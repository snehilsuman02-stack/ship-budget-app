import { formatCurrency, formatNumber } from "./utils.js";

function getKpiData(state) {
  const spares = state.spares || [];
  const purchaseRequests = state.purchaseRequests || [];
  const transactions = state.transactions || [];

  const totalItems = spares.length;
  const totalQty = spares.reduce((sum, item) => sum + Number(item.quantityAvailable || 0), 0);
  const critical = spares.filter((item) => (item.natureOfSpares || item.criticality) === "Critical").length;
  const low = spares.filter(
    (item) => Number(item.quantityAvailable || 0) > 0 && Number(item.quantityAvailable || 0) <= Number(item.reorderLevel || 0)
  ).length;
  const out = spares.filter((item) => Number(item.quantityAvailable || 0) <= 0).length;
  const pendingPr = purchaseRequests.filter((item) => ["Submitted", "Under Review", "Approved", "Ordered"].includes(item.status)).length;

  const stockValue = spares.reduce(
    (sum, item) => sum + Number(item.quantityAvailable || 0) * Number(item.averagePurchasePrice || 0),
    0
  );

  const month = new Date().getMonth();
  const issuedThisMonth = transactions.filter((tx) => {
    if (tx.transactionType !== "Issue") return false;
    const d = new Date(tx.date || tx.timestamp || 0);
    return d.getMonth() === month;
  }).length;

  return { totalItems, totalQty, critical, low, out, pendingPr, stockValue, issuedThisMonth };
}

function buildRecentTransactionsRows(transactions = []) {
  const recent = [...transactions]
    .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
    .slice(0, 8);

  if (!recent.length) {
    return "<tr><td colspan='5'>No transactions available.</td></tr>";
  }

  return recent
    .map(
      (tx) => `
      <tr>
        <td>${tx.date || "-"}</td>
        <td>${tx.transactionType || "-"}</td>
        <td>${tx.spareName || tx.spareId || "-"}</td>
        <td>${formatNumber(tx.quantity || 0)}</td>
        <td>${tx.reference || "-"}</td>
      </tr>
    `
    )
    .join("");
}

export function renderDashboard(container, state) {
  const kpi = getKpiData(state);

  container.innerHTML = `
    <section class="kpi-grid">
      <article class="card kpi-card"><h3>Total Spare Items</h3><p class="kpi-value">${formatNumber(kpi.totalItems)}</p><p class="kpi-meta">Master item count</p></article>
      <article class="card kpi-card"><h3>Total Quantity</h3><p class="kpi-value">${formatNumber(kpi.totalQty)}</p><p class="kpi-meta">Units in stock</p></article>
      <article class="card kpi-card"><h3>Critical Spares</h3><p class="kpi-value">${formatNumber(kpi.critical)}</p><p class="kpi-meta">Flagged as critical</p></article>
      <article class="card kpi-card"><h3>Low Stock Items</h3><p class="kpi-value">${formatNumber(kpi.low)}</p><p class="kpi-meta">At or below reorder level</p></article>
      <article class="card kpi-card"><h3>Out of Stock</h3><p class="kpi-value">${formatNumber(kpi.out)}</p><p class="kpi-meta">Immediate action required</p></article>
      <article class="card kpi-card"><h3>Pending PRs</h3><p class="kpi-value">${formatNumber(kpi.pendingPr)}</p><p class="kpi-meta">Awaiting procurement action</p></article>
      <article class="card kpi-card"><h3>Stock Value</h3><p class="kpi-value">${formatCurrency(kpi.stockValue, state.settings?.currency || "USD")}</p><p class="kpi-meta">Quantity x unit cost</p></article>
      <article class="card kpi-card"><h3>Issued This Month</h3><p class="kpi-value">${formatNumber(kpi.issuedThisMonth)}</p><p class="kpi-meta">Current month issues</p></article>
    </section>

    <section class="dashboard-grid">
      <article class="card">
        <div class="section-title"><h3>Stock by Category</h3><span class="muted">Live</span></div>
        <div class="chart-wrap"><canvas id="stock-category-chart" height="120"></canvas></div>
      </article>

      <article class="card">
        <div class="section-title"><h3>Low Stock Alerts</h3><span class="muted">Auto-detected</span></div>
        <div id="low-stock-list" class="stack-list"></div>
      </article>
    </section>

    <section class="card">
      <div class="section-title"><h3>Recent Transactions</h3><span class="muted">Latest 8</span></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Spare</th><th>Qty</th><th>Reference</th></tr>
          </thead>
          <tbody>
            ${buildRecentTransactionsRows(state.transactions || [])}
          </tbody>
        </table>
      </div>
    </section>
  `;

  renderLowStockList(state);
  renderStockCategoryChart(state);
}

function renderLowStockList(state) {
  const host = document.getElementById("low-stock-list");
  if (!host) return;

  const low = (state.spares || []).filter(
    (item) => Number(item.quantityAvailable || 0) > 0 && Number(item.quantityAvailable || 0) <= Number(item.reorderLevel || 0)
  );

  if (!low.length) {
    host.innerHTML = '<div class="stack-item"><strong>All clear</strong><span class="muted">No low-stock items right now.</span></div>';
    return;
  }

  host.innerHTML = low
    .slice(0, 8)
    .map((item) => {
      const qty = Number(item.quantityAvailable || 0);
      const reorder = Number(item.reorderLevel || 0);
      const statusClass = qty <= 0 ? "critical" : "low";
      return `
        <article class="stack-item">
          <strong>${item.spareName || item.partNumber || item.spareId || "Unnamed Spare"}</strong>
          <span class="muted">Qty: <span class="status ${statusClass}">${formatNumber(qty)}</span> | Reorder: ${formatNumber(reorder)}</span>
        </article>
      `;
    })
    .join("");
}

function renderStockCategoryChart(state) {
  const canvas = document.getElementById("stock-category-chart");
  if (!canvas || typeof window.Chart === "undefined") return;

  const map = new Map();
  (state.spares || []).forEach((item) => {
    const key = item.category || "Uncategorized";
    const qty = Number(item.quantityAvailable || 0);
    map.set(key, (map.get(key) || 0) + qty);
  });

  const labels = [...map.keys()];
  const values = [...map.values()];

  const old = window.__ssmsCharts?.stockCategory;
  if (old) old.destroy();
  if (!window.__ssmsCharts) window.__ssmsCharts = {};

  window.__ssmsCharts.stockCategory = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Stock Qty",
          data: values,
          backgroundColor: "rgba(47, 127, 191, 0.72)",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}
