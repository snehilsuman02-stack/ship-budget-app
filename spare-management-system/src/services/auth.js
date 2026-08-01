import { auth, db, firebaseApi, isFirebaseConfigured } from "./firebase.js";

const TEST_USERNAME = "user";
const TEST_PASSWORD = "user";
const LOCAL_TEST_USER_KEY = "sms-local-test-user";

function loadLocalTestUser() {
  try {
    const raw = localStorage.getItem(LOCAL_TEST_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalTestUser(user) {
  localStorage.setItem(LOCAL_TEST_USER_KEY, JSON.stringify(user));
}

function clearLocalTestUser() {
  localStorage.removeItem(LOCAL_TEST_USER_KEY);
}

export function watchAuthState(onSignedIn, onSignedOut, onError) {
  if (!isFirebaseConfigured || !auth) {
    const localUser = loadLocalTestUser();
    if (localUser) onSignedIn(localUser);
    else onSignedOut();
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
  if (!isFirebaseConfigured || !auth) {
    if (String(email).trim().toLowerCase() === TEST_USERNAME && String(password) === TEST_PASSWORD) {
      const localUser = {
        uid: "local-test-user",
        email: "user@test.local",
        isLocalTest: true,
      };
      saveLocalTestUser(localUser);
      return localUser;
    }
    throw new Error("Invalid test credentials. Use user / user, or configure Firebase credentials.");
  }

  // Temporary test-period login: user / user
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
  if (!isFirebaseConfigured || !auth) {
    clearLocalTestUser();
    return;
  }
  await firebaseApi.signOut(auth);
}

export function watchUserRole(uid, callback, onError) {
  if (!isFirebaseConfigured || !db) {
    callback("admin");
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
          displayName: auth.currentUser?.email || "User",
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
