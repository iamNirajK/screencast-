/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, ShieldCheck } from 'lucide-react';
import { detectDeviceCapabilities } from '../services/audioDetector';

interface CapabilityCheckerProps {
  onLearnMoreAudio?: () => void;
}

export const CapabilityChecker: React.FC<CapabilityCheckerProps> = ({ onLearnMoreAudio }) => {
  const caps = detectDeviceCapabilities();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Browser & Hardware Compatibility</h3>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {caps.browserName} {caps.isAndroid ? '(Android)' : caps.isIOS ? '(iOS)' : '(Desktop)'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Screen Capture API */}
        <div className="rounded-xl bg-slate-950/60 p-3.5 border border-slate-800/60">
          <div className="flex items-center gap-2 mb-1.5">
            {caps.hasDisplayMedia ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="text-xs font-semibold text-slate-200">Screen Sharing</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {caps.isIframe
              ? 'Preview iframe detected. For native capture, open in standalone tab or use Interactive Stream.'
              : caps.hasDisplayMedia
              ? 'Supported natively via getDisplayMedia API.'
              : caps.isIOS
              ? 'iOS Safari restricts web screen capture. Recommended as Viewer device.'
              : 'Requires modern Chromium, Firefox, or Safari.'}
          </p>
        </div>

        {/* WebRTC P2P Engine */}
        <div className="rounded-xl bg-slate-950/60 p-3.5 border border-slate-800/60">
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200">WebRTC Engine</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Ultra-low latency peer-to-peer data & media transmission ready.
          </p>
        </div>

        {/* Audio Pipeline */}
        <div className="rounded-xl bg-slate-950/60 p-3.5 border border-slate-800/60">
          <div className="flex items-center gap-2 mb-1.5">
            {caps.isAndroid ? (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs font-semibold text-slate-200">Audio Casting</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {caps.isAndroid
              ? 'Android web browsers restrict system audio capture. Mic commentary is supported.'
              : 'Tab & system audio supported if provided during permission prompt.'}
          </p>
        </div>
      </div>

      {caps.isAndroid && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <p className="text-slate-400 text-[11px]">
            <strong className="text-slate-300">Android notice:</strong> System audio casting is governed by Android OS sandbox policies.
          </p>
          {onLearnMoreAudio && (
            <button
              onClick={onLearnMoreAudio}
              className="text-violet-400 hover:text-violet-300 font-medium text-[11px] underline underline-offset-2 shrink-0 cursor-pointer"
            >
              Learn how native companion bypasses this →
            </button>
          )}
        </div>
      )}
    </div>
  );
};
