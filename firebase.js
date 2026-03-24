// SSOYA Firebase DB 연결 설정

import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, push, remove, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAyz7kFvcoNYH2PcDAhkEXaE_UXX1BB5G0",
  authDomain: "ssoya-a2ae2.firebaseapp.com",
  databaseURL: "https://ssoya-a2ae2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ssoya-a2ae2",
  storageBucket: "ssoya-a2ae2.firebasestorage.app",
  messagingSenderId: "643252613306",
  appId: "1:643252613306:web:0390fe79bb9ecedacb1283"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export async function fetchSongs() {
  try {
    const snapshot = await get(ref(db, "songs"));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.entries(data).map(([id, song]) => ({ id, ...song }));
  } catch (e) {
    console.error("Firebase fetch error:", e);
    return [];
  }
}

export async function addSong(songData) {
  const newRef = push(ref(db, "songs"));
  await set(newRef, songData);
  return newRef.key;
}

export async function updateSong(id, songData) {
  await update(ref(db, `songs/${id}`), songData);
}

export async function deleteSong(id) {
  await remove(ref(db, `songs/${id}`));
}

export async function setAllSongs(data) {
  await set(ref(db, "songs"), data);
}

export async function setSong(id, songData) {
  await set(ref(db, `songs/${id}`), songData);
}
