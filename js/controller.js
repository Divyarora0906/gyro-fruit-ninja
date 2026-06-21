import { db } from "./firebase.js";
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const roomId = new URLSearchParams(location.search).get("room");
const roomRef = doc(db, "rooms", roomId);
const status = document.getElementById("status");

status.textContent = "Initializing phone side... ⏳";

let dataChannel;

try {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
      { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
    ]
  });

  pc.oniceconnectionstatechange = () => { status.textContent = `ICE: ${pc.iceConnectionState}`; };
  pc.onconnectionstatechange = () => { status.textContent = `Conn: ${pc.connectionState}`; };

  // Classic WebRTC: Phone listens for the host's data channel incoming event
  pc.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.onopen = () => { status.textContent = "Connected to Laptop! ✅"; };
  };

  const guestCandidates = collection(db, "rooms", roomId, "guestCandidates");
  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      await addDoc(guestCandidates, event.candidate.toJSON());
    }
  };

  document.getElementById("room").textContent = `Room: ${roomId}`;

  async function init() {
    try {
      await updateDoc(roomRef, { joined: true });
      const roomSnap = await getDoc(roomRef);
      const roomData = roomSnap.data();

      if (!roomData || !roomData.offer) {
        status.textContent = "Error: Room offer not found! ❌";
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));

      onSnapshot(collection(db, "rooms", roomId, "hostCandidates"), (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            try { await pc.addIceCandidate(new RTCIceCandidate(change.doc.data())); } catch (err) {}
          }
        });
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });
    } catch (initErr) {
      status.textContent = `Init Error: ${initErr.message} ❌`;
    }
  }

  init();

  document.getElementById("startBtn").addEventListener("click", startSensors);

  async function startSensors() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          status.textContent = "Permission Denied ❌";
          return;
        }
      }
      const sensorData = { alpha: 0, beta: 0, gamma: 0, ax: 0, ay: 0, az: 0 };
      window.addEventListener("deviceorientation", (event) => {
        sensorData.alpha = Math.round(event.alpha || 0);
        sensorData.beta = Math.round(event.beta || 0);
        sensorData.gamma = Math.round(event.gamma || 0);
        document.getElementById("alphaVal").textContent = sensorData.alpha;
        document.getElementById("betaVal").textContent = sensorData.beta;
        document.getElementById("gammaVal").textContent = sensorData.gamma;
      });
      window.addEventListener("devicemotion", (event) => {
        const accel = event.accelerationIncludingGravity;
        sensorData.ax = Math.round((accel?.x || 0) * 100) / 100;
        sensorData.ay = Math.round((accel?.y || 0) * 100) / 100;
        sensorData.az = Math.round((accel?.z || 0) * 100) / 100;
      });
      setInterval(() => {
        if (dataChannel && dataChannel.readyState === "open") {
          dataChannel.send(JSON.stringify(sensorData));
        }
      }, 50);
    } catch (err) { status.textContent = "Sensor Loop Error"; }
  }

} catch (setupErr) {
  status.textContent = `Setup Crash: ${setupErr.message} ❌`;
}