import { firebaseConfig } from "../config/firebase-config.js";

const hasConfig = Object.values(firebaseConfig).every((v) => typeof v === "string" && v && !v.startsWith("REPLACE_"));
export const isFirebaseConfigured = hasConfig;

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

if (!hasConfig) {
  console.warn("Firebase config is not set. Update src/config/firebase-config.js before production use.");
}

export async function initializeFirebase() {
  if (firebaseReady && app && auth && db) {
    return true;
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
    console.warn("Firebase SDK failed to initialize.", error);
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
  };
}
