/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cast, Settings, HelpCircle, Smartphone } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenAudioGuide: () => void;
  onStartShare: () => void;
  onJoinClick: () => void;
  currentView: 'landing' | 'host' | 'viewer';
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenAudioGuide,
  onStartShare,
  onJoinClick,
  currentView,
  onNavigateHome,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090a0f]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-slate-100 hover:text-white transition-colors cursor-pointer text-left whitespace-nowrap shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
            <Cast className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Mr Nikku
          </span>
        </button>

        {/* Zone 2: 4-5 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={onNavigateHome}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={onOpenAudioGuide}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5 text-violet-400" />
            Android Audio Guide
          </button>
          <button
            onClick={onJoinClick}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Join Screen
          </button>
          <button
            onClick={onOpenSettings}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            Signaling & TURN
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSettings}
            title="Settings & Signaling"
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>

          {currentView === 'landing' ? (
            <button
              onClick={onStartShare}
              className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all shadow-md shadow-violet-600/25 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
            >
              <Cast className="w-4 h-4" />
              Share My Screen
            </button>
          ) : (
            <button
              onClick={onNavigateHome}
              className="min-h-[44px] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Exit to Home
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
