# ⚔️ Kurukshetra: The Battleground of Minds

![Kurukshetra Preview](https://img.shields.io/badge/React_Native-Expo-blue?logo=react)
![Firebase](https://img.shields.io/badge/Firebase-Backend-FFCA28?logo=firebase)
![Agora](https://img.shields.io/badge/Agora-WebRTC-0096E6?logo=agora)
![Claude AI](https://img.shields.io/badge/Anthropic-Claude_3-D97757?logo=anthropic)

**Kurukshetra** is a real-time, 1v1 video debate application where intellect meets the arena. It’s not just a forum—it's a high-stakes esports environment for debates. Users can bet virtual coins, challenge opponents via real-time video, and have their final arguments evaluated and judged by an **Impartial AI Judge (Claude 3)**.

---

## 🚀 Features

- **🎮 Virtual Economy & Betting**: Start with a signup bonus of 500 coins. Put your coins on the line in 1v1 debates. Winner takes the prize pool!
- **⚡ Real-time Matchmaking**: Select a topic (Tech, Philosophy, Politics, etc.), write a custom headline, and get instantly matched with an opponent waiting in the lobby.
- **🎥 WebRTC Video Arena**: Powered by **Agora SDK**, debaters face off in a 3-round live video call with a synced 10-second (or custom) timer per round.
- **🤖 The AI Judge**: At the end of the video rounds, players type their "Final Punch." These arguments are sent to the **Anthropic Claude API**, which scores the debate on logic and facts, declaring a fair winner and reasoning!
- **👁️ Live Spectator Mode**: Others can browse live debates on the Home screen, join as a video spectator (Audience), chat in real-time, and vote for their favorite player to earn coins.
- **🏆 Hall of Fame**: Global live leaderboard showcasing top users ranked by total wins and win-rates.
- **🔔 Push Notifications**: Get notified instantly when a warrior creates a room and is waiting for an opponent.

---

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo Bare Workflow)
- **Backend & Auth:** Firebase Auth (Email/Password)
- **Database:** Cloud Firestore (Real-time sync for matches, coins, and chat)
- **Video Calling:** Agora React Native SDK
- **AI Integration:** Anthropic API (Claude 3 Haiku)
- **UI/UX:** Custom Google Fonts (`Cinzel`, `Inter`), Expo Linear Gradient, React Native Animated.

---

## 💻 Local Setup & Installation

### Prerequisites
- Node.js (v18+)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator or a physical device.

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/Kurukshetra.git
cd Kurukshetra
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add your API keys:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 4. Build and Run (Native Build)
Because this app uses the Agora Native Video SDK, it cannot run in the standard Expo Go app. You must compile the native code:

**For iOS:**
```bash
npx expo prebuild --clean
npx expo run:ios
```

**For Android:**
```bash
npx expo prebuild --clean
npx expo run:android
```

---

## 📜 License
This project is open-source and available under the MIT License.

*Built with ❤️ in 3 Hours. "Sab energy ka khel hai."*










Last updated: 2026-04-24 -