# 🤝 Contributing to blade ninja

Thank you for your interest in contributing to blade ninja! Whether it's fixing a bug, improving the game, or suggesting a new feature — all contributions are welcome.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Branch Naming](#branch-naming)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## 📜 Code of Conduct

By participating in this project, you agree to keep interactions respectful and constructive. Be kind, be helpful, and focus on making the project better for everyone.

---

## 🚀 Getting Started

### 1. Fork the repository

Click the **Fork** button on the top right of the repo page.

### 2. Clone your fork

```bash
git clone https://github.com/YOUR_USERNAME/gyro-fruit-ninja.git
cd gyro-fruit-ninja
```

### 3. Serve locally

```bash
npx serve .
# or
python3 -m http.server 3000
```

Open `http://localhost:3000` on your desktop and scan the QR code with your phone.

> ⚠️ iOS requires HTTPS for gyroscope access. Use [ngrok](https://ngrok.com/) to tunnel locally over HTTPS when testing on iPhone.

### 4. Create a branch

```bash
git checkout -b feature/your-feature-name
```

---

## 🛠️ How to Contribute

### Areas you can help with

| Area | Examples |
|---|---|
| 🐛 Bug fixes | Game crashes, sensor not connecting, QR not generating |
| 🎮 Gameplay | New fruit types, bomb mechanics, difficulty levels |
| 📱 Controller | Better gyroscope calibration, touch fallback |
| 🎨 UI / Design | Improved overlays, animations, mobile controller UI |
| ⚡ Performance | Reduce latency, optimize Phaser scenes |
| 📖 Documentation | Improve README, add code comments |
| 🌐 Accessibility | Keyboard fallback, screen reader support |

---

## 🌿 Branch Naming

Use descriptive, lowercase branch names:

```
feature/add-bomb-mechanic
fix/qr-code-not-rendering
docs/update-readme
style/improve-overlay-ui
perf/reduce-websocket-latency
```

---

## ✍️ Commit Message Guidelines

Follow this format for clean commit history:

```
type: short description
```

| Type | When to use |
|---|---|
| `feat` | Adding a new feature |
| `fix` | Fixing a bug |
| `docs` | Documentation changes |
| `style` | UI/CSS changes (no logic change) |
| `refactor` | Code restructuring (no feature/fix) |
| `perf` | Performance improvements |
| `chore` | Build, config, or tooling changes |

**Examples:**
```
feat: add bomb fruit with game-over mechanic
fix: gyroscope not triggering on Android Chrome
docs: add ngrok setup instructions to README
style: improve QR code wrapper animation
```

---

## 🔁 Pull Request Process

1. Make sure your branch is up to date with `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. Test your changes on both desktop and phone before submitting.

3. Open a Pull Request against the `main` branch.

4. Fill in the PR template:
   - What does this PR do?
   - How was it tested?
   - Screenshots or GIFs (if UI change)

5. Wait for review. Address any feedback and push updates to the same branch.

6. Once approved, your PR will be merged. 🎉

---

## 🐛 Reporting Bugs

Found a bug? [Open an issue](https://github.com/Divyarora0906/gyro-fruit-ninja/issues/new) and include:

- **What happened** — describe the bug clearly
- **Steps to reproduce** — how can we see it?
- **Expected behavior** — what should have happened?
- **Device & browser** — e.g. iPhone 14 / Safari 17, Android Chrome 120
- **Screenshot or video** — if possible

---

## 💡 Suggesting Features

Have an idea? [Open an issue](https://github.com/Divyarora0906/gyro-fruit-ninja/issues/new) with:

- **What the feature is** — describe it clearly
- **Why it would improve the game** — what problem does it solve?
- **Any references** — mockups, similar games, links

---

## 👨‍💻 Author

**Divy Arora**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Divy%20Arora-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/divyarora0906/)
[![GitHub](https://img.shields.io/badge/GitHub-Divyarora0906-181717?style=flat&logo=github&logoColor=white)](https://github.com/Divyarora0906)

---

<p align="center">Thanks for helping make blade ninja better! 🥷⚔️</p>
