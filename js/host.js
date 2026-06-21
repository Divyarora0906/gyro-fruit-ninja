import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

document.getElementById("createRoomBtn").addEventListener("click", createRoom);

async function createRoom() {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

  await setDoc(doc(db, "rooms", roomId), {
    joined: false,
    createdAt: Date.now(),
  });
  new QRCode(document.getElementById("qrcode"), joinUrl);

  document.getElementById("roomId").textContent = roomId;
}

const joinUrl = `${location.origin}/controller.html?room=${roomId}`;
console.log(joinUrl);
const statusEl = document.getElementById("status");

onSnapshot(doc(db, "rooms", roomId), (snapshot) => {
  const data = snapshot.data();

  if (data?.joined) {
    statusEl.textContent = "Phone Connected ✅";
  }
  document.getElementById("alpha").textContent = data.alpha ?? 0;

  document.getElementById("beta").textContent = data.beta ?? 0;

  document.getElementById("gamma").textContent = data.gamma ?? 0;
});
