import { getFirebaseContext } from "./firebase.js";

const LOCAL_DB_KEY = "sms-local-db";
const LOCAL_DB_EVENT = "sms-local-db-changed";
const PENDING_OPS_KEY = "sms-pending-ops";

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

function readPendingOps() {
  try {
    const raw = localStorage.getItem(PENDING_OPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePendingOps(ops) {
  localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(ops));
}

function enqueuePendingOp(op) {
  const ops = readPendingOps();
  ops.push({ ...op, queuedAt: Date.now() });
  writePendingOps(ops);
}

function clearPendingOps() {
  localStorage.removeItem(PENDING_OPS_KEY);
}

function mutateLocalCollection(path, updater) {
  const dbData = loadLocalDb();
  const parts = getPathParts(path);
  if (parts.length !== 1) throw new Error("Nested paths are not supported in local mode.");
  const root = parts[0];
  dbData[root] = dbData[root] || {};
  dbData[root] = updater(dbData[root]);
  saveLocalDb(dbData);
}

function saveLocalCollection(path, rows) {
  const dbData = loadLocalDb();
  const parts = getPathParts(path);
  if (parts.length !== 1) throw new Error("Nested paths are not supported in local mode.");
  const root = parts[0];
  dbData[root] = Array.isArray(rows)
    ? rows.reduce((acc, row) => {
        if (row && row.id) acc[row.id] = { ...row, id: undefined };
        return acc;
      }, {})
    : {};
  saveLocalDb(dbData);
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

export function getLocalDbSnapshot() {
  return loadLocalDb();
}

function normalizeSnapshot(snapshot) {
  const raw = snapshot.val() || {};
  return Object.entries(raw).map(([id, value]) => ({ id, ...value }));
}

export function subscribeCollection(path, callback, onError) {
  const { db, firebaseApi, isFirebaseConfigured } = getFirebaseContext();
  if (!isFirebaseConfigured || !db) {
    const run = () => callback(readLocalCollection(path));
    run();
    window.addEventListener(LOCAL_DB_EVENT, run);
    return () => window.removeEventListener(LOCAL_DB_EVENT, run);
  }

  const target = firebaseApi.ref(db, path);
  return firebaseApi.onValue(
    target,
    (snapshot) => {
      const rows = normalizeSnapshot(snapshot);
      saveLocalCollection(path, rows);
      callback(rows);
    },
    (error) => {
      console.error("Realtime subscription failed", path, error);
      if (onError) onError(error);
    }
  );
}

export async function readCollection(path) {
  const { db, firebaseApi, isFirebaseConfigured } = getFirebaseContext();
  if (!isFirebaseConfigured || !db) {
    return readLocalCollection(path);
  }

  const target = firebaseApi.ref(db, path);
  const snapshot = await firebaseApi.get(target);
  return normalizeSnapshot(snapshot);
}

export async function upsert(path, id, payload) {
  const { db, firebaseApi, isFirebaseConfigured, isOfflineModeEnabled, deviceId } = getFirebaseContext();
  mutateLocalCollection(path, (collection) => {
    collection[id] = payload;
    return collection;
  });

  if (!isFirebaseConfigured || !db || isOfflineModeEnabled()) {
    enqueuePendingOp({ type: "upsert", path, id, payload, deviceId });
    return;
  }

  const target = firebaseApi.ref(db, `${path}/${id}`);
  await firebaseApi.set(target, payload);
}

export async function patch(path, id, payload) {
  const { db, firebaseApi, isFirebaseConfigured, isOfflineModeEnabled, deviceId } = getFirebaseContext();
  mutateLocalCollection(path, (collection) => {
    collection[id] = {
      ...(collection[id] || {}),
      ...payload,
    };
    return collection;
  });

  if (!isFirebaseConfigured || !db || isOfflineModeEnabled()) {
    enqueuePendingOp({ type: "patch", path, id, payload, deviceId });
    return;
  }

  const target = firebaseApi.ref(db, `${path}/${id}`);
  await firebaseApi.update(target, payload);
}

export async function create(path, payload) {
  const id = crypto.randomUUID();
  const { db, firebaseApi, isFirebaseConfigured, isOfflineModeEnabled, deviceId } = getFirebaseContext();

  mutateLocalCollection(path, (collection) => {
    collection[id] = payload;
    return collection;
  });

  if (!isFirebaseConfigured || !db || isOfflineModeEnabled()) {
    enqueuePendingOp({ type: "create", path, id, payload, deviceId });
    return id;
  }

  const target = firebaseApi.ref(db, path);
  const created = firebaseApi.push(target);
  await firebaseApi.set(created, payload);
  return created.key;
}

export async function removeById(path, id) {
  const { db, firebaseApi, isFirebaseConfigured, isOfflineModeEnabled, deviceId } = getFirebaseContext();
  mutateLocalCollection(path, (collection) => {
    if (collection[id]) delete collection[id];
    return collection;
  });

  if (!isFirebaseConfigured || !db || isOfflineModeEnabled()) {
    enqueuePendingOp({ type: "remove", path, id, deviceId });
    return;
  }

  const target = firebaseApi.ref(db, `${path}/${id}`);
  await firebaseApi.remove(target);
}

export async function syncLocalCollectionsToFirebase(collections = []) {
  const { db, firebaseApi, isFirebaseConfigured, firebaseReady } = getFirebaseContext();
  if (!isFirebaseConfigured || !db || !firebaseReady) {
    throw new Error("Firebase is not ready for sync.");
  }

  const localDb = loadLocalDb();
  for (const collection of collections) {
    const payload = localDb[collection] || {};
    const target = firebaseApi.ref(db, collection);
    await firebaseApi.set(target, payload);
  }
}

export async function flushPendingOpsToFirebase() {
  const { db, firebaseApi, isFirebaseConfigured, firebaseReady } = getFirebaseContext();
  if (!isFirebaseConfigured || !db || !firebaseReady) {
    throw new Error("Firebase is not ready for sync.");
  }

  const ops = readPendingOps();
  if (!ops.length) return 0;

  for (const op of ops) {
    if (op.type === "create" || op.type === "upsert") {
      await firebaseApi.set(firebaseApi.ref(db, `${op.path}/${op.id}`), op.payload);
    } else if (op.type === "patch") {
      await firebaseApi.update(firebaseApi.ref(db, `${op.path}/${op.id}`), op.payload);
    } else if (op.type === "remove") {
      await firebaseApi.remove(firebaseApi.ref(db, `${op.path}/${op.id}`));
    }
  }

  clearPendingOps();
  return ops.length;
}

export function hasPendingLocalSync() {
  return readPendingOps().length > 0;
}
