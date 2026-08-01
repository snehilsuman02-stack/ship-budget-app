import { getFirebaseContext } from "./firebase.js";

const TEST_USERNAME = "user";
const TEST_PASSWORD = "user";

export function watchAuthState(onSignedIn, onSignedOut, onError) {
  const { auth, firebaseApi, isFirebaseConfigured } = getFirebaseContext();
  if (!isFirebaseConfigured || !auth || !firebaseApi.onAuthStateChanged) {
    if (onError) onError(new Error("Firebase authentication is not ready."));
    onSignedOut();
    return () => {};
  }

  return firebaseApi.onAuthStateChanged(
    auth,
    (user) => {
      if (user) onSignedIn(user);
      else onSignedOut();
    },
    (error) => {
      console.error("Auth state watch failed", error);
      if (onError) onError(error);
    }
  );
}

export async function signIn(email, password) {
  const { auth, firebaseApi, isFirebaseConfigured } = getFirebaseContext();
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase authentication is not configured.");
  }

  if (String(email).trim().toLowerCase() === TEST_USERNAME && String(password) === TEST_PASSWORD) {
    if (!firebaseApi.signInAnonymously) {
      throw new Error("Anonymous sign-in not available. Enable it in Firebase Authentication.");
    }
    const result = await firebaseApi.signInAnonymously(auth);
    return result.user;
  }

  const result = await firebaseApi.signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOutUser() {
  const { auth, firebaseApi } = getFirebaseContext();
  if (!auth || !firebaseApi.signOut) return;
  await firebaseApi.signOut(auth);
}

export async function ensureFirebaseSession() {
  const { auth, firebaseApi, isFirebaseConfigured } = getFirebaseContext();
  if (!isFirebaseConfigured || !auth) return null;
  if (auth.currentUser) return auth.currentUser;
  if (!firebaseApi.signInAnonymously) return null;

  try {
    const result = await firebaseApi.signInAnonymously(auth);
    return result.user || null;
  } catch (error) {
    console.warn("Silent Firebase session bootstrap failed", error);
    return null;
  }
}

export function watchUserRole(uid, callback, onError) {
  const { auth, db, firebaseApi, isFirebaseConfigured } = getFirebaseContext();
  if (!isFirebaseConfigured || !db || !firebaseApi.onValue || !firebaseApi.ref) {
    if (onError) onError(new Error("Firebase database is not ready."));
    callback("viewer");
    return () => {};
  }

  const roleRef = firebaseApi.ref(db, `users/${uid}`);
  return firebaseApi.onValue(
    roleRef,
    async (snapshot) => {
      const value = snapshot.val();
      if (!value) {
        await firebaseApi.set(roleRef, {
          role: "viewer",
          displayName: auth?.currentUser?.email || "User",
          createdAt: Date.now(),
        });
        callback("viewer");
        return;
      }
      callback(value.role || "viewer");
    },
    (error) => {
      console.error("Role watch failed", error);
      if (onError) onError(error);
    }
  );
}
