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
const planForm = document.getElementById("plan-form");
const planFields = document.getElementById("plan-fields");
const userSelect = document.getElementById("user-select");
const reportingDateInput = document.getElementById("reporting-date");
const userNameInput = document.getElementById("user-name");
const switchUserButton = document.getElementById("switch-user");
const exportCsvButton = document.getElementById("export-csv");
const printReportButton = document.getElementById("print-report");
const claimEditButton = document.getElementById("claim-edit");
const resetUsersButton = document.getElementById("reset-users");
const loginScreen = document.getElementById("login-screen");
const loginForm = document.getElementById("login-form");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginSubmit = document.getElementById("login-submit");
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
      asOfDate: parsed.asOfDate || getDefaultAsOfDate(),
    };
  } catch {
    return createDefaultState();
  }
}

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
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  if (username === "user" && password === "user") {
    state.currentUser = "user";
    state.users["user"] = state.users["user"] || makeUserData("user");
    saveState();
    return true;
  }
  if (username === "LOGO" && password === "1234") {
    state.currentUser = "Logistics Officer";
    state.users["Logistics Officer"] = state.users["Logistics Officer"] || makeUserData("Logistics Officer");
    state.users["Logistics Officer"].role = "admin";
    saveState();
    return true;
  }
  alert("Invalid username or password.");
  return false;
}

function createDefaultState() {
  return {
    currentUser: null,
    asOfDate: getDefaultAsOfDate(),
    adminPin: null,
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

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
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

function getAsOfDate() {
  return reportingDateInput.value || state.asOfDate || getDefaultAsOfDate();
}

function isCurrentUserAdmin() {
  return state.users[state.currentUser] && state.users[state.currentUser].role === "admin";
}

function filterExpensesToDate(expenses, asOfDate) {
  return expenses.filter((item) => item.date <= asOfDate);
}

function updateDashboard() {
  const currentUserData = getCurrentUserData();
  const asOfDate = getAsOfDate();
  const expensesToDate = filterExpensesToDate(currentUserData.expenses, asOfDate);
  const spendByCategory = getCategorySpend(expensesToDate);
  const totalBudget = Object.values(currentUserData.plan).reduce((sum, value) => sum + Number(value), 0);
  const totalSpent = expensesToDate.reduce((sum, item) => sum + Number(item.amount), 0);
  const remainingBudget = totalBudget - totalSpent;
  const utilizationRate = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;

  document.getElementById("total-budget").textContent = formatCurrency(totalBudget);
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
  // Plan fields and submit
  planFields.querySelectorAll('input').forEach((el) => (el.disabled = !admin));
  const planSubmit = planForm.querySelector('button[type="submit"]');
  if (planSubmit) planSubmit.disabled = !admin;
  // Show or hide claim button
  if (claimEditButton) {
    claimEditButton.style.display = admin ? 'none' : (isLogisticsName(state.currentUser) ? 'inline-block' : 'none');
  }
  if (resetUsersButton) {
    resetUsersButton.style.display = admin ? 'inline-block' : 'none';
  }

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
  renderProgress(spendByCategory, currentUserData.plan);
  renderDonutChart(spendByCategory);
  renderExpenseList();
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
  const currentUserData = getCurrentUserData();
  planFields.innerHTML = Object.entries(defaultBudgetCaps)
    .map(([category, defaultValue]) => {
      const value = currentUserData.plan[category] ?? defaultValue;
      return `
        <label>
          ${category}
          <input id="plan-${category}" type="number" min="0" step="1000" value="${value}" />
        </label>
      `;
    })
    .join("");
}

function renderProgress(spendByCategory, plan) {
  const container = document.getElementById("progress-list");
  container.innerHTML = "";

  Object.entries(defaultBudgetCaps).forEach(([category, defaultCap], index) => {
    const cap = Number(plan[category] ?? defaultCap);
    const spent = spendByCategory[category] || 0;
    const percent = cap ? Math.min(100, Math.round((spent / cap) * 100)) : 0;
    const pending = cap - spent;
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

function deleteExpense(expenseId) {
  const currentUser = state.currentUser;
  const isAdmin = state.users[currentUser] && state.users[currentUser].role === "admin";
  if (!isAdmin) {
    alert("Only an admin can delete expenses.");
    return;
  }

  const currentUserData = getCurrentUserData();
  currentUserData.expenses = currentUserData.expenses.filter((item) => item.id !== expenseId);
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
  saveState();
  updateDashboard();
  expenseForm.reset();
  dateInput.value = new Date().toISOString().split("T")[0];
});

planForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const currentUserData = getCurrentUserData();
  currentUserData.plan = Object.entries(defaultBudgetCaps).reduce((acc, [category]) => {
    acc[category] = Number(document.getElementById(`plan-${category}`).value) || 0;
    return acc;
  }, {});
  saveState();
  updateDashboard();
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

printReportButton.addEventListener("click", () => {
  window.print();
});

window.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
  reportingDateInput.value = state.asOfDate || today;
  loginNote.textContent = 'Enter credentials for the normal user or Logistics Officer account.';
  showLoginScreen();

  loginSubmit.addEventListener("click", () => {
    const success = login();
    if (success) {
      hideLoginScreen();
      updateDashboard();
    }
  });
});
