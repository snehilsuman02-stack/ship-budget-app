const defaultBudgetCaps = {
  "Material and Supplies": 5800000,
  "Repair and Maintenance": 10300000,
  "Office expenses": 1000000,
  "Printing and Publication": 250000,
  "Machinary Equipment": 300000,
  "Other Revenue Expenditure": 150000,
  "Digital equipment": 200000,
  "Fuel and Lubricants": 0
};

const palette = ["#4f8cff", "#ffb24c", "#3ddc97", "#9b7bff", "#ff6161", "#f472b6"];
const sampleExpenses = [];

const storageKey = "ship-budget-app-state";
let state = loadState();

const expenseForm = document.getElementById("expense-form");
const dateInput = document.getElementById("expense-date");
const categoryInput = document.getElementById("expense-category");
const amountInput = document.getElementById("expense-amount");
const noteInput = document.getElementById("expense-note");
const planPanel = document.getElementById("plan-panel");
const planFields = document.getElementById("plan-fields");
const savePlanButton = document.getElementById("save-plan");
const userSelect = document.getElementById("user-select");
const reportingDateInput = document.getElementById("reporting-date");
const userNameInput = document.getElementById("user-name");
const switchUserButton = document.getElementById("switch-user");
const exportCsvButton = document.getElementById("export-csv");
const exportDataButton = document.getElementById("export-data");
const showJsonButton = document.getElementById("show-json");
const showImportPanelButton = document.getElementById("show-import-panel");
const copyJsonButton = document.getElementById("copy-json");
const downloadJsonButton = document.getElementById("download-json");
const closeJsonPanelButton = document.getElementById("close-json-panel");
const jsonExportPanel = document.getElementById("json-export-panel");
const jsonExportText = document.getElementById("json-export-text");
const closeImportPanelButton = document.getElementById("close-import-panel");
const jsonImportPanel = document.getElementById("json-import-panel");
const jsonImportText = document.getElementById("json-import-text");
const applyJsonImportButton = document.getElementById("apply-json-import");
const importDataButton = document.getElementById("import-data");
const importFileInput = document.getElementById("import-file");
const printReportButton = document.getElementById("print-report");
const claimEditButton = document.getElementById("claim-edit");
const resetUsersButton = document.getElementById("reset-users");
const logoutButton = document.getElementById("logout-button");
const cloudSyncButton = document.getElementById("cloud-sync-btn");
const cloudDebugButton = document.getElementById("cloud-debug-write");
const cloudStatusLabel = document.getElementById("cloud-status");
const cloudLog = document.getElementById("cloud-log");
const loginScreen = document.getElementById("login-screen");
const loginForm = document.getElementById("login-form");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginSubmit = document.getElementById("login-submit");
const loginError = document.getElementById("login-error");
const loginNote = document.querySelector(".login-note");
const asOfDateLabel = document.getElementById("as-of-date-label");

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    return createDefaultState();
  }

  try {
    const parsed = JSON.parse(saved);
    if (!parsed || !parsed.users) {
      return createDefaultState();
    }
    // Ensure only the Logistics Officer may have admin role
    const normalizedUsers = Object.fromEntries(
      Object.entries(parsed.users).map(([k, v]) => {
        const role = v && v.role === 'admin' && isLogisticsName(k) ? 'admin' : 'user';
        return [k, { ...v, role }];
      })
    );

    return {
      ...createDefaultState(),
      ...parsed,
      users: normalizedUsers,
      adminPin: parsed.adminPin || null,
      cdaPlan: parsed.cdaPlan || { ...defaultBudgetCaps },
      asOfDate: parsed.asOfDate || getDefaultAsOfDate(),
    };
  } catch {
    return createDefaultState();
  }
}

function pushCloudLog(message, level = 'info') {
  try {
    console.log('[CLOUD]', level, message);
    if (!cloudLog) return;
    const entry = document.createElement('div');
    entry.className = 'cloud-log-entry ' + (level || 'info');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    cloudLog.prepend(entry);
    cloudLog.classList.remove('hidden');
  } catch (e) {
    console.log('pushCloudLog error', e);
  }
}

// Global error handlers to surface startup/runtime errors in the UI
window.addEventListener('error', (ev) => {
  const msg = ev && ev.message ? ev.message : String(ev);
  pushCloudLog('Runtime error: ' + msg, 'error');
  // also show alert so it's visible when DevTools is closed
  alert('Runtime error: ' + msg);
});

window.addEventListener('unhandledrejection', (ev) => {
  const reason = ev && ev.reason ? ev.reason : String(ev);
  pushCloudLog('Unhandled promise rejection: ' + (reason && reason.message ? reason.message : reason), 'error');
  alert('Unhandled promise rejection: ' + (reason && reason.message ? reason.message : reason));
});

function getDefaultAsOfDate() {
  return new Date().toISOString().split("T")[0];
}

function isLogisticsName(name) {
  if (!name) return false;
  return /logistic/i.test(String(name));
}

function setAdminPin(pin) {
  state.adminPin = String(pin);
  saveState();
}

function verifyAdminPin(pin) {
  return state.adminPin && String(pin) === String(state.adminPin);
}

function showLoginScreen() {
  if (loginScreen) loginScreen.style.display = "grid";
  document.querySelector(".app-shell").style.display = "none";
}

function hideLoginScreen() {
  if (loginScreen) loginScreen.style.display = "none";
  document.querySelector(".app-shell").style.display = "block";
}

function login() {
  const username = (loginUsername && loginUsername.value) ? loginUsername.value.trim() : '';
  const password = (loginPassword && loginPassword.value) ? loginPassword.value : '';
  pushCloudLog('Login attempt: ' + username, 'info');
  if (loginError) {
    loginError.classList.add('hidden');
    loginError.textContent = '';
  }

  if (username === "user" && password === "user") {
    state.currentUser = "user";
    state.users["user"] = state.users["user"] || makeUserData("user");
    saveState({ skipCloud: true });
    pushCloudLog('Login success: user', 'info');
    if (loginError) { loginError.classList.add('hidden'); }
    // Ensure UI transitions happen even if callers forget to handle the result
    try { hideLoginScreen(); updateDashboard(); if (firebaseDb) syncCloudData(); } catch (e) { console.warn('Post-login UI update failed', e); }
    return true;
  }
  if (username === "LOGO" && password === "1234") {
    state.currentUser = "Logistics Officer";
    state.users["Logistics Officer"] = state.users["Logistics Officer"] || makeUserData("Logistics Officer");
    state.users["Logistics Officer"].role = "admin";
    mirrorLogisticsExpensesToUser();
    saveState({ skipCloud: true });
    pushCloudLog('Login success: Logistics Officer', 'info');
    if (loginError) { loginError.classList.add('hidden'); }
    try { hideLoginScreen(); updateDashboard(); if (firebaseDb) syncCloudData(); } catch (e) { console.warn('Post-login UI update failed', e); }
    return true;
  }
  pushCloudLog('Login failed for user: ' + username, 'warn');
  if (loginError) {
    loginError.textContent = 'Invalid username or password. Try user/user or LOGO/1234';
    loginError.classList.remove('hidden');
  } else {
    alert("Invalid username or password. Try: user/user or LOGO/1234");
  }
  return false;
}

// Attach fallback handlers so login works even if initializeApp didn't run or had an error
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const success = login();
    if (success) {
      hideLoginScreen();
      updateDashboard();
      if (firebaseDb) syncCloudData();
    }
  });
}

if (loginSubmit) {
  loginSubmit.addEventListener('click', () => {
    const success = login();
    if (success) {
      hideLoginScreen();
      updateDashboard();
      if (firebaseDb) syncCloudData();
    }
  });
}

function createDefaultState() {
  return {
    currentUser: null,
    asOfDate: getDefaultAsOfDate(),
    adminPin: null,
    cdaPlan: { ...defaultBudgetCaps },
    users: {
      user: makeUserData("user"),
      "Logistics Officer": makeUserData("Logistics Officer"),
    },
  };
}

function makeUserData(name) {
  return {
    name,
    role: "user",
    plan: { ...defaultBudgetCaps },
    expenses: sampleExpenses.map((item) => ({ ...item })),
  };
}

function saveState({ skipCloud = false } = {}) {
  mirrorLogisticsExpensesToUser();
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (!skipCloud && isCloudSyncEnabled()) {
    saveStateToCloud();
  }
}

function mirrorLogisticsExpensesToUser() {
  if (!state.users["Logistics Officer"] || !state.users["user"]) return;
  const loExpenses = Array.isArray(state.users["Logistics Officer"].expenses)
    ? state.users["Logistics Officer"].expenses
    : [];
  const userExpenses = Array.isArray(state.users["user"].expenses)
    ? state.users["user"].expenses
    : [];

  // Only mirror when the Logistics Officer has actual expense records.
  if (loExpenses.length === 0 && userExpenses.length > 0) {
    return;
  }

  state.users["user"].expenses = loExpenses.map((item) => ({ ...item }));
}

function getCurrentUserData() {
  if (!state.users[state.currentUser]) {
    state.users[state.currentUser] = makeUserData(state.currentUser);
  }
  return state.users[state.currentUser];
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCategorySpend(expenses) {
  return Object.keys(defaultBudgetCaps).reduce((acc, category) => {
    acc[category] = expenses
      .filter((item) => item.category === category)
      .reduce((sum, item) => sum + Number(item.amount), 0);
    return acc;
  }, {});
}

function getMonthKey(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getSameMonthLastYear(dateString) {
  const date = new Date(dateString);
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split('T')[0];
}

function filterExpensesForMonth(expenses, targetDate) {
  const monthKey = getMonthKey(targetDate);
  return expenses.filter((item) => getMonthKey(item.date) === monthKey);
}

function getAsOfDate() {
  return reportingDateInput.value || state.asOfDate || getDefaultAsOfDate();
}

function getYearMonths(year) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  });
}

function formatMonthLabel(yearMonth) {
  const [year, month] = yearMonth.split('-');
  return `${new Date(year, Number(month) - 1).toLocaleString('default', { month: 'short' })}`;
}

function buildHeadMonthBreakup(expenses, year) {
  const months = getYearMonths(year);
  const breakdown = Object.keys(defaultBudgetCaps).reduce((acc, category) => {
    acc[category] = months.reduce((monthMap, monthKey) => {
      monthMap[monthKey] = 0;
      return monthMap;
    }, {});
    return acc;
  }, {});

  expenses.forEach((expense) => {
    const expenseDate = new Date(expense.date);
    if (expenseDate.getFullYear() !== year) return;
    const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
    const category = expense.category || 'Uncategorized';
    if (!breakdown[category]) return;
    breakdown[category][monthKey] += Number(expense.amount) || 0;
  });

  return breakdown;
}

function renderMonthBreakup(breakdown, months) {
  const container = document.getElementById('month-breakup-table');
  if (!container) return;
  const rows = Object.entries(breakdown).map(([category, monthData]) => {
    const cells = months.map((monthKey) => `
      <td>${formatCurrency(monthData[monthKey] || 0)}</td>
    `).join('');
    const total = Object.values(monthData).reduce((sum, value) => sum + Number(value), 0);
    return `
      <tr>
        <td>${category}</td>
        ${cells}
        <td>${formatCurrency(total)}</td>
      </tr>
    `;
  }).join('');

  const headerCells = months.map((monthKey) => `<th>${formatMonthLabel(monthKey)}</th>`).join('');
  const totalByMonth = months.map((monthKey) => {
    const sum = Object.values(breakdown).reduce((monthSum, monthData) => monthSum + Number(monthData[monthKey] || 0), 0);
    return `<td>${formatCurrency(sum)}</td>`;
  }).join('');
  const yearlyTotal = Object.values(breakdown).reduce((sum, monthData) => sum + Object.values(monthData).reduce((mSum, value) => mSum + Number(value), 0), 0);

  container.innerHTML = `
    <div class="month-breakup-header">Year ${months[0].split('-')[0]} month-wise expenditure by head</div>
    <div class="month-breakup-inner">
      <table>
        <thead>
          <tr>
            <th>Head</th>
            ${headerCells}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr>
            <td>Grand Total</td>
            ${totalByMonth}
            <td>${formatCurrency(yearlyTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

const firebaseConfig = {
  apiKey: "AIzaSyCZ24BN42MxM40qoR39Ore6veO0F9I7DkU",
  authDomain: "budget-tracker-f5fae.firebaseapp.com",
  databaseURL: "https://budget-tracker-f5fae-default-rtdb.firebaseio.com",
  projectId: "budget-tracker-f5fae",
  storageBucket: "budget-tracker-f5fae.appspot.com",
  messagingSenderId: "757492379743",
  appId: "1:757492379743:web:9b8a6213b57fd11fd12bea",
};

// Fill these values from your Firebase web app settings to enable cloud sync.
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuthReady = false;
let firebaseAuthPromise = Promise.resolve();
let cloudSyncStatus = "Cloud not configured";

function waitForCloudAuth() {
  return firebaseAuthPromise;
}

function initCloudSync() {
  if (!window.firebase) {
    console.warn("Cloud sync initialization failed: Firebase SDK not loaded.");
    cloudSyncStatus = "Firebase SDK missing";
    updateCloudStatus();
    return false;
  }

  if (!firebaseConfig.apiKey) {
    console.warn("Cloud sync initialization failed: Firebase config is empty.");
    cloudSyncStatus = "Firebase config missing";
    updateCloudStatus();
    return false;
  }

  try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    if (!firebase.database) {
      console.warn("Cloud sync initialization failed: Firebase Database SDK not loaded.");
      cloudSyncStatus = "Realtime DB SDK missing";
      updateCloudStatus();
      return false;
    }
    firebaseDb = firebase.database();

    if (firebase.auth) {
      cloudSyncStatus = "Cloud auth pending";
      updateCloudStatus();
      firebaseAuthPromise = new Promise((resolve, reject) => {
        firebase.auth().onAuthStateChanged((user) => {
          if (user) {
            firebaseAuthReady = true;
              console.log("Firebase auth ready.");
              pushCloudLog('Firebase auth ready', 'info');
            cloudSyncStatus = "Cloud sync enabled";
            updateCloudStatus();
            resolve(user);
          } else {
            firebase.auth().signInAnonymously().catch((authError) => {
              console.error("Cloud auth failed:", authError);
              pushCloudLog('Cloud auth failed: ' + (authError && authError.message ? authError.message : authError), 'error');
              cloudSyncStatus = "Cloud auth failed";
              updateCloudStatus();
              reject(authError);
            });
          }
        });
      });
    } else {
      firebaseAuthReady = true;
      cloudSyncStatus = "Cloud sync enabled";
      updateCloudStatus();
    }

    console.log("Firebase initialized successfully.");
    pushCloudLog('Firebase initialized successfully', 'info');
    return true;
  } catch (error) {
    console.warn("Cloud sync initialization failed:", error);
    pushCloudLog('Cloud init failed: ' + (error && error.message ? error.message : error), 'error');
    cloudSyncStatus = "Cloud init failed";
    updateCloudStatus();
    return false;
  }
}

function isCloudSyncEnabled() {
  return !!firebaseDb;
}

const cloudPath = "ship-budget-app/shared-state";

function legacyCloudPathForUser(user) {
  return `ship-budget-app/${encodeURIComponent(user || 'anonymous')}`;
}

function cloudPathForUser(user) {
  return cloudPath;
}

function normalizeUserData(name, userData) {
  const base = makeUserData(name);
  return {
    ...base,
    ...userData,
    name,
    role: userData && typeof userData.role === "string" ? userData.role : base.role,
    plan:
      userData && typeof userData.plan === "object"
        ? { ...base.plan, ...userData.plan }
        : base.plan,
    expenses: Array.isArray(userData && userData.expenses)
      ? userData.expenses.map((item) => ({ ...item }))
      : base.expenses,
  };
}

function mergeRemoteUsers(remoteUsers) {
  if (!remoteUsers || typeof remoteUsers !== "object" || Array.isArray(remoteUsers)) {
    return;
  }
  Object.entries(remoteUsers).forEach(([name, userData]) => {
    state.users[name] = normalizeUserData(name, userData);
  });
}

function applyRemoteState(remote) {
  if (!remote || typeof remote !== "object") {
    return;
  }
  if (remote.users) {
    mergeRemoteUsers(remote.users);
  }
  if (remote.cdaPlan && typeof remote.cdaPlan === "object") {
    state.cdaPlan = { ...state.cdaPlan, ...remote.cdaPlan };
  }
  if (remote.asOfDate) {
    state.asOfDate = remote.asOfDate;
  }
  if (remote.adminPin) {
    state.adminPin = remote.adminPin;
  }
}

function saveStateToCloud() {
  if (!firebaseDb) return Promise.resolve();
  return waitForCloudAuth()
    .then(() => {
      if (!isCloudSyncEnabled()) {
        return Promise.reject(new Error("Cloud auth not ready."));
      }
      const data = {
        users: state.users,
        cdaPlan: state.cdaPlan,
        asOfDate: state.asOfDate,
        adminPin: state.adminPin,
      };
      const path = cloudPathForUser(state.currentUser);
      console.log("Saving cloud state at:", path, data);
      return firebaseDb.ref(path).set(data);
    })
    .catch((error) => {
      console.error("Cloud save failed:", error);
      pushCloudLog('Cloud save failed: ' + (error && error.message ? error.message : error), 'error');
      throw error;
    });
}

function loadStateFromCloud({ silent = false } = {}) {
  if (!firebaseDb) return Promise.resolve();
  return waitForCloudAuth()
    .then(() => {
      if (!isCloudSyncEnabled()) {
        return Promise.reject(new Error("Cloud auth not ready."));
      }
      const path = cloudPathForUser(state.currentUser);
      console.log("Loading cloud state from: ", path);
      return firebaseDb
    .ref(path)
    .once("value")
    .then((snapshot) => {
      const remote = snapshot.val();
      if (remote) {
        return { remote, source: path };
      }
      const legacyPath = legacyCloudPathForUser(state.currentUser);
      if (legacyPath === path) {
        return { remote: null, source: null };
      }
      console.log("Cloud state not found at shared path, checking legacy path:", legacyPath);
      return firebaseDb.ref(legacyPath).once("value").then((legacySnapshot) => {
        const legacyRemote = legacySnapshot.val();
        return { remote: legacyRemote, source: legacyRemote ? legacyPath : null };
      });
    })
    .then(({ remote, source }) => {
          if (!remote) {
        if (!silent) alert("No cloud data found at: " + path);
        return null;
      }
      console.log(`Cloud state loaded from ${source}:`, remote);
      if (typeof applyRemoteState === "function") {
        applyRemoteState(remote);
      } else {
        console.warn("applyRemoteState not defined; falling back to manual merge.");
        if (remote.users) {
          mergeRemoteUsers(remote.users);
        }
        if (remote.cdaPlan && typeof remote.cdaPlan === "object") {
          state.cdaPlan = { ...state.cdaPlan, ...remote.cdaPlan };
        }
        if (remote.asOfDate) {
          state.asOfDate = remote.asOfDate;
        }
        if (remote.adminPin) {
          state.adminPin = remote.adminPin;
        }
      }
      if (!state.users[state.currentUser]) {
        state.currentUser = Object.keys(state.users)[0] || state.currentUser;
      }
      saveState({ skipCloud: true });
      updateDashboard();
      if (!silent) alert("Cloud data loaded successfully.");
      if (source && source !== path) {
        saveStateToCloud();
      }
      return remote;
    })
    .catch((error) => {
      console.error("Cloud load failed:", error);
      cloudSyncStatus = "Cloud load failed";
      updateCloudStatus();
      if (!silent) {
        const message = error && error.message ? error.message : "unknown error";
        pushCloudLog('Cloud load failed: ' + message, 'error');
        alert("Cloud load failed: " + message + ". Check console for full details.");
      }
      return null;
    });
}

function syncCloudData() {
  console.log("cloud sync click fired", { enabled: isCloudSyncEnabled(), currentUser: state.currentUser });
  if (!firebaseDb) {
    const msg = "Cloud sync is not configured. Enter Firebase configuration in script.js.";
    console.warn(msg);
    alert(msg);
    return Promise.resolve();
  }
  if (!state.currentUser) {
    const msg = "Please log in before syncing to cloud.";
    console.warn(msg);
    alert(msg);
    return Promise.resolve();
  }

  return waitForCloudAuth()
    .then(() => {
      return loadStateFromCloud().then((remote) => {
        if (!remote) {
          return saveStateToCloud()
            .then(() => {
              alert("Local data saved to cloud.");
            })
            .catch((error) => {
              console.error("Cloud save failed:", error);
              alert("Cloud save failed: " + (error && error.message ? error.message : "unknown error") + ". Check console.");
            });
        }
        alert("Cloud data loaded and applied successfully.");
        return Promise.resolve();
      });
    })
    .catch((error) => {
      console.error("Cloud sync failed due to auth:", error);
      const message = error && error.message ? error.message : "unknown error";
      alert("Cloud sync failed: " + message + ". Check console for details.");
    });
}

function updateCloudStatus() {
  if (!cloudStatusLabel) return;
  if (isCloudSyncEnabled()) {
    cloudSyncStatus = "Cloud sync enabled";
  }
  cloudStatusLabel.textContent = cloudSyncStatus;
}

function isCurrentUserAdmin() {
  return state.users[state.currentUser] && state.users[state.currentUser].role === "admin";
}

function filterExpensesToDate(expenses, asOfDate) {
  return expenses.filter((item) => item.date <= asOfDate);
}

function updateDashboard() {
  if (state.currentUser === "user") {
    mirrorLogisticsExpensesToUser();
  }
  const currentUserData = getCurrentUserData();
  const asOfDate = getAsOfDate();
  const expensesToDate = filterExpensesToDate(currentUserData.expenses, asOfDate);
  const spendByCategory = getCategorySpend(expensesToDate);
  const currentMonthExpenses = filterExpensesForMonth(currentUserData.expenses, asOfDate);
  const lastYearMonthDate = getSameMonthLastYear(asOfDate);
  const lastYearMonthExpenses = filterExpensesForMonth(currentUserData.expenses, lastYearMonthDate);
  const currentMonthSpendByCategory = getCategorySpend(currentMonthExpenses);
  const lastYearMonthSpendByCategory = getCategorySpend(lastYearMonthExpenses);
  const totalAllocation = Object.values(defaultBudgetCaps).reduce((sum, value) => sum + Number(value), 0);
  const totalSpent = expensesToDate.reduce((sum, item) => sum + Number(item.amount), 0);
  const remainingBudget = totalAllocation - totalSpent;
  const utilizationRate = totalAllocation ? Math.round((totalSpent / totalAllocation) * 100) : 0;
  const year = new Date(asOfDate).getFullYear();
  const months = getYearMonths(year);
  const monthBreakup = buildHeadMonthBreakup(currentUserData.expenses, year);

  document.getElementById("total-budget").textContent = formatCurrency(totalAllocation);
  document.getElementById("total-spent").textContent = formatCurrency(totalSpent);
  document.getElementById("remaining-budget").textContent = formatCurrency(remainingBudget);
  document.getElementById("utilization-rate").textContent = `${utilizationRate}%`;
  asOfDateLabel.textContent = asOfDate;

  // Enable/disable editing controls based on role
  const admin = isCurrentUserAdmin();
  // Expense form controls
  dateInput.disabled = !admin;
  categoryInput.disabled = !admin;
  amountInput.disabled = !admin;
  noteInput.disabled = !admin;
  // Expense submit button
  const expenseSubmit = expenseForm.querySelector('button[type="submit"]');
  if (expenseSubmit) expenseSubmit.disabled = !admin;
  // Show or hide claim button
  if (claimEditButton) {
    claimEditButton.style.display = admin ? 'none' : (isLogisticsName(state.currentUser) ? 'inline-block' : 'none');
  }
  if (resetUsersButton) {
    resetUsersButton.style.display = admin ? 'inline-block' : 'none';
  }

  updateCloudStatus();
  const statusPill = document.getElementById("status-pill");
  if (utilizationRate > 85) {
    statusPill.textContent = "Critical";
    statusPill.style.background = "rgba(255,97,97,0.16)";
    statusPill.style.color = "var(--danger)";
  } else if (utilizationRate > 60) {
    statusPill.textContent = "Watch";
    statusPill.style.background = "rgba(255,178,76,0.16)";
    statusPill.style.color = "var(--orange)";
  } else {
    statusPill.textContent = "Healthy";
    statusPill.style.background = "rgba(61,220,151,0.13)";
    statusPill.style.color = "var(--green)";
  }

  renderUserSelection();
  renderPlanForm();
  renderCategoryOptions();
  renderMonthBreakup(monthBreakup, months);
  renderProgress(spendByCategory, state.cdaPlan || defaultBudgetCaps, currentMonthSpendByCategory, lastYearMonthSpendByCategory, asOfDate);
  renderDonutChart(spendByCategory);
  renderExpenseList();
  if (savePlanButton) {
    savePlanButton.style.display = isCurrentUserAdmin() ? 'block' : 'none';
  }
}

function renderUserSelection() {
  const users = Object.keys(state.users).filter((user) => {
    if (user === "Logistics Officer") {
      return isCurrentUserAdmin() || state.currentUser === "Logistics Officer";
    }
    return true;
  });
  userSelect.innerHTML = users
    .map((user) => `<option value="${user}" ${user === state.currentUser ? "selected" : ""}>${user}</option>`)
    .join("");
}

function renderCategoryOptions() {
  const categories = Object.keys(defaultBudgetCaps);
  categoryInput.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
}

function renderPlanForm() {
  const adminEditable = isCurrentUserAdmin();
  const currentUserExpenses = state.users[state.currentUser] ? state.users[state.currentUser].expenses : [];

  planFields.innerHTML = Object.entries(state.cdaPlan)
    .map(([category, amount]) => {
      const spent = currentUserExpenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      const percentOfHead = amount ? Math.round((Number(spent) / Number(amount)) * 100) : 0;
      return `
        <div class="plan-row">
          <div class="plan-meta">
            <span>${category}</span>
            ${adminEditable ? `<input class="plan-input" data-category="${category}" type="number" min="0" step="1000" value="${amount}" />` : `<strong>${formatCurrency(amount)}</strong>`}
          </div>
          <div class="plan-details">
            <span>${formatCurrency(amount)} approved</span>
            <span>${formatCurrency(spent)} spent • ${percentOfHead}% of head expenditure</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderProgress(spendByCategory, plan, currentMonthSpendByCategory, lastYearMonthSpendByCategory, asOfDate) {
  const container = document.getElementById("progress-list");
  container.innerHTML = "";

  Object.entries(defaultBudgetCaps).forEach(([category, defaultCap], index) => {
    const cap = Number(plan[category] ?? defaultCap);
    const spent = spendByCategory[category] || 0;
    const monthSpent = currentMonthSpendByCategory[category] || 0;
    const lastYearSpent = lastYearMonthSpendByCategory[category] || 0;
    const diff = monthSpent - lastYearSpent;
    const diffText = diff >= 0 ? `↑ ${formatCurrency(diff)} vs last year` : `↓ ${formatCurrency(Math.abs(diff))} vs last year`;
    const percent = cap ? Math.min(100, Math.round((spent / cap) * 100)) : 0;
    const pending = cap - spent;
    const monthName = new Date(asOfDate).toLocaleString('default', { month: 'long' });
    const combinedSameMonth = monthSpent + lastYearSpent;
    const item = document.createElement("div");
    item.className = "progress-item";
    item.innerHTML = `
      <div class="progress-label">
        <span>${category}</span>
        <span>${formatCurrency(spent)} / ${formatCurrency(cap)}</span>
      </div>
      <div class="progress-detail">
        ${pending >= 0 ? `Pending ${formatCurrency(pending)} until date` : `Over budget by ${formatCurrency(Math.abs(pending))}`}
      </div>
      <div class="progress-detail month-compare">
        <span>Current ${monthName}: <strong>${formatCurrency(monthSpent)}</strong></span>
        <span>Same month last year: <strong>${formatCurrency(lastYearSpent)}</strong></span>
      </div>
      <div class="progress-detail month-compare">
        Combined same-month spend: <strong>${formatCurrency(combinedSameMonth)}</strong> · ${diffText}
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${percent}%; background: linear-gradient(90deg, ${palette[index % palette.length]}, ${palette[(index + 2) % palette.length]});"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderDonutChart(spendByCategory) {
  const totalSpent = Object.values(spendByCategory).reduce((sum, value) => sum + value, 0);
  const chart = document.getElementById("donut-chart");
  const legend = document.getElementById("legend");

  if (!totalSpent) {
    chart.style.background = "conic-gradient(#4f8cff 0 100%)";
    legend.innerHTML = '<div class="legend-item"><span>No spend recorded</span></div>';
    return;
  }

  const entries = Object.entries(spendByCategory).filter(([, amount]) => amount > 0);
  let start = 0;
  const gradientStops = entries.map(([category, amount], index) => {
    const end = start + (amount / totalSpent) * 100;
    const color = palette[index % palette.length];
    const stop = `${color} ${start.toFixed(1)}% ${end.toFixed(1)}%`;
    start = end;
    return stop;
  });

  chart.style.background = `conic-gradient(${gradientStops.join(", ")})`;
  legend.innerHTML = entries
    .map(([category, amount], index) => {
      const color = palette[index % palette.length];
      return `<div class="legend-item"><span><span class="swatch" style="background:${color}"></span>${category}</span><strong>${formatCurrency(amount)}</strong></div>`;
    })
    .join("");
}

function renderExpenseList() {
  const list = document.getElementById("expense-list");
  const asOfDate = getAsOfDate();
  const sorted = [...getCurrentUserData().expenses]
    .filter((item) => item.date <= asOfDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!sorted.length) {
    list.innerHTML = '<p class="expense-meta">No expenditures added yet.</p>';
    return;
  }

  const isAdmin = state.users[state.currentUser] && state.users[state.currentUser].role === "admin";

  list.innerHTML = sorted
    .map((item) => `
      <div class="expense-item">
        <div>
          <strong>${item.category}</strong>
          <div class="expense-meta">${item.date} • ${item.note || "No note"}</div>
        </div>
        <div class="expense-actions">
          <span class="expense-amount">${formatCurrency(item.amount)}</span>
          ${isAdmin ? `<button type="button" class="expense-delete" data-id="${item.id}" aria-label="Delete expense">×</button>` : ``}
        </div>
      </div>
    `)
    .join("");
}

function syncLogisticsExpensesToUser() {
  if (state.currentUser !== "Logistics Officer") return;
  const adminData = getCurrentUserData();
  if (!state.users["user"]) {
    state.users["user"] = makeUserData("user");
  }
  state.users["user"].expenses = adminData.expenses.map((item) => ({ ...item }));
}

function deleteExpense(expenseId) {
  const currentUser = state.currentUser;
  const isAdmin = state.users[currentUser] && state.users[currentUser].role === "admin";
  if (!isAdmin) {
    alert("Only an admin can delete expenses.");
    return;
  }

  const currentUserData = getCurrentUserData();
  currentUserData.expenses = currentUserData.expenses.filter((item) => item.id !== expenseId);
  mirrorLogisticsExpensesToUser();
  saveState();
  updateDashboard();
}

const expenseList = document.getElementById("expense-list");
expenseList.addEventListener("click", (event) => {
  const button = event.target.closest(".expense-delete");
  if (!button) return;
  const id = Number(button.dataset.id);
  deleteExpense(id);
});

// Claim edit access (grant admin role to current user)
if (claimEditButton) {
  claimEditButton.addEventListener('click', () => {
    if (!isLogisticsName(state.currentUser)) {
      alert('Only the Logistics Officer may claim edit access.');
      return;
    }

    if (!state.adminPin) {
      const pin1 = prompt('Set a new 4-digit admin PIN (numbers only):');
      if (!pin1 || !/^[0-9]{4}$/.test(pin1)) {
        alert('PIN must be exactly 4 digits.');
        return;
      }
      const pin2 = prompt('Confirm the 4-digit admin PIN:');
      if (pin1 !== pin2) {
        alert('PINs do not match. Try again.');
        return;
      }
      setAdminPin(pin1);
      if (!state.users[state.currentUser]) state.users[state.currentUser] = makeUserData(state.currentUser);
      state.users[state.currentUser].role = 'admin';
      saveState();
      updateDashboard();
      alert('Admin PIN set and edit access granted.');
      return;
    }

    const attempt = prompt('Enter the 4-digit admin PIN:');
    if (!attempt) return;
    if (verifyAdminPin(attempt)) {
      if (!state.users[state.currentUser]) state.users[state.currentUser] = makeUserData(state.currentUser);
      state.users[state.currentUser].role = 'admin';
      saveState();
      updateDashboard();
      alert('PIN accepted. Edit access granted.');
    } else {
      alert('Incorrect PIN.');
    }
  });
}

if (resetUsersButton) {
  resetUsersButton.addEventListener('click', () => {
    if (!isCurrentUserAdmin()) {
      alert('Only an admin can delete all users.');
      return;
    }
    const confirmed = confirm('Delete all users and reset to defaults? This will remove all custom user accounts.');
    if (!confirmed) return;
    state = createDefaultState();
    saveState();
    updateDashboard();
    alert('All users have been deleted and defaults restored.');
  });
}

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const currentUserData = getCurrentUserData();
  const newExpense = {
    id: Date.now(),
    date: dateInput.value,
    category: categoryInput.value,
    amount: Number(amountInput.value),
    note: noteInput.value.trim(),
  };

  currentUserData.expenses.push(newExpense);
  mirrorLogisticsExpensesToUser();
  saveState();
  updateDashboard();
  expenseForm.reset();
  dateInput.value = new Date().toISOString().split("T")[0];
});


reportingDateInput.addEventListener("change", (event) => {
  state.asOfDate = event.target.value;
  saveState();
  updateDashboard();
});

userSelect.addEventListener("change", (event) => {
  state.currentUser = event.target.value;
  saveState();
  updateDashboard();
});

switchUserButton.addEventListener("click", () => {
  const newUserName = userNameInput.value.trim();
  if (!newUserName) {
    return;
  }

  if (isLogisticsName(newUserName)) {
    alert("Switching to the Logistics Officer account is only allowed through the Logistics Officer login.");
    return;
  }

  if (!state.users[newUserName]) {
    state.users[newUserName] = makeUserData(newUserName);
  }
  state.currentUser = newUserName;
  userNameInput.value = "";
  saveState();
  updateDashboard();
});

exportCsvButton.addEventListener("click", () => {
  const currentUserData = getCurrentUserData();
  const rows = [
    ["Date", "Category", "Amount", "Note"],
    ...currentUserData.expenses.map((item) => [item.date, item.category, item.amount, item.note || ""]),
  ];
  const csvContent = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.currentUser}-budget.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

function buildExportPayload() {
  return {
    exportedAt: new Date().toISOString(),
    currentUser: state.currentUser,
    users: state.users,
    cdaPlan: state.cdaPlan,
    asOfDate: state.asOfDate,
  };
}

function triggerJsonDownload(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

if (exportDataButton) {
  exportDataButton.addEventListener("click", () => {
    const exportPayload = buildExportPayload();
    triggerJsonDownload(`${state.currentUser || 'budget'}-data.json`, exportPayload);
  });
}

if (showJsonButton && jsonExportPanel && jsonExportText) {
  showJsonButton.addEventListener("click", () => {
    const exportPayload = buildExportPayload();
    jsonExportText.value = JSON.stringify(exportPayload, null, 2);
    jsonExportPanel.classList.remove("hidden");
  });
}

if (closeJsonPanelButton && jsonExportPanel) {
  closeJsonPanelButton.addEventListener("click", () => {
    jsonExportPanel.classList.add("hidden");
  });
}

if (copyJsonButton && jsonExportText) {
  copyJsonButton.addEventListener("click", () => {
    navigator.clipboard?.writeText(jsonExportText.value)
      .then(() => alert("Export JSON copied to clipboard."))
      .catch(() => {
        jsonExportText.select();
        document.execCommand('copy');
        alert("Export JSON copied to clipboard.");
      });
  });
}

if (downloadJsonButton) {
  downloadJsonButton.addEventListener("click", () => {
    const exportPayload = buildExportPayload();
    triggerJsonDownload(`${state.currentUser || 'budget'}-data.json`, exportPayload);
  });
}

if (showImportPanelButton && jsonImportPanel) {
  showImportPanelButton.addEventListener("click", () => {
    jsonImportPanel.classList.remove("hidden");
  });
}

if (closeImportPanelButton && jsonImportPanel) {
  closeImportPanelButton.addEventListener("click", () => {
    jsonImportPanel.classList.add("hidden");
  });
}

if (applyJsonImportButton && jsonImportText) {
  applyJsonImportButton.addEventListener("click", () => {
    try {
      const imported = JSON.parse(jsonImportText.value);
      applyImportedPayload(imported);
      saveState();
      updateDashboard();
      jsonImportText.value = "";
      jsonImportPanel.classList.add("hidden");
      alert('Data imported successfully from pasted JSON.');
    } catch (error) {
      console.error(error);
      alert('Failed to import pasted JSON. Please make sure it is valid export data.');
    }
  });
}

if (importDataButton && importFileInput) {
  importDataButton.addEventListener("click", (event) => {
    event.preventDefault();
    importFileInput.click();
  });
}

function applyImportedPayload(imported) {
  if (!imported || typeof imported !== 'object' || !imported.users) {
    throw new Error('Invalid import file.');
  }

  state.users = {
    ...state.users,
    ...imported.users,
  };

  if (imported.cdaPlan) {
    state.cdaPlan = {
      ...state.cdaPlan,
      ...imported.cdaPlan,
    };
  }
  if (imported.asOfDate) {
    state.asOfDate = imported.asOfDate;
  }
  if (imported.currentUser) {
    state.currentUser = imported.currentUser;
  }
}

if (importFileInput) {
  importFileInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const imported = JSON.parse(loadEvent.target.result);
        applyImportedPayload(imported);
        saveState();
        updateDashboard();
        alert('Data imported successfully.');
      } catch (error) {
        console.error(error);
        alert('Failed to import JSON data. Please use a valid export file.');
      }
    };
    reader.readAsText(file);
  });
}

printReportButton.addEventListener("click", () => {
  window.print();
});

function initializeApp() {
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
  reportingDateInput.value = state.asOfDate || today;
  loginNote.textContent = 'Enter credentials for the normal user or Logistics Officer account.';
  initCloudSync();
  updateCloudStatus();

  // Auto-login support for debugging: use ?autologin=1 or ?autologin=1&user=LOGO
  function getUrlParam(name) {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get(name);
    } catch (e) {
      return null;
    }
  }

  const auto = getUrlParam('autologin');
  const autoUser = getUrlParam('user');

  if (state.currentUser && firebaseDb) {
    waitForCloudAuth()
      .then(() => loadStateFromCloud({ silent: true }))
      .catch((authError) => {
        console.warn("Cloud auth was not ready on startup:", authError);
      });
  }

  if (auto === '1' || auto === 'true') {
    // fill credentials and attempt login automatically
    if (autoUser && autoUser.toUpperCase() === 'LOGO') {
      if (loginUsername) loginUsername.value = 'LOGO';
      if (loginPassword) loginPassword.value = '1234';
    } else {
      if (loginUsername) loginUsername.value = 'user';
      if (loginPassword) loginPassword.value = 'user';
    }
    const ok = login();
    if (ok) {
      hideLoginScreen();
      updateDashboard();
      if (firebaseDb) syncCloudData();
      pushCloudLog('Auto-login succeeded', 'info');
      return;
    } else {
      pushCloudLog('Auto-login failed', 'warn');
    }
  }

  showLoginScreen();

  loginSubmit.addEventListener("click", () => {
    const success = login();
    if (success) {
      hideLoginScreen();
      updateDashboard();
      if (isCloudSyncEnabled()) {
        syncCloudData();
      }
    }
  });

  window.addEventListener("focus", () => {
    if (isCloudSyncEnabled() && state.currentUser) {
      loadStateFromCloud({ silent: true });
    }
  });

  if (savePlanButton) {
    savePlanButton.addEventListener("click", () => {
      if (!isCurrentUserAdmin()) {
        alert("Only the Logistics Officer can save CDA amounts.");
        return;
      }

      const planInputs = planFields.querySelectorAll(".plan-input");
      planInputs.forEach((input) => {
        const category = input.dataset.category;
        state.cdaPlan[category] = Number(input.value) || 0;
      });
      saveState();
      updateDashboard();
      alert("CDA approved amounts updated.");
    });
  }

  function logout() {
    const confirmed = confirm("Log out and return to login screen?");
    if (!confirmed) return;

    state.currentUser = null;
    loginUsername.value = "";
    loginPassword.value = "";
    loginNote.textContent = 'Enter credentials for the normal user or Logistics Officer account.';
    saveState();
    showLoginScreen();
    updateDashboard();
  }

  function handleCloudSyncClick() {
    console.log("cloud sync button handler attached", { button: cloudSyncButton });
    syncCloudData();
  }

  if (cloudSyncButton) {
    cloudSyncButton.addEventListener("click", handleCloudSyncClick);
  }

  if (cloudDebugButton) {
    cloudDebugButton.addEventListener("click", () => {
      if (!firebaseDb) {
        alert('Cloud not configured. Check Firebase settings.');
        return;
      }
      waitForCloudAuth()
        .then(() => {
          const debugPath = cloudPath + '/debug';
          const payload = {
            testAt: new Date().toISOString(),
            user: state.currentUser || null,
            client: navigator.userAgent || 'unknown',
          };
          firebaseDb
            .ref(debugPath)
            .push(payload)
            .then(() => {
              pushCloudLog('Debug write succeeded to: ' + debugPath, 'info');
              alert('Debug write succeeded to: ' + debugPath);
            })
            .catch((err) => {
              console.error('Debug write failed:', err);
              pushCloudLog('Debug write failed: ' + (err && err.message ? err.message : err), 'error');
              alert('Debug write failed: ' + (err && err.message ? err.message : err));
            });
        })
        .catch((err) => {
          console.error('Auth not ready for debug write:', err);
          pushCloudLog('Auth not ready for debug write: ' + (err && err.message ? err.message : err), 'error');
          alert('Cloud auth not ready: ' + (err && err.message ? err.message : err));
        });
    });
  } else {
    console.warn("Cloud sync button not found on page.");
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
