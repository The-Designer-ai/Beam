export interface Device {
  id: string;
  name: string;
  type: 'ios' | 'android' | 'web';
  online: boolean;
  lastSeen: number;
  ownerId?: string;
  ownerName?: string;
  ownerDomain?: string;
  pushToken?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  domain: string;
}

export interface Room {
  id: string;
  code: string;
  title: string;
  senderId?: string;
  receiverIds: string[];
  isActive: boolean;
}

export interface SubscriptionTier {
  type: 'free' | 'plus';
  expiresAt?: number;
  productIdentifier?: string;
  latestPurchaseDate?: string;
}

export type SignalMessage =
  | { type: 'offer'; sdp: any }
  | { type: 'answer'; sdp: any }
  | { type: 'ice'; candidate: RTCIceCandidateInit }
  | { type: 'join'; roomCode: string; userId: string }
  | { type: 'leave'; roomCode: string; userId: string }
  | { type: 'control'; action: 'play' | 'pause' | 'seek'; position?: number };

export interface SignalingProvider {
  connect(roomCode: string, userId: string): Promise<void>;
  disconnect(): void;
  send(msg: SignalMessage): void;
  onMessage(cb: (msg: SignalMessage) => void): void;
  onPeerJoin(cb: (userId: string) => void): void;
  onPeerLeave(cb: (userId: string) => void): void;
}
