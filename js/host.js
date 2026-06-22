import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const statusEl = document.getElementById("status");
const scoreTextEl = document.getElementById("scoreText");
const startOverlay = document.getElementById("startOverlay");
document.getElementById("createRoomBtn").addEventListener("click", createRoom);
document.getElementById("startGameBtn").addEventListener("click", () => {
  startOverlay.style.display = "none";
  if (window.gameScene) window.gameScene.startGame();
});

// Blade coordinates controlled by physical velocity vectors
window.bladeX = 400;
window.bladeY = 250;
window.targetBladeX = 400; // FIX: was undefined, causing LERP to break
window.targetBladeY = 250; // FIX: was undefined, causing LERP to break
window.isSlashing = false;
window.score = 0;
class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    window.gameScene = this;

    // Background
    const bg = this.make.graphics({ x: 0, y: 0, add: false });
    bg.fillStyle(0x3e2723, 1);
    bg.fillRect(0, 0, 800, 500);
    bg.lineStyle(3, 0x2a1b16);
    for (let y = 0; y < 500; y += 40) {
      bg.strokeLineShape(new Phaser.Geom.Line(0, y, 800, y));
    }
    bg.generateTexture("dojo_bg", 800, 500);
    bg.destroy();
    this.add.image(400, 250, "dojo_bg");

    // Fruits Setup
    this.createFruitTexture("watermelon", 0x43a047, 0xff5252);
    this.createFruitTexture("apple", 0xd50000, 0xffffff);
    this.createFruitTexture("orange", 0xff9800, 0xffcc80);
    this.createFruitTexture("banana", 0xffeb3b, 0xfff59d);
    this.createFruitTexture("bomb", 0x111111, 0x555555);

    this.fruits = this.physics.add.group();
    this.trailGraphics = this.add.graphics();
    this.trailPoints = [];
    this.gameRunning = false;
  }

  createFruitTexture(key, outerColor, innerColor) {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(outerColor, 1);
    gfx.fillCircle(30, 30, 30);
    gfx.fillStyle(innerColor, 1);
    gfx.fillCircle(30, 30, 24);
    gfx.generateTexture(key, 60, 60);
    gfx.destroy();
  }
  update() {
    // 1. USE PHONE COORDINATES (targetBlade) INSTEAD OF MOUSE POINTER
    const lerp = 0.2;
    window.bladeX += (window.targetBladeX - window.bladeX) * lerp;
    window.bladeY += (window.targetBladeY - window.bladeY) * lerp;

    if (window.isSlashing) {
      this.trailPoints.push({ x: window.bladeX, y: window.bladeY });
      if (this.trailPoints.length > 15) this.trailPoints.shift();
    } else {
      this.trailPoints = [];
    }

    this.drawTrail();

    // 3. Collision Detection (as before)
    if (this.gameRunning && this.trailPoints.length > 2) {
      for (let i = 1; i < this.trailPoints.length; i++) {
        const p1 = this.trailPoints[i - 1];
        const p2 = this.trailPoints[i];
        const slashLine = new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y);

        this.fruits.getChildren().forEach((fruit) => {
          if (!fruit.active) return;
          const b = fruit.getBounds();
          const hitBox = new Phaser.Geom.Rectangle(
            b.x - 10,
            b.y - 10,
            b.width + 20,
            b.height + 20,
          );

          if (Phaser.Geom.Intersects.LineToRectangle(slashLine, hitBox)) {
            this.sliceFruit(fruit);
          }
        });
      }
    }
  }
  drawTrail() {
    this.trailGraphics.clear();

    // Don't draw if we don't have enough points
    if (this.trailPoints.length < 2) return;

    for (let i = 1; i < this.trailPoints.length; i++) {
      const p1 = this.trailPoints[i - 1];
      const p2 = this.trailPoints[i];

      // Calculate progress from 0 (tail) to 1 (head)
      const progress = i / this.trailPoints.length;

      // Taper the thickness: head is thick (14px), tail is thin
      const coreThickness = progress * 4;
      const glowThickness = progress * 10;

      // Fade out the tail
      const alpha = progress;

      // 1. DRAW OUTER GLOW (Cyan/Blue)
      this.trailGraphics.lineStyle(glowThickness, 0x00e5ff, alpha * 0.5);
      this.trailGraphics.strokeLineShape(
        new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y),
      );
      // Add a circle at the joint to round off jagged edges
      this.trailGraphics.fillStyle(0x00e5ff, alpha * 0.5);
      this.trailGraphics.fillCircle(p2.x, p2.y, glowThickness / 2);

      // 2. DRAW INNER CORE (White)
      this.trailGraphics.lineStyle(coreThickness, 0xffffff, alpha);
      this.trailGraphics.strokeLineShape(
        new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y),
      );
      // Round off the inner core
      this.trailGraphics.fillStyle(0xffffff, alpha);
      this.trailGraphics.fillCircle(p2.x, p2.y, coreThickness / 2);
    }
  }
  sliceFruit(fruit) {
    const key = fruit.texture.key;
    const { x, y } = fruit;
    fruit.setActive(false).setVisible(false);
    fruit.destroy();

    if (key === "bomb") {
      this.gameRunning = false;
      this.add
        .text(400, 250, "GAME OVER", {
          fontSize: "64px",
          color: "#ff0000",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      return;
    }

    // Update Score
    window.score += 10;
    scoreTextEl.textContent = window.score;

    // Visual Splash
    const color = key === "watermelon" ? 0xff5252 : 0xff9800;
    for (let i = 0; i < 12; i++) {
      const splash = this.add.circle(x, y, 4, color);
      this.physics.add.existing(splash);
      splash.body.setVelocity(
        Phaser.Math.Between(-300, 300),
        Phaser.Math.Between(-300, 300),
      );
      this.time.delayedCall(500, () => splash.destroy());
    }
  }

  startGame() {
    this.gameRunning = true;
    window.score = 0;
    scoreTextEl.textContent = "0";
    this.scheduleNextWave();
  }

  scheduleNextWave() {
    if (!this.gameRunning) return;
    this.spawnFruit();
    // Faster wave interval
    this.time.delayedCall(Phaser.Math.Between(500, 1000), () =>
      this.scheduleNextWave(),
    );
  }
  spawnFruit() {
    const x = Phaser.Math.Between(100, 700);
    const type = Phaser.Utils.Array.GetRandom([
      "watermelon",
      "apple",
      "orange",
      "banana",
      "bomb",
    ]);
    const fruit = this.fruits.create(x, 550, type);

    // 1. Massive increase to launch velocity
    fruit.setVelocity(
      Phaser.Math.Between(-250, 250),
      Phaser.Math.Between(-1400, -1100),
    );

    // 2. Faster spinning
    fruit.setAngularVelocity(Phaser.Math.Between(-400, 400));

    // 3. Heavy gravity so they arc and fall sharply
    fruit.setGravityY(1600);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "arena",
  physics: { default: "arcade", arcade: { debug: false } },
  scene: GameScene,
};
new Phaser.Game(config);

async function createRoom() {
  try {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById("roomId").textContent = roomId;
    statusEl.textContent = "Setting up WebRTC... ⏳";

    // FIX: Added TURN servers so WebRTC works through hotspot NAT
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
    });

    pc.oniceconnectionstatechange = () => {
      statusEl.textContent = `ICE: ${pc.iceConnectionState}`;
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        statusEl.textContent = "Phone linked! ✅";
        startOverlay.style.display = "flex";
      }
      if (pc.connectionState === "failed") {
        statusEl.textContent = "Connection failed ❌ — Try again";
      }
    };

    const hostCandidates = collection(db, "rooms", roomId, "hostCandidates");
    pc.onicecandidate = async (event) => {
      if (event.candidate)
        await addDoc(hostCandidates, event.candidate.toJSON());
    };

    const channel = pc.createDataChannel("controller");
    channel.onopen = () => {
      window.isSlashing = true;
      statusEl.textContent = "Phone linked! ✅";
    };
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        const centerX = 400;
        const centerY = 250;

        window.targetBladeX = centerX + (data.swingX || 0) * 25;

        window.targetBladeY = centerY + (data.swingY || 0) * 25;

        window.targetBladeX = Phaser.Math.Clamp(window.targetBladeX, 0, 800);

        window.targetBladeY = Phaser.Math.Clamp(window.targetBladeY, 0, 500);

        window.isSlashing = (data.power || 0) > 8;
      } catch (e) {
        console.error("Data parse error:", e);
      }
    };

    await setDoc(doc(db, "rooms", roomId), {
      joined: false,
      createdAt: Date.now(),
    });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await updateDoc(doc(db, "rooms", roomId), {
      offer: { type: offer.type, sdp: offer.sdp },
    });

    // FIX: Always use Vercel URL in QR so phone can actually open it
    // When running locally, localhost is unreachable from the phone
    const origin =
      location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "https://gyro-fruit-ninja.vercel.app"
        : location.origin;
    const joinUrl = `${origin}/controller.html?room=${roomId}`;

    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), joinUrl);
    statusEl.textContent = "Scan QR to Pair... 📱";

    let listeningToGuests = false;
    onSnapshot(doc(db, "rooms", roomId), async (snapshot) => {
      const data = snapshot.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        if (!listeningToGuests) {
          listeningToGuests = true;
          onSnapshot(
            collection(db, "rooms", roomId, "guestCandidates"),
            (snap) => {
              snap.docChanges().forEach(async (change) => {
                if (change.type === "added") {
                  try {
                    await pc.addIceCandidate(
                      new RTCIceCandidate(change.doc.data()),
                    );
                  } catch (e) {}
                }
              });
            },
          );
        }
      }
    });
  } catch (err) {
    statusEl.textContent = `Err: ${err.message}`;
  }
}
