/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Cast,
  ArrowRight,
  Shield,
  Zap,
  Smartphone,
  Lock,
  Volume2,
  QrCode,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { CapabilityChecker } from './CapabilityChecker';
import { PWAInstallButton } from './PWAInstallButton';

interface LandingPageProps {
  onStartShare: () => void;
  onJoinClick: () => void;
  onOpenAudioGuide: () => void;
  onOpenSettings: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartShare,
  onJoinClick,
  onOpenAudioGuide,
  onOpenSettings,
}) => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14 space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/50 border border-violet-800/40 text-violet-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Peer-to-Peer WebRTC Mobile Streaming</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Your Screen.{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
            Shared Live.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Broadcast your mobile screen and audio directly to another phone or tablet in real time. Powered by secure WebRTC peer connections and zero cloud recording.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onStartShare}
            className="w-full sm:w-auto min-h-[50px] px-7 flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-bold text-white transition active:scale-[0.98] shadow-lg shadow-violet-600/30 cursor-pointer"
          >
            <Cast className="w-4 h-4" />
            <span>Share My Screen</span>
          </button>

          <button
            onClick={onJoinClick}
            className="w-full sm:w-auto min-h-[50px] px-6 flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-semibold text-slate-200 transition active:scale-[0.98] cursor-pointer"
          >
            <span>Join a Shared Screen</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>

          <div className="sm:hidden pt-2">
            <PWAInstallButton />
          </div>
        </div>
      </div>

      {/* Hardware & Browser Compatibility Module */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Current Device Diagnostics
          </h2>
          <PWAInstallButton />
        </div>
        <CapabilityChecker onLearnMoreAudio={onOpenAudioGuide} />
      </section>

      {/* Workflow: How It Works */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">How Mr Nikku Works</h2>
          <p className="text-xs text-slate-400">
            A seamless three-step handoff between Phone 1 and Phone 2.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h3 className="text-sm font-bold text-white">Grant Screen Capture</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tap Share Screen. Your mobile operating system will prompt you to confirm live screen capture.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h3 className="text-sm font-bold text-white">Send Instant Invitation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mr Nikku generates a cryptographically signed link and QR code. Share via WhatsApp, SMS, or camera scan.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600/20 text-sky-400 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h3 className="text-sm font-bold text-white">Direct WebRTC Stream</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Phone 2 opens the link and connects via low-latency peer-to-peer WebRTC without intermediate server recording.
            </p>
          </div>
        </div>
      </section>

      {/* Core Architectural Highlights */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h4 className="text-xs font-bold text-white">Real WebRTC Latency</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Direct UDP transport with adaptive bitrate. Zero simulated screenshot polling.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <Lock className="w-5 h-5 text-violet-400" />
          <h4 className="text-xs font-bold text-white">High-Entropy Tokens</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Every room requires token hashing and optional PIN verification before joining.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <Volume2 className="w-5 h-5 text-emerald-400" />
          <h4 className="text-xs font-bold text-white">Capability-Aware Audio</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Transmits screen audio when supported by browser, plus microphone commentary fallback.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <Shield className="w-5 h-5 text-sky-400" />
          <h4 className="text-xs font-bold text-white">Immediate Revocation</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The host retains complete sovereignty. Terminate or revoke access in a single tap.
          </p>
        </div>
      </section>

      {/* Audio Casting Limitations & Companion Guide Callout */}
      <section className="p-6 rounded-3xl bg-gradient-to-r from-violet-950/30 via-slate-900 to-indigo-950/30 border border-violet-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold">
            <Smartphone className="w-4 h-4" />
            <span>Android Audio Casting Architecture</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Need System Audio from Games or Third-Party Android Apps?
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Learn why the Android OS sandbox restricts browser audio capture from other applications, and how our companion Kotlin MediaProjection architecture achieves complete system-audio casting.
          </p>
        </div>

        <button
          onClick={onOpenAudioGuide}
          className="min-h-[44px] px-5 flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition cursor-pointer shadow-md shadow-violet-600/20 shrink-0"
        >
          <span>Read Technical Guide</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Troubleshooting & FAQ */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1.5">
            <h4 className="font-semibold text-white">Does the viewer need to install an app?</h4>
            <p className="text-slate-400 leading-relaxed">
              No. The viewer simply opens the invitation link in Chrome, Safari, Firefox, or Edge on Android, iOS, or PC.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1.5">
            <h4 className="font-semibold text-white">Are stream videos stored in the cloud?</h4>
            <p className="text-slate-400 leading-relaxed">
              Never. Streams are transmitted strictly peer-to-peer using WebRTC DTLS/SRTP encryption directly between Phone 1 and Phone 2.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1.5">
            <h4 className="font-semibold text-white">What happens if the cellular network changes?</h4>
            <p className="text-slate-400 leading-relaxed">
              Mr Nikku includes automated ICE candidate trickle and reconnect capabilities. If the connection drops, tap Reconnect in the viewer control bar.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1.5">
            <h4 className="font-semibold text-white">How do I configure my own Firebase RTDB or TURN?</h4>
            <p className="text-slate-400 leading-relaxed">
              Click Signaling & TURN in the top navigation or footer to enter your custom Firebase project keys and TURN server credentials.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-violet-600/30 text-violet-400 flex items-center justify-center text-[10px] font-bold">
            N
          </div>
          <span className="font-semibold text-slate-400">Mr Nikku</span>
          <span>·</span>
          <span>Live Mobile Screen Sharing & Audio Casting</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onOpenAudioGuide}
            className="hover:text-slate-300 transition cursor-pointer"
          >
            Audio Guide
          </button>
          <button
            onClick={onOpenSettings}
            className="hover:text-slate-300 transition cursor-pointer"
          >
            Signaling Settings
          </button>
        </div>
      </footer>
    </div>
  );
};
