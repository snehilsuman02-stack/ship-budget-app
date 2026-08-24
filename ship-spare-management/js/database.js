import { getFirebaseContext } from "./firebase.js";

export async function getValue(path) {
  const { db, sdk } = getFirebaseContext();
  if (!db || !sdk?.ref || !sdk?.get) return null;

  const snapshot = await sdk.get(sdk.ref(db, path));
  return snapshot.val();
}

export function subscribe(path, callback) {
  const { db, sdk } = getFirebaseContext();
  if (!db || !sdk?.ref || !sdk?.onValue) {
    callback?.(null);
    return () => {};
  }

  const target = sdk.ref(db, path);
  return sdk.onValue(target, (snapshot) => callback?.(snapshot.val()));
}

export async function setValue(path, value) {
  const { db, sdk } = getFirebaseContext();
  if (!db || !sdk?.ref || !sdk?.set) {
    throw new Error("Database is not ready.");
  }

  await sdk.set(sdk.ref(db, path), value);
}

export async function patchValue(path, value) {
  const { db, sdk } = getFirebaseContext();
  if (!db || !sdk?.ref || !sdk?.update) {
    throw new Error("Database is not ready.");
  }

  await sdk.update(sdk.ref(db, path), value);
}
