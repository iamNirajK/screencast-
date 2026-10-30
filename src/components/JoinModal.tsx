/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ArrowRight, Link as LinkIcon, KeyRound, AlertCircle } from 'lucide-react';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (roomId: string, token: string, pin?: string) => void;
}

export const JoinModal: React.FC<JoinModalProps> = ({
  isOpen,
  onClose,
  onJoin,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [pinVal, setPinVal] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = inputVal.trim();
    if (!trimmed) {
      setError('Please enter a room code or paste an invitation link.');
      return;
    }

    try {
      // Check if user pasted a full URL
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const url = new URL(trimmed);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // Expecting /join/:roomId or ?room=:roomId
        let roomId = '';
        if (pathParts[0] === 'join' && pathParts[1]) {
          roomId = pathParts[1];
        } else {
          roomId = url.searchParams.get('room') || '';
        }

        // Token from hash or query
        let token = url.searchParams.get('token') || '';
        if (url.hash) {
          const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
          token = hashParams.get('token') || token;
        }

        if (!roomId) {
          setError('Could not find a valid room identifier in the link.');
          return;
        }

        onJoin(roomId, token, pinVal.trim() || undefined);
        return;
      }

      // Plain room ID entered
      onJoin(trimmed, '', pinVal.trim() || undefined);
    } catch {
      setError('Invalid link format. Please check and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-violet-400" />
            <h3 className="text-base font-bold text-white">Join a Shared Screen</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Invitation Link or Room Code
            </label>
            <input
              type="text"
              placeholder="Paste link or type mrn-xxxx-xxxx"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              Room PIN (If required by host)
            </label>
            <input
              type="text"
              placeholder="e.g. 1234"
              value={pinVal}
              onChange={(e) => setPinVal(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold text-white transition cursor-pointer shadow-md shadow-violet-600/25"
            >
              <span>Connect</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
