import { db } from "./firebase.js";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// --- Configuration & State ---
const roomId = new URLSearchParams(location.search).get("room");
const roomRef = doc(db, "rooms", roomId);
const status = document.getElementById("status");

let dataChannel;
let posX = 400; // Starting position X
let posY = 250; // Starting position Y
let motionData = { ax: 400, ay: 250, az: 0 }; // Shared state

// --- Initialization ---
if (!roomId) {
  status.textContent = "No room ID in URL ❌";
  throw new Error("Missing room ID");
}

document.getElementById("room").textContent = `Room: ${roomId}`;
status.textContent = "Waiting for laptop offer... ⏳";

const pc = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
});

// --- WebRTC Logic ---
pc.oniceconnectionstatechange = () =>
  (status.textContent = `ICE: ${pc.iceConnectionState}`);
pc.onconnectionstatechange = () => {
  const s = pc.connectionState;
  status.textContent =
    s === "connected" ? "Connected to Laptop! ✅" : `Conn: ${s}`;
};

pc.ondatachannel = (event) => {
  dataChannel = event.channel;
  dataChannel.onopen = () => (status.textContent = "Connected to Laptop! ✅");
};

pc.onicecandidate = async (event) => {
  if (event.candidate)
    await addDoc(
      collection(db, "rooms", roomId, "guestCandidates"),
      event.candidate.toJSON(),
    );
};

// Listen for Offer
let initialized = false;
onSnapshot(roomRef, async (snapshot) => {
  const data = snapshot.data();
  if (!data?.offer || initialized) return;
  initialized = true;

  try {
    status.textContent = "Offer received, connecting... 🔗";
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

    // Handle ICE Candidates from host
    onSnapshot(collection(db, "rooms", roomId, "hostCandidates"), (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type === "added")
          await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      });
    });

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await updateDoc(roomRef, {
      answer: { type: answer.type, sdp: answer.sdp },
    });
  } catch (err) {
    status.textContent = `Init Error: ${err.message} ❌`;
  }
});

// --- Sensor Logic ---
document.getElementById("startBtn").addEventListener("click", startSensors);
async function startSensors() {
  try {
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission !== "granted")
        return (status.textContent = "Permission Denied ❌");
    }

    status.textContent = "Sensors active! Swing to slice 🔪";

    // --- NEW PHYSICS VARIABLES ---
    let vx = 0;
    let vy = 0;

    // 🔴 CHANGE THESE TO FLIP THE DIRECTION 🔴
    // If up/down is backward, change invertY to 1. If left/right is backward, change invertX to -1.
    const invertX = 1;
    const invertY = -1;
    window.addEventListener("devicemotion", (event) => {
      let ax = event.acceleration?.x || 0;
      let ay = event.acceleration?.y || 0;

      if (ax === 0 && ay === 0) {
        ax = event.accelerationIncludingGravity?.x || 0;
        ay = event.accelerationIncludingGravity?.y || 0;
      }

      if (Math.abs(ax) < 0.1) ax = 0;
      if (Math.abs(ay) < 0.1) ay = 0;

      vx += ax;
      vy += ay;

      vx *= 0.8;
      vy *= 0.8;

      const swingX = vx;
      const swingY = vy;

      motionData.swingX = swingX;
      motionData.swingY = swingY;

      motionData.power = Math.abs(vx) + Math.abs(vy);

      motionData.isMoving = motionData.power > 8;
    });
    
    setInterval(() => {
      if (dataChannel?.readyState === "open") {
        dataChannel.send(JSON.stringify(motionData));
      }
    }, 25);
  } catch (err) {
    status.textContent = `Sensor Error: ${err.message} ❌`;
  }
}
