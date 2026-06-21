import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const statusEl = document.getElementById("status");

document.getElementById("createRoomBtn").addEventListener("click", createRoom);

async function createRoom() {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

  document.getElementById("roomId").textContent = roomId;

  await setDoc(doc(db, "rooms", roomId), {
    joined: false,
    createdAt: Date.now(),
  });

  const joinUrl = `${location.origin}${location.pathname.replace("index.html", "")}controller.html?room=${roomId}`;

  document.getElementById("qrcode").innerHTML = "";

  new QRCode(document.getElementById("qrcode"), joinUrl);

  console.log(joinUrl);

  onSnapshot(doc(db, "rooms", roomId), (snapshot) => {
    const data = snapshot.data();

    if (!data) return;

    if (data.joined) {
      statusEl.textContent = "Phone Connected ✅";
    }

    document.getElementById("alpha").textContent = data.alpha ?? 0;

    document.getElementById("beta").textContent = data.beta ?? 0;

    document.getElementById("gamma").textContent = data.gamma ?? 0;

    document.getElementById("ax").textContent = data.ax ?? 0;

    document.getElementById("ay").textContent = data.ay ?? 0;

    document.getElementById("az").textContent = data.az ?? 0;
  });
}
