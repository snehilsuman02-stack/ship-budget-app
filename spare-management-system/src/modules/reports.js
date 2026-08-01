import { exportToExcel } from "../services/file.js";
import { exportInventoryPdf } from "../services/reports.js";

export function renderReports(container, state, ctx) {
  const spares = state.data.spares;
  const tx = state.data.transactions;

  container.innerHTML = `
    <section class="card grid">
      <h3>Reports</h3>
      <div class="toolbar">
        <button id="report-inv-excel" type="button">Inventory Excel</button>
        <button id="report-inv-pdf" type="button">Inventory PDF</button>
        <button id="report-tx-excel" type="button">Transactions Excel</button>
      </div>
      <p class="meta">Exports are generated on demand from realtime data.</p>
    </section>
  `;

  container.querySelector("#report-inv-excel").addEventListener("click", () => {
    try {
      exportToExcel("inventory-report.xlsx", spares);
      ctx.toast("Inventory Excel exported.");
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });

  container.querySelector("#report-inv-pdf").addEventListener("click", () => {
    try {
      exportInventoryPdf(
        "Inventory Report",
        ["Code", "Name", "Category", "Qty", "Min Qty", "Location"],
        spares.map((r) => [r.code || "", r.name || "", r.category || "", r.qty || 0, r.minQty || 0, r.location || ""])
      );
      ctx.toast("Inventory PDF exported.");
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });

  container.querySelector("#report-tx-excel").addEventListener("click", () => {
    try {
      exportToExcel("transactions-report.xlsx", tx);
      ctx.toast("Transactions Excel exported.");
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });
}
