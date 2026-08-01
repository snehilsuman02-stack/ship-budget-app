import { create } from "../services/database.js";

export function renderPurchase(container, state, ctx) {
  const rows = state.data.purchaseRequests;

  container.innerHTML = `
    <section class="card grid">
      <h3>Purchase Requests</h3>
      <form id="pr-form" class="toolbar">
        <input class="input" name="spareName" placeholder="Spare name" required />
        <input class="input" name="qty" type="number" min="1" placeholder="Required qty" required />
        <input class="input" name="priority" placeholder="Priority" value="Medium" />
        <button class="primary" type="submit">Create Request</button>
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Spare</th><th>Qty</th><th>Priority</th><th>Status</th><th>Requested By</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows
                    .map(
                      (r) => `<tr><td>${r.spareName || ""}</td><td>${r.qty || 0}</td><td>${r.priority || ""}</td><td>${r.status || "Open"}</td><td>${r.requestedBy || ""}</td></tr>`
                    )
                    .join("")
                : `<tr><td colspan="5">No requests yet.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;

  container.querySelector("#pr-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      await create("purchaseRequests", {
        spareName: form.get("spareName"),
        qty: Number(form.get("qty")),
        priority: form.get("priority") || "Medium",
        status: "Open",
        requestedBy: state.user?.email || "unknown",
        createdAt: Date.now(),
      });
      await ctx.log("create", "purchase", { spareName: form.get("spareName"), qty: Number(form.get("qty")) });
      event.target.reset();
      ctx.toast("Purchase request submitted.");
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });
}
