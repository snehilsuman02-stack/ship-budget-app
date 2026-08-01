import { firebaseConfig } from "../config/firebase-config.js";

const hasConfig = Object.values(firebaseConfig).every((v) => typeof v === "string" && v && !v.startsWith("REPLACE_"));
export const isFirebaseConfigured = hasConfig;
const OFFLINE_MODE_KEY = "sms-offline-mode";
const DEVICE_ID_KEY = "sms-device-id";

let app = null;
let auth = null;
let db = null;
let firebaseReady = false;

let firebaseApi = {
  signInWithEmailAndPassword: null,
  signInAnonymously: null,
  onAuthStateChanged: null,
  signOut: null,
  ref: null,
  set: null,
  push: null,
  onValue: null,
  remove: null,
  get: null,
  update: null,
  serverTimestamp: null,
};

function readOfflineMode() {
  try {
    return localStorage.getItem(OFFLINE_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

function getDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const generated = `device-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
    localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return "device-ephemeral";
  }
}

export function isOfflineModeEnabled() {
  return readOfflineMode();
}

export function setOfflineMode(enabled) {
  localStorage.setItem(OFFLINE_MODE_KEY, enabled ? "1" : "0");
}

if (!hasConfig) {
  console.warn("Firebase config is not set. Update src/config/firebase-config.js before production use.");
}

export async function initializeFirebase() {
  if (firebaseReady && app && auth && db) {
    return true;
  }

  const runtimeOffline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (runtimeOffline) {
    firebaseReady = false;
    return false;
  }

  if (!hasConfig) {
    firebaseReady = false;
    return false;
  }

  try {
    const [appMod, authMod, dbMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"),
    ]);

    app = app || appMod.initializeApp(firebaseConfig);
    auth = authMod.getAuth(app);
    db = dbMod.getDatabase(app);

    firebaseApi = {
      signInWithEmailAndPassword: authMod.signInWithEmailAndPassword,
      signInAnonymously: authMod.signInAnonymously,
      onAuthStateChanged: authMod.onAuthStateChanged,
      signOut: authMod.signOut,
      ref: dbMod.ref,
      set: dbMod.set,
      push: dbMod.push,
      onValue: dbMod.onValue,
      remove: dbMod.remove,
      get: dbMod.get,
      update: dbMod.update,
      serverTimestamp: dbMod.serverTimestamp,
    };

    firebaseReady = true;
    return true;
  } catch (error) {
    console.warn("Firebase SDK failed to initialize. Running in local test mode.", error);
    firebaseReady = false;
    return false;
  }
}

export function getFirebaseContext() {
  return {
    app,
    auth,
    db,
    firebaseApi,
    firebaseReady,
    isFirebaseConfigured,
    isOfflineModeEnabled: readOfflineMode(),
    deviceId: getDeviceId(),
  };
}
