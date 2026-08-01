import { create } from "./database.js";

export async function logAudit({ userId, role, action, module, payload }) {
  const entry = {
    userId,
    role,
    action,
    module,
    payload: payload || null,
    createdAt: Date.now(),
  };
  await create("auditLogs", entry);
}
