/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2, Shield, Lock } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteUrl: string;
  roomId: string;
  pin?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  inviteUrl,
  roomId,
  pin,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my live screen on Mr Nikku',
          text: pin
            ? `Watch my mobile screen live on Mr Nikku. Room: ${roomId} (PIN: ${pin})`
            : `Watch my mobile screen live on Mr Nikku. Room: ${roomId}`,
          url: inviteUrl,
        });
      } catch (err) {
        console.warn('Share cancelled or failed:', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-center relative">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1">Scan to Join Live Stream</h3>
        <p className="text-xs text-slate-400 mb-6">
          Open the camera on Phone 2 or a tablet to instantly view this stream.
        </p>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto mb-5 border-4 border-slate-800">
          <QRCodeSVG
            value={inviteUrl}
            size={200}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Room & PIN metadata */}
        <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 mb-5 text-left text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>Room Code:</span>
            <span className="font-mono text-slate-200 font-semibold">{roomId}</span>
          </div>
          {pin ? (
            <div className="flex items-center justify-between text-amber-400 font-medium">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Room PIN:
              </span>
              <span className="font-mono text-white font-bold bg-amber-500/20 px-2 py-0.5 rounded">
                {pin}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Secured with high-entropy token</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-300" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold text-white transition cursor-pointer shadow-md shadow-violet-600/20"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Sheet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
