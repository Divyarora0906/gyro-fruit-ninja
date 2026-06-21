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

// Blade coordinates controlled by physical velocity vectors
window.bladeX = 400;
window.bladeY = 250;
window.isSlashing = false;
window.score = 0;

class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }
  preload() {}
  create() {
    window.gameScene = this;
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
    
    if(this.spawnTimer) this.spawnTimer.remove();
    this.spawnTimer = this.time.addEvent({
      delay: 1000,
      callback: this.spawnFruit,
      callbackScope: this,
      loop: true
    });
  }

  spawnFruit() {
    if (!this.gameRunning) return;
    
    // Spawns low and launches way up high
    const x = Phaser.Math.Between(100, 700);
    const y = 530; 

    const fruitColors = [0xff5722, 0x4caf50, 0xffeb3b, 0xe91e63, 0x9c27b0];
    const targetColor = Phaser.Math.RND.pick(fruitColors);

    const circleGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    circleGraphics.fillStyle(targetColor, 1);
    circleGraphics.fillCircle(25, 25, 25);
    circleGraphics.generateTexture('fruit_' + targetColor, 50, 50);

    const fruit = this.physics.add.sprite(x, y, 'fruit_' + targetColor);
    fruit.setCircle(25);
    
    // Tweak these values to adjust the heights and flight arcs of the fruit objects
    fruit.setGravityY(280); // Lower gravity so they stay in air longer
    fruit.setVelocityX(Phaser.Math.Between(-120, 120));
    fruit.setVelocityY(Phaser.Math.Between(-500, -620)); // High upward blast speed
    
    this.fruits.add(fruit);
  }

  update() {
    if (window.isSlashing) {
      this.trailPoints.push({ x: window.bladeX, y: window.bladeY });
      if (this.trailPoints.length > 10) this.trailPoints.shift();
    } else {
      if(this.trailPoints.length > 0) this.trailPoints.shift();
    }

    this.trailGraphics.clear();
    if (this.trailPoints.length > 1) {
      for (let i = 1; i < this.trailPoints.length; i++) {
        const p1 = this.trailPoints[i - 1];
        const p2 = this.trailPoints[i];
        const alpha = i / this.trailPoints.length;
        
        this.trailGraphics.lineStyle(8, 0x00e5ff, alpha); // Thicker neon line
        this.trailGraphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
        
        this.trailGraphics.lineStyle(3, 0xffffff, alpha);
        this.trailGraphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
      }
    }

    if (this.gameRunning && this.trailPoints.length > 1) {
      const lastPoint = this.trailPoints[this.trailPoints.length - 1];
      const prevPoint = this.trailPoints[this.trailPoints.length - 2];
      const slashLine = new Phaser.Geom.Line(prevPoint.x, prevPoint.y, lastPoint.x, lastPoint.y);

      this.fruits.getChildren().forEach((fruit) => {
        if (fruit && fruit.active) {
          if (Phaser.Geom.Intersects.LineToRectangle(slashLine, fruit.getBounds())) {
            this.sliceFruit(fruit);
          }
        }
      });
    }

    this.fruits.getChildren().forEach((fruit) => {
      if (fruit.y > 560) fruit.destroy();
    });
  }

  sliceFruit(fruit) {
    const fx = fruit.x;
    const fy = fruit.y;
    fruit.destroy();

    window.score += 10;
    scoreTextEl.textContent = window.score;

    for(let i=0; i<10; i++){
      const part = this.add.circle(fx, fy, Phaser.Math.Between(3, 6), 0xffc107);
      this.physics.add.existing(part);
      part.body.setVelocity(Phaser.Math.Between(-250, 250), Phaser.Math.Between(-250, 250));
      this.time.delayedCall(400, () => part.destroy());
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: 'arena',
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: GameScene
};
new Phaser.Game(config);

async function createRoom() {
  try {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById("roomId").textContent = roomId;
    statusEl.textContent = "Setting up WebRTC... ⏳";

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.oniceconnectionstatechange = () => { statusEl.textContent = `ICE: ${pc.iceConnectionState}`; };
    pc.onconnectionstatechange = () => {
      if(pc.connectionState === "connected") {
        statusEl.textContent = "Phone linked!";
        startOverlay.style.display = "flex";
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

        // Convert the phone's physical linear translation forces into screen pointer tracking coordinates
        // Using high amplification multipliers (* 45) turns fast spatial changes into huge knife slashes
        window.bladeX = 400 - (data.ax * 45); 
        window.bladeY = 250 + (data.ay * 45);

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