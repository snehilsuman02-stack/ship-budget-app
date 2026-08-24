import { showToast } from "./notifications.js";
import { createId } from "./utils.js";

const STORAGE_KEY = "ssms-issues";

function getIssueStorage() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveIssueStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function renderIssueRows(rows) {
  if (!rows.length) {
    return "<tr><td colspan='11'>No issue records found.</td></tr>";
  }

  return rows
    .slice()
    .reverse()
    .map(
      (item) => `
        <tr>
          <td>${item.issueNumber || "-"}</td>
          <td>${item.date || "-"}</td>
          <td>${item.spareName || "-"}</td>
          <td>${item.equipment || "-"}</td>
          <td>${item.department || "-"}</td>
          <td>${item.quantity || 0}</td>
          <td>${item.issuedTo || "-"}</td>
          <td>${item.authorizedBy || "-"}</td>
          <td>${item.purpose || "-"}</td>
        </tr>
      `
    )
    .join("");
}

export function renderIssuing(container, state) {
  const rows = getIssueStorage();

  container.innerHTML = `
    <section class="card">
      <h2>Issue Spare</h2>
    </section>

    <section class="card" style="margin-top: 14px;">
      <form id="issue-form" class="form-grid">
        <div><label>Issue Number<input name="issueNumber" type="text" value="${createId("ISS")}" required /></label></div>
        <div><label>Date<input name="date" type="date" required /></label></div>
        <div><label>Spare<select name="spareName" required>
          ${(state.spares || []).map((item) => `<option value="${item.spareName || item.partNumber}">${item.spareName || item.partNumber}</option>`).join("") || "<option value=''>No spares available</option>"}
        </select></label></div>
        <div><label>Equipment<input name="equipment" type="text" /></label></div>
        <div><label>Quantity<input name="quantity" type="number" min="1" value="1" required /></label></div>
        <div><label>Department<input name="department" type="text" /></label></div>
        <div><label>Work Order / Defect No.<input name="workOrder" type="text" /></label></div>
        <div><label>Purpose<input name="purpose" type="text" /></label></div>
        <div><label>Issued To<input name="issuedTo" type="text" /></label></div>
        <div><label>Authorized By<input name="authorizedBy" type="text" /></label></div>
        <div style="grid-column: 1 / -1;"><label>Remarks<textarea name="remarks" rows="3"></textarea></label></div>

        <div style="grid-column: 1 / -1; display: flex; gap: 10px; align-items: center;">
          <button class="btn btn-primary" type="submit">Issue Spare</button>
          <span id="issue-message" class="form-message" aria-live="polite"></span>
        </div>
      </form>
    </section>

    <section class="card" style="margin-top: 14px;">
      <div class="section-title"><h3>Issue Register</h3></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Issue</th><th>Date</th><th>Spare</th><th>Equipment</th><th>Department</th><th>Qty</th><th>Issued To</th><th>Authorized By</th><th>Purpose</th>
            </tr>
          </thead>
          <tbody>${renderIssueRows(rows)}</tbody>
        </table>
      </div>
    </section>
  `;

  const form = container.querySelector("#issue-form");
  const message = container.querySelector("#issue-message");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    const quantity = Number(formData.quantity || 0);

    if (!formData.spareName || quantity <= 0) {
      message.textContent = "Please choose a spare and enter a valid issue quantity.";
      message.className = "form-message error";
      return;
    }

    const match = (state.spares || []).find((item) => item.spareName === formData.spareName || item.partNumber === formData.spareName);
    if (!match) {
      message.textContent = "Selected spare was not found in inventory.";
      message.className = "form-message error";
      return;
    }

    const available = Number(match.quantityAvailable || 0);
    if (quantity > available) {
      message.textContent = `Issue quantity exceeds available stock (${available}).`;
      message.className = "form-message error";
      return;
    }

    match.quantityAvailable = available - quantity;
    match.lastIssue = formData.date || new Date().toISOString().slice(0, 10);

    const issueList = getIssueStorage();
    issueList.push({ ...formData, quantity, timestamp: Date.now(), transactionType: "Issue" });
    saveIssueStorage(issueList);

    const ledger = JSON.parse(localStorage.getItem("ssms-ledger") || "[]");
    ledger.push({
      date: formData.date || new Date().toISOString().slice(0, 10),
      transactionId: createId("TXN"),
      spareId: match.spareId || "-",
      partNumber: match.partNumber || "-",
      description: `${match.spareName || formData.spareName} issue`,
      transactionType: "Issue",
      receiptQty: 0,
      issueQty: quantity,
      adjustmentQty: 0,
      balance: Number(match.quantityAvailable || 0),
      reference: formData.workOrder || formData.issueNumber,
      user: "System",
      remarks: formData.remarks || "Stock issued",
      timestamp: Date.now(),
    });
    localStorage.setItem("ssms-ledger", JSON.stringify(ledger));
    localStorage.setItem("ssms-spares", JSON.stringify(state.spares));

    form.reset();
    message.textContent = "Spare issue posted successfully.";
    message.className = "form-message success";
    showToast("Spare issued and ledger updated.", "success");
    renderIssuing(container, state);
  });
}
