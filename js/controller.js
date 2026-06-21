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

const pc = new RTCPeerConnection({
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
});

let dataChannel;

const guestCandidates = collection(db, "rooms", roomId, "guestCandidates");

pc.onicecandidate = async (event) => {
  if (event.candidate) {
    await addDoc(guestCandidates, event.candidate.toJSON());
  }
};

pc.ondatachannel = (event) => {
  dataChannel = event.channel;

  dataChannel.onopen = () => {
    console.log("CHANNEL OPEN");

    dataChannel.send("HELLO FROM PHONE");
  };
};

document.getElementById("room").textContent = `Room: ${roomId}`;

await updateDoc(roomRef, {
  joined: true,
});

const roomSnap = await getDoc(roomRef);

const roomData = roomSnap.data();

await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));

const answer = await pc.createAnswer();

await pc.setLocalDescription(answer);

await updateDoc(roomRef, {
  answer: {
    type: answer.type,
    sdp: answer.sdp,
  },
});

onSnapshot(collection(db, "rooms", roomId, "hostCandidates"), (snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === "added") {
      await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
    }
  });
});

document.getElementById("startBtn").addEventListener("click", startSensors);

async function startSensors() {
  const status = document.getElementById("status");

  try {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const permission = await DeviceOrientationEvent.requestPermission();

      if (permission !== "granted") {
        status.textContent = "Permission Denied";

        return;
      }
    }

    status.textContent = "Sensors Active ✅";

    const sensorData = {
      alpha: 0,
      beta: 0,
      gamma: 0,
      ax: 0,
      ay: 0,
      az: 0,
    };

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
  } catch (err) {
    console.error(err);

    status.textContent = "Sensor Error";
  }
}
