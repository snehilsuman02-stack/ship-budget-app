(function () {
  const storageKey = "ship-budget-app-state";
  const defaultBudgetCaps = {
    "Material and Supplies": 5800000,
    "Repair and Maintenance": 10300000,
    "Office expenses": 1000000,
    "Printing and Publication": 250000,
    "Machinary Equipment": 300000,
    "Other Revenue Expenditure": 150000,
    "Digital equipment": 200000,
    "Fuel and Lubricants": 0,
  };

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  }

  function monthKeyFromDate(dateString) {
    const date = new Date(dateString);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }

  function getSameMonthLastYear(dateString) {
    const date = new Date(dateString);
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split("T")[0];
  }

  function getCategorySpend(expenses) {
    return Object.keys(defaultBudgetCaps).reduce((acc, category) => {
      acc[category] = expenses
        .filter((item) => item.category === category)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return acc;
    }, {});
  }

  function readState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function getBudgetHealth(utilization) {
    if (utilization > 85) {
      return { label: "Critical", className: "critical" };
    }
    if (utilization > 60) {
      return { label: "Watch", className: "watch" };
    }
    return { label: "Healthy", className: "healthy" };
  }

  function renderStatusModule() {
    const params = new URLSearchParams(window.location.search);
    const moduleName = (params.get("module") || "").toLowerCase();
    if (moduleName !== "status") return;

    const moduleGrid = document.querySelector(".module-grid");
    if (!moduleGrid) return;

    const state = readState();
    const users = (state && state.users) || {};
    const currentUser = (state && state.currentUser) || Object.keys(users)[0] || "user";
    const userData = users[currentUser] || { expenses: [] };
    const allExpenses = Array.isArray(userData.expenses) ? userData.expenses : [];
    const asOfDate = (state && state.asOfDate) || new Date().toISOString().split("T")[0];

    const expensesToDate = allExpenses.filter((item) => item.date && item.date <= asOfDate);
    const thisMonthKey = monthKeyFromDate(asOfDate);
    const lastYearDate = getSameMonthLastYear(asOfDate);
    const lastYearMonthKey = monthKeyFromDate(lastYearDate);
    const currentMonthExpenses = allExpenses.filter((item) => item.date && monthKeyFromDate(item.date) === thisMonthKey);
    const lastYearMonthExpenses = allExpenses.filter((item) => item.date && monthKeyFromDate(item.date) === lastYearMonthKey);

    const plan = { ...defaultBudgetCaps, ...((state && state.cdaPlan) || {}) };
    const spendByCategory = getCategorySpend(expensesToDate);
    const currentMonthSpendByCategory = getCategorySpend(currentMonthExpenses);
    const lastYearMonthSpendByCategory = getCategorySpend(lastYearMonthExpenses);

    const totalAllocation = 18000000;
    const totalSpent = expensesToDate.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const utilization = totalAllocation ? Math.round((totalSpent / totalAllocation) * 100) : 0;
    const health = getBudgetHealth(utilization);

    const rows = Object.keys(defaultBudgetCaps)
      .map((category) => {
        const allocation = Number(plan[category] || 0);
        const spent = Number(spendByCategory[category] || 0);
        const percent = allocation > 0 ? Math.min(100, Math.round((spent / allocation) * 100)) : 0;
        const pending = allocation - spent;
        const monthSpent = Number(currentMonthSpendByCategory[category] || 0);
        const lastYearSpent = Number(lastYearMonthSpendByCategory[category] || 0);
        const variance = monthSpent - lastYearSpent;

        return (
          '<article class="status-item">' +
            '<div class="status-label-row">' +
              '<strong>' + category + '</strong>' +
              '<span>' + formatCurrency(spent) + ' / ' + formatCurrency(allocation) + '</span>' +
            '</div>' +
            '<div class="status-muted-row">' +
              '<span>' + (pending >= 0 ? 'Pending ' + formatCurrency(pending) : 'Over by ' + formatCurrency(Math.abs(pending))) + '</span>' +
              '<span>Current month ' + formatCurrency(monthSpent) + ' | Last year same month ' + formatCurrency(lastYearSpent) + '</span>' +
            '</div>' +
            '<div class="status-muted-row">' +
              '<span>Variance ' + (variance >= 0 ? '+' : '-') + formatCurrency(Math.abs(variance)) + '</span>' +
              '<span>Utilization ' + percent + '%</span>' +
            '</div>' +
            '<div class="status-bar"><div class="status-bar-fill" style="width:' + percent + '%;"></div></div>' +
          '</article>'
        );
      })
      .join("");

    moduleGrid.innerHTML =
      '<section class="module-card budget-status-shell" style="grid-column: 1 / -1;">' +
        '<div class="status-topline">' +
          '<span>Showing budget status for <strong>' + currentUser + '</strong> as of <strong>' + asOfDate + '</strong></span>' +
          '<span class="status-health-pill ' + health.className + '">Overall ' + health.label + ' · ' + utilization + '%</span>' +
        '</div>' +
        rows +
      '</section>';
  }

  window.addEventListener("DOMContentLoaded", renderStatusModule);
})();
