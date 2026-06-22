import { db } from "./firebase.js";
import {
  doc, updateDoc, collection, addDoc, onSnapshot
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
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  ],
});

// --- WebRTC Logic ---
pc.oniceconnectionstatechange = () => (status.textContent = `ICE: ${pc.iceConnectionState}`);
pc.onconnectionstatechange = () => {
  const s = pc.connectionState;
  status.textContent = s === "connected" ? "Connected to Laptop! ✅" : `Conn: ${s}`;
};

pc.ondatachannel = (event) => {
  dataChannel = event.channel;
  dataChannel.onopen = () => (status.textContent = "Connected to Laptop! ✅");
};

pc.onicecandidate = async (event) => {
  if (event.candidate) await addDoc(collection(db, "rooms", roomId, "guestCandidates"), event.candidate.toJSON());
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
        if (change.type === "added") await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      });
    });

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });
  } catch (err) {
    status.textContent = `Init Error: ${err.message} ❌`;
  }
});

// --- Sensor Logic ---
document.getElementById("startBtn").addEventListener("click", startSensors);

async function startSensors() {
  try {
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission !== "granted") return (status.textContent = "Permission Denied ❌");
    }

    status.textContent = "Sensors active! Swing to slice 🔪";
window.addEventListener("devicemotion", (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      // Calculate how much the phone is currently moving
      const movementMagnitude = Math.abs(acc.x || 0) + Math.abs(acc.y || 0);

      // Update position logic
      posX += (acc.x || 0) * 0.5;
      posY -= (acc.y || 0) * 0.5;

      // Boundary constraints
      posX = Math.max(0, Math.min(800, posX));
      posY = Math.max(0, Math.min(500, posY));

      // Update shared object AND add the isMoving flag
      motionData.ax = posX;
      motionData.ay = posY;
      motionData.az = (acc.z || 0) - 9.8;
      motionData.isMoving = movementMagnitude > 1.5; // True if swinging, False if still

      // Update UI
      document.getElementById("alphaVal").textContent = posX.toFixed(0);
      document.getElementById("betaVal").textContent = posY.toFixed(0);
    });
    // Send data to laptop
    setInterval(() => {
      if (dataChannel?.readyState === "open") {
        dataChannel.send(JSON.stringify(motionData));
      }
    }, 25);
  } catch (err) {
    status.textContent = `Sensor Error: ${err.message} ❌`;
  }
}