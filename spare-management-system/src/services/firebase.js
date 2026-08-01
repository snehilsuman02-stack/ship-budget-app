import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  remove,
  get,
  update,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "../config/firebase-config.js";

const hasConfig = Object.values(firebaseConfig).every((v) => typeof v === "string" && v && !v.startsWith("REPLACE_"));
export const isFirebaseConfigured = hasConfig;

if (!hasConfig) {
  console.warn("Firebase config is not set. Update src/config/firebase-config.js before production use.");
}

export const app = hasConfig ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getDatabase(app) : null;

export const firebaseApi = {
  signInWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  ref,
  set,
  push,
  onValue,
  remove,
  get,
  update,
  serverTimestamp,
};
