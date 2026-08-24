import { getFirebaseContext } from "./firebase.js";

export function watchAuthState(onSignedIn, onSignedOut) {
  const { auth, sdk } = getFirebaseContext();
  if (!auth || !sdk?.onAuthStateChanged) {
    onSignedOut?.();
    return () => {};
  }

  return sdk.onAuthStateChanged(auth, (user) => {
    if (user) onSignedIn?.(user);
    else onSignedOut?.();
  });
}

export async function signInWithEmail(email, password) {
  const { auth, sdk } = getFirebaseContext();
  if (!auth || !sdk?.signInWithEmailAndPassword) {
    throw new Error("Firebase Auth is not ready.");
  }

  const result = await sdk.signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOutUser() {
  const { auth, sdk } = getFirebaseContext();
  if (!auth || !sdk?.signOut) return;
  await sdk.signOut(auth);
}
