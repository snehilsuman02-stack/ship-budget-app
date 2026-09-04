import { saveSpare } from "../services/inventory.js";
import { removeById } from "../services/database.js";
import { exportToExcel, importFromExcel } from "../services/file.js";
import { exportInventoryPdf } from "../services/reports.js";
import { paginateAndSort } from "../ui/table.js";

const tableState = {
  page: 1,
  pageSize: 10,
  query: "",
  sortBy: "name",
  sortDir: "asc",
  categoryFilter: "",
};

export function renderInventory(container, state, ctx) {
  const rows = state.data.spares;
  const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))];
  const result = paginateAndSort(rows, {
    ...tableState,
    filterKey: "category",
    filterValue: tableState.categoryFilter,
  });

  container.innerHTML = `
    <section class="card grid">
      <h3>Inventory</h3>
      <div class="toolbar">
        <input id="inv-search" class="input" placeholder="Search by any field" value="${tableState.query}" />
        <select id="inv-filter-category">
          <option value="">All categories</option>
          ${categories
            .map(
              (cat) => `<option value="${cat}" ${tableState.categoryFilter === cat ? "selected" : ""}>${cat}</option>`
            )
            .join("")}
        </select>
        <button id="inv-export-excel" type="button">Export Excel</button>
        <button id="inv-export-pdf" type="button">Export PDF</button>
        <button id="inv-import-button" type="button">Bulk Import CSV/Excel</button>
        <input id="inv-import-file" type="file" accept=".csv,.xlsx,.xls,text/csv" class="hidden" />
      </div>

      <form id="spare-form" class="toolbar">
        <input class="input" name="code" placeholder="Code" required />
        <input class="input" name="name" placeholder="Name" required />
        <input class="input" name="category" placeholder="Category" required />
        <input class="input" name="qty" placeholder="Qty" type="number" min="0" required />
        <input class="input" name="minQty" placeholder="Min Qty" type="number" min="0" required />
        <input class="input" name="location" placeholder="Location" />
        <button class="primary" type="submit">Save Spare</button>
      </form>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th><button type="button" data-sort="code">Code</button></th>
              <th><button type="button" data-sort="name">Name</button></th>
              <th><button type="button" data-sort="category">Category</button></th>
              <th><button type="button" data-sort="qty">Qty</button></th>
              <th><button type="button" data-sort="minQty">Min Qty</button></th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              result.rows.length
                ? result.rows
                    .map(
                      (row) =>
                        `<tr>
                          <td>${row.code || ""}</td>
                          <td>${row.name || ""}</td>
                          <td>${row.category || ""}</td>
                          <td>${row.qty || 0}</td>
                          <td>${row.minQty || 0}</td>
                          <td>${row.location || ""}</td>
                          <td><button data-del="${row.id}" type="button">Delete</button></td>
                        </tr>`
                    )
                    .join("")
                : `<tr><td colspan="7">No spares found.</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="toolbar">
        <button id="inv-prev" type="button">Prev</button>
        <span>Page ${result.page} of ${result.totalPages} (${result.total} rows)</span>
        <button id="inv-next" type="button">Next</button>
      </div>
    </section>
  `;

  container.querySelector("#inv-search").addEventListener("input", (e) => {
    tableState.query = e.target.value;
    tableState.page = 1;
    ctx.render();
  });

  container.querySelector("#inv-filter-category").addEventListener("change", (e) => {
    tableState.categoryFilter = e.target.value;
    tableState.page = 1;
    ctx.render();
  });

  container.querySelector("#inv-prev").addEventListener("click", () => {
    tableState.page = Math.max(1, tableState.page - 1);
    ctx.render();
  });

  container.querySelector("#inv-next").addEventListener("click", () => {
    tableState.page += 1;
    ctx.render();
  });

  container.querySelectorAll("[data-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.sort;
      if (tableState.sortBy === key) tableState.sortDir = tableState.sortDir === "asc" ? "desc" : "asc";
      else {
        tableState.sortBy = key;
        tableState.sortDir = "asc";
      }
      ctx.render();
    });
  });

  container.querySelector("#spare-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      await saveSpare({
        code: form.get("code"),
        name: form.get("name"),
        category: form.get("category"),
        qty: Number(form.get("qty")),
        minQty: Number(form.get("minQty")),
        location: form.get("location"),
      });
      await ctx.log("create", "inventory", { code: form.get("code"), name: form.get("name") });
      event.target.reset();
      ctx.toast("Spare saved.");
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });

  container.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this spare?")) return;
      try {
        await removeById("spares", btn.dataset.del);
        await ctx.log("delete", "inventory", { id: btn.dataset.del });
        ctx.toast("Spare deleted.");
      } catch (error) {
        ctx.toast(error.message, "error");
      }
    });
  });

  container.querySelector("#inv-export-excel").addEventListener("click", () => {
    try {
      exportToExcel("inventory.xlsx", rows);
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });

  container.querySelector("#inv-export-pdf").addEventListener("click", () => {
    try {
      exportInventoryPdf(
        "Inventory Report",
        ["Code", "Name", "Category", "Qty", "Min Qty", "Location"],
        rows.map((r) => [r.code || "", r.name || "", r.category || "", r.qty || 0, r.minQty || 0, r.location || ""])
      );
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });

  container.querySelector("#inv-import-button").addEventListener("click", () => {
    container.querySelector("#inv-import-file").click();
  });

  container.querySelector("#inv-import-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromExcel(file);
      for (const row of data) {
        await saveSpare({
          code: row.code || row.Code || row["Spare ID"] || row.spareId || row["Part Number"] || row.partNumber,
          name: row.name || row.Name || row["Spare Name"] || row.spareName,
          category: row.category || row.Category,
          qty: row.qty || row.Qty || row["Quantity Available"] || row.quantityAvailable || 0,
          minQty: row.minQty || row["Min Qty"] || row["Minimum Stock Level"] || row.minimumStockLevel || 0,
          location: row.location || row.Location || "",
        });
      }
      await ctx.log("import", "inventory", { rows: data.length });
      ctx.toast(`Imported ${data.length} rows.`);
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });
}
