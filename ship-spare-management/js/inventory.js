import { getFirebaseContext } from "./firebase.js";
import { setValue } from "./database.js";
import { showToast } from "./notifications.js";
import { createId } from "./utils.js";

const STORAGE_KEY = "ssms-spares";

function getStatus(quantity, minimum, reorder) {
  if (Number(quantity) <= 0) return { label: "OUT OF STOCK", className: "critical" };
  if (Number(quantity) <= Number(minimum)) return { label: "LOW STOCK", className: "low" };
  return { label: "ADEQUATE", className: "ok" };
}

function saveSparesToStorage(state, spares) {
  state.spares = spares;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spares));

  const { db, sdk } = getFirebaseContext();
  if (db && sdk?.ref && sdk?.set) {
    const target = sdk.ref(db, "spares");
    const objectMap = spares.reduce((acc, item) => {
      acc[item.spareId] = item;
      return acc;
    }, {});
    sdk
      .set(target, objectMap)
      .catch((error) => console.error("Inventory sync failed", error));
  }
}

function validateSpare(item) {
  const errors = [];

  if (!String(item.spareName || "").trim()) errors.push("Spare name is required.");
  if (!String(item.partNumber || "").trim()) errors.push("Part number is required.");
  if (!String(item.category || "").trim()) errors.push("Category is required.");

  const quantity = Number(item.quantityAvailable);
  const minimum = Number(item.minimumStockLevel);
  const reorder = Number(item.reorderLevel);

  if (Number.isNaN(quantity) || quantity < 0) errors.push("Quantity available must be a valid non-negative number.");
  if (Number.isNaN(minimum) || minimum < 0) errors.push("Minimum stock level must be a valid non-negative number.");
  if (Number.isNaN(reorder) || reorder < 0) errors.push("Reorder level must be a valid non-negative number.");
  if (reorder < minimum) errors.push("Reorder level cannot be lower than minimum stock level.");

  return errors;
}

function ensureUniquePartNumber(state, item, currentId) {
  const duplicate = state.spares.find(
    (entry) => entry.partNumber && entry.partNumber.toLowerCase() === String(item.partNumber).trim().toLowerCase() && entry.spareId !== currentId
  );

  return !duplicate;
}

function renderTableRows(rows) {
  if (!rows.length) {
    return `<tr><td colspan="14">No inventory records found for the current filter.</td></tr>`;
  }

  return rows
    .map((item) => {
      const status = getStatus(item.quantityAvailable, item.minimumStockLevel, item.reorderLevel);
      return `
        <tr>
          <td>${item.spareId || "-"}</td>
          <td>${item.partNumber || "-"}</td>
          <td>${item.spareName || "-"}</td>
          <td>${item.equipmentName || "-"}</td>
          <td>${item.category || "-"}</td>
          <td>${item.location || "-"}</td>
          <td>${Number(item.quantityAvailable || 0)}</td>
          <td>${Number(item.minimumStockLevel || 0)}</td>
          <td><span class="status ${status.className}">${status.label}</span></td>
          <td>${item.natureOfSpares || item.criticality || "Non-Critical"}</td>
          <td>${item.typeOfSpares || "Consumable"}</td>
          <td>${item.lastIssue || "-"}</td>
          <td>${item.lastReceipt || "-"}</td>
          <td>
            <button class="btn btn-secondary" data-action="edit-spare" data-id="${item.spareId}">Edit</button>
            <button class="btn btn-danger" data-action="delete-spare" data-id="${item.spareId}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function serializeForm(form) {
  const formData = new FormData(form);
  const values = Object.fromEntries(formData.entries());

  return {
    spareId: values.spareId || createId("SP"),
    spareName: String(values.spareName || "").trim(),
    partNumber: String(values.partNumber || "").trim(),
    nsn: String(values.nsn || "").trim(),
    manufacturerPartNumber: String(values.manufacturerPartNumber || "").trim(),
    manufacturer: String(values.manufacturer || "").trim(),
    description: String(values.description || "").trim(),
    category: String(values.category || "").trim(),
    equipmentName: String(values.equipmentName || "").trim(),
    location: String(values.location || "").trim(),
    quantityAvailable: Number(values.quantityAvailable || 0),
    minimumStockLevel: Number(values.minimumStockLevel || 0),
    reorderLevel: Number(values.reorderLevel || 0),
    maximumStockLevel: Number(values.maximumStockLevel || 0),
    natureOfSpares: values.natureOfSpares || "Non-Critical",
    typeOfSpares: values.typeOfSpares || "Consumable",
    lastIssue: values.lastIssue || "",
    lastReceipt: values.lastReceipt || "",
  };
}

function bindInventoryEvents(container, state) {
  const searchInput = container.querySelector("#inventory-search");
  const form = container.querySelector("#inventory-form");
  const resetBtn = container.querySelector("#inventory-reset-btn");
  const formMessage = container.querySelector("#inventory-form-message");
  const tableBody = container.querySelector("#inventory-table-body");

  tableBody?.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-action='delete-spare']");
    if (!deleteButton) return;

    const spare = state.spares.find((item) => item.spareId === deleteButton.dataset.id);
    if (!spare) return;

    const spareName = spare.spareName || spare.partNumber || spare.spareId;
    if (!window.confirm(`Delete ${spareName} from inventory? This action cannot be undone.`)) return;

    const nextSpares = state.spares.filter((item) => item.spareId !== spare.spareId);
    saveSparesToStorage(state, nextSpares);
    tableBody.innerHTML = renderTableRows(nextSpares);
    if (formMessage) {
      formMessage.textContent = "Spare record deleted.";
      formMessage.className = "form-message success";
    }
    showToast("Inventory item deleted.", "success");
  });

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      const query = String(event.target.value || "").trim().toLowerCase();
      if (!tableBody) return;

      const rows = !query
        ? state.spares
        : state.spares.filter((item) => {
            const haystack = [
              item.spareName,
              item.partNumber,
              item.nsn,
              item.equipmentName,
              item.location,
              item.manufacturer,
            ]
              .join(" ")
              .toLowerCase();
            return haystack.includes(query);
          });

      tableBody.innerHTML = renderTableRows(rows);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      form?.reset();
      const spareId = container.querySelector("#spareId");
      if (spareId) spareId.value = "";
      const message = container.querySelector("#inventory-form-message");
      if (message) message.textContent = "";
      const tableBody = container.querySelector("#inventory-table-body");
      if (tableBody) tableBody.innerHTML = renderTableRows(state.spares);
    });
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formMessage = container.querySelector("#inventory-form-message");
      const formData = serializeForm(form);
      const errors = validateSpare(formData);

      if (!ensureUniquePartNumber(state, formData, formData.spareId)) {
        errors.push("Part number already exists. Use a unique part number.");
      }

      if (errors.length) {
        if (formMessage) formMessage.textContent = errors[0];
        if (formMessage) formMessage.className = "form-message error";
        return;
      }

      if (!window.confirm("Save this spare record?")) {
        return;
      }

      const nextSpares = [...state.spares];
      const existingIndex = nextSpares.findIndex((item) => item.spareId === formData.spareId);

      if (existingIndex >= 0) {
        nextSpares[existingIndex] = formData;
      } else {
        formData.spareId = createId("SP");
        nextSpares.unshift(formData);
      }

      saveSparesToStorage(state, nextSpares);
      form.reset();
      if (formMessage) {
        formMessage.textContent = "Spare record saved successfully.";
        formMessage.className = "form-message success";
      }
      const tableBody = container.querySelector("#inventory-table-body");
      if (tableBody) tableBody.innerHTML = renderTableRows(state.spares);
      showToast("Inventory item saved.", "success");
    });
  }

  const editButtons = container.querySelectorAll("[data-action='edit-spare']");
  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const spare = state.spares.find((item) => item.spareId === button.dataset.id);
      if (!spare) return;

      const fields = [
        "spareId",
        "spareName",
        "partNumber",
        "nsn",
        "manufacturerPartNumber",
        "manufacturer",
        "description",
        "category",
        "equipmentName",
        "location",
        "quantityAvailable",
        "minimumStockLevel",
        "reorderLevel",
        "maximumStockLevel",
        "natureOfSpares",
        "typeOfSpares",
        "lastIssue",
        "lastReceipt",
      ];

      fields.forEach((field) => {
        const node = form?.querySelector(`[name="${field}"]`);
        if (node) node.value = spare[field] ?? (field === "natureOfSpares" ? spare.criticality || "" : field === "typeOfSpares" ? "Consumable" : "");
      });

      if (formMessage) formMessage.textContent = "Editing existing record.";
    });
  });
}

export function renderInventory(container, state) {
  const filtered = state.spares || [];

  container.innerHTML = `
    <section class="card">
      <div class="section-title">
        <h2>Inventory Management</h2>
        <button type="button" class="btn btn-primary" id="inventory-add-btn">Add New Spare</button>
      </div>
    </section>

    <section class="card" style="margin-top: 14px;">
      <form id="inventory-form" class="form-grid">
        <div>
          <label for="spareId">Spare ID</label>
          <input id="spareId" name="spareId" type="text" readonly placeholder="Auto-generated" />
        </div>
        <div>
          <label for="spareName">Spare Name</label>
          <input id="spareName" name="spareName" type="text" required />
        </div>
        <div>
          <label for="partNumber">Part Number</label>
          <input id="partNumber" name="partNumber" type="text" required />
        </div>
        <div>
          <label for="nsn">NSN</label>
          <input id="nsn" name="nsn" type="text" />
        </div>
        <div>
          <label for="manufacturerPartNumber">Manufacturer Part Number</label>
          <input id="manufacturerPartNumber" name="manufacturerPartNumber" type="text" />
        </div>
        <div>
          <label for="manufacturer">Manufacturer</label>
          <input id="manufacturer" name="manufacturer" type="text" />
        </div>
        <div>
          <label for="category">Category</label>
          <input id="category" name="category" type="text" required />
        </div>
        <div>
          <label for="equipmentName">Equipment Name</label>
          <input id="equipmentName" name="equipmentName" type="text" />
        </div>
        <div>
          <label for="location">Location</label>
          <input id="location" name="location" type="text" />
        </div>
        <div>
          <label for="quantityAvailable">Quantity Available</label>
          <input id="quantityAvailable" name="quantityAvailable" type="number" min="0" step="1" value="0" required />
        </div>
        <div>
          <label for="minimumStockLevel">Minimum Stock Level</label>
          <input id="minimumStockLevel" name="minimumStockLevel" type="number" min="0" step="1" value="0" required />
        </div>
        <div>
          <label for="reorderLevel">Reorder Level</label>
          <input id="reorderLevel" name="reorderLevel" type="number" min="0" step="1" value="0" required />
        </div>
        <div>
          <label for="maximumStockLevel">Maximum Stock Level</label>
          <input id="maximumStockLevel" name="maximumStockLevel" type="number" min="0" step="1" value="0" />
        </div>
        <div>
          <label for="natureOfSpares">Nature of Spares</label>
          <select id="natureOfSpares" name="natureOfSpares">
            <option value="Critical">Critical</option>
            <option value="Non-Critical" selected>Non-Critical</option>
            <option value="Refit Spares">Refit Spares</option>
          </select>
        </div>
        <div>
          <label for="typeOfSpares">Type of Spares</label>
          <select id="typeOfSpares" name="typeOfSpares">
            <option value="Permanent">Permanent</option>
            <option value="Consumable" selected>Consumable</option>
            <option value="Quasi Permanent">Quasi Permanent</option>
          </select>
        </div>
        <div>
          <label for="lastIssue">Last Issue</label>
          <input id="lastIssue" name="lastIssue" type="date" />
        </div>
        <div>
          <label for="lastReceipt">Last Receipt</label>
          <input id="lastReceipt" name="lastReceipt" type="date" />
        </div>
        <div style="grid-column: 1 / -1;">
          <label for="description">Description</label>
          <textarea id="description" name="description" rows="3"></textarea>
        </div>

        <div style="grid-column: 1 / -1; display: flex; gap: 10px; align-items: center;">
          <button type="submit" class="btn btn-primary">Save Spare</button>
          <button type="button" class="btn btn-secondary" id="inventory-reset-btn">Reset</button>
          <span id="inventory-form-message" class="form-message" aria-live="polite"></span>
        </div>
      </form>
    </section>

    <section class="card" style="margin-top: 14px;">
      <div class="section-title">
        <h3>Inventory Register</h3>
        <input id="inventory-search" type="search" placeholder="Search by spare name, part number, NSN, equipment, manufacturer or location" style="max-width: 480px;" />
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Spare ID</th>
              <th>Part Number</th>
              <th>Spare Name</th>
              <th>Equipment</th>
              <th>Category</th>
              <th>Location</th>
              <th>Available Qty</th>
              <th>Minimum Qty</th>
              <th>Status</th>
              <th>Nature of Spares</th>
              <th>Type of Spares</th>
              <th>Last Issue</th>
              <th>Last Receipt</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="inventory-table-body">
            ${renderTableRows(filtered)}
          </tbody>
        </table>
      </div>
    </section>
  `;

  const addBtn = container.querySelector("#inventory-add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const form = container.querySelector("#inventory-form");
      form?.reset();
      const spareId = container.querySelector("#spareId");
      if (spareId) spareId.value = "";
      const message = container.querySelector("#inventory-form-message");
      if (message) {
        message.textContent = "Create a new spare item.";
        message.className = "form-message";
      }
    });
  }

  bindInventoryEvents(container, state);
}
