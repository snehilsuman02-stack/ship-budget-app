const permissions = {
  admin: new Set(["all"]),
  manager: new Set([
    "dashboard",
    "inventory",
    "receive",
    "issue",
    "purchase",
    "vendors",
    "analytics",
    "reports",
    "qr",
    "audit",
    "settings",
  ]),
  operator: new Set(["dashboard", "inventory", "receive", "issue", "qr", "reports"]),
  viewer: new Set(["dashboard", "inventory", "analytics", "reports"]),
};

export function canAccess(role, moduleKey) {
  const set = permissions[role] || permissions.viewer;
  return set.has("all") || set.has(moduleKey);
}
