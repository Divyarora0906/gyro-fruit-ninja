const cursor = document.getElementById("cursor");
import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const statusEl = document.getElementById("status");
document.getElementById("createRoomBtn").addEventListener("click", createRoom);

async function createRoom() {
  try {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById("roomId").textContent = roomId;
    statusEl.textContent = "Setting up WebRTC... ⏳";

    // Clean, direct configuration optimal for local Wi-Fi networks
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.oniceconnectionstatechange = () => {
      statusEl.textContent = `ICE: ${pc.iceConnectionState} 📡`;
    };
    pc.onconnectionstatechange = () => {
      statusEl.textContent = `Conn: ${pc.connectionState} 🔗`;
    };

    const hostCandidates = collection(db, "rooms", roomId, "hostCandidates");
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(hostCandidates, event.candidate.toJSON());
      }
    };

    const channel = pc.createDataChannel("controller");
    channel.onopen = () => { statusEl.textContent = "Connected! 🚀 Ready to Play"; };
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        cursor.style.left = `${385 + data.gamma * 4}px`;
        cursor.style.top = `${235 + data.beta * 4}px`;
        document.getElementById("alpha").textContent = data.alpha ?? 0;
        document.getElementById("beta").textContent = data.beta ?? 0;
        document.getElementById("gamma").textContent = data.gamma ?? 0;
      } catch (e) { console.log(event.data); }
    };

    await setDoc(doc(db, "rooms", roomId), { joined: false, createdAt: Date.now() });
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await updateDoc(doc(db, "rooms", roomId), {
      offer: { type: offer.type, sdp: offer.sdp },
    });

    const joinUrl = `${location.origin}${location.pathname.replace("index.html", "")}controller.html?room=${roomId}`;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), joinUrl);
    statusEl.textContent = "Waiting for phone scan... 📱";

    let listeningToGuests = false;
    onSnapshot(doc(db, "rooms", roomId), async (snapshot) => {
      const data = snapshot.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        
        if (!listeningToGuests) {
          listeningToGuests = true;
          onSnapshot(collection(db, "rooms", roomId, "guestCandidates"), (snap) => {
            snap.docChanges().forEach(async (change) => {
              if (change.type === "added") {
                try { await pc.addIceCandidate(new RTCIceCandidate(change.doc.data())); } catch(e){}
              }
            });
          });
        }
      }
    });

  } catch (err) {
    statusEl.textContent = `Error: ${err.message} ❌`;
  }
}