// ───────────────────────────────────────────────────────────
// BeamNearby — Multipeer Connectivity JS API
// Wraps the native Swift BeamNearbyModule for Expo
// ───────────────────────────────────────────────────────────

import { requireOptionalNativeModule } from 'expo';

type EventSubscription = {
  remove(): void;
};

type BeamNearbyEvents = {
  onPeerFound: (event: NearbyPeer) => void;
  onPeerLost: (event: { displayName: string }) => void;
  onDomainReceived: (event: { domainToken: string; from: string }) => void;
  onStateChange: (event: { state: NearbyState; peer?: string; message?: string }) => void;
};

interface BeamNearbyNativeModule {
  startBroadcasting(displayName: string, domainToken: string): Promise<void>;
  startScanning(displayName: string): Promise<void>;
  acceptInvite(peerDisplayName: string): Promise<void>;
  sendDomain(domainToken: string): Promise<void>;
  stop(): Promise<void>;
  getDiscoveredPeers(): Promise<string[]>;
  addListener<EventName extends keyof BeamNearbyEvents>(
    eventName: EventName,
    listener: BeamNearbyEvents[EventName],
  ): EventSubscription;
}

// TODO: Treat this as a temporary safety fallback. BeamNearby should be
// autolinked into every iOS build; if this is null, investigate native
// autolinking/registration instead of accepting Nearby as permanently off.
// This check prevents crash loops by disabling Nearby until a fixed native
// rebuild includes/registers BeamNearbyModule.
const Native = requireOptionalNativeModule<BeamNearbyNativeModule>('BeamNearby');

function requireBeamNearby(): BeamNearbyNativeModule {
  if (!Native) {
    throw new Error('Nearby sharing is not available in this build.');
  }
  return Native;
}

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

  get isAvailable(): boolean {
    return !!Native;
  }

  async startBroadcasting(displayName: string, domainToken: string): Promise<void> {
    await requireBeamNearby().startBroadcasting(displayName, domainToken);
    this._state = 'broadcasting';
    this.callbacks.onStateChange?.('broadcasting');
  }

  async startScanning(displayName: string): Promise<void> {
    await requireBeamNearby().startScanning(displayName);
    this._state = 'scanning';
    this.callbacks.onStateChange?.('scanning');
  }

  async acceptInvite(peerDisplayName: string): Promise<void> {
    this._state = 'connecting';
    this.callbacks.onStateChange?.('connecting');
    await requireBeamNearby().acceptInvite(peerDisplayName);
  }

  async sendDomain(domainToken: string): Promise<void> {
    await requireBeamNearby().sendDomain(domainToken);
  }

  async stop(): Promise<void> {
    await Native?.stop();
    this._state = 'idle';
    this.callbacks.onStateChange?.('idle');
  }

  async getDiscoveredPeers(): Promise<string[]> {
    return Native?.getDiscoveredPeers() ?? [];
  }

  on(callbacks: NearbyCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  off(): void {
    this.callbacks = {};
  }

  setupNativeListeners(): () => void {
    if (!Native) {
      return () => {};
    }

    const subs: EventSubscription[] = [
      Native.addListener('onPeerFound', (peer) => {
        this.callbacks.onPeerFound?.(peer);
      }),
      Native.addListener('onPeerLost', ({ displayName }) => {
        this.callbacks.onPeerLost?.(displayName);
      }),
      Native.addListener('onDomainReceived', ({ domainToken, from }) => {
        this.callbacks.onDomainReceived?.(domainToken, from);
      }),
      Native.addListener('onStateChange', ({ state, peer, message }) => {
        this._state = state;
        this.callbacks.onStateChange?.(state, message ?? peer);
      }),
    ];

    return () => {
      for (const sub of subs) {
        sub.remove();
      }
    };
  }
}

const nearby = new BeamNearby();
export default nearby;
