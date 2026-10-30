/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Volume1,
  RotateCw,
  Activity,
  LogOut,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Cast,
  CheckCircle2,
  Info
} from 'lucide-react';
import { SignalingService } from '../services/signaling';
import { ViewerWebRTCManager } from '../services/webrtc';
import { generateParticipantId } from '../utils/crypto';
import { RoomMetadata, WebRTCStats } from '../types/webrtc';
import { StatsDrawer } from './StatsDrawer';

interface ViewerPageProps {
  roomId: string;
  token: string;
  initialPin?: string;
  onLeave: () => void;
}

export const ViewerPage: React.FC<ViewerPageProps> = ({
  roomId,
  token,
  initialPin,
  onLeave,
}) => {
  const [hasJoined, setHasJoined] = useState(false);
  const [pin, setPin] = useState(initialPin || '');
  const [pinRequired, setPinRequired] = useState(false);
  const [roomMeta, setRoomMeta] = useState<RoomMetadata | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [activeStats, setActiveStats] = useState<WebRTCStats | null>(null);

  // Video & audio states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [hasReceivedAudio, setHasReceivedAudio] = useState(false);
  const [showRotateNotice, setShowRotateNotice] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const signalingRef = useRef<SignalingService | null>(null);
  const viewerManagerRef = useRef<ViewerWebRTCManager | null>(null);
  const participantIdRef = useRef<string>(generateParticipantId('viewer'));

  // 1. Initial Room Verification
  useEffect(() => {
    let isCancelled = false;

    const verifyRoom = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const signaling = new SignalingService(
          roomId,
          participantIdRef.current,
          'viewer'
        );
        signalingRef.current = signaling;

        const result = await signaling.verifyAndGetRoom(token, pin || undefined);

        if (isCancelled) return;

        if (!result.valid) {
          if (result.error === 'PIN_REQUIRED') {
            setPinRequired(true);
            setRoomMeta(result.metadata || null);
          } else {
            setErrorMessage(result.error || 'Failed to authenticate with room.');
          }
          setLoading(false);
          return;
        }

        setRoomMeta(result.metadata || null);
        setPinRequired(false);
        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          setErrorMessage(err.message || 'Error connecting to signaling service.');
          setLoading(false);
        }
      }
    };

    verifyRoom();

    return () => {
      isCancelled = true;
    };
  }, [roomId, token]);

  // Check orientation on mobile
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setShowRotateNotice(window.innerHeight > window.innerWidth);
      } else {
        setShowRotateNotice(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // 2. Join Stream
  const handleJoin = async () => {
    if (!roomMeta) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const signaling = signalingRef.current || new SignalingService(
        roomId,
        participantIdRef.current,
        'viewer'
      );
      signalingRef.current = signaling;

      // Re-verify with PIN if needed
      if (pinRequired) {
        const check = await signaling.verifyAndGetRoom(token, pin);
        if (!check.valid) {
          setErrorMessage(check.error || 'Incorrect PIN code.');
          setLoading(false);
          return;
        }
      }

      await signaling.joinRoom();

      // Listen for room updates (e.g. host ended or revoked)
      signaling.onRoomUpdate((meta) => {
        if (!meta || meta.isRevoked) {
          setErrorMessage('The host has ended or revoked this screen-sharing session.');
          handleLeave();
        }
      });

      // Initialize WebRTC
      const viewerManager = new ViewerWebRTCManager(signaling, roomMeta.hostId);
      viewerManagerRef.current = viewerManager;

      viewerManager.setCallbacks({
        onTrack: (remoteStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;

            // Check for audio track
            const audioTracks = remoteStream.getAudioTracks();
            if (audioTracks.length > 0) {
              setHasReceivedAudio(true);
            }

            // Attempt autoplay
            videoRef.current.play().catch((playErr) => {
              console.warn('Autoplay restricted by browser:', playErr);
              setAutoplayBlocked(true);
            });
          }
        },
        onStats: (stats) => setActiveStats(stats),
        onConnectionStateChange: (state) => setConnectionState(state),
      });

      await viewerManager.connect();
      setHasJoined(true);
      setLoading(false);
    } catch (err: any) {
      console.error('Join error:', err);
      setErrorMessage(err.message || 'Failed to establish WebRTC peer connection.');
      setLoading(false);
    }
  };

  const handleUnmuteAutoplay = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().then(() => {
        setAutoplayBlocked(false);
        setIsMuted(false);
      }).catch((e) => {
        console.warn('Playback gesture retry error:', e);
      });
    }
  };

  const handleToggleFullscreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.() ||
        (el as any).webkitRequestFullscreen?.() ||
        (el as any).msRequestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.() ||
        (document as any).webkitExitFullscreen?.() ||
        (document as any).msExitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handleRestartIce = () => {
    viewerManagerRef.current?.restartIce();
  };

  const handleLeave = () => {
    viewerManagerRef.current?.destroy();
    signalingRef.current?.leave();
    onLeave();
  };

  // Pre-join Screen
  if (!hasJoined) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-violet-500/20">
            <Cast className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Join Live Screen Stream</h2>
          <p className="text-xs text-slate-400">
            You were invited to watch a live screen share session on Mr Nikku.
          </p>
        </div>

        {errorMessage ? (
          <div className="p-5 rounded-2xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>Cannot Join Session</span>
            </div>
            <p>{errorMessage}</p>
            <button
              onClick={onLeave}
              className="w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
            >
              Return Home
            </button>
          </div>
        ) : loading ? (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Verifying security token and room state...</p>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            {/* Room Info */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Room Code:</span>
                <span className="text-white font-mono font-semibold">{roomId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Host Audio:</span>
                <span className="text-emerald-400 font-medium">
                  {roomMeta?.hasAudio ? 'Live Audio Available' : 'Video Only'}
                </span>
              </div>
            </div>

            {/* PIN Entry if required */}
            {pinRequired && (
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Host PIN Required</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter 4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-center font-mono font-bold text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            )}

            {/* Privacy Notice */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                <strong>Privacy Guaranteed:</strong> WebRTC streaming is peer-to-peer. The viewer receives live screen frames and has zero access to the host's files, cameras, or keystrokes.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={handleJoin}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-bold text-white transition shadow-lg shadow-violet-600/30 cursor-pointer"
              >
                <Cast className="w-4 h-4" />
                <span>Join Screen Now</span>
              </button>
              <button
                onClick={onLeave}
                className="w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Stream Viewer
  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Landscape Orientation Advisory for Mobile */}
      {showRotateNotice && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-violet-950/40 border border-violet-800/50 text-xs text-violet-200">
          <div className="flex items-center gap-2">
            <RotateCw className="w-4 h-4 text-violet-400 animate-spin" />
            <span>Rotate your mobile phone to landscape for full screen clarity.</span>
          </div>
          <button
            onClick={() => setShowRotateNotice(false)}
            className="text-[11px] underline text-violet-300 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Autoplay Audio Blocked Banner */}
      {autoplayBlocked && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-xs text-amber-200 shadow-lg">
          <div className="flex items-center gap-2">
            <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Mobile browser blocked audio autoplay. Tap to enable live sound.</span>
          </div>
          <button
            onClick={handleUnmuteAutoplay}
            className="min-h-[38px] px-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition cursor-pointer shrink-0"
          >
            Unmute Audio
          </button>
        </div>
      )}

      {/* Primary Video Container */}
      <div
        ref={videoContainerRef}
        className={`relative rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'aspect-[16/9] sm:aspect-[21/9]'
        }`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full ${fitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
        />

        {/* Video Overlay Info */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-medium text-white border border-white/10">
            <span className={`w-2 h-2 rounded-full ${
              connectionState === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`} />
            <span className="capitalize">{connectionState}</span>
          </div>

          {hasReceivedAudio && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-medium text-emerald-400 border border-white/10">
              <Volume2 className="w-3 h-3" />
              <span>Audio Active</span>
            </div>
          )}
        </div>

        {/* Fullscreen Floating Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
            className="min-h-[36px] px-2.5 rounded-lg bg-black/70 hover:bg-black/90 text-white text-[11px] font-medium border border-white/10 backdrop-blur-md transition cursor-pointer"
          >
            {fitMode === 'contain' ? 'Fit Screen' : 'Fill Screen'}
          </button>
          <button
            onClick={handleToggleFullscreen}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-black/70 hover:bg-black/90 text-white border border-white/10 backdrop-blur-md transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Control Bar (Always persistent outside video) */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Audio Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleMute}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-amber-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4 text-violet-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-violet-400" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-24 sm:w-32 accent-violet-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="text-xs text-slate-400 font-mono tabular-nums w-8">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>

        {/* Diagnostic and Session Actions */}
        <div className="flex items-center gap-2">
          {connectionState !== 'connected' && (
            <button
              onClick={handleRestartIce}
              title="Reconnect WebRTC ICE"
              className="min-h-[44px] px-3 flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reconnect</span>
            </button>
          )}

          <button
            onClick={() => setIsStatsOpen(true)}
            className="min-h-[44px] px-3.5 flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
          >
            <Activity className="w-4 h-4 text-violet-400" />
            <span>Stream Stats</span>
          </button>

          <button
            onClick={handleLeave}
            className="min-h-[44px] px-4 flex items-center gap-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-xs font-semibold text-white transition cursor-pointer shadow-md shadow-red-600/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Session</span>
          </button>
        </div>
      </div>

      {/* Stream Stats Drawer */}
      <StatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={activeStats}
        role="viewer"
      />
    </div>
  );
};
