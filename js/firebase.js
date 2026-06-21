import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5qcyLsG-bXjje7ZCrUPgMWFsfDwY_Lgo",
  authDomain: "aichacha-91dba.firebaseapp.com",
  projectId: "aichacha-91dba",
  storageBucket: "aichacha-91dba.firebasestorage.app",
  messagingSenderId: "523777929014",
  appId: "1:523777929014:web:a72e15be5814ff55b8cd97",
  measurementId: "G-3MYXS1GM4L"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);