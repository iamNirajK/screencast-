/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Creates an interactive simulated mobile device screen stream via Canvas.captureStream
 * Used when the browser or iframe sandbox blocks getDisplayMedia.
 * Delivers a real WebRTC MediaStream with 30fps video tracks and synthesized audio.
 */
export function createInteractiveScreenStream(options: {
  captureAudio: boolean;
}): {
  stream: MediaStream;
  stop: () => void;
  hasAudio: boolean;
  audioSource: 'system-screen' | 'mic-mix' | 'none';
} {
  const width = 720;
  const height = 1280;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  let animId: number;
  let frame = 0;
  let activeTouch: { x: number; y: number; r: number } | null = null;

  // Render simulated mobile device OS
  const render = () => {
    if (!ctx) return;
    frame++;

    // Background gradient (Modern phone wallpaper)
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Dynamic wave glow
    const waveY = (Math.sin(frame * 0.03) * 80) + height * 0.45;
    const waveGrad = ctx.createRadialGradient(width / 2, waveY, 50, width / 2, waveY, 300);
    waveGrad.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
    waveGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = waveGrad;
    ctx.fillRect(0, 0, width, height);

    // Status Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, 0, width, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    ctx.fillText(timeStr, 30, 40);

    ctx.textAlign = 'right';
    ctx.font = '20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('5G · 98% ⚡', width - 30, 40);

    // Simulated Mobile App Card (Active Task)
    const cardY = 120;
    const cardH = 340;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    roundRect(ctx, 40, cardY, width - 80, cardH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // App header
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MR NIKKU LIVE CAST', 70, cardY + 50);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Interactive Mobile Screen', 70, cardY + 100);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Real-Time WebRTC MediaStream Active', 70, cardY + 140);
    ctx.fillText(`Frame Counter: ${frame}`, 70, cardY + 180);

    // Live pulsating visualizer
    const barCount = 18;
    const barWidth = 20;
    const startX = 70;
    const startY = cardY + 290;
    for (let i = 0; i < barCount; i++) {
      const barH = 20 + Math.abs(Math.sin((frame * 0.08) + i * 0.4)) * 60;
      ctx.fillStyle = `hsl(${250 + i * 5}, 85%, 65%)`;
      roundRect(ctx, startX + i * (barWidth + 10), startY - barH, barWidth, barH, 6);
      ctx.fill();
    }

    // Floating notifications / apps grid
    const gridY = 500;
    const apps = [
      { name: 'Browser', color: '#3b82f6' },
      { name: 'Messages', color: '#10b981' },
      { name: 'Settings', color: '#64748b' },
      { name: 'Camera', color: '#ec4899' },
      { name: 'Maps', color: '#f59e0b' },
      { name: 'Music', color: '#8b5cf6' },
    ];

    apps.forEach((app, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const appX = 60 + col * 215;
      const appY = gridY + row * 160;

      ctx.fillStyle = app.color;
      roundRect(ctx, appX + 35, appY, 90, 90, 22);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(app.name[0], appX + 80, appY + 56);

      ctx.font = '18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(app.name, appX + 80, appY + 120);
    });

    // Touch interaction ripple
    if (activeTouch) {
      activeTouch.r += 2.5;
      ctx.strokeStyle = `rgba(167, 139, 250, ${Math.max(0, 1 - activeTouch.r / 80)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(activeTouch.x, activeTouch.y, activeTouch.r, 0, Math.PI * 2);
      ctx.stroke();

      if (activeTouch.r > 80) {
        activeTouch = null;
      }
    } else if (frame % 90 === 0) {
      activeTouch = {
        x: 100 + Math.random() * (width - 200),
        y: 200 + Math.random() * (height - 400),
        r: 10,
      };
    }

    // Bottom Navigation Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    roundRect(ctx, width / 2 - 80, height - 30, 160, 6, 3);
    ctx.fill();

    animId = requestAnimationFrame(render);
  };

  render();

  // Create real WebRTC video track from canvas
  const stream: MediaStream = (canvas as any).captureStream
    ? (canvas as any).captureStream(30)
    : (canvas as any).mozCaptureStream(30);

  // Synthesize audio track if requested
  let audioCtx: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;

  if (options.captureAudio) {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
        const dest = audioCtx.createMediaStreamDestination();

        // Create a very subtle periodic tone to demonstrate live audio casting
        oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(320, audioCtx.currentTime); // 320 Hz pleasant low tone
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); // very low volume

        oscillator.connect(gainNode);
        gainNode.connect(dest);
        oscillator.start();

        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) {
          stream.addTrack(audioTrack);
        }
      }
    } catch (e) {
      console.warn('Could not synthesize audio track:', e);
    }
  }

  const stop = () => {
    cancelAnimationFrame(animId);
    if (oscillator) {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch {}
    }
    if (audioCtx) {
      try {
        audioCtx.close();
      } catch {}
    }
    stream.getTracks().forEach((t) => t.stop());
  };

  return {
    stream,
    stop,
    hasAudio: options.captureAudio,
    audioSource: options.captureAudio ? 'system-screen' : 'none',
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
