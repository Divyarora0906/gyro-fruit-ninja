import { db } from "./firebase.js";

import {
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const roomId =
  new URLSearchParams(location.search)
    .get("room");

const roomRef = doc(db, "rooms", roomId);

document.getElementById("room").textContent =
  `Room: ${roomId}`;

await updateDoc(roomRef, {
  joined: true
});

document
  .getElementById("startBtn")
  .addEventListener("click", startSensors);

async function startSensors() {

  const status =
    document.getElementById("status");

  try {

    // iPhone permission
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {

      const permission =
        await DeviceOrientationEvent.requestPermission();

      if (permission !== "granted") {
        status.textContent =
          "Permission Denied";
        return;
      }
    }

    status.textContent =
      "Sensors Active ✅";

    let lastSent = 0;

    window.addEventListener(
      "deviceorientation",
      async (event) => {

        const now = Date.now();

        // send every 100ms
        if (now - lastSent < 100) return;

        lastSent = now;

        await updateDoc(roomRef, {
          alpha: Math.round(event.alpha || 0),
          beta: Math.round(event.beta || 0),
          gamma: Math.round(event.gamma || 0)
        });

      }
    );

  } catch (err) {

    console.error(err);

    status.textContent =
      "Sensor Error";

  }
}