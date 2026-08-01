import { canAccess } from "./services/rbac.js";
import { renderDashboard } from "./modules/dashboard.js";
import { renderInventory } from "./modules/inventory.js";
import { renderReceive } from "./modules/receive.js";
import { renderIssue } from "./modules/issue.js";
import { renderPurchase } from "./modules/purchase.js";
import { renderVendors } from "./modules/vendors.js";
import { renderAnalytics } from "./modules/analytics.js";
import { renderReports } from "./modules/reports.js";
import { renderQrManagement } from "./modules/qr-management.js";
import { renderAuditLog } from "./modules/audit-log.js";
import { renderSettings } from "./modules/settings.js";

const renderers = {
  dashboard: renderDashboard,
  inventory: renderInventory,
  receive: renderReceive,
  issue: renderIssue,
  purchase: renderPurchase,
  vendors: renderVendors,
  analytics: renderAnalytics,
  reports: renderReports,
  qr: renderQrManagement,
  audit: renderAuditLog,
  settings: renderSettings,
};

export function renderModule(container, state, ctx) {
  const key = state.currentModule;
  if (!canAccess(state.role, key)) {
    container.innerHTML = '<section class="card"><h3>Access Denied</h3><p class="meta">Your role does not have access to this module.</p></section>';
    return;
  }

  const renderer = renderers[key] || renderers.dashboard;
  renderer(container, state, ctx);
}
