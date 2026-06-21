import { db } from "./firebase.js";

import {
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const roomId = new URLSearchParams(location.search).get("room");

const roomRef = doc(db, "rooms", roomId);

document.getElementById("room").textContent = `Room: ${roomId}`;

await updateDoc(roomRef, {
  joined: true,
});

document.getElementById("startBtn").addEventListener("click", startSensors);

async function startSensors() {
  const status = document.getElementById("status");

  try {
    // iPhone permission
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

    let lastSent = 0;

    let sensorData = {
      alpha: 0,
      beta: 0,
      gamma: 0,
      ax: 0,
      ay: 0,
      az: 0,
    };

    // Gyroscope / Orientation
    window.addEventListener("deviceorientation", (event) => {
      sensorData.alpha = Math.round(event.alpha || 0);

      sensorData.beta = Math.round(event.beta || 0);

      sensorData.gamma = Math.round(event.gamma || 0);
    });

    // Accelerometer
    window.addEventListener("devicemotion", (event) => {
      const accel = event.accelerationIncludingGravity;

      sensorData.ax = Math.round((accel?.x || 0) * 100) / 100;

      sensorData.ay = Math.round((accel?.y || 0) * 100) / 100;

      sensorData.az = Math.round((accel?.z || 0) * 100) / 100;
    });

    // Send every 100ms
    setInterval(async () => {
      try {
        await updateDoc(roomRef, sensorData);
      } catch (err) {
        console.error(err);
      }
    }, 100);
  } catch (err) {
    console.error(err);

    status.textContent = "Sensor Error";
  }
}
