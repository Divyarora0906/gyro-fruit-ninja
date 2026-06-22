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
const restartGameBtn = document.getElementById("restartGameBtn");
const createRoomBtn = document.getElementById("createRoomBtn");
const qrWrapper = document.getElementById("qrWrapper");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const roomIdText = document.getElementById("roomId");
const roomIdDisplay = document.getElementById("roomIdDisplay");
const connDot = document.getElementById("connDot");
const connLabel = document.getElementById("connLabel");
const gameContainer = document.getElementById("game-container");
let channel;
createRoomBtn.addEventListener("click", createRoom);

restartGameBtn.addEventListener("click", () => {
  restartGameBtn.style.display = "none";

  if (!document.fullscreenElement && gameContainer.requestFullscreen) {
    gameContainer.requestFullscreen().catch(() => {});
  }
  if (window.gameScene) window.gameScene.restartGame();
});

window.bladeX = 400;
window.bladeY = 250;
window.targetBladeX = 400;
window.targetBladeY = 250;
window.isSlashing = false;
window.score = 0;

export function updateConnectionState(state) {
  connDot.className = "dot"; 
  if (state === "connected") {
    connDot.classList.add("healthy");
    connLabel.textContent = "CONNECTED";
    connLabel.style.color = "var(--neon-green)";
  } else if (state === "connecting") {
    connDot.classList.add("warning");
    connLabel.textContent = "CONNECTING";
    connLabel.style.color = "var(--neon-orange)";
  } else {
    connLabel.textContent = "DISCONNECTED";
    connLabel.style.color = "var(--neon-red)";
  }
}

const fullscreenBtn = document.getElementById("fullscreenBtn");

fullscreenBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    gameContainer
      .requestFullscreen()
      .then(() => {
        fullscreenBtn.style.color = "var(--neon-orange)"; 
      })
      .catch((err) => console.error("Fullscreen error:", err));
  } else {
    document.exitFullscreen().then(() => {
      fullscreenBtn.style.color = "";
    });
  }
});

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }
  preload() {
    this.load.audio("sliceSound", "../assets/slice.mp3");
  }
  create() {
    window.gameScene = this;
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
    const lerp = 0.12;
    window.bladeX += (window.targetBladeX - window.bladeX) * lerp;
    window.bladeY += (window.targetBladeY - window.bladeY) * lerp;

    if (window.isSlashing) {
      this.trailPoints.push({ x: window.bladeX, y: window.bladeY });
      if (this.trailPoints.length > 25) this.trailPoints.shift();
    } else {
      this.trailPoints = [];
    }
    this.drawTrail();

    if (this.gameRunning && this.trailPoints.length > 2) {
      for (let i = 1; i < this.trailPoints.length; i++) {
        const p1 = this.trailPoints[i - 1];
        const p2 = this.trailPoints[i];
        const slashLine = new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y);

        this.fruits.getChildren().forEach((fruit) => {
          if (!fruit.active) return;
          const b = fruit.getBounds();
          const hitBox = new Phaser.Geom.Rectangle(
            b.x - 20,
            b.y - 20,
            b.width + 40,
            b.height + 40,
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
    if (this.trailPoints.length < 2) return;

    for (let i = 1; i < this.trailPoints.length; i++) {
      const p1 = this.trailPoints[i - 1];
      const p2 = this.trailPoints[i];

      const progress = i / this.trailPoints.length;
      const t = Math.sin(progress * Math.PI);
      const coreThickness = 2 + t * 5;
      const glowThickness = 4 + t * 8;
      const alpha = Math.sin(progress * Math.PI);

      this.trailGraphics.lineStyle(glowThickness, 0xffffff, alpha * 0.2);
      this.trailGraphics.strokeLineShape(
        new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y),
      );

      this.trailGraphics.lineStyle(coreThickness, 0xffffff, alpha);
      this.trailGraphics.strokeLineShape(
        new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y),
      );
    }
  }

  sliceFruit(fruit) {
    const key = fruit.texture.key;
    const { x, y } = fruit;

    this.sound.play("sliceSound", { volume: 0.5 });
    if (channel && channel.readyState === "open") {
      channel.send(JSON.stringify({ type: "FRUIT_DESTROYED" }));
    }
    fruit.setActive(false).setVisible(false);
    fruit.destroy();

    if (key === "bomb") {
      this.gameRunning = false;
      this.gameOverText = this.add
        .text(400, 250, "GAME OVER", {
          fontSize: "64px",
          color: "#ff0000",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      modalTitle.textContent = "Game Over";
      modalDesc.textContent = `Your blade was broken by a bomb explosion! Final score tracking evaluated: ${window.score} points.`;

      qrWrapper.style.display = "none";
      createRoomBtn.style.display = "none";
      restartGameBtn.style.display = "block";
      statusEl.style.display = "none";

      startOverlay.style.display = "flex";
      return;
    }

    window.score += 10;
    scoreTextEl.textContent = window.score;
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

  restartGame() {
    this.gameRunning = false;
    this.fruits.clear(true, true);
    this.time.removeAllEvents();
    this.trailPoints = [];
    this.trailGraphics.clear();
    if (this.gameOverText) {
      this.gameOverText.destroy();
      this.gameOverText = null;
    }
    startOverlay.style.display = "none";

    window.bladeX = 400;
    window.bladeY = 250;
    window.targetBladeX = 400;
    window.targetBladeY = 250;
    window.isSlashing = false;
    this.startGame();
  }

  scheduleNextWave() {
    if (!this.gameRunning) return;
    this.spawnFruit();
    this.time.delayedCall(Phaser.Math.Between(500, 1000), () =>
      this.scheduleNextWave(),
    );
  }

  spawnFruit() {
    const x = Phaser.Math.Between(100, 700);
    const type = Phaser.Utils.Array.GetRandom([
      "watermelon",
      "watermelon",
      "apple",
      "apple",
      "orange",
      "orange",
      "banana",
      "banana",
      "banana",
      "bomb",
      "bomb",
    ]);
    const fruit = this.fruits.create(x, 550, type);
    fruit.setVelocity(
      Phaser.Math.Between(-250, 250),
      Phaser.Math.Between(-1400, -1100),
    );
    fruit.setAngularVelocity(Phaser.Math.Between(-400, 400));
    fruit.setGravityY(1600);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "arena",
  physics: { default: "arcade", arcade: { debug: false } },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: GameScene,
};

new Phaser.Game(config);

async function createRoom() {
  try {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    roomIdText.textContent = roomId;
    roomIdDisplay.textContent = roomId;

    createRoomBtn.style.display = "none";
    qrWrapper.style.display = "flex";
    modalTitle.textContent = "Awaiting Sync Handler";
    modalDesc.textContent =
      "Scan this signature link payload mapping on your hardware device to sync telemetry channels.";

    statusEl.textContent = "Setting up WebRTC... ⏳";
    updateConnectionState("connecting");

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
      ],
    });

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed"
      ) {
        updateConnectionState("disconnected");
        statusEl.textContent = "Signal Disconnected ❌";
        startOverlay.style.display = "flex";
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        handleSuccessfulConnection();
      }
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        updateConnectionState("disconnected");
        statusEl.textContent = "Link Failed ❌";
        startOverlay.style.display = "flex";
      }
    };

    const hostCandidates = collection(db, "rooms", roomId, "hostCandidates");
    pc.onicecandidate = async (event) => {
      if (event.candidate)
        await addDoc(hostCandidates, event.candidate.toJSON());
    };

    channel = pc.createDataChannel("controller");
    channel.onopen = () => {
      window.isSlashing = true;
      handleSuccessfulConnection();
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

    const origin =
      location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "https://gyro-fruit-ninja.vercel.app"
        : location.origin;
    const joinUrl = `${origin}/controller.html?room=${roomId}`;

    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), {
      text: joinUrl,
      width: 140,
      height: 140,
      correctLevel: QRCode.CorrectLevel.L,
    });
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
                  } catch (e) {
                    console.error("Error adding ICE candidate:", e);
                  }
                }
              });
            },
          );
        }
      }
    });
  } catch (err) {
    statusEl.textContent = `Err: ${err.message}`;
    updateConnectionState("disconnected");
  }
}

function handleSuccessfulConnection() {
  statusEl.textContent = "Phone linked! ✅";
  updateConnectionState("connected");

  startOverlay.style.display = "none";

  if (!document.fullscreenElement && gameContainer.requestFullscreen) {
    gameContainer
      .requestFullscreen()
      .catch((err) => console.log("Fullscreen restriction:", err));
  }

  if (window.gameScene && !window.gameScene.gameRunning) {
    window.gameScene.startGame();
  }
}
