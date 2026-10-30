/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SignalingService } from './signaling';
import { SignalingMessage, WebRTCStats } from '../types/webrtc';

export interface WebRTCConfig {
  iceServers?: RTCIceServer[];
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: ['stun:stun.cloudflare.com:3478'] },
];

const LOCAL_STORAGE_TURN_KEY = 'mr_nikku_turn_config';

export function getCustomIceServers(): RTCIceServer[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TURN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse custom ICE servers:', err);
  }

  // Check env TURN configuration
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl) {
    return [
      ...DEFAULT_ICE_SERVERS,
      {
        urls: turnUrl,
        username: turnUser,
        credential: turnCred,
      },
    ];
  }

  return DEFAULT_ICE_SERVERS;
}

export function saveCustomIceServers(servers: RTCIceServer[]): void {
  localStorage.setItem(LOCAL_STORAGE_TURN_KEY, JSON.stringify(servers));
}

/**
 * WebRTC Connection Manager for Host
 */
export class HostWebRTCManager {
  private signaling: SignalingService;
  private localStream: MediaStream;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private statsIntervalId: any = null;
  private onStatsCallback?: (viewerId: string, stats: WebRTCStats) => void;
  private onConnectionStateChange?: (viewerId: string, state: RTCPeerConnectionState) => void;
  private lastStatsBytes: Map<string, { bytes: number; timestamp: number }> = new Map();

  constructor(signaling: SignalingService, localStream: MediaStream) {
    this.signaling = signaling;
    this.localStream = localStream;
    this.setupSignalingListeners();
  }

  public setCallbacks(callbacks: {
    onStats?: (viewerId: string, stats: WebRTCStats) => void;
    onConnectionStateChange?: (viewerId: string, state: RTCPeerConnectionState) => void;
  }) {
    this.onStatsCallback = callbacks.onStats;
    this.onConnectionStateChange = callbacks.onConnectionStateChange;
  }

  private setupSignalingListeners() {
    this.signaling.onMessage(async (msg: SignalingMessage) => {
      const viewerId = msg.senderId;

      switch (msg.type) {
        case 'join-request':
          await this.handleViewerJoin(viewerId);
          break;

        case 'answer':
          await this.handleViewerAnswer(viewerId, msg.payload);
          break;

        case 'ice-candidate':
          await this.handleViewerCandidate(viewerId, msg.payload);
          break;

        case 'leave':
          this.closePeer(viewerId);
          break;
      }
    });

    // Start periodic stats collection
    this.statsIntervalId = setInterval(() => this.collectAllStats(), 1500);
  }

  private async handleViewerJoin(viewerId: string) {
    // If peer already exists, close old one
    if (this.peerConnections.has(viewerId)) {
      this.closePeer(viewerId);
    }

    const pc = new RTCPeerConnection({
      iceServers: getCustomIceServers(),
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
    });

    this.peerConnections.set(viewerId, pc);

    // Add local stream tracks (screen video & optional audio)
    this.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream);
    });

    // ICE candidate trickle
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendMessage(viewerId, 'ice-candidate', event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(viewerId, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(viewerId);
      }
    };

    // Create and send SDP Offer
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);
      await this.signaling.sendMessage(viewerId, 'offer', offer);
    } catch (err) {
      console.error(`Failed to create offer for viewer ${viewerId}:`, err);
    }
  }

  private async handleViewerAnswer(viewerId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(viewerId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Apply queued ICE candidates
      const pending = this.pendingCandidates.get(viewerId) || [];
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.pendingCandidates.delete(viewerId);
    } catch (err) {
      console.error(`Failed to set remote answer for viewer ${viewerId}:`, err);
    }
  }

  private async handleViewerCandidate(viewerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(viewerId);
    if (!pc || !pc.remoteDescription) {
      const list = this.pendingCandidates.get(viewerId) || [];
      list.push(candidate);
      this.pendingCandidates.set(viewerId, list);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error(`Failed to add ICE candidate for viewer ${viewerId}:`, err);
    }
  }

  /**
   * Mute or unmute outgoing audio track
   */
  public setAudioMuted(muted: boolean): void {
    const audioTracks = this.localStream.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = !muted;
    });
  }

  private async collectAllStats() {
    for (const [viewerId, pc] of this.peerConnections.entries()) {
      if (pc.connectionState !== 'connected') continue;

      try {
        const stats = await pc.getStats();
        let bytesSent = 0;
        let packetsLost = 0;
        let packetsSent = 0;
        let frameWidth = 0;
        let frameHeight = 0;
        let fps = 0;
        let candidateType = 'unknown';
        let rtt = 0;

        stats.forEach((report) => {
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            bytesSent = report.bytesSent || 0;
            packetsSent = report.packetsSent || 0;
            frameWidth = report.frameWidth || 0;
            frameHeight = report.frameHeight || 0;
            fps = report.framesPerSecond || 0;
          }
          if (report.type === 'remote-inbound-rtp') {
            packetsLost = report.packetsLost || 0;
            rtt = report.roundTripTime ? report.roundTripTime * 1000 : 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            candidateType = report.localCandidateId || 'direct';
          }
        });

        // Compute bitrate
        const prev = this.lastStatsBytes.get(viewerId);
        const now = Date.now();
        let bitrateKbps = 0;
        if (prev) {
          const deltaBytes = bytesSent - prev.bytes;
          const deltaSec = (now - prev.timestamp) / 1000;
          if (deltaSec > 0 && deltaBytes >= 0) {
            bitrateKbps = Math.round((deltaBytes * 8) / (deltaSec * 1000));
          }
        }
        this.lastStatsBytes.set(viewerId, { bytes: bytesSent, timestamp: now });

        const totalPackets = packetsSent + packetsLost;
        const lossRate = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

        this.onStatsCallback?.(viewerId, {
          timestamp: now,
          bytesSent,
          bitrateKbps,
          packetsLost,
          packetsTotal: totalPackets,
          packetLossRate: parseFloat(lossRate.toFixed(2)),
          frameWidth,
          frameHeight,
          framesPerSecond: fps,
          roundTripTimeMs: Math.round(rtt),
          candidateType,
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
        });
      } catch {
        // ignore
      }
    }
  }

  public closePeer(viewerId: string) {
    const pc = this.peerConnections.get(viewerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(viewerId);
      this.pendingCandidates.delete(viewerId);
      this.lastStatsBytes.delete(viewerId);
    }
  }

  public destroy() {
    if (this.statsIntervalId) {
      clearInterval(this.statsIntervalId);
    }
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.pendingCandidates.clear();
    this.lastStatsBytes.clear();
  }
}

/**
 * WebRTC Connection Manager for Viewer
 */
export class ViewerWebRTCManager {
  private signaling: SignalingService;
  private hostId: string;
  private pc: RTCPeerConnection | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteStream: MediaStream = new MediaStream();
  private statsIntervalId: any = null;
  private lastStatsBytes: { bytes: number; timestamp: number } | null = null;
  private onTrackCallback?: (stream: MediaStream) => void;
  private onStatsCallback?: (stats: WebRTCStats) => void;
  private onConnectionStateChange?: (state: RTCPeerConnectionState) => void;

  constructor(signaling: SignalingService, hostId: string) {
    this.signaling = signaling;
    this.hostId = hostId;
    this.setupSignalingListeners();
  }

  public setCallbacks(callbacks: {
    onTrack?: (stream: MediaStream) => void;
    onStats?: (stats: WebRTCStats) => void;
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  }) {
    this.onTrackCallback = callbacks.onTrack;
    this.onStatsCallback = callbacks.onStats;
    this.onConnectionStateChange = callbacks.onConnectionStateChange;
  }

  private setupSignalingListeners() {
    this.signaling.onMessage(async (msg: SignalingMessage) => {
      switch (msg.type) {
        case 'offer':
          await this.handleOffer(msg.payload);
          break;

        case 'ice-candidate':
          await this.handleCandidate(msg.payload);
          break;

        case 'revoke':
        case 'leave':
          this.destroy();
          break;
      }
    });

    this.statsIntervalId = setInterval(() => this.collectStats(), 1500);
  }

  /**
   * Initiate connection by sending join-request to the host
   */
  public async connect(): Promise<void> {
    this.initPeerConnection();
    await this.signaling.sendMessage(this.hostId, 'join-request');
  }

  private initPeerConnection() {
    if (this.pc) {
      this.pc.close();
    }

    this.pc = new RTCPeerConnection({
      iceServers: getCustomIceServers(),
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
    });

    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!this.remoteStream.getTracks().find((t) => t.id === track.id)) {
          this.remoteStream.addTrack(track);
        }
      });
      this.onTrackCallback?.(this.remoteStream);
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendMessage(this.hostId, 'ice-candidate', event.candidate.toJSON());
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        this.onConnectionStateChange?.(this.pc.connectionState);
      }
    };
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.pc) {
      this.initPeerConnection();
    }
    const pc = this.pc!;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Add queued ICE candidates
      for (const candidate of this.pendingCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.pendingCandidates = [];

      // Create and send SDP Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await this.signaling.sendMessage(this.hostId, 'answer', answer);
    } catch (err) {
      console.error('Failed to handle SDP offer from host:', err);
    }
  }

  private async handleCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc || !this.pc.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Failed to add candidate from host:', err);
    }
  }

  /**
   * Trigger ICE restart for network reconnects
   */
  public async restartIce(): Promise<void> {
    if (!this.pc) return;
    try {
      await this.signaling.sendMessage(this.hostId, 'join-request');
    } catch (err) {
      console.error('Failed to request ICE restart:', err);
    }
  }

  private async collectStats() {
    if (!this.pc || this.pc.connectionState !== 'connected') return;

    try {
      const stats = await this.pc.getStats();
      let bytesReceived = 0;
      let packetsLost = 0;
      let packetsTotal = 0;
      let frameWidth = 0;
      let frameHeight = 0;
      let fps = 0;
      let jitter = 0;
      let candidateType = 'unknown';

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          bytesReceived = report.bytesReceived || 0;
          packetsLost = report.packetsLost || 0;
          packetsTotal = (report.packetsReceived || 0) + packetsLost;
          frameWidth = report.frameWidth || 0;
          frameHeight = report.frameHeight || 0;
          fps = report.framesPerSecond || 0;
          jitter = report.jitter ? report.jitter * 1000 : 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          candidateType = report.remoteCandidateId || 'direct';
        }
      });

      const now = Date.now();
      let bitrateKbps = 0;
      if (this.lastStatsBytes) {
        const deltaBytes = bytesReceived - this.lastStatsBytes.bytes;
        const deltaSec = (now - this.lastStatsBytes.timestamp) / 1000;
        if (deltaSec > 0 && deltaBytes >= 0) {
          bitrateKbps = Math.round((deltaBytes * 8) / (deltaSec * 1000));
        }
      }
      this.lastStatsBytes = { bytes: bytesReceived, timestamp: now };

      const lossRate = packetsTotal > 0 ? (packetsLost / packetsTotal) * 100 : 0;

      this.onStatsCallback?.({
        timestamp: now,
        bytesReceived,
        bitrateKbps,
        packetsLost,
        packetsTotal,
        packetLossRate: parseFloat(lossRate.toFixed(2)),
        frameWidth,
        frameHeight,
        framesPerSecond: fps,
        jitterMs: Math.round(jitter),
        candidateType,
        connectionState: this.pc.connectionState,
        iceConnectionState: this.pc.iceConnectionState,
      });
    } catch {
      // ignore
    }
  }

  public destroy() {
    if (this.statsIntervalId) {
      clearInterval(this.statsIntervalId);
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.remoteStream.getTracks().forEach((t) => t.stop());
    this.remoteStream = new MediaStream();
  }
}
