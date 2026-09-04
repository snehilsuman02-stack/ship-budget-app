import { getFirebaseContext } from "./firebase.js";
import { readSqlite, writeSqlite } from "./sqlite.js";

export async function getValue(path) {
  const { db, sdk } = getFirebaseContext();
  if (!db || !sdk?.ref || !sdk?.get) {
    const [table, id] = String(path).split("/");
    const value = await readSqlite(table);
    return id && value ? value[id] ?? null : value;
  }

  const snapshot = await sdk.get(sdk.ref(db, path));
  return snapshot.val();
}

export function subscribe(path, callback) {
  const { db, sdk } = getFirebaseContext();
  if (!db || !sdk?.ref || !sdk?.onValue) {
    getValue(path).then((value) => callback?.(value)).catch(() => callback?.(null));
    return () => {};
  }

  const target = sdk.ref(db, path);
  return sdk.onValue(target, (snapshot) => callback?.(snapshot.val()));
}

export async function setValue(path, value) {
  const { db, sdk } = getFirebaseContext();
  if (!db || !sdk?.ref || !sdk?.set) {
    const [table, id] = String(path).split("/");
    if (id) {
      const current = (await readSqlite(table)) || {};
      await writeSqlite(table, { ...current, [id]: value });
    } else {
      await writeSqlite(table, value);
    }
    return;
  }

  await sdk.set(sdk.ref(db, path), value);
}

export async function patchValue(path, value) {
  const { db, sdk } = getFirebaseContext();
  if (!db || !sdk?.ref || !sdk?.update) {
    const [table, id] = String(path).split("/");
    const current = (await readSqlite(table)) || {};
    if (id) {
      await writeSqlite(table, { ...current, [id]: { ...(current[id] || {}), ...value } });
    } else {
      await writeSqlite(table, { ...current, ...value });
    }
    return;
  }

  await sdk.update(sdk.ref(db, path), value);
}
