# 🥷 Haptic Ninja

> Turn your phone into a motion-controlled ninja blade and slash fruits on your laptop in real time.

[![Live Demo](https://res.cloudinary.com/dbwyexls4/image/upload/v1782164784/Jun_23_2026_02_13_39_AM_xax4i4.png)](https://haptic.ninja)

Haptic Ninja is a browser-based multiplayer game inspired by Fruit Ninja. The game runs on a laptop/desktop screen while your phone acts as the controller using its gyroscope sensors. Simply scan a QR code, connect your phone, and start slicing.

---

## 📸 Screenshots

![Gameplay](https://res.cloudinary.com/dbwyexls4/image/upload/v1782164784/HapticNinjaHome_b1nm1k.png)

---

## ✨ Features

- 📱 **Phone-as-Controller** gameplay — no extra hardware needed
- 🎮 **Real-time motion tracking** using gyroscope data
- 🔗 **QR-code based device pairing** — connect in seconds
- 🍉 **Fruit slicing mechanics** with satisfying physics
- ⚡ **Low-latency communication** between phone and desktop
- 🌐 **Browser-based** — no app installation required
- 🏆 **Score tracking** and combo system
- 🖥️ **Fullscreen** gaming experience

---

## 🚀 How It Works

1. Open the game on your laptop at [haptic.ninja](https://haptic.ninja)
2. Click **Initialize Setup**
3. Scan the generated QR code using your phone
4. Allow motion sensor access on your device
5. Swing your phone like a katana
6. Slice fruits and chase high scores

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Game Engine | [Phaser 3](https://phaser.io/) |
| Frontend | HTML5, CSS3, JavaScript (ES6) |
| Communication | WebRTC / Realtime device communication |
| Pairing | QR Code via [QRCode.js](https://davidshimjs.github.io/qrcodejs/) |
| Device Sensors | Gyroscope API, Device Orientation API |

---

## 📂 Project Structure

```text
haptic-ninja/
│
├── assets/               # Images, icons, sounds
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   └── og-image.png
├── js/
│   ├── host.js           # Main game logic & WebSocket host
│   └── controller.js     # Gyroscope capture & WebSocket sender
├── index.html            # Desktop game arena
├── controller.html       # Phone controller page
├── privacy-policy.html   # Privacy policy
├── terms.html            # Terms of service
├── sitemap.xml           # SEO sitemap
├── robots.txt            # Search engine directives
└── README.md
```

---

## 🎯 Gameplay

- Slice fruits to earn points
- Avoid missing fruits
- Build combos for higher scores
- Use real-world movements for immersive gameplay

---

## 🏃 Run Locally

### Prerequisites

- A modern browser (Chrome recommended)
- A smartphone with a gyroscope
- Node.js (optional, for a local static server)

### Steps

```bash
# Clone the repository
git clone https://github.com/Divyarora0906/gyro-fruit-ninja.git

# Navigate into the project
cd gyro-fruit-ninja

# Serve with a static server
npx serve .
# or
python3 -m http.server 3000
```

Open `http://localhost:3000` on your desktop, then scan the QR code with your phone.

> ⚠️ **iOS requires HTTPS** for gyroscope access. For local iPhone testing, use [ngrok](https://ngrok.com/) to tunnel your server over HTTPS, or deploy to a live domain.

---

## 🌍 Live Demo

🔗 [https://haptic.ninja](https://haptic.ninja)

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

## 👨‍💻 Author

**Divy Arora**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Divy%20Arora-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/divyarora0906/)
[![GitHub](https://img.shields.io/badge/GitHub-Divyarora0906-181717?style=flat&logo=github&logoColor=white)](https://github.com/Divyarora0906)

---

<p align="center">
  <strong>Your Phone is the Blade. Become the Ninja. 🥷</strong>
  <br /><br />
  <a href="https://haptic.ninja">haptic.ninja →</a>
</p>