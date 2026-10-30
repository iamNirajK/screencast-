/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Cast,
  StopCircle,
  Copy,
  Check,
  Share2,
  QrCode,
  Volume2,
  VolumeX,
  Users,
  Activity,
  AlertTriangle,
  ShieldCheck,
  KeyRound,
  Trash2,
  Info,
  ExternalLink,
  Play
} from 'lucide-react';
import { SignalingService } from '../services/signaling';
import { HostWebRTCManager } from '../services/webrtc';
import { requestScreenMedia, detectDeviceCapabilities } from '../services/audioDetector';
import { generateRoomId, generateAccessToken, generateParticipantId } from '../utils/crypto';
import { WebRTCStats, ScreenShareStatus } from '../types/webrtc';
import { QRCodeModal } from './QRCodeModal';
import { StatsDrawer } from './StatsDrawer';

interface HostDashboardProps {
  onStop: () => void;
  onOpenAudioGuide: () => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  onStop,
  onOpenAudioGuide,
}) => {
  const [status, setStatus] = useState<ScreenShareStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIframeSandboxError, setIsIframeSandboxError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Audio configuration
  const [requestAudio, setRequestAudio] = useState(true);
  const [includeMicCommentary, setIncludeMicCommentary] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const [audioSource, setAudioSource] = useState<'system-screen' | 'mic-mix' | 'none'>('none');
  const [isInteractiveStream, setIsInteractiveStream] = useState(false);

  // Security configuration
  const [usePin, setUsePin] = useState(false);
  const [pinCode, setPinCode] = useState('1234');

  // Session state
  const [roomId, setRoomId] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [activeStats, setActiveStats] = useState<WebRTCStats | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopFallbackRef = useRef<(() => void) | null>(null);
  const signalingRef = useRef<SignalingService | null>(null);
  const hostManagerRef = useRef<HostWebRTCManager | null>(null);

  const caps = detectDeviceCapabilities();

  const inviteUrl = roomId && accessToken
    ? `${window.location.origin}/join/${roomId}#token=${accessToken}`
    : '';

  // Start screen capture workflow
  const startSharing = async (forceInteractive = false) => {
    setErrorMessage(null);
    setIsIframeSandboxError(false);
    setStatus('requesting-permission');

    try {
      // 1. Request display media or interactive stream
      const mediaResult = await requestScreenMedia({
        captureAudio: requestAudio,
        includeMicFallback: includeMicCommentary,
        forceInteractive,
      });

      const stream = mediaResult.stream;
      streamRef.current = stream;
      if (mediaResult.stopFallback) {
        stopFallbackRef.current = mediaResult.stopFallback;
      }
      setIsInteractiveStream(!!mediaResult.isInteractiveFallback);
      setHasAudioTrack(mediaResult.hasAudio);
      setAudioSource(mediaResult.audioSource);

      // Handle user stopping screen share from browser native bar
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopSharing();
        };
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 2. Generate secure tokens
      const newRoomId = generateRoomId();
      const newToken = generateAccessToken();
      const hostId = generateParticipantId('host');

      setRoomId(newRoomId);
      setAccessToken(newToken);

      // 3. Initialize signaling
      const signaling = new SignalingService(newRoomId, hostId, 'host');
      signalingRef.current = signaling;

      await signaling.createRoom({
        accessToken: newToken,
        pin: usePin ? pinCode : undefined,
        hasAudio: mediaResult.hasAudio,
        audioSource: mediaResult.audioSource,
      });

      // 4. Initialize WebRTC Manager
      const hostManager = new HostWebRTCManager(signaling, stream);
      hostManagerRef.current = hostManager;

      hostManager.setCallbacks({
        onStats: (_, stats) => setActiveStats(stats),
        onConnectionStateChange: () => {},
      });

      // 5. Presence listener
      signaling.onViewerCount((count) => {
        setViewerCount(count);
      });

      setStatus('sharing');
    } catch (err: any) {
      console.warn('Failed to start screen share:', err);
      const isNotSupported =
        err.message?.includes('not supported') ||
        err.name === 'NotSupportedError' ||
        err.name === 'SecurityError' ||
        caps.isIframe;

      if (isNotSupported) {
        setIsIframeSandboxError(true);
        setErrorMessage(
          'Native screen capture (getDisplayMedia) is restricted by this browser or embedded iframe sandbox.'
        );
      } else if (err.name === 'NotAllowedError') {
        setErrorMessage('Screen capture permission was cancelled or denied by user.');
      } else if (err.name === 'NotFoundError') {
        setErrorMessage('No screen capture source found on this device.');
      } else {
        setErrorMessage(err.message || 'Unable to initiate screen sharing.');
      }
      setStatus('error');
    }
  };

  const stopSharing = async () => {
    if (stopFallbackRef.current) {
      stopFallbackRef.current();
      stopFallbackRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (hostManagerRef.current) {
      hostManagerRef.current.destroy();
      hostManagerRef.current = null;
    }
    if (signalingRef.current) {
      await signalingRef.current.leave();
      signalingRef.current = null;
    }
    setStatus('idle');
    setViewerCount(0);
    setActiveStats(null);
    onStop();
  };

  const handleRevoke = async () => {
    if (window.confirm('Are you sure you want to revoke this invitation? All connected viewers will be disconnected immediately.')) {
      if (signalingRef.current) {
        await signalingRef.current.revokeRoom();
      }
      stopSharing();
    }
  };

  const handleToggleAudio = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    hostManagerRef.current?.setAudioMuted(next);
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy link error:', err);
    }
  };

  const handleShareSheet = async () => {
    if (navigator.share && inviteUrl) {
      try {
        await navigator.share({
          title: 'Mr Nikku Live Screen',
          text: usePin
            ? `Watch my screen live on Mr Nikku! Room: ${roomId} (PIN: ${pinCode})`
            : `Watch my screen live on Mr Nikku! Room: ${roomId}`,
          url: inviteUrl,
        });
      } catch {
        // cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  useEffect(() => {
    return () => {
      stopFallbackRef.current?.();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      hostManagerRef.current?.destroy();
      signalingRef.current?.cleanup();
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${
            status === 'sharing'
              ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse'
              : status === 'requesting-permission'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-slate-600'
          }`} />
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Host Console</span>
              {status === 'sharing' && (
                <span className="text-[11px] font-normal text-emerald-400 font-mono">
                  · {isInteractiveStream ? 'Interactive Stream Active' : 'Live Screen Transmitting'}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              {status === 'sharing'
                ? `Broadcasting to ${viewerCount} active viewer${viewerCount === 1 ? '' : 's'}`
                : status === 'requesting-permission'
                ? 'Waiting for screen capture authorization...'
                : 'Configure settings and launch live stream'}
            </p>
          </div>
        </div>

        {status === 'sharing' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsStatsOpen(true)}
              className="min-h-[44px] flex-1 sm:flex-none px-3.5 py-1.5 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              <Activity className="w-4 h-4 text-violet-400" />
              <span>Stats</span>
            </button>
            <button
              onClick={stopSharing}
              className="min-h-[44px] flex-1 sm:flex-none px-4 py-1.5 flex items-center justify-center gap-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-xs font-semibold text-white transition cursor-pointer shadow-md shadow-red-600/20"
            >
              <StopCircle className="w-4 h-4" />
              <span>Stop Sharing</span>
            </button>
          </div>
        )}
      </div>

      {/* Actionable Error Card */}
      {errorMessage && (
        <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-800/60 space-y-3.5 text-xs text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-semibold text-amber-300 text-sm">
                Screen Capture Notice
              </strong>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          </div>

          {/* Solutions if restricted in iframe or unsupported browser */}
          {isIframeSandboxError && (
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-slate-300">
              <p className="text-[11px] text-slate-400">
                Browsers enforce strict security policies restricting display capture inside embedded preview frames. Choose an option below to proceed:
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  onClick={() => startSharing(true)}
                  className="min-h-[40px] px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer shadow-md shadow-violet-600/20"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Interactive Screen Stream</span>
                </button>

                <a
                  href="/host"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Open Standalone Tab for Native Capture</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main View Area */}
      {status === 'sharing' ? (
        <div className="space-y-6">
          {/* Active Screen Video Stream */}
          <div className="relative rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl aspect-[16/9] sm:aspect-[21/9] flex items-center justify-center group">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted // Never unmute host preview to prevent audio feedback loop
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-medium text-white border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isInteractiveStream ? 'Interactive Stream' : 'Transmitting Live'}</span>
            </div>

            {hasAudioTrack && (
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  onClick={handleToggleAudio}
                  className={`min-h-[40px] px-3 flex items-center gap-1.5 rounded-lg text-xs font-medium backdrop-blur-md transition cursor-pointer ${
                    audioMuted
                      ? 'bg-amber-600/80 text-white'
                      : 'bg-black/70 text-emerald-400 border border-white/10'
                  }`}
                >
                  {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{audioMuted ? 'Audio Muted' : 'Audio On'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Invitation & Sharing Card */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-violet-400" />
                  <span>Secure Invitation Link</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Send this link to Phone 2 or scan the QR code to watch the live WebRTC stream.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsQrOpen(true)}
                  className="min-h-[44px] px-3.5 flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-violet-400" />
                  <span>Show QR Code</span>
                </button>
                <button
                  onClick={handleShareSheet}
                  className="min-h-[44px] px-3.5 flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition cursor-pointer shadow-md shadow-violet-600/20"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Sheet</span>
                </button>
              </div>
            </div>

            {/* URL Display and Copy */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="min-h-[44px] min-w-[100px] px-4 flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-300" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Room Credentials and Revoke Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs">
              <div className="flex items-center gap-4 text-slate-400">
                <span>Room: <strong className="text-white font-mono">{roomId}</strong></span>
                {usePin && (
                  <span>PIN: <strong className="text-amber-400 font-mono">{pinCode}</strong></span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-violet-400" />
                  <strong className="text-white font-mono tabular-nums">{viewerCount}</strong> viewers
                </span>
              </div>

              <button
                onClick={handleRevoke}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revoke Invitation</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Pre-Share Configuration Card */
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Start a Screen Sharing Session</h3>
            <p className="text-xs text-slate-400">
              Share your mobile or desktop screen in real-time with another phone via WebRTC.
            </p>
          </div>

          {/* Iframe notice if detected */}
          {caps.isIframe && (
            <div className="p-3.5 rounded-2xl bg-violet-950/30 border border-violet-800/40 text-xs text-violet-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Preview iframe detected. Use Interactive Stream here, or open in standalone tab for full device capture.</span>
              </div>
              <a
                href="/host"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-400 hover:text-white underline whitespace-nowrap shrink-0 flex items-center gap-1"
              >
                <span>Standalone Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Audio Options Selection */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-white">Audio Casting Pipeline</span>
              </div>
              <button
                onClick={onOpenAudioGuide}
                className="text-[11px] text-violet-400 hover:text-violet-300 underline underline-offset-2 cursor-pointer flex items-center gap-1"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Android Limitations Guide</span>
              </button>
            </div>

            <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-900/60 cursor-pointer transition">
              <input
                type="checkbox"
                checked={requestAudio}
                onChange={(e) => setRequestAudio(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-violet-600 focus:ring-violet-500"
              />
              <div className="text-xs">
                <span className="font-medium text-slate-200 block">Capture Screen / System Audio</span>
                <span className="text-[11px] text-slate-400 block">
                  Asks browser for internal audio. Works for desktop tabs & supported media.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-900/60 cursor-pointer transition">
              <input
                type="checkbox"
                checked={includeMicCommentary}
                onChange={(e) => setIncludeMicCommentary(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-violet-600 focus:ring-violet-500"
              />
              <div className="text-xs">
                <span className="font-medium text-slate-200 block">Include Host Microphone Commentary</span>
                <span className="text-[11px] text-slate-400 block">
                  Recommended for mobile Android hosts to speak while demonstrating mobile apps.
                </span>
              </div>
            </label>
          </div>

          {/* Optional PIN Protection */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">Room PIN Protection</span>
              </div>
              <input
                type="checkbox"
                checked={usePin}
                onChange={(e) => setUsePin(e.target.checked)}
                className="rounded border-slate-700 text-violet-600 focus:ring-violet-500"
              />
            </div>
            {usePin && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Required 4-digit PIN for Viewers
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-32 min-h-[40px] px-3 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono font-bold text-center text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            )}
          </div>

          {/* Launch Buttons: Native vs Interactive Fallback */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => startSharing(false)}
              disabled={status === 'requesting-permission'}
              className="min-h-[50px] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-bold text-white transition active:scale-[0.99] shadow-lg shadow-violet-600/30 cursor-pointer"
            >
              <Cast className="w-5 h-5" />
              <span>{status === 'requesting-permission' ? 'Requesting Permission...' : 'Share Device Screen'}</span>
            </button>

            <button
              onClick={() => startSharing(true)}
              disabled={status === 'requesting-permission'}
              className="min-h-[50px] flex items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-semibold text-slate-200 transition active:scale-[0.99] cursor-pointer"
            >
              <Play className="w-4 h-4 text-violet-400" />
              <span>Interactive Screen Stream</span>
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        inviteUrl={inviteUrl}
        roomId={roomId}
        pin={usePin ? pinCode : undefined}
      />

      {/* Stats Drawer */}
      <StatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={activeStats}
        role="host"
      />
    </div>
  );
};
