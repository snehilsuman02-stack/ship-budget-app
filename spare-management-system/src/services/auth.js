import { auth, db, firebaseApi } from "./firebase.js";

export function watchAuthState(onSignedIn, onSignedOut, onError) {
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
  const result = await firebaseApi.signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOutUser() {
  await firebaseApi.signOut(auth);
}

export function watchUserRole(uid, callback, onError) {
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
