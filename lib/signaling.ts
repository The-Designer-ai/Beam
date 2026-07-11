import { io, Socket } from 'socket.io-client';
import { SignalingProvider, SignalMessage } from '../types';

const SIGNAL_SERVER = __DEV__
  ? 'http://localhost:3001'
  : 'https://signal.beam.app'; // Prod — replace when deployed

/**
 * WebSocket-based signaling using Socket.IO.
 *
 * ════════════════════════════════════════════════════════
 *   SUPABASE REALTIME MIGRATION
 *
 *   When you connect the Supabase MCP, replace this file
 *   with a Supabase Realtime implementation:
 *
 *   const channel = supabase.channel(`beam:${roomCode}`)
 *   channel.send({ type: 'broadcast', event: 'signal', payload: msg })
 *   channel.on('broadcast', { event: 'signal' }, ({ payload }) => cb(payload))
 *   channel.subscribe()
 *
 *   The interface (SignalingProvider) stays the same.
 * ════════════════════════════════════════════════════════
 */
export class SocketSignaling implements SignalingProvider {
  private socket: Socket | null = null;
  private roomCode: string = '';
  private userId: string = '';
  private messageCb: ((msg: SignalMessage) => void) | null = null;
  private peerJoinCb: ((userId: string) => void) | null = null;
  private peerLeaveCb: ((userId: string) => void) | null = null;

  async connect(roomCode: string, userId: string): Promise<void> {
    this.roomCode = roomCode;
    this.userId = userId;

    this.socket = io(SIGNAL_SERVER, {
      transports: ['websocket'],
      forceNew: true,
    });

    return new Promise((resolve, reject) => {
      this.socket!.on('connect', () => {
        this.socket!.emit('join-room', { roomCode, userId });

        this.socket!.on('signal', (msg: SignalMessage) => {
          this.messageCb?.(msg);
        });

        this.socket!.on('peer-joined', ({ userId: id }) => {
          this.peerJoinCb?.(id);
        });

        this.socket!.on('peer-left', ({ userId: id }) => {
          this.peerLeaveCb?.(id);
        });

        resolve();
      });

      this.socket!.on('connect_error', (err) => {
        reject(err);
      });

      // Timeout after 5s
      setTimeout(() => reject(new Error('Signaling timeout')), 5000);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.emit('leave-room', { roomCode: this.roomCode, userId: this.userId });
      this.socket.disconnect();
      this.socket = null;
    }
  }

  send(msg: SignalMessage): void {
    this.socket?.emit('signal', { roomCode: this.roomCode, msg });
  }

  onMessage(cb: (msg: SignalMessage) => void): void {
    this.messageCb = cb;
  }

  onPeerJoin(cb: (userId: string) => void): void {
    this.peerJoinCb = cb;
  }

  onPeerLeave(cb: (userId: string) => void): void {
    this.peerLeaveCb = cb;
  }
}

// ─── Factory ───────────────────────────────────────────────────────
// Returns a signaling provider. Swap implementation here when migrating.
export function createSignaling(): SignalingProvider {
  return new SocketSignaling();
}
