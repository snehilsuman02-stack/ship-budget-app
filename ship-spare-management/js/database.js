import { readSqlite, writeSqlite } from "./sqlite.js";

export async function getValue(path) {
  const [table, id] = String(path).split("/");
  const value = await readSqlite(table);
  return id && value ? value[id] ?? null : value;
}

export function subscribe(path, callback) {
  getValue(path).then((value) => callback?.(value)).catch(() => callback?.(null));
  return () => {};
}

export async function setValue(path, value) {
  const [table, id] = String(path).split("/");
  if (id) {
    const current = (await readSqlite(table)) || {};
    await writeSqlite(table, { ...current, [id]: value });
  } else {
    await writeSqlite(table, value);
  }
}

export async function patchValue(path, value) {
  const [table, id] = String(path).split("/");
  const current = (await readSqlite(table)) || {};
  if (id) {
    await writeSqlite(table, { ...current, [id]: { ...(current[id] || {}), ...value } });
  } else {
    await writeSqlite(table, { ...current, ...value });
  }
}
