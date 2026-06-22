import { db } from "./firebase.js";
import {
  doc, updateDoc, collection, addDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const roomId = new URLSearchParams(location.search).get("room");
const roomRef = doc(db, "rooms", roomId);
const status = document.getElementById("status");

if (!roomId) {
  status.textContent = "No room ID in URL ❌";
  throw new Error("Missing room ID");
}

document.getElementById("room").textContent = `Room: ${roomId}`;
status.textContent = "Waiting for laptop offer... ⏳";

let dataChannel;

// FIX 1: Same TURN servers as host — both sides need them for hotspot NAT
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
  status.textContent = `ICE: ${pc.iceConnectionState}`;
};
pc.onconnectionstatechange = () => {
  const s = pc.connectionState;
  status.textContent =
    s === "connected" ? "Connected to Laptop! ✅" :
    s === "failed"    ? "Connection failed ❌ — Refresh and retry" :
    `Conn: ${s}`;
};

pc.ondatachannel = (event) => {
  dataChannel = event.channel;
  dataChannel.onopen = () => {
    status.textContent = "Connected to Laptop! ✅";
  };
};

// Send our ICE candidates to Firebase for the laptop to read
const guestCandidates = collection(db, "rooms", roomId, "guestCandidates");
pc.onicecandidate = async (event) => {
  if (event.candidate) await addDoc(guestCandidates, event.candidate.toJSON());
};

// FIX 2: Wait for the offer via onSnapshot instead of getDoc
// This handles the case where phone opens the URL before laptop writes the offer
let initialized = false;
onSnapshot(roomRef, async (snapshot) => {
  const data = snapshot.data();

  if (!data?.offer || initialized) return;
  initialized = true;

  try {
    status.textContent = "Offer received, connecting... 🔗";
    await updateDoc(roomRef, { joined: true });
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

    // Listen for host ICE candidates
    onSnapshot(collection(db, "rooms", roomId, "hostCandidates"), (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          } catch (e) {}
        }
      });
    });

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });
    status.textContent = "Answer sent, waiting for ICE... ⏳";
  } catch (err) {
    status.textContent = `Init Error: ${err.message} ❌`;
  }
});

// Sensor button
document.getElementById("startBtn").addEventListener("click", startSensors);

async function startSensors() {
  try {
    // iOS permission request
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission !== "granted") {
        status.textContent = "Motion Permission Denied ❌";
        return;
      }
    }

    status.textContent = "Sensors active! Swing to slice 🔪";

    const motionData = { ax: 0, ay: 0, az: 0 };

    window.addEventListener("devicemotion", (event) => {
      // FIX 3: Many Android phones return null for event.acceleration
      // Fall back to accelerationIncludingGravity and subtract ~gravity on Z
      const accel = event.acceleration;
      const accelG = event.accelerationIncludingGravity;

      if (accel && accel.x !== null) {
        // Best case: hardware linear acceleration (no gravity)
        motionData.ax = accel.x || 0;
        motionData.ay = accel.y || 0;
        motionData.az = accel.z || 0;
      } else if (accelG) {
        // Fallback: subtract approximate gravity (device held upright ~9.8 on Z)
        motionData.ax = accelG.x || 0;
        motionData.ay = accelG.y || 0;
        motionData.az = (accelG.z || 0) - 9.8;
      }

      // Show live values on phone screen
      document.getElementById("alphaVal").textContent = motionData.ax.toFixed(1);
      document.getElementById("betaVal").textContent = motionData.ay.toFixed(1);
      document.getElementById("gammaVal").textContent = motionData.az.toFixed(1);
    });

    // Send gyro data at 25ms intervals (~40fps)
    setInterval(() => {
      if (dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(JSON.stringify(motionData));
      }
    }, 25);

  } catch (err) {
    status.textContent = `Sensor Error: ${err.message} ❌`;
  }
}