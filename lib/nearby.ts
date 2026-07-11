// ───────────────────────────────────────────────────────────
// lib/nearby.ts — High-level "Share Domain via Nearby" API
//
// Two flows:
//   A) Both have Beam → Multipeer Connectivity (P2P, no internet)
//   B) Other person doesn't have Beam → Invite link fallback
// ───────────────────────────────────────────────────────────

import { Platform, Share, Linking } from 'react-native';
import nearby, { NearbyPeer, NearbyState } from '../modules/beam-nearby/index';

export type { NearbyPeer, NearbyState };

const DISCOVERY_TIMEOUT_MS = 8000; // 8 seconds then offer fallback

export type DomainShareResult = {
  method: 'nearby' | 'invite-link';
  domainToken?: string;
  from?: string;
};

export type DomainShareCallbacks = {
  onStateChange: (state: NearbyState, detail?: string) => void;
  onPeerFound: (peer: NearbyPeer) => void;
  onPeerLost: (displayName: string) => void;
  onDomainReceived: (token: string, from: string) => void;
  onSuccess: (result: DomainShareResult) => void;
  onTimeout: () => void; // No nearby Beam devices found
  onError: (error: Error) => void;
};

// ─── Start broadcasting your domain ────────────────────────

export async function shareDomainViaNearby(
  displayName: string,
  domainToken: string,
  callbacks: DomainShareCallbacks,
): Promise<DomainShareResult> {
  // 1. Set up native event listeners
  const cleanup = nearby.setupNativeListeners();
  nearby.on({
    onPeerFound: (peer) => callbacks.onPeerFound(peer),
    onPeerLost: (name) => callbacks.onPeerLost(name),
    onDomainReceived: (token, from) => {
      callbacks.onDomainReceived(token, from);
      callbacks.onSuccess({ method: 'nearby', domainToken: token, from });
      cleanup();
    },
    onStateChange: (state, detail) => callbacks.onStateChange(state, detail),
  });

  try {
    // 2. Start broadcasting
    await nearby.startBroadcasting(displayName, domainToken);
    callbacks.onStateChange('broadcasting');

    // 3. Wait for discovery timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // No one found nearby after timeout — offer fallback
        cleanup();
        resolve();
      }, DISCOVERY_TIMEOUT_MS);

      // If someone connects, cancel the timeout
      nearby.on({
        onDomainReceived: (_token, _from) => {
          clearTimeout(timeout);
          resolve();
        },
        onStateChange: (state) => {
          if (state === 'connected') {
            clearTimeout(timeout);
            resolve();
          }
        },
      });
    });

    // 4. If domain was already received, we're done
    // Otherwise offer invite link as fallback
    if (nearby.state === 'connected') {
      return { method: 'nearby' };
    }

    // ─── Fallback: No nearby Beam devices found ─────────────────
    callbacks.onTimeout();

    // Generate invite link
    const inviteUrl = `https://beam.app/invite/${domainToken}`;
    await Share.share({
      message: `Join me on Beam! Tap here to add my domain: ${inviteUrl}`,
      title: 'Invite to Beam',
    });

    await nearby.stop();
    callbacks.onSuccess({ method: 'invite-link', domainToken });

    return { method: 'invite-link', domainToken };
  } catch (error: any) {
    callbacks.onError(error);
    throw error;
  } finally {
    cleanup();
  }
}

// ─── Scan for nearby domain broadcasters ───────────────────

export async function scanForNearbyDomains(
  displayName: string,
  callbacks: DomainShareCallbacks,
): Promise<void> {
  const cleanup = nearby.setupNativeListeners();
  nearby.on({
    onPeerFound: (peer) => callbacks.onPeerFound(peer),
    onPeerLost: (name) => callbacks.onPeerLost(name),
    onDomainReceived: (token, from) => {
      callbacks.onDomainReceived(token, from);
      callbacks.onSuccess({ method: 'nearby', domainToken: token, from });
    },
    onStateChange: (state, detail) => callbacks.onStateChange(state, detail),
  });

  try {
    await nearby.startScanning(displayName);
    callbacks.onStateChange('scanning');
  } catch (error: any) {
    callbacks.onError(error);
    cleanup();
  }
}

// ─── Accept a discovered peer's domain ─────────────────────

export async function acceptNearbyDomain(
  peerDisplayName: string,
): Promise<void> {
  await nearby.acceptInvite(peerDisplayName);
}

// ─── Stop all nearby activity ─────────────────────────────

export async function stopNearby(): Promise<void> {
  await nearby.stop();
}

// ─── Helper: Handle invite link deep link ──────────────────

export function handleInviteLink(url: string): string | null {
  // Parses https://beam.app/invite/DOMAIN_TOKEN
  // or beam://invite/DOMAIN_TOKEN
  const patterns = [
    /beam\.app\/invite\/([A-Za-z0-9_-]+)/,
    /beam:\/\/invite\/([A-Za-z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

// ─── Check if Multipeer Connectivity is available ──────────

export function isNearbySupported(): boolean {
  // Multipeer Connectivity is iOS-only
  return Platform.OS === 'ios';
}
