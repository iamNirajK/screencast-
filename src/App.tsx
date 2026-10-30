/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { HostDashboard } from './components/HostDashboard';
import { ViewerPage } from './components/ViewerPage';
import { SettingsModal } from './components/SettingsModal';
import { JoinModal } from './components/JoinModal';
import { AndroidAudioGuideModal } from './components/AndroidAudioGuideModal';
import { WifiOff } from 'lucide-react';

interface RouteState {
  view: 'landing' | 'host' | 'viewer';
  roomId?: string;
  token?: string;
  pin?: string;
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => parseInitialRoute());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isAudioGuideOpen, setIsAudioGuideOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Parse deep link from URL path (/join/:roomId#token=...) or query params
  function parseInitialRoute(): RouteState {
    if (typeof window === 'undefined') return { view: 'landing' };

    const pathname = window.location.pathname;
    const search = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(hash);

    const pathParts = pathname.split('/').filter(Boolean);

    let roomId = '';
    let token = search.get('token') || hashParams.get('token') || '';
    const pin = search.get('pin') || undefined;

    if (pathParts[0] === 'join' && pathParts[1]) {
      roomId = pathParts[1];
    } else if (search.get('room')) {
      roomId = search.get('room') || '';
    }

    if (roomId) {
      return {
        view: 'viewer',
        roomId,
        token,
        pin,
      };
    }

    return { view: 'landing' };
  }

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseInitialRoute());
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navigateTo = (newRoute: RouteState) => {
    setRoute(newRoute);
    if (newRoute.view === 'landing') {
      window.history.pushState({}, '', '/');
    } else if (newRoute.view === 'viewer' && newRoute.roomId) {
      const url = newRoute.token
        ? `/join/${newRoute.roomId}#token=${newRoute.token}`
        : `/join/${newRoute.roomId}`;
      window.history.pushState({}, '', url);
    } else if (newRoute.view === 'host') {
      window.history.pushState({}, '', '/host');
    }
  };

  const handleStartShare = () => {
    navigateTo({ view: 'host' });
  };

  const handleJoinFromModal = (roomId: string, token: string, pin?: string) => {
    setIsJoinOpen(false);
    navigateTo({
      view: 'viewer',
      roomId,
      token,
      pin,
    });
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col font-sans selection:bg-violet-600/30 selection:text-violet-200">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xl animate-bounce">
          <WifiOff className="w-4 h-4" />
          <span>Offline mode · Waiting for network reconnection</span>
        </div>
      )}

      {/* Global Header */}
      <Header
        currentView={route.view}
        onNavigateHome={() => navigateTo({ view: 'landing' })}
        onStartShare={handleStartShare}
        onJoinClick={() => setIsJoinOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAudioGuide={() => setIsAudioGuideOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {route.view === 'host' && (
          <HostDashboard
            onStop={() => navigateTo({ view: 'landing' })}
            onOpenAudioGuide={() => setIsAudioGuideOpen(true)}
          />
        )}

        {route.view === 'viewer' && route.roomId && (
          <ViewerPage
            roomId={route.roomId}
            token={route.token || ''}
            initialPin={route.pin}
            onLeave={() => navigateTo({ view: 'landing' })}
          />
        )}

        {route.view === 'landing' && (
          <LandingPage
            onStartShare={handleStartShare}
            onJoinClick={() => setIsJoinOpen(true)}
            onOpenAudioGuide={() => setIsAudioGuideOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

      {/* Global Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <JoinModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoin={handleJoinFromModal}
      />

      <AndroidAudioGuideModal
        isOpen={isAudioGuideOpen}
        onClose={() => setIsAudioGuideOpen(false)}
      />
    </div>
  );
}
