import { formatNumber } from "./utils.js";

function getNatureOfSpare(spare) {
  return spare.natureOfSpares || spare.criticality || "Non-Critical";
}

function getCriticalSpares(spares = []) {
  return spares.filter((spare) => getNatureOfSpare(spare) === "Critical");
}

function getStockStatus(spare) {
  const quantity = Number(spare.quantityAvailable ?? spare.qty ?? 0);
  const minimum = Number(spare.minimumStockLevel ?? spare.minQty ?? 0);

  if (quantity <= 0) return { label: "OUT OF STOCK", className: "critical" };
  if (quantity <= minimum) return { label: "LOW STOCK", className: "low" };
  return { label: "ADEQUATE", className: "ok" };
}

function renderRows(spares) {
  if (!spares.length) {
    return `<tr><td colspan="10" class="muted">No spares are currently marked as Critical.</td></tr>`;
  }

  return spares
    .map((spare) => {
      const quantity = Number(spare.quantityAvailable ?? spare.qty ?? 0);
      const minimum = Number(spare.minimumStockLevel ?? spare.minQty ?? 0);
      const status = getStockStatus(spare);

      return `
        <tr>
          <td>${spare.spareId || spare.id || "-"}</td>
          <td>${spare.spareName || spare.name || "-"}</td>
          <td>${spare.partNumber || spare.code || "-"}</td>
          <td>${spare.nsn || "-"}</td>
          <td>${spare.equipmentName || spare.equipment || "-"}</td>
          <td>${spare.category || "-"}</td>
          <td>${spare.location || "-"}</td>
          <td>${formatNumber(quantity)}</td>
          <td>${formatNumber(minimum)}</td>
          <td><span class="status ${status.className}">${status.label}</span></td>
        </tr>
      `;
    })
    .join("");
}

export function renderCriticalSpares(container, state) {
  const criticalSpares = getCriticalSpares(state.spares || []);

  container.innerHTML = `
    <section class="card">
      <div class="section-title">
        <div>
          <h2>Critical Spares</h2>
          <p class="muted" style="margin-top: 6px;">All inventory records whose Nature of Spares is marked Critical.</p>
        </div>
        <span class="role-badge">${formatNumber(criticalSpares.length)} items</span>
      </div>
    </section>

    <section class="card" style="margin-top: 14px;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Spare ID</th>
              <th>Spare Name</th>
              <th>Part Number</th>
              <th>NSN</th>
              <th>Equipment</th>
              <th>Category</th>
              <th>Location</th>
              <th>Available Qty</th>
              <th>Minimum Qty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${renderRows(criticalSpares)}</tbody>
        </table>
      </div>
    </section>
  `;
}
