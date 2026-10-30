/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Server, Database, Save, RotateCcw, Check, AlertCircle } from 'lucide-react';
import {
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  FirebaseConfig,
  initFirebase,
  testConnection
} from '../services/firebase';
import { getCustomIceServers, saveCustomIceServers } from '../services/webrtc';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const currentFirebase = getStoredFirebaseConfig();
  const [apiKey, setApiKey] = useState(currentFirebase?.apiKey || '');
  const [databaseURL, setDatabaseURL] = useState(currentFirebase?.databaseURL || '');
  const [projectId, setProjectId] = useState(currentFirebase?.projectId || '');
  const [authDomain, setAuthDomain] = useState(currentFirebase?.authDomain || '');

  // TURN settings
  const customIce = getCustomIceServers();
  const turnServer = customIce.find((s) => {
    const urls = Array.isArray(s.urls) ? s.urls[0] : s.urls;
    return urls.startsWith('turn:');
  });

  const [turnUrl, setTurnUrl] = useState(
    turnServer ? (Array.isArray(turnServer.urls) ? turnServer.urls[0] : turnServer.urls) : ''
  );
  const [turnUsername, setTurnUsername] = useState(turnServer?.username || '');
  const [turnCredential, setTurnCredential] = useState((turnServer?.credential as string) || '');

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTestFirebase = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const ok = await testConnection();
      if (ok) {
        setTestResult({
          success: true,
          message: 'Connected to Firebase Cloud Firestore successfully.',
        });
      } else {
        setTestResult({
          success: false,
          message: 'Connecting to Firestore... (Retrying)',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    // Save Firebase configuration
    if (apiKey && databaseURL && projectId) {
      saveFirebaseConfig({
        apiKey,
        databaseURL,
        projectId,
        authDomain: authDomain || `${projectId}.firebaseapp.com`,
      });
    } else {
      saveFirebaseConfig(null);
    }

    // Save TURN configuration
    const defaultStun: RTCIceServer[] = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      { urls: ['stun:stun.cloudflare.com:3478'] },
    ];

    if (turnUrl.trim()) {
      defaultStun.push({
        urls: turnUrl.trim(),
        username: turnUsername.trim() || undefined,
        credential: turnCredential.trim() || undefined,
      });
    }

    saveCustomIceServers(defaultStun);

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSaved?.();
      onClose();
    }, 1000);
  };

  const handleReset = () => {
    saveFirebaseConfig(null);
    saveCustomIceServers([
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      { urls: ['stun:stun.cloudflare.com:3478'] },
    ]);
    setApiKey('');
    setDatabaseURL('');
    setProjectId('');
    setAuthDomain('');
    setTurnUrl('');
    setTurnUsername('');
    setTurnCredential('');
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-violet-400" />
            <h3 className="text-base font-bold text-white">Signaling & Network Settings</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-xs text-slate-300">
          {/* Active Provider Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <Database className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-white block mb-0.5">
                Dual Signaling Pipeline
              </span>
              <p className="text-[11px] text-slate-400">
                Mr Nikku works instantly via the built-in network hub. For production deployment across isolated cellular carriers, connect your Firebase Realtime Database and custom TURN server below.
              </p>
            </div>
          </div>

          {/* Firebase RTDB Settings */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              Firebase Realtime Database (Optional)
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Database URL
                </label>
                <input
                  type="text"
                  placeholder="https://my-app-default-rtdb.firebaseio.com"
                  value={databaseURL}
                  onChange={(e) => setDatabaseURL(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Project ID
                  </label>
                  <input
                    type="text"
                    placeholder="my-project-id"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Auth Domain (Optional)
                </label>
                <input
                  type="text"
                  placeholder="my-project-id.firebaseapp.com"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTestFirebase}
                  disabled={testing}
                  className="min-h-[40px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>

                {testResult && (
                  <span
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      testResult.success ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {testResult.success ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* TURN / STUN Settings */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              TURN Server Relay (RFC 5766)
            </h4>
            <p className="text-[11px] text-slate-400 mb-3">
              STUN is enabled by default. Add a TURN relay to bypass symmetric NATs on strict carrier cellular networks.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  TURN Server URL
                </label>
                <input
                  type="text"
                  placeholder="turn:turn.example.com:3478?transport=udp"
                  value={turnUrl}
                  onChange={(e) => setTurnUrl(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="turn-user"
                    value={turnUsername}
                    onChange={(e) => setTurnUsername(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Credential
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={turnCredential}
                    onChange={(e) => setTurnCredential(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="min-h-[44px] px-3 flex items-center gap-1.5 rounded-xl text-slate-400 hover:text-white text-xs transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="min-h-[44px] px-5 flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition cursor-pointer shadow-md shadow-violet-600/20"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
