// ───────────────────────────────────────────────────────────
// BeamNearby — Multipeer Connectivity JS API
// Wraps the native Swift BeamNearbyModule for Expo
// ───────────────────────────────────────────────────────────

import { requireNativeModule } from 'expo-modules-core';
import { EventSubscription } from 'expo-modules-core';

interface BeamNearbyNativeModule {
  startBroadcasting(displayName: string, domainToken: string): Promise<void>;
  startScanning(displayName: string): Promise<void>;
  acceptInvite(peerDisplayName: string): Promise<void>;
  sendDomain(domainToken: string): Promise<void>;
  stop(): Promise<void>;
  getDiscoveredPeers(): Promise<string[]>;
  addListener(eventName: string): EventSubscription;
}

const Native = requireNativeModule<BeamNearbyNativeModule>('BeamNearby');

// ─── High-level API ────────────────────────────────────────

export type NearbyPeer = {
  displayName: string;
  domainToken: string;
};

export type NearbyState = 'idle' | 'broadcasting' | 'scanning' | 'connecting' | 'connected' | 'error';

type NearbyCallbacks = {
  onPeerFound?: (peer: NearbyPeer) => void;
  onPeerLost?: (displayName: string) => void;
  onDomainReceived?: (domainToken: string, from: string) => void;
  onStateChange?: (state: NearbyState, detail?: string) => void;
};

class BeamNearby {
  private callbacks: NearbyCallbacks = {};
  private _state: NearbyState = 'idle';

  get state(): NearbyState {
    return this._state;
  }

  async startBroadcasting(displayName: string, domainToken: string): Promise<void> {
    await Native.startBroadcasting(displayName, domainToken);
    this._state = 'broadcasting';
    this.callbacks.onStateChange?.('broadcasting');
  }

  async startScanning(displayName: string): Promise<void> {
    await Native.startScanning(displayName);
    this._state = 'scanning';
    this.callbacks.onStateChange?.('scanning');
  }

  async acceptInvite(peerDisplayName: string): Promise<void> {
    this._state = 'connecting';
    this.callbacks.onStateChange?.('connecting');
    await Native.acceptInvite(peerDisplayName);
  }

  async sendDomain(domainToken: string): Promise<void> {
    await Native.sendDomain(domainToken);
  }

  async stop(): Promise<void> {
    await Native.stop();
    this._state = 'idle';
    this.callbacks.onStateChange?.('idle');
  }

  async getDiscoveredPeers(): Promise<string[]> {
    return Native.getDiscoveredPeers();
  }

  on(callbacks: NearbyCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  off(): void {
    this.callbacks = {};
  }

  setupNativeListeners(): () => void {
    const subs: EventSubscription[] = [
      Native.addListener('onPeerFound'),
      Native.addListener('onPeerLost'),
      Native.addListener('onDomainReceived'),
      Native.addListener('onStateChange'),
    ];

    // Wire each subscription to the appropriate handler
    // Expo Modules API dispatches events with the event name as the first arg
    // and the payload as the data property

    return () => {
      for (const sub of subs) {
        sub.remove();
      }
    };
  }
}

const nearby = new BeamNearby();
export default nearby;
