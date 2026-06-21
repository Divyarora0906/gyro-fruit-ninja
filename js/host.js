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
window.isSlashing = false;
window.score = 0;
class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    // Keep this empty since we are creating assets dynamically below
  }

  createFruitTexture(key, outerColor, innerColor) {
    let gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(outerColor, 1);
    gfx.fillCircle(25, 25, 25);
    gfx.fillStyle(innerColor, 1);
    gfx.fillCircle(25, 25, 20); // Inner flesh ring look
    gfx.generateTexture(key, 50, 50);
    gfx.destroy(); // Clean up graphics object from memory
  }

  create() {
    window.gameScene = this;

    // 1. Generate Dojo Background Plank Texture safely in create()
    let bgGfx = this.make.graphics({ x: 0, y: 0, add: false });
    bgGfx.fillStyle(0x3e2723, 1);
    bgGfx.fillRect(0, 0, 800, 500);
    bgGfx.lineStyle(4, 0x271714, 1);
    for (let i = 0; i < 500; i += 50) {
      bgGfx.strokeLineShape(new Phaser.Geom.Line(0, i, 800, i));
    }
    bgGfx.generateTexture("dojo_bg", 800, 500);
    bgGfx.destroy();

    // Draw the background image to the screen
    this.add.image(400, 250, "dojo_bg");

    // 2. Generate Fruit Textures safely in create()
    this.createFruitTexture("watermelon", 0x4caf50, 0xff5722);
    this.createFruitTexture("apple", 0xd50000, 0xffffff);
    this.createFruitTexture("orange", 0xff9800, 0xffe082);
    this.createFruitTexture("banana", 0xffeb3b, 0xfff59d);

    // Initialize groups and physics configurations
    this.fruits = this.physics.add.group();
    this.gameRunning = false;
    this.trailGraphics = this.add.graphics();
    this.trailPoints = [];
    this.spawnTimer = null;
  }

  startGame() {
    this.gameRunning = true;
    window.score = 0;
    scoreTextEl.textContent = window.score;

    if (this.spawnTimer) this.spawnTimer.remove();
    this.spawnTimer = this.time.addEvent({
      delay: 1000,
      callback: this.spawnFruit,
      callbackScope: this,
      loop: true,
    });
  }

  spawnFruit() {
    if (!this.gameRunning) return;

    const x = Phaser.Math.Between(150, 650);
    const y = 540; // Spawns cleanly completely offscreen beneath layout

    const fruitTypes = ["watermelon", "apple", "orange", "banana"];
    const chosenType = Phaser.Math.RND.pick(fruitTypes);

    const fruit = this.physics.add.sprite(x, y, chosenType);
    fruit.setCircle(23);

    // Parabolic arc mechanics: Go up high, gravity naturally forces them back down
    fruit.setGravityY(400);
    fruit.setVelocityX(Phaser.Math.Between(-100, 100));
    fruit.setVelocityY(Phaser.Math.Between(-620, -720)); // High upward jump velocity

    this.fruits.add(fruit);
  }

  update() {
    // --- LERP ANTI-JERK INPUT FILTERING ---
    const lerpFactor = 0.15;
    window.bladeX += (window.targetBladeX - window.bladeX) * lerpFactor;
    window.bladeY += (window.targetBladeY - window.bladeY) * lerpFactor;

    if (window.isSlashing) {
      this.trailPoints.push({ x: window.bladeX, y: window.bladeY });
      if (this.trailPoints.length > 8) this.trailPoints.shift();
    } else {
      if (this.trailPoints.length > 0) this.trailPoints.shift();
    }

    // Render the beautiful blade trail
    this.trailGraphics.clear();
    if (this.trailPoints.length > 1) {
      for (let i = 1; i < this.trailPoints.length; i++) {
        const p1 = this.trailPoints[i - 1];
        const p2 = this.trailPoints[i];
        const alpha = i / this.trailPoints.length;

        this.trailGraphics.lineStyle(7, 0xe0f7fa, alpha);
        this.trailGraphics.strokeLineShape(
          new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y),
        );

        this.trailGraphics.lineStyle(3, 0xffffff, alpha);
        this.trailGraphics.strokeLineShape(
          new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y),
        );
      }
    }

    // Slicing Collision Intersection Checks
    if (this.gameRunning && this.trailPoints.length > 1) {
      const lastPoint = this.trailPoints[this.trailPoints.length - 1];
      const prevPoint = this.trailPoints[this.trailPoints.length - 2];
      const slashLine = new Phaser.Geom.Line(
        prevPoint.x,
        prevPoint.y,
        lastPoint.x,
        lastPoint.y,
      );

      this.fruits.getChildren().forEach((fruit) => {
        if (fruit && fruit.active) {
          if (
            Phaser.Geom.Intersects.LineToRectangle(slashLine, fruit.getBounds())
          ) {
            this.sliceFruit(fruit);
          }
        }
      });
    }

    // Safely remove fallen dead items once they descend completely below screen horizon
    this.fruits.getChildren().forEach((fruit) => {
      if (fruit.y > 560 && fruit.body.velocity.y > 0) {
        fruit.destroy();
      }
    });
  }

  sliceFruit(fruit) {
    const fx = fruit.x;
    const fy = fruit.y;
    const key = fruit.texture.key;
    fruit.destroy();

    window.score += 10;
    scoreTextEl.textContent = window.score;

    // Explode juicy splashes based on custom fruit styles
    let splashColor = 0xff5722;
    if (key === "watermelon") splashColor = 0xff3d00;
    if (key === "apple") splashColor = 0xffebee;
    if (key === "orange") splashColor = 0xff9800;
    if (key === "banana") splashColor = 0xffeb3b;

    for (let i = 0; i < 12; i++) {
      const part = this.add.circle(
        fx,
        fy,
        Phaser.Math.Between(3, 6),
        splashColor,
      );
      this.physics.add.existing(part);
      part.body.setVelocity(
        Phaser.Math.Between(-300, 300),
        Phaser.Math.Between(-300, 300),
      );
      part.body.setGravityY(200);
      this.time.delayedCall(400, () => part.destroy());
    }
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

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.oniceconnectionstatechange = () => {
      statusEl.textContent = `ICE: ${pc.iceConnectionState}`;
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        statusEl.textContent = "Phone linked!";
        startOverlay.style.display = "flex";
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
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Convert the phone's physical linear translation forces into screen pointer tracking coordinates
        // Using high amplification multipliers (* 45) turns fast spatial changes into huge knife slashes
        window.bladeX = 400 - data.ax * 45;
        window.bladeY = 250 + data.ay * 45;

        window.bladeX = Math.max(0, Math.min(800, window.bladeX));
        window.bladeY = Math.max(0, Math.min(500, window.bladeY));
      } catch (e) {}
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

    const joinUrl = `${location.origin}${location.pathname.replace("index.html", "")}controller.html?room=${roomId}`;
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
