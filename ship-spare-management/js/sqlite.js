const SQLITE_TABLES = {
  spares: "spares",
  transactions: "transactions",
  purchaseRequests: "purchase-requests",
  equipment: "equipment",
  receipts: "receipts",
  ledger: "ledger",
  settings: "settings",
};

export function isSqliteAvailable() {
  return Boolean(window.sqlite?.get && window.sqlite?.set);
}

export async function readSqlite(table) {
  if (!isSqliteAvailable()) return null;
  return window.sqlite.get(SQLITE_TABLES[table] || table);
}

export async function writeSqlite(table, value) {
  if (!isSqliteAvailable()) return false;
  await window.sqlite.set(SQLITE_TABLES[table] || table, value);
  return true;
}

export async function removeSqlite(table) {
  if (!window.sqlite?.remove) return false;
  await window.sqlite.remove(SQLITE_TABLES[table] || table);
  return true;
}