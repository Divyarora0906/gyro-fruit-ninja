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
    statusEl.textContent = "Creating signaling channel... ⏳";

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
      ]
    });

    pc.oniceconnectionstatechange = () => {
      statusEl.textContent = `ICE State: ${pc.iceConnectionState} 📡`;
    };
    pc.onconnectionstatechange = () => {
      statusEl.textContent = `Conn State: ${pc.connectionState} 🔗`;
    };

    const hostCandidates = collection(db, "rooms", roomId, "hostCandidates");
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(hostCandidates, event.candidate.toJSON());
      }
    };

    // Classic WebRTC: Host creates the channel explicitly
    const channel = pc.createDataChannel("controller");
    channel.onopen = () => { statusEl.textContent = "Data Channel OPEN! Ready 🚀"; };
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        cursor.style.left = `${385 + data.gamma * 4}px`;
        cursor.style.top = `${235 + data.beta * 4}px`;
        document.getElementById("alpha").textContent = data.alpha ?? 0;
        document.getElementById("beta").textContent = data.beta ?? 0;
        document.getElementById("gamma").textContent = data.gamma ?? 0;
        document.getElementById("ax").textContent = data.ax ?? 0;
        document.getElementById("ay").textContent = data.ay ?? 0;
        document.getElementById("az").textContent = data.az ?? 0;
      } catch { console.log(event.data); }
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
    statusEl.textContent = "Waiting for phone to scan... 📱";

    let listeningToGuests = false;
    onSnapshot(doc(db, "rooms", roomId), async (snapshot) => {
      const data = snapshot.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        statusEl.textContent = "Connecting to phone... 🔄";
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
    statusEl.textContent = `Host Error: ${err.message} ❌`;
  }
}