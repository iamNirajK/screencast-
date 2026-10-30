/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'host' | 'viewer';

export type ScreenShareStatus = 
  | 'idle' 
  | 'requesting-permission' 
  | 'sharing' 
  | 'paused' 
  | 'ended' 
  | 'error';

export type ConnectionState = 
  | 'new' 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'failed' 
  | 'closed';

export interface RoomMetadata {
  id: string;
  hostId: string;
  createdAt: number;
  expiresAt: number;
  requiresPin: boolean;
  pinHash?: string;
  tokenHash: string;
  isRevoked: boolean;
  hasAudio: boolean;
  audioSource?: 'system-screen' | 'mic-mix' | 'none';
  viewerCount: number;
}

export interface SignalingMessage {
  id: string;
  senderId: string;
  targetId: string;
  roomId: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-request' | 'leave' | 'revoke' | 'ping';
  payload?: any;
  timestamp: number;
}

export interface WebRTCStats {
  timestamp: number;
  bytesReceived?: number;
  bytesSent?: number;
  bitrateKbps: number;
  packetsLost: number;
  packetsTotal: number;
  packetLossRate: number;
  frameWidth?: number;
  frameHeight?: number;
  framesPerSecond?: number;
  roundTripTimeMs?: number;
  jitterMs?: number;
  candidateType?: string;
  protocol?: string;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
}

export interface AudioTrackInfo {
  supported: boolean;
  active: boolean;
  muted: boolean;
  label?: string;
  isSystemAudio: boolean;
  message?: string;
}

export interface TurnServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface AppConfig {
  signalingMode: 'auto' | 'firebase' | 'server';
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  };
  iceServers: RTCIceServer[];
}
