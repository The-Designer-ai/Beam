import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
} from 'react-native-webrtc';
import { SignalMessage } from '../types';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // TURN servers — add later via Cloudflare free TURN or self-hosted coturn
];

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface PeerConnectionCallbacks {
  onStream: (stream: MediaStream) => void;
  onState: (state: ConnectionState) => void;
  onError: (error: Error) => void;
}

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private callbacks: PeerConnectionCallbacks;

  constructor(callbacks: PeerConnectionCallbacks) {
    this.callbacks = callbacks;
  }

  // ─── Create a PeerConnection (called by sender) ────────────────

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    this.pc = this.createPeerConnection();
    this.localStream = await mediaDevices.getDisplayMedia({
      video: { width: 1920, height: 1080, frameRate: 30 },
      audio: true,
    });

    this.localStream.getTracks().forEach((track) => {
      this.pc?.addTrack(track, this.localStream!);
    });

    const offer = await this.pc.createOffer({
      offerToReceiveVideo: false,
      offerToReceiveAudio: false,
    });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  // ─── Handle incoming offer (called by receiver) ────────────────

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.pc = this.createPeerConnection();
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await this.pc.createAnswer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true,
    });
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  // ─── Handle incoming answer (called by sender) ─────────────────

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error('No peer connection');
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  // ─── Handle ICE candidate ──────────────────────────────────────

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  // ─── Get local stream (for preview) ────────────────────────────

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // ─── Cleanup ───────────────────────────────────────────────────

  dispose(): void {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
  }

  // ─── Internal ──────────────────────────────────────────────────

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.onError(new Error('ICE_CANDIDATE')); // Signal to parent
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.callbacks.onStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState as ConnectionState;
      this.callbacks.onState(state);
    };

    return pc;
  }
}
