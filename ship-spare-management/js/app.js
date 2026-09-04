import { APP_BRAND, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, THEME_STORAGE_KEY } from "./constants.js";
import { getHashRoute, debounce } from "./utils.js";
import { showToast } from "./notifications.js";
import { renderSidebar, updateStatusBadges, applySidebarState, toggleSidebarCollapsed } from "./ui.js";
import { renderDashboard } from "./dashboard.js";
import { renderCriticalSpares } from "./critical-spares.js";
import { renderInventory } from "./inventory.js";
import { renderStockStatus } from "./stock-status.js";
import { renderReceiving } from "./receiving.js";
import { renderIssuing } from "./issuing.js";
import { renderLedger } from "./ledger.js";
import { renderEquipment, hydrateEquipment } from "./equipment.js";
import { renderVendors } from "./vendors.js";
import { renderProcurement } from "./procurement.js";
import { renderQr } from "./qr.js";
import { renderAnalytics } from "./analytics.js";
import { renderReports } from "./reports.js";
import { renderAudit } from "./audit.js";
import { renderUsers } from "./users.js";
import { renderSettings } from "./settings.js";
import { createPlaceholderModule } from "./module-template.js";
import { isSqliteAvailable, readSqlite, writeSqlite } from "./sqlite.js";

const fallback = createPlaceholderModule("Module", "This module is scaffolded and will be implemented in upcoming phases.");

const routeRenderers = {
  dashboard: renderDashboard,
  inventory: renderInventory,
  "critical-spares": renderCriticalSpares,
  "low-stock": (container, state) => renderStockStatus(container, state, "low"),
  "out-of-stock": (container, state) => renderStockStatus(container, state, "out"),
  "expiring-items": fallback,
  receive: renderReceiving,
  issue: renderIssuing,
  "stock-ledger": renderLedger,
  "adjust-stock": fallback,
  equipment: renderEquipment,
  "equipment-wise-spares": fallback,
  "critical-equipment": fallback,
  "purchase-requests": renderProcurement,
  "pending-requests": fallback,
  "purchase-history": fallback,
  vendors: renderVendors,
  "qr-management": renderQr,
  "scan-qr": fallback,
  "generate-labels": fallback,
  analytics: renderAnalytics,
  "stock-analytics": fallback,
  "procurement-analytics": fallback,
  reports: renderReports,
  "stock-ledger-report": fallback,
  "consumption-report": fallback,
  "critical-spare-report": fallback,
  "purchase-report": fallback,
  "audit-report": fallback,
  users: renderUsers,
  "audit-log": renderAudit,
  settings: (container, currentState) => renderSettings(container, currentState, saveSettings),
  help: fallback,
};

const DEMO_SPARES = [
  {
    spareId: "SP-0001",
    spareName: "Fuel Pump Seal Kit",
    partNumber: "FP-120A",
    nsn: "4820-01-234-5678",
    manufacturer: "Wartsila",
    category: "Engine",
    equipmentName: "Main Engine",
    location: "Engine Room",
    quantityAvailable: 8,
    minimumStockLevel: 4,
    reorderLevel: 5,
    maximumStockLevel: 20,
    criticality: "Critical",
    lastIssue: "2026-08-20",
    lastReceipt: "2026-08-10",
    description: "Seal kit for fuel pump assembly.",
  },
  {
    spareId: "SP-0002",
    spareName: "Air Filter Element",
    partNumber: "AF-440",
    nsn: "2940-01-100-2340",
    manufacturer: "Mitsubishi",
    category: "Air Systems",
    equipmentName: "Compressor",
    location: "Workshop",
    quantityAvailable: 14,
    minimumStockLevel: 6,
    reorderLevel: 8,
    maximumStockLevel: 30,
    criticality: "Non-Critical",
    lastIssue: "2026-08-17",
    lastReceipt: "2026-08-08",
    description: "High-efficiency air filter element.",
  },
  {
    spareId: "SP-0003",
    spareName: "Bearing Kit",
    partNumber: "BK-914",
    nsn: "3110-01-121-2340",
    manufacturer: "SKF",
    category: "Mechanical",
    equipmentName: "Pump Motor",
    location: "Store Room",
    quantityAvailable: 2,
    minimumStockLevel: 4,
    reorderLevel: 5,
    maximumStockLevel: 16,
    criticality: "Critical",
    lastIssue: "2026-08-14",
    lastReceipt: "2026-08-04",
    description: "Bearing replacement kit for motor units.",
  },
];

const state = {
  route: getHashRoute(),
  online: navigator.onLine,
  syncState: "IDLE",
  role: "viewer",
  user: null,
  settings: { ...DEFAULT_SETTINGS },
  spares: [],
  transactions: [
    {
      date: "2026-08-20",
      transactionType: "Issue",
      spareName: "Fuel Pump Seal Kit",
      quantity: 2,
      reference: "WO-2215",
      timestamp: Date.now() - 86400000,
    },
    {
      date: "2026-08-18",
      transactionType: "Receipt",
      spareName: "Air Filter Element",
      quantity: 6,
      reference: "PO-4451",
      timestamp: Date.now() - 172800000,
    },
  ],
  purchaseRequests: [],
  equipment: [],
};

const unsubscribers = [];

async function hydrateStateData() {
  const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (savedSettings) {
    try {
      state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings), currency: "INR" };
    } catch (error) {
      console.warn("Saved settings could not be loaded.", error);
    }
  }

  const savedSpares = localStorage.getItem("ssms-spares");
  const sqliteSpares = await readSqlite("spares");
  state.spares = sqliteSpares ? Object.values(sqliteSpares) : savedSpares ? JSON.parse(savedSpares) : [...DEMO_SPARES];
  if (isSqliteAvailable() && !sqliteSpares) await writeSqlite("spares", state.spares.reduce((map, item) => ({ ...map, [item.spareId]: item }), {}));

  const sqliteTransactions = await readSqlite("transactions");
  if (sqliteTransactions) state.transactions = Object.values(sqliteTransactions);
  else if (isSqliteAvailable()) await writeSqlite("transactions", state.transactions.reduce((map, item, index) => ({ ...map, [item.transactionId || `seed-${index}`]: item }), {}));
  hydrateEquipment(state);
}

function calculateBadges() {
  const lowStockCount = state.spares.filter(
    (x) => Number(x.quantityAvailable || 0) > 0 && Number(x.quantityAvailable || 0) <= Number(x.reorderLevel || 0)
  ).length;

  return {
    lowStockCount,
    outOfStockCount: state.spares.filter((x) => Number(x.quantityAvailable || 0) <= 0).length,
    criticalCount: state.spares.filter((x) => (x.natureOfSpares || x.criticality) === "Critical").length,
    pendingPrCount: state.purchaseRequests.filter((x) => ["Submitted", "Under Review", "Approved", "Ordered"].includes(x.status)).length,
  };
}

function saveSettings(nextSettings) {
  state.settings = nextSettings ? { ...DEFAULT_SETTINGS, ...nextSettings, currency: "INR" } : { ...DEFAULT_SETTINGS };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings));
  localStorage.setItem(THEME_STORAGE_KEY, state.settings.theme);
  applyTheme();
  initBranding();
  render();
  showToast(nextSettings ? "Settings saved." : "Settings reset to defaults.", "success");
}

function render() {
  const container = document.getElementById("app-content");
  if (!container) return;

  renderSidebar({ route: state.route, badges: calculateBadges() });
  updateStatusBadges({ online: state.online, syncState: state.syncState, role: state.role });

  const renderer = routeRenderers[state.route] || fallback;
  renderer(container, state);
  renderGlobalSearchResults();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openSpareDetailsWindow(spare) {
  const spareName = spare.spareName || spare.name || spare.partNumber || spare.code || "Unnamed Spare";
  const partNumber = spare.partNumber || spare.code || "-";
  const quantity = Number(spare.quantityAvailable ?? spare.qty ?? 0);
  const nature = spare.natureOfSpares || spare.criticality || "Non-Critical";
  const details = [
    ["Spare ID", spare.spareId || "-"],
    ["Part Number", partNumber],
    ["NSN", spare.nsn || "-"],
    ["Manufacturer Part Number", spare.manufacturerPartNumber || "-"],
    ["Manufacturer", spare.manufacturer || "-"],
    ["Equipment", spare.equipmentName || spare.equipment || "-"],
    ["Category", spare.category || "-"],
    ["Nature of Spares", nature],
    ["Available Quantity", quantity],
    ["Minimum Stock Level", spare.minimumStockLevel ?? spare.minQty ?? "-"],
    ["Reorder Level", spare.reorderLevel ?? "-"],
    ["Maximum Stock Level", spare.maximumStockLevel ?? "-"],
    ["Location", spare.location || "-"],
    ["Compartment", spare.compartment || "-"],
    ["Rack", spare.rack || "-"],
    ["Shelf", spare.shelf || "-"],
    ["Bin", spare.bin || "-"],
    ["Last Issue", spare.lastIssue || "-"],
    ["Last Receipt", spare.lastReceipt || "-"],
    ["Description", spare.description || "-"],
    ["Remarks", spare.remarks || "-"],
  ];

  const detailsWindow = window.open("", "_blank", "width=920,height=760,resizable=yes,scrollbars=yes");
  if (!detailsWindow) {
    showToast("Unable to open spare details. Please allow pop-ups for this site.", "error", 4500);
    return;
  }

  detailsWindow.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(spareName)} | SSMS</title>
        <style>
          :root { color-scheme: light; font-family: Manrope, Segoe UI, Arial, sans-serif; color: #10263d; background: #edf3f9; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; }
          .page { max-width: 880px; margin: 0 auto; background: #fff; border: 1px solid #d5e0ec; border-radius: 16px; box-shadow: 0 16px 36px rgba(4, 18, 32, .14); overflow: hidden; }
          header { padding: 24px 28px; color: #fff; background: linear-gradient(120deg, #0c2238, #205a82); }
          header p { margin: 6px 0 0; color: #c8e0f6; font-size: 13px; }
          h1 { margin: 0; font-size: 25px; }
          .actions { display: flex; gap: 10px; padding: 18px 28px 0; }
          button { border: 0; border-radius: 8px; padding: 10px 14px; color: #fff; background: #247bb5; cursor: pointer; font-weight: 700; }
          button.secondary { color: #18324a; background: #e5edf5; }
          dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; margin: 18px 28px 28px; }
          .field { padding: 14px 12px; border-bottom: 1px solid #e2eaf2; }
          dt { color: #718196; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
          dd { margin: 5px 0 0; font-size: 15px; font-weight: 700; overflow-wrap: anywhere; }
          @media (max-width: 620px) { body { padding: 10px; } dl { grid-template-columns: 1fr; margin: 12px 16px 18px; } header { padding: 20px 16px; } .actions { padding: 14px 16px 0; } }
          @media print { body { padding: 0; background: #fff; } .page { border: 0; box-shadow: none; } .actions { display: none; } }
        </style>
      </head>
      <body>
        <main class="page">
          <header><h1>${escapeHtml(spareName)}</h1><p>SSMS Spare Details · ${escapeHtml(partNumber)}</p></header>
          <div class="actions"><button type="button" onclick="window.print()">Print Details</button><button class="secondary" type="button" onclick="window.close()">Close Window</button></div>
          <dl>${details.map(([label, value]) => `<div class="field"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
        </main>
      </body>
    </html>
  `);
  detailsWindow.document.close();
  detailsWindow.focus();
}

function renderGlobalSearchResults(query = document.getElementById("global-search")?.value || "") {
  const input = document.getElementById("global-search");
  const resultsHost = document.getElementById("global-search-results");
  if (!input || !resultsHost) return;

  const normalizedQuery = String(query).trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    resultsHost.innerHTML = "";
    resultsHost.classList.add("hidden");
    input.setAttribute("aria-expanded", "false");
    return;
  }

  const results = state.spares.filter((item) => {
    const searchableText = [
      item.spareName || item.name,
      item.partNumber || item.code,
      item.nsn,
      item.equipmentName || item.equipment,
      item.location,
      item.manufacturer,
      item.natureOfSpares,
      item.criticality,
    ]
      .join(" ")
      .toLowerCase();
    return searchableText.includes(normalizedQuery);
  });

  if (!results.length) {
    resultsHost.innerHTML = '<div class="global-search-empty">No matching spares found.</div>';
    resultsHost.classList.remove("hidden");
    input.setAttribute("aria-expanded", "true");
    return;
  }

  resultsHost.innerHTML = results
    .slice(0, 12)
    .map(
      (item) => `
        <button class="global-search-result" type="button" role="option" data-spare-id="${item.spareId || ""}">
          <strong>${item.spareName || item.name || item.partNumber || item.code || "Unnamed Spare"}</strong>
          <small>${item.partNumber || item.code || "No part number"} · ${item.equipmentName || item.equipment || "No equipment"} · Qty ${Number(item.quantityAvailable ?? item.qty ?? 0)}</small>
        </button>
      `
    )
    .join("");

  resultsHost.classList.remove("hidden");
  input.setAttribute("aria-expanded", "true");

  resultsHost.querySelectorAll("[data-spare-id]").forEach((result) => {
    result.addEventListener("click", () => {
      const spare = state.spares.find((item) => item.spareId === result.dataset.spareId);
      if (!spare) return;
      input.value = spare.spareName || spare.name || spare.partNumber || spare.code || "";
      resultsHost.classList.add("hidden");
      input.setAttribute("aria-expanded", "false");
      openSpareDetailsWindow(spare);
    });
  });
}

function applyTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  document.documentElement.dataset.theme = savedTheme || state.settings.theme || "light";
}

function bindGlobalEvents() {
  window.addEventListener("hashchange", () => {
    state.route = getHashRoute();
    render();
  });

  window.addEventListener("online", () => {
    state.online = true;
    updateStatusBadges({ online: true, syncState: state.syncState, role: state.role });
    showToast("Connection restored. Cloud sync resumed.", "success");
  });

  window.addEventListener("offline", () => {
    state.online = false;
    updateStatusBadges({ online: false, syncState: state.syncState, role: state.role });
    showToast("You are offline. Changes will sync when online.", "info");
  });

  document.getElementById("menu-toggle")?.addEventListener("click", () => {
    if (window.innerWidth <= 980) {
      document.getElementById("sidebar")?.classList.toggle("open");
      return;
    }
    toggleSidebarCollapsed();
  });

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_STORAGE_KEY, next);
  });

  const searchInput = document.getElementById("global-search");
  if (searchInput) {
    const handleSearch = debounce((event) => {
      renderGlobalSearchResults(event.target.value);
    }, 250);
    searchInput.addEventListener("input", handleSearch);
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.addEventListener("focus", () => renderGlobalSearchResults(searchInput.value));
    searchInput.addEventListener("click", () => renderGlobalSearchResults(searchInput.value));
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        renderGlobalSearchResults(searchInput.value);
      }
    });
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        document.getElementById("global-search-results")?.classList.add("hidden");
        searchInput.setAttribute("aria-expanded", "false");
      }
    });
    document.getElementById("global-search-button")?.addEventListener("click", () => {
      renderGlobalSearchResults(searchInput.value);
      searchInput.focus();
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".global-search-wrap")) {
        document.getElementById("global-search-results")?.classList.add("hidden");
        searchInput.setAttribute("aria-expanded", "false");
      }
    });
  }

}

async function initBranding() {
  document.getElementById("brand-title").textContent = state.settings.shipName || APP_BRAND.title;
  document.getElementById("brand-subtitle").textContent = state.settings.subtitle || APP_BRAND.subtitle;
  document.title = state.settings.shipName || APP_BRAND.title;
}

async function init() {
  await hydrateStateData();
  applyTheme();
  applySidebarState();
  await initBranding();
  bindGlobalEvents();

  state.syncState = isSqliteAvailable() ? "LOCAL SQLITE" : "LOCAL STORAGE";
  render();
}

init();
