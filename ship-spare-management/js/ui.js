import { NAV_STRUCTURE, SIDEBAR_STATE_KEY } from "./constants.js";
import { setHashRoute } from "./utils.js";

export function getSidebarState() {
  return localStorage.getItem(SIDEBAR_STATE_KEY) === "1";
}

export function applySidebarState() {
  const collapsed = getSidebarState();
  document.body.classList.toggle("sidebar-collapsed", collapsed);
}

export function toggleSidebarCollapsed() {
  const collapsed = !getSidebarState();
  localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "1" : "0");
  applySidebarState();
}

function createNavButton(item, currentRoute, badges = {}) {
  const active = currentRoute === item.key ? "active" : "";
  const badgeValue = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
  const badge = badgeValue > 0 ? `<span class="nav-badge">${badgeValue}</span>` : "";

  return `
    <button class="nav-item ${active}" type="button" data-route="${item.key}">
      <span class="nav-item-row">
        <span>${item.label}</span>
        ${badge}
      </span>
    </button>
  `;
}

export function renderSidebar({ route, badges = {} }) {
  const nav = document.getElementById("sidebar-nav");
  if (!nav) return;

  nav.innerHTML = NAV_STRUCTURE.map((group) => {
    const items = group.items.map((item) => createNavButton(item, route, badges)).join("");
    return `
      <section class="sidebar-group">
        <h3 class="sidebar-group-title">${group.group}</h3>
        ${items}
      </section>
    `;
  }).join("");

  nav.querySelectorAll("[data-route]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setHashRoute(btn.dataset.route || "dashboard");
      if (window.innerWidth <= 980) {
        document.getElementById("sidebar")?.classList.remove("open");
      }
    });
  });
}

export function updateStatusBadges({ online = false, syncState = "IDLE", role = "VIEWER" }) {
  const connectionBadge = document.getElementById("connection-badge");
  const syncBadge = document.getElementById("sync-badge");
  const roleBadge = document.getElementById("user-role-badge");

  if (connectionBadge) connectionBadge.textContent = online ? "ONLINE" : "OFFLINE";
  if (syncBadge) syncBadge.textContent = syncState;
  if (roleBadge) roleBadge.textContent = String(role || "VIEWER").toUpperCase();
}
