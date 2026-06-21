import { db } from "./firebase.js";
import {
  doc, setDoc, onSnapshot, updateDoc, collection, addDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const statusEl = document.getElementById("status");
const scoreTextEl = document.getElementById("scoreText");
const startOverlay = document.getElementById("startOverlay");
document.getElementById("createRoomBtn").addEventListener("click", createRoom);
document.getElementById("startGameBtn").addEventListener("click", () => {
  startOverlay.style.display = "none";
  if (window.gameScene) window.gameScene.startGame();
});

// Calibration global states
let baseGamma = 0, baseBeta = 0;
// Track blade slice vectors globally for Phaser
window.bladeX = 400;
window.bladeY = 250;
window.isSlashing = false;
window.score = 0;

// --- PHASER ENGINE CONFIGURATION ---
class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }
  preload() {
    // Canvas graphics generated programmatically so you don't need asset files
  }
  create() {
    window.gameScene = this;
    this.fruits = this.physics.add.group();
    this.gameRunning = false;

    // Graphics object to render the sword trails
    this.trailGraphics = this.add.graphics();
    this.trailPoints = [];

    // Spawn routine loop tracker
    this.spawnTimer = null;
  }

  startGame() {
    this.gameRunning = true;
    window.score = 0;
    scoreTextEl.textContent = window.score;
    
    if(this.spawnTimer) this.spawnTimer.remove();
    this.spawnTimer = this.time.addEvent({
      delay: 1200,
      callback: this.spawnFruit,
      callbackScope: this,
      loop: true
    });
  }

  spawnFruit() {
    if (!this.gameRunning) return;
    
    // Choose starting X coordinate randomly across screen horizon
    const x = Phaser.Math.Between(150, 650);
    const y = 520; // Spawn just below viewport boundary

    const fruitColors = [0xff5722, 0x4caf50, 0xffeb3b, 0xe91e63];
    const targetColor = Phaser.Math.RND.pick(fruitColors);

    // Draw temporary colored circles representing fruits programmatically
    const circleGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    circleGraphics.fillStyle(targetColor, 1);
    circleGraphics.fillCircle(25, 25, 25);
    circleGraphics.generateTexture('fruit_' + targetColor, 50, 50);

    const fruit = this.physics.add.sprite(x, y, 'fruit_' + targetColor);
    fruit.setCircle(25);
    
    // Gravity physics engine configuration to create parabolic arc trajectories
    fruit.setGravityY(350);
    fruit.setVelocityX(Phaser.Math.Between(-100, 100));
    fruit.setVelocityY(Phaser.Math.Between(-450, -550)); // Launch upwards
    
    this.fruits.add(fruit);
  }

  update() {
    // 1. Maintain the blade trail arrays
    if (window.isSlashing) {
      this.trailPoints.push({ x: window.bladeX, y: window.bladeY });
      if (this.trailPoints.length > 8) this.trailPoints.shift();
    } else {
      if(this.trailPoints.length > 0) this.trailPoints.shift();
    }

    // 2. Render the Glowing Sword Slice Effect
    this.trailGraphics.clear();
    if (this.trailPoints.length > 1) {
      for (let i = 1; i < this.trailPoints.length; i++) {
        const p1 = this.trailPoints[i - 1];
        const p2 = this.trailPoints[i];
        const alpha = i / this.trailPoints.length;
        
        this.trailGraphics.lineStyle(6, 0x00e5ff, alpha);
        this.trailGraphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
        
        // Inner white edge core accent
        this.trailGraphics.lineStyle(2, 0xffffff, alpha);
        this.trailGraphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
      }
    }

    // 3. Collision Intersection Detections (Cut Effect Execution)
    if (this.gameRunning && this.trailPoints.length > 1) {
      const lastPoint = this.trailPoints[this.trailPoints.length - 1];
      const prevPoint = this.trailPoints[this.trailPoints.length - 2];
      const slashLine = new Phaser.Geom.Line(prevPoint.x, prevPoint.y, lastPoint.x, lastPoint.y);

      this.fruits.getChildren().forEach((fruit) => {
        if (fruit && fruit.active) {
          const bounds = fruit.getBounds();
          // Check if the current line slice segment cuts right through the fruit boundary frame
          if (Phaser.Geom.Intersects.LineToRectangle(slashLine, bounds)) {
            this.sliceFruit(fruit);
          }
        }
      });
    }

    // Clear fallen offscreen dead bodies to save computer memory
    this.fruits.getChildren().forEach((fruit) => {
      if (fruit.y > 550) fruit.destroy();
    });
  }

  sliceFruit(fruit) {
    const fx = fruit.x;
    const fy = fruit.y;
    fruit.destroy(); // Remove whole item asset

    window.score += 10;
    scoreTextEl.textContent = window.score;

    // Spawn splitting juice splash blast particles on cut execution point
    const splash = this.add.graphics();
    splash.fillStyle(0xffffff, 1);
    for(let i=0; i<8; i++){
      const part = this.add.circle(fx, fy, Phaser.Math.Between(3, 6), 0xff9800);
      this.physics.add.existing(part);
      part.body.setVelocity(Phaser.Math.Between(-200, 200), Phaser.Math.Between(-200, 200));
      this.time.delayedCall(300, () => part.destroy());
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: 'arena',
  backgroundColor: '#11111d',
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: GameScene
};
new Phaser.Game(config);

// --- WEBRTC SIGNALING PIPELINE HANDLERS ---
async function createRoom() {
  try {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById("roomId").textContent = roomId;
    statusEl.textContent = "Setting up WebRTC Router... ⏳";

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.oniceconnectionstatechange = () => { statusEl.textContent = `ICE: ${pc.iceConnectionState}`; };
    pc.onconnectionstatechange = () => {
      if(pc.connectionState === "connected") {
        statusEl.textContent = "Phone linked!";
        startOverlay.style.display = "flex"; // Unveil Game Initiation UI Overlay
      }
    };

    const hostCandidates = collection(db, "rooms", roomId, "hostCandidates");
    pc.onicecandidate = async (event) => {
      if (event.candidate) await addDoc(hostCandidates, event.candidate.toJSON());
    };

    const channel = pc.createDataChannel("controller");
    channel.onopen = () => { window.isSlashing = true; };
    
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.isFirst) {
          baseGamma = data.gamma;
          baseBeta = data.beta;
          return;
        }

        // Relative tracking updates translated directly to game dimensions
        const relativeGamma = data.gamma - baseGamma;
        const relativeBeta = data.beta - baseBeta;

        window.bladeX = 400 + (relativeGamma * 12); // High multiplier for instant snappy slashes
        window.bladeY = 250 + (relativeBeta * 12);

        // Constrain bounding boxes within Phaser coordinate framework
        window.bladeX = Math.max(0, Math.min(800, window.bladeX));
        window.bladeY = Math.max(0, Math.min(500, window.bladeY));

      } catch (e) {}
    };

    await setDoc(doc(db, "rooms", roomId), { joined: false, createdAt: Date.now() });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await updateDoc(doc(db, "rooms", roomId), { offer: { type: offer.type, sdp: offer.sdp } });

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
          onSnapshot(collection(db, "rooms", roomId, "guestCandidates"), (snap) => {
            snap.docChanges().forEach(async (change) => {
              if (change.type === "added") {
                try { await pc.addIceCandidate(new RTCIceCandidate(change.doc.data())); } catch(e){}
              }
            });
          });
        }
      }
    });
  } catch (err) { statusEl.textContent = `Err: ${err.message}`; }
}