const defaultFirebaseConfig = {
  apiKey: "REPLACE_WITH_API_KEY",
  authDomain: "REPLACE_WITH_AUTH_DOMAIN",
  databaseURL: "REPLACE_WITH_DATABASE_URL",
  projectId: "REPLACE_WITH_PROJECT_ID",
  storageBucket: "REPLACE_WITH_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_APP_ID",
};

let app = null;
let auth = null;
let db = null;
let storage = null;
let sdk = null;
let initialized = false;

export function getFirebaseConfig() {
  return { ...defaultFirebaseConfig };
}

export function isFirebaseConfigured(config = defaultFirebaseConfig) {
  return Object.values(config).every(
    (value) => typeof value === "string" && value.length > 0 && !value.startsWith("REPLACE_WITH_")
  );
}

export async function initializeFirebase() {
  if (initialized) {
    return { app, auth, db, storage, sdk, ready: true, configured: true };
  }

  const config = getFirebaseConfig();
  if (!isFirebaseConfigured(config)) {
    return { app: null, auth: null, db: null, storage: null, sdk: null, ready: false, configured: false };
  }

  try {
    const [appMod, authMod, dbMod, storageMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js"),
      import("https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js"),
    ]);

    app = appMod.initializeApp(config);
    auth = authMod.getAuth(app);
    db = dbMod.getDatabase(app);
    storage = storageMod.getStorage(app);
    sdk = {
      ...authMod,
      ...dbMod,
      ...storageMod,
    };
    initialized = true;

    return { app, auth, db, storage, sdk, ready: true, configured: true };
  } catch (error) {
    console.error("Firebase initialization failed", error);
    return { app: null, auth: null, db: null, storage: null, sdk: null, ready: false, configured: true, error };
  }
}

export function getFirebaseContext() {
  return { app, auth, db, storage, sdk, initialized };
}
