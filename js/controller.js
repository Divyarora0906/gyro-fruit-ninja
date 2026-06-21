import { db } from "./firebase.js";
import {
  doc, updateDoc, getDoc, collection, addDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const roomId = new URLSearchParams(location.search).get("room");
const roomRef = doc(db, "rooms", roomId);
const status = document.getElementById("status");

status.textContent = "Initializing... ⏳";
let dataChannel;

try {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.oniceconnectionstatechange = () => { status.textContent = `ICE: ${pc.iceConnectionState}`; };
  pc.onconnectionstatechange = () => { status.textContent = `Conn: ${pc.connectionState}`; };

  pc.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.onopen = () => { status.textContent = "Connected to Laptop! ✅"; };
  };

  const guestCandidates = collection(db, "rooms", roomId, "guestCandidates");
  pc.onicecandidate = async (event) => {
    if (event.candidate) await addDoc(guestCandidates, event.candidate.toJSON());
  };

  document.getElementById("room").textContent = `Room: ${roomId}`;

  async function init() {
    try {
      await updateDoc(roomRef, { joined: true });
      const roomSnap = await getDoc(roomRef);
      const roomData = roomSnap.data();
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
    } catch (initErr) { status.textContent = `Init Error: ${initErr.message} ❌`; }
  }

  init();

  document.getElementById("startBtn").addEventListener("click", startSensors);

  async function startSensors() {
    try {
      // Prompt permissions for motion sensors on iOS devices
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== "granted") {
          status.textContent = "Permission Denied ❌";
          return;
        }
      }
      status.textContent = "Slicing Mode Active! 🟢";
      
      const motionData = { ax: 0, ay: 0, az: 0 };

      // Listen directly to the phone's physical spatial acceleration changes
      window.addEventListener("devicemotion", (event) => {
        const accel = event.acceleration; // Reading linear acceleration without gravity offsets
        motionData.ax = accel?.x || 0;
        motionData.ay = accel?.y || 0;
        motionData.az = accel?.z || 0;

        // Print raw states locally on the phone screen layout variables
        document.getElementById("alphaVal").textContent = Math.round(motionData.ax);
        document.getElementById("betaVal").textContent = Math.round(motionData.ay);
        document.getElementById("gammaVal").textContent = Math.round(motionData.az);
      });

      setInterval(() => {
        if (dataChannel && dataChannel.readyState === "open") {
          dataChannel.send(JSON.stringify(motionData));
        }
      }, 25); // Fast 25ms poll intervals for rapid weapon slashing calculations
    } catch (err) { status.textContent = "Sensor Loop Error"; }
  }
} catch (setupErr) { status.textContent = `Setup Crash: ${setupErr.message} ❌`; }