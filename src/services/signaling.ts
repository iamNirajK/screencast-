/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, ensureFirebaseAuth, handleFirestoreError, OperationType } from './firebase';
import { RoomMetadata, SignalingMessage } from '../types/webrtc';
import { sha256 } from '../utils/crypto';

export type SignalingEventCallback = (msg: SignalingMessage) => void;
export type RoomUpdateCallback = (room: RoomMetadata | null) => void;
export type ViewerCountCallback = (count: number) => void;

export class SignalingService {
  private roomId: string;
  private participantId: string;
  private role: 'host' | 'viewer';
  private unsubs: Array<() => void> = [];
  private pollIntervalId: any = null;

  constructor(roomId: string, participantId: string, role: 'host' | 'viewer') {
    this.roomId = roomId;
    this.participantId = participantId;
    this.role = role;
  }

  /**
   * Host creates a new room with metadata, token hash and optional PIN hash in Firestore
   */
  public async createRoom(params: {
    accessToken: string;
    pin?: string;
    hasAudio: boolean;
    audioSource?: 'system-screen' | 'mic-mix' | 'none';
  }): Promise<RoomMetadata> {
    const tokenHash = await sha256(params.accessToken);
    const pinHash = params.pin ? await sha256(params.pin) : undefined;
    const now = Date.now();
    const expiresAt = now + 4 * 60 * 60 * 1000; // 4 hours session limit

    const metadata: RoomMetadata = {
      id: this.roomId,
      hostId: this.participantId,
      createdAt: now,
      expiresAt,
      requiresPin: !!params.pin,
      pinHash,
      tokenHash,
      isRevoked: false,
      hasAudio: params.hasAudio,
      audioSource: params.audioSource || 'none',
      viewerCount: 0,
    };

    const path = `rooms/${this.roomId}`;
    try {
      await ensureFirebaseAuth();
      const roomDocRef = doc(db, 'rooms', this.roomId);
      await setDoc(roomDocRef, metadata);

      // Register host participant
      const partDocRef = doc(db, 'rooms', this.roomId, 'participants', this.participantId);
      await setDoc(partDocRef, {
        id: this.participantId,
        role: 'host',
        joinedAt: now,
        lastSeen: now,
      });
    } catch (err) {
      console.warn('Firestore room creation fallback to server signaling:', err);
      try {
        await this.serverFetch(`/api/signaling/rooms/${this.roomId}`, {
          method: 'POST',
          body: JSON.stringify(metadata),
        });
      } catch (serverErr) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    return metadata;
  }

  /**
   * Verify room existence, token hash, and optional PIN
   */
  public async verifyAndGetRoom(token: string, pin?: string): Promise<{
    valid: boolean;
    error?: string;
    metadata?: RoomMetadata;
  }> {
    let metadata: RoomMetadata | null = null;
    const path = `rooms/${this.roomId}`;

    try {
      await ensureFirebaseAuth();
      const roomSnap = await getDoc(doc(db, 'rooms', this.roomId));
      if (roomSnap.exists()) {
        metadata = roomSnap.data() as RoomMetadata;
      }
    } catch (err) {
      console.warn('Firestore getDoc fallback to server signaling:', err);
    }

    if (!metadata) {
      try {
        const res = await this.serverFetch(`/api/signaling/rooms/${this.roomId}/metadata`);
        if (res.ok) {
          metadata = await res.json();
        }
      } catch {
        // ignore
      }
    }

    if (!metadata) {
      return { valid: false, error: 'Room does not exist or has expired.' };
    }

    if (metadata.isRevoked) {
      return { valid: false, error: 'This invitation has been revoked by the host.' };
    }

    if (Date.now() > metadata.expiresAt) {
      return { valid: false, error: 'This invitation link has expired.' };
    }

    // Verify token hash
    const inputTokenHash = await sha256(token);
    if (inputTokenHash !== metadata.tokenHash) {
      return { valid: false, error: 'Invalid room security token.' };
    }

    // Verify PIN if required
    if (metadata.requiresPin) {
      if (!pin) {
        return { valid: false, error: 'PIN_REQUIRED', metadata };
      }
      const inputPinHash = await sha256(pin);
      if (inputPinHash !== metadata.pinHash) {
        return { valid: false, error: 'Incorrect PIN entered.', metadata };
      }
    }

    return { valid: true, metadata };
  }

  /**
   * Register participant join in the room
   */
  public async joinRoom(): Promise<void> {
    const now = Date.now();
    const path = `rooms/${this.roomId}/participants/${this.participantId}`;

    try {
      await ensureFirebaseAuth();
      const partDocRef = doc(db, 'rooms', this.roomId, 'participants', this.participantId);
      await setDoc(partDocRef, {
        id: this.participantId,
        role: this.role,
        joinedAt: now,
        lastSeen: now,
      });
    } catch (err) {
      console.warn('Firestore join fallback to server signaling:', err);
      try {
        await this.serverFetch(`/api/signaling/rooms/${this.roomId}/participants`, {
          method: 'POST',
          body: JSON.stringify({
            id: this.participantId,
            role: this.role,
            joinedAt: now,
          }),
        });
      } catch (serverErr) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  }

  /**
   * Send a signaling message to a target participant or host
   */
  public async sendMessage(
    targetId: string,
    type: SignalingMessage['type'],
    payload?: any
  ): Promise<void> {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msg: SignalingMessage = {
      id: msgId,
      senderId: this.participantId,
      targetId,
      roomId: this.roomId,
      type,
      payload: payload ? JSON.stringify(payload) : undefined,
      timestamp: Date.now(),
    };

    const path = `rooms/${this.roomId}/signaling/${msgId}`;
    try {
      await ensureFirebaseAuth();
      const msgDocRef = doc(db, 'rooms', this.roomId, 'signaling', msgId);
      await setDoc(msgDocRef, msg);
    } catch (err) {
      console.warn('Firestore sendMessage fallback to server signaling:', err);
      try {
        await this.serverFetch(`/api/signaling/rooms/${this.roomId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            ...msg,
            payload,
          }),
        });
      } catch (serverErr) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  }

  /**
   * Listen for signaling messages specifically addressed to this participant
   */
  public onMessage(callback: SignalingEventCallback): () => void {
    const processedMsgIds = new Set<string>();
    const path = `rooms/${this.roomId}/signaling`;

    let unsubscribeFirestore: Unsubscribe | null = null;
    try {
      const q = query(
        collection(db, 'rooms', this.roomId, 'signaling'),
        where('targetId', '==', this.participantId)
      );

      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data() as SignalingMessage;
              if (data && !processedMsgIds.has(data.id)) {
                processedMsgIds.add(data.id);
                const parsedPayload = data.payload ? (typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload) : undefined;
                callback({
                  ...data,
                  payload: parsedPayload,
                });
                // Consume and delete message to prevent duplicate processing
                deleteDoc(change.doc.ref).catch(() => {});
              }
            }
          });
        },
        (error) => {
          console.warn('Firestore onSnapshot error on signaling inbox:', error);
          this.startServerPolling(processedMsgIds, callback);
        }
      );
    } catch (err) {
      this.startServerPolling(processedMsgIds, callback);
    }

    const cleanup = () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      if (this.pollIntervalId) {
        clearInterval(this.pollIntervalId);
        this.pollIntervalId = null;
      }
    };

    this.unsubs.push(cleanup);
    return cleanup;
  }

  private startServerPolling(processedMsgIds: Set<string>, callback: SignalingEventCallback) {
    if (this.pollIntervalId) return;
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const res = await this.serverFetch(
          `/api/signaling/rooms/${this.roomId}/messages?targetId=${this.participantId}`
        );
        if (res.ok) {
          const messages: SignalingMessage[] = await res.json();
          for (const msg of messages) {
            if (!processedMsgIds.has(msg.id)) {
              processedMsgIds.add(msg.id);
              callback(msg);
            }
          }
        }
      } catch {
        // silent
      }
    };

    this.pollIntervalId = setInterval(poll, 600);
  }

  /**
   * Subscribe to room metadata updates (e.g., host ended or revoked)
   */
  public onRoomUpdate(callback: RoomUpdateCallback): () => void {
    const path = `rooms/${this.roomId}`;
    let unsubscribeFirestore: Unsubscribe | null = null;

    try {
      unsubscribeFirestore = onSnapshot(
        doc(db, 'rooms', this.roomId),
        (snap) => {
          if (!snap.exists()) {
            callback(null);
          } else {
            callback(snap.data() as RoomMetadata);
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot error on room metadata:', error);
        }
      );
    } catch {
      // ignore
    }

    const cleanup = () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
    this.unsubs.push(cleanup);
    return cleanup;
  }

  /**
   * Subscribe to viewer count updates
   */
  public onViewerCount(callback: ViewerCountCallback): () => void {
    const path = `rooms/${this.roomId}/participants`;
    let unsubscribeFirestore: Unsubscribe | null = null;

    try {
      unsubscribeFirestore = onSnapshot(
        collection(db, 'rooms', this.roomId, 'participants'),
        (snapshot) => {
          let count = 0;
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.role === 'viewer') count++;
          });
          callback(count);
        },
        (error) => {
          console.warn('Firestore onSnapshot error on participants:', error);
        }
      );
    } catch {
      // ignore
    }

    const cleanup = () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
    this.unsubs.push(cleanup);
    return cleanup;
  }

  /**
   * Host revokes the invitation link
   */
  public async revokeRoom(): Promise<void> {
    const path = `rooms/${this.roomId}`;
    try {
      await ensureFirebaseAuth();
      await updateDoc(doc(db, 'rooms', this.roomId), { isRevoked: true });
    } catch (err) {
      console.warn('Firestore revokeRoom fallback to server signaling:', err);
      try {
        await this.serverFetch(`/api/signaling/rooms/${this.roomId}/revoke`, {
          method: 'POST',
        });
      } catch (serverErr) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  }

  /**
   * Leave room and clean up resources
   */
  public async leave(): Promise<void> {
    this.cleanup();
    const path = `rooms/${this.roomId}/participants/${this.participantId}`;

    try {
      await ensureFirebaseAuth();
      await deleteDoc(doc(db, 'rooms', this.roomId, 'participants', this.participantId));

      if (this.role === 'host') {
        await updateDoc(doc(db, 'rooms', this.roomId), { isRevoked: true });
      }
    } catch (err) {
      try {
        await this.serverFetch(
          `/api/signaling/rooms/${this.roomId}/participants/${this.participantId}`,
          { method: 'DELETE' }
        );
      } catch {
        // ignore
      }
    }
  }

  public cleanup(): void {
    this.unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // ignore
      }
    });
    this.unsubs = [];
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  private async serverFetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  }
}
