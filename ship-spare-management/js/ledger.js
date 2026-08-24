function getLedgerRows() {
  return JSON.parse(localStorage.getItem("ssms-ledger") || "[]");
}

function renderLedgerRows(rows) {
  if (!rows.length) {
    return "<tr><td colspan='12'>No ledger transactions available.</td></tr>";
  }

  return rows
    .slice()
    .reverse()
    .map(
      (item) => `
        <tr>
          <td>${item.date || "-"}</td>
          <td>${item.transactionId || "-"}</td>
          <td>${item.spareId || "-"}</td>
          <td>${item.partNumber || "-"}</td>
          <td>${item.description || "-"}</td>
          <td>${item.transactionType || "-"}</td>
          <td>${item.receiptQty || 0}</td>
          <td>${item.issueQty || 0}</td>
          <td>${item.adjustmentQty || 0}</td>
          <td>${item.balance || 0}</td>
          <td>${item.reference || "-"}</td>
          <td>${item.user || "-"}</td>
        </tr>
      `
    )
    .join("");
}

export function renderLedger(container, state) {
  const rows = getLedgerRows();

  container.innerHTML = `
    <section class="card">
      <h2>Stock Ledger</h2>
    </section>

    <section class="card" style="margin-top: 14px;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Transaction ID</th>
              <th>Spare ID</th>
              <th>Part Number</th>
              <th>Description</th>
              <th>Type</th>
              <th>Receipt Qty</th>
              <th>Issue Qty</th>
              <th>Adjustment Qty</th>
              <th>Balance</th>
              <th>Reference</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>${renderLedgerRows(rows)}</tbody>
        </table>
      </div>
    </section>
  `;
}
