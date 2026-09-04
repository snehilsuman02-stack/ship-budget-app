import { showToast } from "./notifications.js";
import { createId } from "./utils.js";
import { setValue } from "./database.js";
import { writeSqlite } from "./sqlite.js";

const STORAGE_KEY = "ssms-receipts";

function getReceiptStorage() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveReceiptStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  writeSqlite("receipts", items).catch((error) => console.error("SQLite receipt save failed", error));
}

function renderReceiptRows(rows) {
  if (!rows.length) {
    return "<tr><td colspan='11'>No receipt records found.</td></tr>";
  }

  return rows
    .slice()
    .reverse()
    .map(
      (item) => `
        <tr>
          <td>${item.receiptNumber || "-"}</td>
          <td>${item.date || "-"}</td>
          <td>${item.spareName || "-"}</td>
          <td>${item.partNumber || "-"}</td>
          <td>${item.vendor || "-"}</td>
          <td>${item.quantity || 0}</td>
          <td>${item.unitCost || 0}</td>
          <td>${item.totalCost || 0}</td>
          <td>${item.batchLot || "-"}</td>
          <td>${item.condition || "-"}</td>
          <td>${item.receivedBy || "-"}</td>
        </tr>
      `
    )
    .join("");
}

export function renderReceiving(container, state) {
  const rows = getReceiptStorage();

  container.innerHTML = `
    <section class="card">
      <h2>Receive Spare</h2>
    </section>

    <section class="card" style="margin-top: 14px;">
      <form id="receive-form" class="form-grid">
        <div><label>Receipt Number<input name="receiptNumber" type="text" value="${createId("RCPT")}" required /></label></div>
        <div><label>Date<input name="date" type="date" required /></label></div>
        <div><label>Spare<select name="spareName" required>
          ${(state.spares || []).map((item) => `<option value="${item.spareName || item.partNumber}">${item.spareName || item.partNumber}</option>`).join("") || "<option value=''>No spares available</option>"}
        </select></label></div>
        <div><label>Part Number<input name="partNumber" type="text" placeholder="Auto fill" /></label></div>
        <div><label>Quantity<input name="quantity" type="number" min="1" value="1" required /></label></div>
        <div><label>Vendor<input name="vendor" type="text" /></label></div>
        <div><label>Purchase Order<input name="purchaseOrder" type="text" /></label></div>
        <div><label>Invoice Number<input name="invoiceNumber" type="text" /></label></div>
        <div><label>Unit Cost<input name="unitCost" type="number" min="0" step="0.01" value="0" /></label></div>
        <div><label>Total Cost<input name="totalCost" type="number" min="0" step="0.01" value="0" /></label></div>
        <div><label>Batch / Lot<input name="batchLot" type="text" /></label></div>
        <div><label>Warranty<input name="warranty" type="text" /></label></div>
        <div><label>Expiry Date<input name="expiryDate" type="date" /></label></div>
        <div><label>Condition<select name="condition"><option>New</option><option>Serviceable</option><option>Damaged</option></select></label></div>
        <div><label>Received By<input name="receivedBy" type="text" /></label></div>
        <div><label>Verified By<input name="verifiedBy" type="text" /></label></div>
        <div style="grid-column: 1 / -1;"><label>Remarks<textarea name="remarks" rows="3"></textarea></label></div>

        <div style="grid-column: 1 / -1; display: flex; gap: 10px; align-items: center;">
          <button class="btn btn-primary" type="submit">Save Receipt</button>
          <span id="receive-message" class="form-message" aria-live="polite"></span>
        </div>
      </form>
    </section>

    <section class="card" style="margin-top: 14px;">
      <div class="section-title"><h3>Receipt Register</h3></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Receipt</th><th>Date</th><th>Spare</th><th>Part No.</th><th>Vendor</th><th>Qty</th><th>Unit Cost</th><th>Total Cost</th><th>Lot</th><th>Condition</th><th>Received By</th>
            </tr>
          </thead>
          <tbody>${renderReceiptRows(rows)}</tbody>
        </table>
      </div>
    </section>
  `;

  const form = container.querySelector("#receive-form");
  const message = container.querySelector("#receive-message");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    const quantity = Number(formData.quantity || 0);
    const unitCost = Number(formData.unitCost || 0);
    const totalCost = Number(formData.totalCost || 0);

    if (!formData.spareName || quantity <= 0) {
      message.textContent = "Please choose a spare and enter a valid quantity.";
      message.className = "form-message error";
      return;
    }

    const nextSpares = [...(state.spares || [])];
    const match = nextSpares.find((item) => item.spareName === formData.spareName || item.partNumber === formData.partNumber);

    if (!match) {
      message.textContent = "Selected spare was not found in inventory.";
      message.className = "form-message error";
      return;
    }

    match.quantityAvailable = Number(match.quantityAvailable || 0) + quantity;
    match.lastReceipt = formData.date || new Date().toISOString().slice(0, 10);
    const receiptRecord = {
      ...formData,
      quantity,
      unitCost,
      totalCost: totalCost || quantity * unitCost,
      timestamp: Date.now(),
      transactionType: "Receipt",
    };

    const receiptList = getReceiptStorage();
    receiptList.push(receiptRecord);
    saveReceiptStorage(receiptList);

    const ledger = JSON.parse(localStorage.getItem("ssms-ledger") || "[]");
    const ledgerEntry = {
      date: formData.date || new Date().toISOString().slice(0, 10),
      transactionId: createId("TXN"),
      spareId: match.spareId || "-",
      partNumber: match.partNumber || formData.partNumber || "-",
      description: `${match.spareName || formData.spareName} receipt`,
      transactionType: "Receipt",
      receiptQty: quantity,
      issueQty: 0,
      adjustmentQty: 0,
      balance: Number(match.quantityAvailable || 0),
      reference: formData.purchaseOrder || formData.invoiceNumber || formData.receiptNumber,
      user: "System",
      remarks: formData.remarks || "Stock received",
      timestamp: Date.now(),
    };
    ledger.push(ledgerEntry);
    localStorage.setItem("ssms-ledger", JSON.stringify(ledger));
    writeSqlite("ledger", ledger).catch((error) => console.error("SQLite ledger save failed", error));

    localStorage.setItem("ssms-spares", JSON.stringify(nextSpares));
    state.spares = nextSpares;

    try {
      await Promise.all([
        setValue(`spares/${match.spareId}`, match),
        setValue(`transactions/${ledgerEntry.transactionId}`, ledgerEntry),
      ]);
    } catch (error) {
      console.error("Receipt sync failed", error);
      showToast("Receipt saved locally, but cloud sync failed.", "error", 5000);
    }

    form.reset();
    message.textContent = "Receipt posted successfully.";
    message.className = "form-message success";
    showToast("Spare received and ledger updated.", "success");
    renderReceiving(container, state);
  });
}
