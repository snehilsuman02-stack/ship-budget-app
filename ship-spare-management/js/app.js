import { initializeFirebase, getFirebaseContext } from "./firebase.js";
import { watchAuthState, signInWithEmail, signOutUser } from "./auth.js";
import { subscribe } from "./database.js";
import { APP_BRAND, DEFAULT_SETTINGS, THEME_STORAGE_KEY } from "./constants.js";
import { getHashRoute, debounce } from "./utils.js";
import { showToast } from "./notifications.js";
import { renderSidebar, updateStatusBadges, applySidebarState, toggleSidebarCollapsed } from "./ui.js";
import { renderDashboard } from "./dashboard.js";
import { renderInventory } from "./inventory.js";
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

const fallback = createPlaceholderModule("Module", "This module is scaffolded and will be implemented in upcoming phases.");

const routeRenderers = {
  dashboard: renderDashboard,
  inventory: renderInventory,
  "critical-spares": fallback,
  "low-stock": fallback,
  "out-of-stock": fallback,
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
  settings: renderSettings,
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

function hydrateStateData() {
  const savedSpares = localStorage.getItem("ssms-spares");
  state.spares = savedSpares ? JSON.parse(savedSpares) : [...DEMO_SPARES];
  hydrateEquipment(state);
}

function calculateBadges() {
  const lowStockCount = state.spares.filter(
    (x) => Number(x.quantityAvailable || 0) <= Number(x.reorderLevel || 0)
  ).length;

  return {
    lowStockCount,
    outOfStockCount: state.spares.filter((x) => Number(x.quantityAvailable || 0) <= 0).length,
    criticalCount: state.spares.filter((x) => (x.natureOfSpares || x.criticality) === "Critical").length,
    pendingPrCount: state.purchaseRequests.filter((x) => ["Submitted", "Under Review", "Approved", "Ordered"].includes(x.status)).length,
  };
}

function render() {
  const container = document.getElementById("app-content");
  if (!container) return;

  renderSidebar({ route: state.route, badges: calculateBadges() });
  updateStatusBadges({ online: state.online, syncState: state.syncState, role: state.role });

  const renderer = routeRenderers[state.route] || fallback;
  renderer(container, state);
}

function clearSubscriptions() {
  while (unsubscribers.length) {
    const stop = unsubscribers.pop();
    if (typeof stop === "function") stop();
  }
}

function attachRealtimeListeners() {
  clearSubscriptions();

  unsubscribers.push(
    subscribe("spares", (value) => {
      state.spares = value ? Object.values(value) : [];
      render();
    })
  );

  unsubscribers.push(
    subscribe("transactions", (value) => {
      state.transactions = value ? Object.values(value) : [];
      render();
    })
  );

  unsubscribers.push(
    subscribe("purchaseRequests", (value) => {
      state.purchaseRequests = value ? Object.values(value) : [];
      render();
    })
  );

  unsubscribers.push(
    subscribe("equipment", (value) => {
      if (!value) return;
      state.equipment = Object.values(value);
      localStorage.setItem("ssms-equipment", JSON.stringify(state.equipment));
      render();
    })
  );
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

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    try {
      await signOutUser();
      showToast("Signed out", "info");
    } catch (error) {
      showToast(error.message || "Sign out failed", "error");
    }
  });

  const searchInput = document.getElementById("global-search");
  if (searchInput) {
    const handleSearch = debounce((event) => {
      const query = String(event.target.value || "").trim();
      if (query.length < 2) return;
      showToast(`Global search scaffold: \"${query}\"`, "info", 1800);
    }, 250);
    searchInput.addEventListener("input", handleSearch);
  }

  document.getElementById("login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email")?.value || "";
    const password = document.getElementById("login-password")?.value || "";
    const errorNode = document.getElementById("login-error");

    try {
      if (errorNode) errorNode.textContent = "";
      await signInWithEmail(email, password);
      showToast("Authenticated successfully.", "success");
    } catch (error) {
      if (errorNode) errorNode.textContent = error.message || "Unable to sign in.";
    }
  });
}

async function initBranding() {
  document.getElementById("brand-title").textContent = state.settings.shipName || APP_BRAND.title;
  document.getElementById("brand-subtitle").textContent = state.settings.subtitle || APP_BRAND.subtitle;
}

async function init() {
  hydrateStateData();
  applyTheme();
  applySidebarState();
  await initBranding();
  bindGlobalEvents();

  const context = await initializeFirebase();
  const loginOverlay = document.getElementById("login-overlay");

  if (!context.configured) {
    if (loginOverlay) loginOverlay.classList.add("hidden");
    state.syncState = "OFFLINE";
    showToast("Firebase config placeholders detected. Running in skeleton mode.", "info", 4500);
    render();
    return;
  }

  watchAuthState(
    (user) => {
      state.user = user;
      state.role = "viewer";
      state.syncState = "SYNC COMPLETE";
      loginOverlay?.classList.add("hidden");
      attachRealtimeListeners();
      render();
    },
    () => {
      state.user = null;
      state.role = "viewer";
      state.syncState = "IDLE";
      clearSubscriptions();
      loginOverlay?.classList.remove("hidden");
      render();
    }
  );

  render();
}

init();
