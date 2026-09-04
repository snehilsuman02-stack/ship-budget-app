import { formatNumber, setHashRoute } from "./utils.js";

function getQuantity(spare) {
  return Number(spare.quantityAvailable ?? spare.qty ?? 0);
}

function getReorderLevel(spare) {
  return Number(spare.reorderLevel ?? spare.minimumStockLevel ?? spare.minQty ?? 0);
}

function matchesStatus(spare, status) {
  const quantity = getQuantity(spare);
  if (status === "out") return quantity <= 0;
  return quantity > 0 && quantity <= getReorderLevel(spare);
}

function getSearchText(spare) {
  return [
    spare.spareId,
    spare.spareName || spare.name,
    spare.partNumber || spare.code,
    spare.nsn,
    spare.equipmentName || spare.equipment,
    spare.category,
    spare.location,
  ]
    .join(" ")
    .toLowerCase();
}

function renderRows(spares, status) {
  if (!spares.length) {
    const message = status === "out" ? "No spares are currently out of stock." : "No spares are currently below the reorder level.";
    return `<tr><td colspan="10" class="muted">${message}</td></tr>`;
  }

  return spares
    .map((spare) => {
      const quantity = getQuantity(spare);
      const minimum = Number(spare.minimumStockLevel ?? spare.minQty ?? 0);
      const reorder = getReorderLevel(spare);
      const statusLabel = quantity <= 0 ? "OUT OF STOCK" : "LOW STOCK";
      const statusClass = quantity <= 0 ? "critical" : "low";

      return `
        <tr>
          <td>${spare.spareId || spare.id || "-"}</td>
          <td>${spare.spareName || spare.name || "-"}</td>
          <td>${spare.partNumber || spare.code || "-"}</td>
          <td>${spare.equipmentName || spare.equipment || "-"}</td>
          <td>${spare.category || "-"}</td>
          <td>${spare.location || "-"}</td>
          <td>${formatNumber(quantity)}</td>
          <td>${formatNumber(minimum)}</td>
          <td>${formatNumber(reorder)}</td>
          <td><span class="status ${statusClass}">${statusLabel}</span></td>
        </tr>
      `;
    })
    .join("");
}

export function renderStockStatus(container, state, status) {
  const allSpares = state.spares || [];
  const filteredSpares = allSpares.filter((spare) => matchesStatus(spare, status));
  const title = status === "out" ? "Out of Stock" : "Low Stock";
  const description = status === "out"
    ? "Spares with no quantity currently available."
    : "Spares with stock above zero but at or below the reorder level.";

  container.innerHTML = `
    <section class="card">
      <div class="section-title">
        <div>
          <h2>${title}</h2>
          <p class="muted" style="margin-top: 6px;">${description}</p>
        </div>
        <span class="role-badge" id="stock-status-count">${formatNumber(filteredSpares.length)} items</span>
      </div>
      <div class="action-row">
        <button type="button" class="btn btn-primary" id="stock-status-inventory-btn">Open Inventory</button>
        <button type="button" class="btn btn-secondary" id="stock-status-refresh-btn">Refresh</button>
      </div>
    </section>

    <section class="card" style="margin-top: 14px;">
      <div class="section-title">
        <h3>${title} Register</h3>
        <input id="stock-status-search" type="search" placeholder="Search by spare, part number, equipment or location" style="max-width: 420px;" />
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Spare ID</th>
              <th>Spare Name</th>
              <th>Part Number</th>
              <th>Equipment</th>
              <th>Category</th>
              <th>Location</th>
              <th>Available Qty</th>
              <th>Minimum Qty</th>
              <th>Reorder Level</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="stock-status-table-body">${renderRows(filteredSpares, status)}</tbody>
        </table>
      </div>
    </section>
  `;

  container.querySelector("#stock-status-inventory-btn")?.addEventListener("click", () => setHashRoute("inventory"));
  container.querySelector("#stock-status-refresh-btn")?.addEventListener("click", () => renderStockStatus(container, state, status));
  container.querySelector("#stock-status-search")?.addEventListener("input", (event) => {
    const query = String(event.target.value || "").trim().toLowerCase();
    const visibleSpares = filteredSpares.filter((spare) => !query || getSearchText(spare).includes(query));
    const tableBody = container.querySelector("#stock-status-table-body");
    if (tableBody) tableBody.innerHTML = renderRows(visibleSpares, status);
  });
}