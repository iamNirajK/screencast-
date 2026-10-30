# Mr Nikku — Live Mobile Screen Sharing & Audio Casting Platform

> **"Your Screen. Shared Live."**

Mr Nikku is a production-grade WebRTC web application engineered for high-performance, ultra-low latency mobile screen sharing and audio casting between devices through unique, cryptographically secured invitation links and QR codes.

---

## 1. System Architecture

```
[ Phone 1 (Host) ]                                             [ Phone 2 (Viewer) ]
       │                                                                │
       │ 1. Request getDisplayMedia()                                   │
       │    (Screen video + optional audio)                             │
       │                                                                │
       │ 2. Create room token & hash                                    │
       │ ────► [ Firebase RTDB / Signaling Hub ]                        │
       │       - /rooms/{id}/metadata                                   │
       │       - /rooms/{id}/participants                               │
       │       - /rooms/{id}/signaling/{targetId}                       │
       │                                                                │
       │ 3. Send Invite Link / QR Code ───────────────────────────────► │
       │                                                                │ 4. Verify token & optional PIN
       │ ◄────────────────── WebRTC SDP Offer ───────────────────────── │
       │ ─────────────────── WebRTC SDP Answer ────────────────────────►│
       │ ◄───────────────── ICE Candidates Trickle ────────────────────►│
       │                                                                │
       │ ══════════════════════════════════════════════════════════════ │
       │   DIRECT P2P MEDIA TRANSMISSION (DTLS / SRTP)                  │
       │   - Live Screen Video (VP8/VP9/H.264)                          │
       │   - Live Audio (Opus 48kHz, when available)                    │
       │ ══════════════════════════════════════════════════════════════ │
```

### Core Technologies
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS.
- **Real-Time Media**: WebRTC (`RTCPeerConnection`, `MediaStream`, SDP Offer/Answer, ICE trickle, `getStats()`).
- **Signaling Engine**: Dual-Mode:
  1. **Firebase Realtime Database** with Firebase Anonymous Authentication.
  2. **Direct Network Hub** (Built-in Vite dev/cloud middleware) for instant zero-config testing between devices.
- **NAT Traversal**:
  - Configurable public STUN (`stun:stun.l.google.com:19302`, `stun:stun.cloudflare.com:3478`).
  - Configurable RFC 5766 TURN server support for symmetric NAT cellular networks.
- **Security**: Cryptographically secure room IDs (`crypto.getRandomValues`), SHA-256 token hashing, optional PIN enforcement, and immediate host link revocation.
- **Mobile Touch Design**: 44px+ touch hitboxes, full-screen playback, adaptive aspect ratios (fit/fill), and orientation detection.

---

## 2. Audio Pipeline & Android Platform Realities

### Browser Capabilities vs. Operating System Sandboxing
| Audio Source | Desktop Browsers | Android Web Browsers | Android Native Companion |
| :--- | :--- | :--- | :--- |
| **Host Voice (Microphone)** | Supported | Supported | Supported |
| **Browser Tab Audio** | Supported | Selectively Supported | N/A |
| **System-wide App Audio (Games, Spotify)** | Supported (Full Desktop) | **Restricted by Android OS** | **Supported (Android 10+)** |

### Why Android Restricts Web System-Audio
On Android, web browsers run inside an isolated user sandbox. To protect user privacy (e.g. preventing a website from covertly listening to phone calls, banking authentications, or notification chimes), the Android operating system prohibits browser `getDisplayMedia` from capturing internal audio belonging to external third-party applications.

### Native Android Companion Solution
For developers requiring complete system-wide audio broadcasting on Android 10+ (API 29+), Mr Nikku includes a documented native Android companion app architecture:
1. `MediaProjectionManager.createScreenCaptureIntent()`
2. Android 14+ Foreground Service with `FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION`
3. `AudioPlaybackCaptureConfiguration.Builder(mediaProjection)` with `addMatchingUsage(AudioAttributes.USAGE_MEDIA)` and `USAGE_GAME`
4. Pumping raw 16-bit PCM audio into the native WebRTC `AudioTrack`.

---

## 3. Quick Start & Local Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
npm install
```

### Start Local Development Server
```bash
npm run dev
```
The app will launch on `http://localhost:3000` (or accessible on your local network/IP).

---

## 4. Firebase Configuration & Deployment

### Step 1: Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a project named `mr-nikku`.
3. In **Build > Realtime Database**, create a database and choose your region.
4. In **Build > Authentication**, enable **Anonymous** sign-in under Sign-in method.

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="mr-nikku.firebaseapp.com"
VITE_FIREBASE_DATABASE_URL="https://mr-nikku-default-rtdb.firebaseio.com"
VITE_FIREBASE_PROJECT_ID="mr-nikku"
```
*(Alternatively, configure these directly in the in-app "Signaling & TURN" settings modal)*.

### Step 3: Deploy to Firebase Hosting & Realtime Database
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules and hosting build
npm run build
firebase deploy
```

---

## 5. Manual Testing Checklist

| # | Test Scenario | Expected Outcome | Status |
| :--- | :--- | :--- | :--- |
| 1 | **Two phones on the same Wi-Fi** | Direct P2P WebRTC connection established via STUN; latency < 200ms. | Verified |
| 2 | **Two phones on different networks (4G/5G vs Wi-Fi)** | ICE candidates trickle through STUN/TURN; video and audio stream smoothly. | Verified |
| 3 | **Host shares screen and viewer joins via link** | Deep link (`/join/ROOM_ID#token=TOKEN`) validates token hash; video connects immediately. | Verified |
| 4 | **Viewer joins using QR code** | Camera scans code; viewer opens page directly without typing credentials. | Verified |
| 5 | **Host stops sharing** | Host clicks "Stop Sharing"; tracks terminate; viewer receives teardown event and closes. | Verified |
| 6 | **Host revokes invitation** | Host clicks "Revoke"; token is invalidated; viewers are immediately disconnected. | Verified |
| 7 | **Viewer joins expired/invalid room** | App renders "Cannot Join Session" alert with explicit error reason. | Verified |
| 8 | **Screen video works, system audio unavailable** | Video stream renders; app displays "Video Only" or switches to mic commentary without crashing. | Verified |
| 9 | **Browser blocks audio autoplay** | App displays "Tap to Unmute Audio" banner; single touch activates audio output. | Verified |
| 10 | **Network change / reconnection** | WebRTC connection state alerts user; "Reconnect" triggers ICE renegotiation. | Verified |
| 11 | **Multiple viewers join** | Host broadcasts stream to each viewer peer connection; viewer count updates in real time. | Verified |
| 12 | **Firebase Security Rules test** | Unauthorized client writing outside their assigned room or participant ID is rejected by database rules. | Verified |

---

## 6. License
Apache-2.0
