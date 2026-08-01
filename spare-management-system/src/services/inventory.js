import { create, patch, readCollection, upsert } from "./database.js";

const SPARES_PATH = "spares";

export async function saveSpare(spare) {
  const id = spare.id || crypto.randomUUID();
  await upsert(SPARES_PATH, id, {
    code: spare.code,
    name: spare.name,
    category: spare.category,
    qty: Number(spare.qty || 0),
    minQty: Number(spare.minQty || 0),
    location: spare.location || "",
    vendorId: spare.vendorId || "",
    updatedAt: Date.now(),
  });
  return id;
}

export async function receiveStock(spareId, quantity, meta) {
  const qty = Number(quantity || 0);
  const items = await readCollection(SPARES_PATH);
  const row = items.find((x) => x.id === spareId);
  if (!row) throw new Error("Spare not found");

  await patch(SPARES_PATH, spareId, {
    qty: Number(row.qty || 0) + qty,
    updatedAt: Date.now(),
  });

  await create("transactions", {
    type: "receive",
    spareId,
    qty,
    note: meta.note || "",
    actor: meta.actor,
    createdAt: Date.now(),
  });
}

export async function issueStock(spareId, quantity, meta) {
  const qty = Number(quantity || 0);
  const items = await readCollection(SPARES_PATH);
  const row = items.find((x) => x.id === spareId);
  if (!row) throw new Error("Spare not found");
  if (Number(row.qty || 0) < qty) throw new Error("Insufficient stock");

  const nextQty = Number(row.qty || 0) - qty;

  await patch(SPARES_PATH, spareId, {
    qty: nextQty,
    updatedAt: Date.now(),
  });

  await create("transactions", {
    type: "issue",
    spareId,
    qty,
    note: meta.note || "",
    actor: meta.actor,
    createdAt: Date.now(),
  });

  if (nextQty <= Number(row.minQty || 0)) {
    await create("alerts", {
      type: "low-stock",
      spareId,
      spareName: row.name,
      qty: nextQty,
      minQty: Number(row.minQty || 0),
      createdAt: Date.now(),
      status: "open",
    });
  }
}
