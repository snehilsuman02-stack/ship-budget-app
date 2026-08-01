import { db, firebaseApi } from "./firebase.js";

function normalizeSnapshot(snapshot) {
  const raw = snapshot.val() || {};
  return Object.entries(raw).map(([id, value]) => ({ id, ...value }));
}

export function subscribeCollection(path, callback, onError) {
  const target = firebaseApi.ref(db, path);
  return firebaseApi.onValue(
    target,
    (snapshot) => callback(normalizeSnapshot(snapshot)),
    (error) => {
      console.error("Realtime subscription failed", path, error);
      if (onError) onError(error);
    }
  );
}

export async function readCollection(path) {
  const target = firebaseApi.ref(db, path);
  const snapshot = await firebaseApi.get(target);
  return normalizeSnapshot(snapshot);
}

export async function upsert(path, id, payload) {
  const target = firebaseApi.ref(db, `${path}/${id}`);
  await firebaseApi.set(target, payload);
}

export async function patch(path, id, payload) {
  const target = firebaseApi.ref(db, `${path}/${id}`);
  await firebaseApi.update(target, payload);
}

export async function create(path, payload) {
  const target = firebaseApi.ref(db, path);
  const created = firebaseApi.push(target);
  await firebaseApi.set(created, payload);
  return created.key;
}

export async function removeById(path, id) {
  const target = firebaseApi.ref(db, `${path}/${id}`);
  await firebaseApi.remove(target);
}
