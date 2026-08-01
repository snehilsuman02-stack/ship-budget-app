import { ensureFirebaseSession, signIn, signOutUser, watchAuthState, watchUserRole } from "./services/auth.js";
import { subscribeCollection } from "./services/database.js";
import { logAudit } from "./services/audit.js";
import { canAccess } from "./services/rbac.js";
import { initializeFirebase, getFirebaseContext } from "./services/firebase.js";
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
  const roleBadge = document.getElementById("user-role-badge");
  if (roleBadge) roleBadge.textContent = `${state.role}`;

  const statusBadge = document.getElementById("connection-badge");
  if (statusBadge) {
    const { firebaseReady } = getFirebaseContext();
    statusBadge.textContent = firebaseReady ? "Cloud Live" : "Cloud Pending";
  }

  const loginError = document.getElementById("login-error");
  const { isFirebaseConfigured, firebaseReady } = getFirebaseContext();
  if (loginError && !isFirebaseConfigured && !firebaseReady) {
    loginError.textContent = "Firebase is not configured yet. Add real Firebase credentials to enable login.";
    loginError.classList.remove("hidden");
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

  subscriptions.push(subscribeCollection("spares", (rows) => { state.data.spares = rows; render(); }));
  subscriptions.push(subscribeCollection("transactions", (rows) => { state.data.transactions = rows; render(); }));
  subscriptions.push(subscribeCollection("purchaseRequests", (rows) => { state.data.purchaseRequests = rows; render(); }));
  subscriptions.push(subscribeCollection("vendors", (rows) => { state.data.vendors = rows; render(); }));
  subscriptions.push(subscribeCollection("alerts", (rows) => {
    state.data.alerts = rows;
    render();
    const openLowStock = rows.filter((a) => a.type === "low-stock" && a.status === "open");
    if (openLowStock.length) {
      showToast(`${openLowStock.length} low stock alert(s) active.`);
    }
  }));
  subscriptions.push(subscribeCollection("auditLogs", (rows) => {
    state.data.auditLogs = rows;
    if (state.currentModule === "audit") render();
  }));
}

function bindGlobalUi() {
  document.getElementById("menu-toggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("open");
  });
  const { isFirebaseConfigured } = getFirebaseContext();

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

    if (!isFirebaseConfigured) {
      if (errorNode) {
        errorNode.textContent = "Firebase credentials are missing. Add your Firebase config to enable login.";
        errorNode.classList.remove("hidden");
      }
      return;
    }

    try {
      if (errorNode) {
        errorNode.textContent = "";
        errorNode.classList.add("hidden");
      }
      await signIn(email, password);
    } catch (error) {
      if (errorNode) {
        errorNode.textContent = error.message;
        errorNode.classList.remove("hidden");
      }
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
  await ensureFirebaseSession();
  bindGlobalUi();
  render();

  watchAuthState(
    (user) => setLoggedInUi(user),
    () => setLoggedOutUi(),
    () => {}
  );
}

init();
