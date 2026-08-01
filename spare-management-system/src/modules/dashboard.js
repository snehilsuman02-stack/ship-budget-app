export function renderDashboard(container, state) {
  const spares = state.data.spares;
  const transactions = state.data.transactions;
  const lowStock = spares.filter((x) => Number(x.qty || 0) <= Number(x.minQty || 0));

  const totalQty = spares.reduce((sum, x) => sum + Number(x.qty || 0), 0);
  const receiveCount = transactions.filter((x) => x.type === "receive").length;
  const issueCount = transactions.filter((x) => x.type === "issue").length;

  container.innerHTML = `
    <section class="grid cards-4">
      <article class="card"><h3>Total Spares</h3><p class="meta">${spares.length} items</p></article>
      <article class="card"><h3>Total Stock Units</h3><p class="meta">${totalQty}</p></article>
      <article class="card"><h3>Receives</h3><p class="meta">${receiveCount}</p></article>
      <article class="card"><h3>Issues</h3><p class="meta">${issueCount}</p></article>
    </section>

    <section class="card">
      <h3>Low Stock Alerts</h3>
      <p class="meta">Automatic alerts when stock reaches minimum threshold.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Qty</th><th>Min Qty</th><th>Location</th></tr></thead>
          <tbody>
            ${
              lowStock.length
                ? lowStock
                    .map(
                      (x) => `<tr><td>${x.code || ""}</td><td>${x.name || ""}</td><td>${x.qty || 0}</td><td>${x.minQty || 0}</td><td>${x.location || ""}</td></tr>`
                    )
                    .join("")
                : `<tr><td colspan="5">No low stock items.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}
