# 🌟 Multiplication Quest

> A beautiful, engaging, progressive multiplication learning game designed for children aged 7–10.

[![Deploy to GitHub Pages](https://github.com/vahid-nazifi/multiplicationquest/actions/workflows/deploy.yml/badge.svg)](https://github.com/vahid-nazifi/multiplicationquest/actions/workflows/deploy.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-blueviolet)](https://vahid-nazifi.github.io/multiplicationquest/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Live Demo:** [https://vahid-nazifi.github.io/multiplicationquest/](https://vahid-nazifi.github.io/multiplicationquest/)

---

## 🎮 About the Game

Multiplication Quest transforms practising times tables into an exciting adventure. Children explore six progressive levels, collect stars, unlock achievements, and improve their multiplication speed — all through positive reinforcement and a beautiful, engaging experience.

The game is guided by **Stella**, a friendly star mascot who celebrates correct answers, offers hints when needed, and encourages children every step of the way.

---

## ✨ Features

### 🎯 Core Gameplay
- **Progressive Levels** — Six levels from Multiplication Explorer to Multiplication Master
- **Adaptive Difficulty** — Smart engine tracks performance and adjusts challenge automatically
- **4 Answer Choices** — Multiple-choice format with plausible wrong answers
- **Number Keypad Mode** — Optional typed answer input
- **Positive Reinforcement** — No negative messages, ever

### 🏆 Gamification
- **Stars & XP** — Earn rewards for every correct answer
- **20 Achievements** — From "First Victory" to "Galaxy Brain"
- **Streaks** — In-game and daily streaks with fire animations
- **Level-Up Celebrations** — Confetti, animations, and mascot reactions
- **Progress Dashboard** — Visual accuracy charts per times table

### 🎮 Game Modes
| Mode | Description |
|------|-------------|
| 🗺️ **Adventure Mode** | Main progressive experience through all 6 levels |
| ⚡ **Quick Play** | 10 rapid-fire questions |
| 🏎️ **Speed Challenge** | Answer as many as possible in 60 seconds |
| 📚 **Practice Mode** | Choose specific tables, no time pressure |
| 📅 **Daily Challenge** | A fresh set of questions every day |

### ⚙️ Settings & Controls
- Sound effects, background music, timer ticking — all independently controllable
- Timer visibility: visible, icon only, or hidden (timer still runs internally)
- Multiple choice or keypad input mode
- Animation toggle (respects `prefers-reduced-motion`)
- Full progress reset option

### 📱 PWA / Offline
- Fully installable on Android, iOS, and desktop
- Works completely offline after first load
- App icon, splash screen, standalone display mode

---

## 🖥️ Technology Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure, semantic markup |
| CSS3 | Animations, layout, design system |
| Vanilla JavaScript (ES6+) | Game logic, all modules |
| Web Audio API | All sounds (synthesized, no files needed) |
| LocalStorage | Progress persistence |
| Service Worker | Offline caching |
| PWA Manifest | Installability |
| GitHub Actions | Automatic deployment |

**No frameworks, no dependencies, no build step required.**

---

## 📁 Project Structure

```
multiplicationquest/
├── index.html                  # Single-page app entry point
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker (offline caching)
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD
├── icons/
│   ├── icon-192.png            # PWA icon (192×192)
│   └── icon-512.png            # PWA icon (512×512)
├── css/
│   ├── main.css                # Design tokens, reset, global layout
│   ├── animations.css          # All keyframe animations
│   ├── components.css          # Buttons, cards, timer, mascot, etc.
│   └── screens.css             # Screen-specific layouts
└── js/
    ├── storage.js              # LocalStorage abstraction
    ├── progress.js             # XP, stars, levels, streaks
    ├── achievements.js         # 20 achievements + unlock logic
    ├── audio.js                # Web Audio API sound system
    ├── adaptive.js             # Adaptive difficulty engine + hints
    ├── game.js                 # Core game engine + question logic
    ├── mascot.js               # Mascot expressions + dialogue
    ├── ui.js                   # DOM, animations, particle system
    └── app.js                  # App bootstrap + event coordination
```

---

## 🚀 Running Locally

No build step required! Just open with a local HTTP server.

**Option 1 — VS Code Live Server:**
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` → "Open with Live Server"

**Option 2 — Python:**
```bash
cd multiplicationquest
python -m http.server 8080
# Open: http://localhost:8080
```

**Option 3 — Node.js (npx):**
```bash
cd multiplicationquest
npx serve .
# Open the URL shown in the terminal
```

> **Note:** The Service Worker requires HTTPS or localhost. Directly opening `index.html` as a file (`file://`) will work for the game itself but not for PWA installation.

---

## 🌐 Deploying to GitHub Pages

### Automatic Deployment (Recommended)

The included GitHub Actions workflow automatically deploys to GitHub Pages on every push to `main`.

1. **Fork or clone this repository**
2. **Go to your repo Settings → Pages**
3. Set Source to **GitHub Actions**
4. Push any change to `main` — deployment runs automatically!
5. Your game will be live at: `https://YOUR-USERNAME.github.io/multiplicationquest/`

### Manual Deployment

1. Go to **Settings → Pages** in your GitHub repository
2. Set Source to **Deploy from a branch**
3. Select `main` branch, `/ (root)` folder
4. Save — the site deploys in 1–2 minutes

---

## 📱 Installing on Android (Chrome)

1. Open Chrome and navigate to your GitHub Pages URL
2. Tap the **three-dot menu** (⋮) in the top right
3. Tap **"Add to Home screen"** or **"Install app"**
4. Tap **"Install"** in the prompt
5. The game appears on your home screen like a native app!

The game works fully offline after installation.

### Installing on iOS (Safari)

1. Open Safari and navigate to your GitHub Pages URL
2. Tap the **Share button** (📤) at the bottom
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right

---

## 🎓 Game Mechanics & Progression

### Level System

| Level | Name | Tables | Timer |
|-------|------|--------|-------|
| 1 | Multiplication Explorer | 1, 2, 10 | None |
| 2 | Number Adventurer | 2, 3, 4, 5, 10 | 30s |
| 3 | Multiplication Hero | 1–5 | 25s |
| 4 | Math Champion | 1–7 | 20s |
| 5 | Math Superstar | 1–10 | 15s |
| 6 | Multiplication Master | 1–10 | Adaptive |

### Level Advancement
- Play at least **10 questions** in Adventure Mode at your current level
- Achieve **≥80% accuracy** across your recent sessions
- Never time-gated — progress at your own pace

### Scoring
- **+10 XP** per correct answer
- **+5 XP** streak bonus at 3 in a row
- **+10 XP** streak bonus at 5 in a row
- **+20 XP** streak bonus at 10 in a row
- **Speed bonus** for fast answers (above timer threshold)
- **+50 XP** for a perfect round (100% accuracy)

### Stars Earned Per Round
- ⭐ 1 star — Completed the round
- ⭐⭐ 2 stars — 70%+ accuracy
- ⭐⭐⭐ 3 stars — 90%+ accuracy

---

## 🧠 Adaptive Difficulty Engine

The adaptive engine tracks your performance and adjusts in real time:

- **Slow it down** if accuracy drops below 70% — gives more time
- **Speed it up** if accuracy is ≥85% and you're answering quickly — reduces timer
- **Weights weak tables** — tables with <60% accuracy appear 3× more often
- **Never sudden jumps** — adjustments are smooth and gradual

---

## 💾 Local Data Storage

All progress is saved in your browser's **LocalStorage** under the key `mquest_v1`.

Data stored:
- Player level, XP, total stars
- Achievement unlocks
- Per-table accuracy statistics
- Session history (last 30 sessions)
- Settings preferences
- Daily challenge status and streak

**Data is private** — it never leaves your device. There is no account, no server, and no tracking.

### Backing Up / Transferring Progress

Open browser DevTools → Application → Local Storage → copy the value of `mquest_v1`.

---

## 🎨 Customising Levels and Difficulty

Edit `js/progress.js` to change level definitions:

```javascript
const LEVELS = [
  { level: 1, name: 'Multiplication Explorer', tables: [1,2,10], timer: null, minXP: 0 },
  // Add or modify levels here...
];
```

Edit `js/adaptive.js` to tune difficulty parameters:

```javascript
const MIN_TIMER = 8000;          // Minimum 8 seconds allowed
const MAX_TIMER = 45000;         // Maximum 45 seconds
const ADJUSTMENT_STEP_UP = 2000; // Reduce timer by 2s when doing well
const ADJUSTMENT_STEP_DOWN = 3000; // Increase by 3s when struggling
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Ideas for Contributions
- New achievements
- Additional mascot expressions
- More game modes (e.g., two-player)
- Division/addition/subtraction modes
- Localisation support
- More background music themes

---

## 🔧 Troubleshooting

**Game won't install as PWA**
- Make sure you're accessing over HTTPS (GitHub Pages provides this automatically)
- Clear site data and try again

**Sounds not working**
- Browser audio requires a user interaction first — tap any button
- Check your device isn't on silent mode
- Enable sound in Settings → Sound

**Progress not saving**
- Check that your browser allows LocalStorage (not in Private/Incognito mode)
- Some browsers clear LocalStorage automatically — use regular browsing mode

**Offline mode not working**
- Visit the site online at least once to populate the cache
- Check that the service worker registered correctly (DevTools → Application → Service Workers)

**Fonts look wrong**
- On first offline load, system fonts are used as fallback — this is normal
- Subsequent offline loads will use cached Google Fonts

---

## 👨‍👩‍👧 For Parents

Multiplication Quest:
- ✅ Contains **no advertisements**
- ✅ Contains **no in-app purchases**
- ✅ Contains **no external links** during gameplay
- ✅ Collects **no personal information**
- ✅ Requires **no account creation**
- ✅ Works **completely offline**
- ✅ Uses **positive reinforcement only** — no negative sounds or discouraging messages
- ✅ Designed with **child-appropriate content** throughout

The progress dashboard gives parents a clear view of their child's improvement over time.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
Made with ❤️ for young mathematicians everywhere 🌟
</div>
