/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Activity, Wifi, ShieldAlert, Cpu } from 'lucide-react';
import { WebRTCStats } from '../types/webrtc';

interface StatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: WebRTCStats | null;
  role: 'host' | 'viewer';
}

export const StatsDrawer: React.FC<StatsDrawerProps> = ({
  isOpen,
  onClose,
  stats,
  role,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" />
            <h3 className="text-base font-bold text-white">
              Live WebRTC Stream Diagnostics
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close diagnostics"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {stats ? (
          <div className="space-y-3.5">
            {/* Grid of stats */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-0.5">Bitrate</span>
                <span className="text-lg font-bold text-white font-mono tabular-nums">
                  {stats.bitrateKbps} <span className="text-xs font-normal text-slate-400">kbps</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-0.5">Framerate</span>
                <span className="text-lg font-bold text-white font-mono tabular-nums">
                  {stats.framesPerSecond || 0} <span className="text-xs font-normal text-slate-400">fps</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-0.5">Stream Resolution</span>
                <span className="text-sm font-bold text-white font-mono tabular-nums">
                  {stats.frameWidth && stats.frameHeight
                    ? `${stats.frameWidth} × ${stats.frameHeight}`
                    : 'Awaiting keyframe'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-0.5">Packet Loss</span>
                <span className={`text-sm font-bold font-mono tabular-nums ${
                  stats.packetLossRate > 3 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {stats.packetLossRate}% ({stats.packetsLost} pkts)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  {role === 'host' ? 'Round Trip Latency' : 'Network Jitter'}
                </span>
                <span className="text-sm font-bold text-white font-mono tabular-nums">
                  {role === 'host'
                    ? `${stats.roundTripTimeMs || 0} ms`
                    : `${stats.jitterMs || 0} ms`}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-0.5">ICE Transport</span>
                <span className="text-xs font-semibold text-slate-200 capitalize font-mono">
                  {stats.candidateType || 'direct'}
                </span>
              </div>
            </div>

            {/* Connection States */}
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-violet-400" /> Peer State:
              </span>
              <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
                {stats.connectionState}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
            <p>Negotiating WebRTC peer connection and collecting telemetry...</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
