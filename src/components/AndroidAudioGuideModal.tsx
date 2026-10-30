/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Smartphone, ShieldCheck, Code, AlertCircle, Copy, Check } from 'lucide-react';

interface AndroidAudioGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidAudioGuideModal: React.FC<AndroidAudioGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const kotlinArchitectureCode = `// Android Native Companion Architecture (Kotlin / WebRTC)
// Requires Android 10 (API level 29) or higher

class ScreenAudioCaptureService : Service() {
    private var mediaProjection: MediaProjection? = null
    private var audioRecord: AudioRecord? = null
    private var isRecording = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // 1. Mandatory Android 14+ Foreground Service with MEDIA_PROJECTION type
        startForeground(
            NOTIFICATION_ID, 
            buildPersistentNotification(),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
        )

        val resultCode = intent?.getIntExtra("RESULT_CODE", Activity.RESULT_CANCELED) ?: return START_NOT_STICKY
        val data = intent.getParcelableExtra<Intent>("DATA") ?: return START_NOT_STICKY
        
        val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjection = projectionManager.getMediaProjection(resultCode, data)

        // 2. AudioPlaybackCaptureConfiguration (Captures internal game & media audio)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val audioConfig = AudioPlaybackCaptureConfiguration.Builder(mediaProjection!!)
                .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                .addMatchingUsage(AudioAttributes.USAGE_GAME)
                .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
                .build()

            val sampleRate = 48000
            val channelMask = AudioFormat.CHANNEL_IN_STEREO
            val encoding = AudioFormat.ENCODING_PCM_16BIT
            val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelMask, encoding)

            audioRecord = AudioRecord.Builder()
                .setAudioPlaybackCaptureConfig(audioConfig)
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(encoding)
                        .setSampleRate(sampleRate)
                        .setChannelMask(channelMask)
                        .build()
                )
                .setBufferSizeInBytes(minBufferSize * 2)
                .build()

            audioRecord?.startRecording()
            isRecording = true

            // 3. Pipe PCM frames directly into WebRTC Native AudioTrack
            thread(name = "AudioRecordWorker") {
                val buffer = ByteArray(minBufferSize)
                while (isRecording) {
                    val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (read > 0) {
                        // Stream bytes into WebRTC custom audio source or AudioTrack
                        webrtcAudioSource.onData(buffer, read)
                    }
                }
            }
        }
        return START_STICKY
    }
}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(kotlinArchitectureCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Android Screen & Audio Casting Architecture
              </h3>
              <p className="text-xs text-slate-400">
                Operating System Boundaries, Web Limitations & Native Solutions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close guide"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
          {/* Executive Summary */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              The Security Boundary on Android
            </h4>
            <p className="text-slate-300 mb-2">
              On Android, browsers run in an isolated app sandbox. While Google Chrome and Chromium browsers on Android support <code className="text-violet-300 bg-slate-900 px-1 py-0.5 rounded font-mono">navigator.mediaDevices.getDisplayMedia()</code> for live screen video capture, the Android OS <strong>strictly restricts web pages from intercepting system-wide internal audio</strong> from third-party apps.
            </p>
            <p className="text-slate-400 text-[11px]">
              This is a deliberate Android security rule to prevent web trackers or malicious websites from recording confidential VoIP calls, banking tones, and private notifications without explicit system confirmation.
            </p>
          </div>

          {/* Capability Comparison Matrix */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Capability Comparison: Web vs Native Companion
            </h4>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Media Capability</th>
                    <th className="py-2.5 px-3 font-semibold">Mr Nikku Web App</th>
                    <th className="py-2.5 px-3 font-semibold">Android Companion (Native)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
                  <tr>
                    <td className="py-2.5 px-3 text-white font-medium">Live Mobile Screen Video</td>
                    <td className="py-2.5 px-3 text-emerald-400">Supported (WebRTC)</td>
                    <td className="py-2.5 px-3 text-emerald-400">Supported (MediaProjection)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-white font-medium">Host Voice Commentary</td>
                    <td className="py-2.5 px-3 text-emerald-400">Supported (Mic Track)</td>
                    <td className="py-2.5 px-3 text-emerald-400">Supported (AudioRecord)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-white font-medium">Tab Audio (Desktop Chrome)</td>
                    <td className="py-2.5 px-3 text-emerald-400">Supported</td>
                    <td className="py-2.5 px-3 text-slate-400">N/A (Mobile Native)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-white font-medium">Internal System Audio (Games, Music)</td>
                    <td className="py-2.5 px-3 text-amber-400 font-medium">OS Restricted</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-medium">Supported (Android 10+ AudioPlaybackCapture)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Native Companion Implementation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-4 h-4 text-violet-400" />
                Native Companion Architecture (Android 10+)
              </h4>
              <button
                onClick={handleCopyCode}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {kotlinArchitectureCode}
            </pre>
          </div>

          {/* Privacy & Legal notice */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-violet-950/20 border border-violet-900/40 text-[11px] text-slate-300">
            <AlertCircle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <p>
              <strong>Content Protection & DRM:</strong> Apps with <code className="text-violet-300">FLAG_SECURE</code> (e.g. banking apps, Netflix) prevent screen and audio capture by operating system design. Mr Nikku respects user privacy and operating system sandboxes.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
