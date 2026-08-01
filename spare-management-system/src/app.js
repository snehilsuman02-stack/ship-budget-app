import { signIn, signOutUser, watchAuthState, watchUserRole } from "./services/auth.js";
import { subscribeCollection, flushPendingOpsToFirebase, hasPendingLocalSync } from "./services/database.js";
import { logAudit } from "./services/audit.js";
import { canAccess } from "./services/rbac.js";
import {
  initializeFirebase,
  getFirebaseContext,
  isOfflineModeEnabled,
} from "./services/firebase.js";
import { navItems, renderSidebar } from "./ui/sidebar.js";
import { showToast } from "./ui/toast.js";
import { renderModule } from "./router.js";

const state = {
  user: null,
  role: "viewer",
  currentModule: "dashboard",
  data: {
    spares: [],
    transactions: [],
    purchaseRequests: [],
    vendors: [],
    alerts: [],
    auditLogs: [],
  },
};

const subscriptions = [];
let roleUnsubscribe = null;
const SYNC_PENDING_KEY = "sms-sync-pending";
let syncInProgress = false;

async function attemptOfflineSync(trigger = "manual") {
  if (syncInProgress) return;

  if (isOfflineModeEnabled()) {
    showToast("Disable offline mode before syncing.", "error");
    return;
  }

  if (!navigator.onLine) {
    showToast("Device is offline. Connect internet to sync.", "error");
    return;
  }

  if (!state.user) {
    showToast("Log in first to sync data.", "error");
    return;
  }

  await initializeFirebase();
  const ctx = getFirebaseContext();
  if (!ctx.isFirebaseConfigured || !ctx.firebaseReady) {
    showToast("Firebase is not configured. Sync unavailable.", "error");
    return;
  }

  syncInProgress = true;
  try {
    const flushed = await flushPendingOpsToFirebase();
    localStorage.removeItem(SYNC_PENDING_KEY);
    await logAudit({
      userId: state.user?.uid || "unknown",
      role: state.role,
      action: "sync",
      module: "settings",
      payload: { trigger, flushed, pendingLocal: hasPendingLocalSync() },
    });
    showToast(flushed > 0 ? `Offline changes synced to Firebase (${flushed}).` : "No offline changes to sync.");
  } catch (error) {
    console.error("Sync failed", error);
    showToast(error.message || "Sync failed.", "error");
  } finally {
    syncInProgress = false;
  }
}

function getAllowedKeys(role) {
  if (role === "admin") return new Set(["all"]);
  return new Set(navItems.filter((item) => canAccess(role, item.key)).map((item) => item.key));
}

function render() {
  const content = document.getElementById("app-content");
  if (!content) return;

  const allowedKeys = getAllowedKeys(state.role);
  if (!allowedKeys.has("all") && !allowedKeys.has(state.currentModule)) {
    state.currentModule = "dashboard";
  }

  renderSidebar(state.currentModule, allowedKeys);
  document.getElementById("user-role-badge").textContent = `${state.role}`;
  const modeBadge = document.getElementById("connection-badge");
  if (modeBadge) {
    const isOffline = isOfflineModeEnabled() || navigator.onLine === false;
    modeBadge.textContent = isOffline ? "Offline Mode" : "Online Mode";
    modeBadge.classList.toggle("offline", isOffline);
  }

  renderModule(content, state, {
    render,
    toast: showToast,
    log: async (action, module, payload) => {
      try {
        await logAudit({
          userId: state.user?.uid || "unknown",
          role: state.role,
          action,
          module,
          payload,
        });
      } catch (error) {
        console.error("Audit log failed", error);
      }
    },
  });

  bindSidebarClicks();
}

function clearSubscriptions() {
  while (subscriptions.length) {
    const stop = subscriptions.pop();
    if (typeof stop === "function") stop();
  }
}

function bindSidebarClicks() {
  document.querySelectorAll("[data-nav]").forEach((node) => {
    node.addEventListener("click", () => {
      state.currentModule = node.dataset.nav;
      // On mobile, collapse the sidebar once a module is selected.
      if (window.innerWidth <= 980) {
        document.getElementById("sidebar")?.classList.remove("open");
      }
      render();
    });
  });
}

function setLoggedOutUi() {
  document.getElementById("login-overlay")?.classList.remove("hidden");
  clearSubscriptions();
  if (roleUnsubscribe) {
    roleUnsubscribe();
    roleUnsubscribe = null;
  }
  state.user = null;
  state.role = "viewer";
  state.currentModule = "dashboard";
  state.data = {
    spares: [],
    transactions: [],
    purchaseRequests: [],
    vendors: [],
    alerts: [],
    auditLogs: [],
  };
  render();
}

function setLoggedInUi(user) {
  document.getElementById("login-overlay")?.classList.add("hidden");
  state.user = user;

  roleUnsubscribe = watchUserRole(
    user.uid,
    (role) => {
      state.role = role;
      render();
    },
    (error) => showToast(error.message, "error")
  );

  subscriptions.push(
    subscribeCollection("spares", (rows) => {
      state.data.spares = rows;
      render();
    })
  );

  subscriptions.push(
    subscribeCollection("transactions", (rows) => {
      state.data.transactions = rows;
      render();
    })
  );

  subscriptions.push(
    subscribeCollection("purchaseRequests", (rows) => {
      state.data.purchaseRequests = rows;
      render();
    })
  );

  subscriptions.push(
    subscribeCollection("vendors", (rows) => {
      state.data.vendors = rows;
      render();
    })
  );

  subscriptions.push(
    subscribeCollection("alerts", (rows) => {
      state.data.alerts = rows;
      render();
      const openLowStock = rows.filter((a) => a.type === "low-stock" && a.status === "open");
      if (openLowStock.length) {
        showToast(`${openLowStock.length} low stock alert(s) active.`);
      }
    })
  );

  subscriptions.push(
    subscribeCollection("auditLogs", (rows) => {
      state.data.auditLogs = rows;
      if (state.currentModule === "audit") render();
    })
  );

  if (localStorage.getItem(SYNC_PENDING_KEY) === "1") {
    attemptOfflineSync("post-login");
  }

  if (hasPendingLocalSync() && !isOfflineModeEnabled() && navigator.onLine) {
    attemptOfflineSync("post-login-pending");
  }
}

function bindGlobalUi() {
  document.getElementById("menu-toggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("open");
  });

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("sms-theme", next);
  });

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    try {
      await signOutUser();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  document.getElementById("login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email")?.value || "";
    const password = document.getElementById("login-password")?.value || "";
    const errorNode = document.getElementById("login-error");

    try {
      if (errorNode) {
        errorNode.textContent = "";
        errorNode.classList.add("hidden");
      }
      const user = await signIn(email, password);
      const { isFirebaseConfigured } = getFirebaseContext();
      if (!isFirebaseConfigured && user) {
        setLoggedInUi(user);
      }
    } catch (error) {
      if (errorNode) {
        errorNode.textContent = error.message;
        errorNode.classList.remove("hidden");
      }
    }
  });

  window.addEventListener("sms-sync-now", () => {
    attemptOfflineSync("manual");
  });

  window.addEventListener("online", () => {
    if (localStorage.getItem(SYNC_PENDING_KEY) === "1" || hasPendingLocalSync()) {
      attemptOfflineSync("network-online");
    }
  });
}

function initializeTheme() {
  const saved = localStorage.getItem("sms-theme");
  if (saved === "dark" || saved === "light") {
    document.documentElement.dataset.theme = saved;
  }
}

async function init() {
  initializeTheme();
  await initializeFirebase();
  bindGlobalUi();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  }

  if (isOfflineModeEnabled()) {
    showToast("Offline mode is enabled. Using local storage data.");
  }

  render();

  watchAuthState(
    (user) => setLoggedInUi(user),
    () => setLoggedOutUi(),
    (error) => showToast(error.message, "error")
  );
}

init();
