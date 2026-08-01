import { db, firebaseApi, isFirebaseConfigured } from "./firebase.js";

const LOCAL_DB_KEY = "sms-local-db";
const LOCAL_DB_EVENT = "sms-local-db-changed";

function getPathParts(path) {
  return String(path || "").split("/").filter(Boolean);
}

function loadLocalDb() {
  const empty = {
    spares: {},
    transactions: {},
    purchaseRequests: {},
    vendors: {},
    alerts: {},
    auditLogs: {},
    users: {},
  };
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

function saveLocalDb(data) {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(LOCAL_DB_EVENT));
}

function readLocalCollection(path) {
  const dbData = loadLocalDb();
  const parts = getPathParts(path);
  let node = dbData;
  for (const part of parts) {
    node = node?.[part];
    if (!node) return [];
  }
  return Object.entries(node || {}).map(([id, value]) => ({ id, ...value }));
}

function normalizeSnapshot(snapshot) {
  const raw = snapshot.val() || {};
  return Object.entries(raw).map(([id, value]) => ({ id, ...value }));
}

export function subscribeCollection(path, callback, onError) {
  if (!isFirebaseConfigured || !db) {
    const run = () => callback(readLocalCollection(path));
    run();
    window.addEventListener(LOCAL_DB_EVENT, run);
    return () => window.removeEventListener(LOCAL_DB_EVENT, run);
  }

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
  if (!isFirebaseConfigured || !db) {
    return readLocalCollection(path);
  }

  const target = firebaseApi.ref(db, path);
  const snapshot = await firebaseApi.get(target);
  return normalizeSnapshot(snapshot);
}

export async function upsert(path, id, payload) {
  if (!isFirebaseConfigured || !db) {
    const dbData = loadLocalDb();
    const parts = getPathParts(path);
    if (parts.length !== 1) throw new Error("Nested paths are not supported in local mode for upsert.");
    const root = parts[0];
    dbData[root] = dbData[root] || {};
    dbData[root][id] = payload;
    saveLocalDb(dbData);
    return;
  }

  const target = firebaseApi.ref(db, `${path}/${id}`);
  await firebaseApi.set(target, payload);
}

export async function patch(path, id, payload) {
  if (!isFirebaseConfigured || !db) {
    const dbData = loadLocalDb();
    const parts = getPathParts(path);
    if (parts.length !== 1) throw new Error("Nested paths are not supported in local mode for patch.");
    const root = parts[0];
    dbData[root] = dbData[root] || {};
    dbData[root][id] = {
      ...(dbData[root][id] || {}),
      ...payload,
    };
    saveLocalDb(dbData);
    return;
  }

  const target = firebaseApi.ref(db, `${path}/${id}`);
  await firebaseApi.update(target, payload);
}

export async function create(path, payload) {
  if (!isFirebaseConfigured || !db) {
    const id = crypto.randomUUID();
    await upsert(path, id, payload);
    return id;
  }

  const target = firebaseApi.ref(db, path);
  const created = firebaseApi.push(target);
  await firebaseApi.set(created, payload);
  return created.key;
}

export async function removeById(path, id) {
  if (!isFirebaseConfigured || !db) {
    const dbData = loadLocalDb();
    const parts = getPathParts(path);
    if (parts.length !== 1) throw new Error("Nested paths are not supported in local mode for delete.");
    const root = parts[0];
    if (dbData[root] && dbData[root][id]) {
      delete dbData[root][id];
      saveLocalDb(dbData);
    }
    return;
  }

  const target = firebaseApi.ref(db, `${path}/${id}`);
  await firebaseApi.remove(target);
}
