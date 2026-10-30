/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createInteractiveScreenStream } from './screenStreamGenerator';

export interface DeviceCapability {
  hasMediaDevices: boolean;
  hasDisplayMedia: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isMobile: boolean;
  isIframe: boolean;
  browserName: string;
  secureContext: boolean;
  systemAudioSupportNotes: string;
  recommendedAudioOption: 'system' | 'mic-commentary' | 'none';
}

export function detectDeviceCapabilities(): DeviceCapability {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isAndroid = /android/.test(ua);
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isMobile = isAndroid || isIOS || /mobile/.test(ua);
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  let browserName = 'Unknown Browser';
  if (/edg/.test(ua)) browserName = 'Microsoft Edge';
  else if (/chrome|crios/.test(ua)) browserName = 'Google Chrome';
  else if (/firefox|fxios/.test(ua)) browserName = 'Mozilla Firefox';
  else if (/safari/.test(ua) && !/chrome/.test(ua)) browserName = 'Apple Safari';
  else if (/samsungbrowser/.test(ua)) browserName = 'Samsung Internet';

  const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  const hasDisplayMedia = hasMediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function';
  const secureContext = typeof window !== 'undefined' && window.isSecureContext === true;

  let systemAudioSupportNotes = '';
  let recommendedAudioOption: 'system' | 'mic-commentary' | 'none' = 'system';

  if (isAndroid) {
    systemAudioSupportNotes = 
      'Android mobile browsers support live screen video sharing, but system-wide audio capture is restricted by Android OS sandbox policy. To cast internal device audio, Android 10+ requires a native MediaProjection companion app.';
    recommendedAudioOption = 'mic-commentary';
  } else if (isIOS) {
    systemAudioSupportNotes = 
      'iOS Safari restricts web screen capture. Recommended as Viewer device or use Interactive Screen mode.';
    recommendedAudioOption = 'none';
  } else {
    systemAudioSupportNotes = 
      'Desktop browsers (Chrome, Edge) support full tab and system audio capture alongside screen sharing.';
    recommendedAudioOption = 'system';
  }

  return {
    hasMediaDevices,
    hasDisplayMedia,
    isAndroid,
    isIOS,
    isMobile,
    isIframe,
    browserName,
    secureContext,
    systemAudioSupportNotes,
    recommendedAudioOption,
  };
}

/**
 * Request display media stream with requested audio configurations
 */
export async function requestScreenMedia(options: {
  captureAudio: boolean;
  includeMicFallback?: boolean;
  forceInteractive?: boolean;
}): Promise<{
  stream: MediaStream;
  hasAudio: boolean;
  audioSource: 'system-screen' | 'mic-mix' | 'none';
  isInteractiveFallback?: boolean;
  stopFallback?: () => void;
}> {
  // If user explicitly chose interactive mode or if running where getDisplayMedia is impossible
  if (options.forceInteractive) {
    const res = createInteractiveScreenStream({ captureAudio: options.captureAudio });
    return {
      stream: res.stream,
      hasAudio: res.hasAudio,
      audioSource: res.audioSource,
      isInteractiveFallback: true,
      stopFallback: res.stop,
    };
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('Screen capture (getDisplayMedia) is not supported in this browser or environment.');
  }

  const displayConstraints: DisplayMediaStreamOptions = {
    video: {
      displaySurface: 'monitor',
      frameRate: { ideal: 30, max: 60 },
      width: { ideal: 1920, max: 2560 },
      height: { ideal: 1080, max: 1440 },
    },
    audio: options.captureAudio
      ? {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      : false,
  };

  const stream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);
  const audioTracks = stream.getAudioTracks();

  if (audioTracks.length > 0) {
    return {
      stream,
      hasAudio: true,
      audioSource: 'system-screen',
    };
  }

  // If host wants audio commentary but system audio is not returned (e.g. mobile Android browser)
  if (options.includeMicFallback && navigator.mediaDevices.getUserMedia) {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const micTrack = micStream.getAudioTracks()[0];
      if (micTrack) {
        stream.addTrack(micTrack);
        return {
          stream,
          hasAudio: true,
          audioSource: 'mic-mix',
        };
      }
    } catch (micErr) {
      console.warn('Microphone fallback audio permission denied or unavailable:', micErr);
    }
  }

  return {
    stream,
    hasAudio: false,
    audioSource: 'none',
  };
}
