export const navItems = [
  { key: "dashboard", label: "Dashboard" },
  { key: "inventory", label: "Inventory" },
  { key: "receive", label: "Receive Spares" },
  { key: "issue", label: "Issue Spares" },
  { key: "purchase", label: "Purchase Requests" },
  { key: "vendors", label: "Vendors" },
  { key: "analytics", label: "Analytics" },
  { key: "reports", label: "Reports" },
  { key: "qr", label: "QR Code Management" },
  { key: "audit", label: "Audit Log" },
  { key: "settings", label: "Settings" },
];

export function renderSidebar(activeKey, allowedKeys) {
  const nav = document.getElementById("sidebar-nav");
  if (!nav) return;
  nav.innerHTML = navItems
    .filter((item) => allowedKeys.has("all") || allowedKeys.has(item.key))
    .map(
      (item) =>
        `<button class="nav-item ${item.key === activeKey ? "active" : ""}" type="button" data-nav="${item.key}">${item.label}</button>`
    )
    .join("");
}
