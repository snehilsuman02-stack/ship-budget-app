import { issueStock } from "../services/inventory.js";

export function renderIssue(container, state, ctx) {
  const options = state.data.spares
    .map((s) => `<option value="${s.id}">${s.code || ""} - ${s.name || ""} (Qty: ${s.qty || 0})</option>`)
    .join("");

  container.innerHTML = `
    <section class="card grid">
      <h3>Issue Spares</h3>
      <form id="issue-form" class="toolbar">
        <select name="spareId" required><option value="">Select spare</option>${options}</select>
        <input class="input" name="qty" type="number" min="1" placeholder="Quantity" required />
        <input class="input" name="note" placeholder="Issued to / purpose" />
        <button class="primary" type="submit">Issue</button>
      </form>
    </section>
  `;

  container.querySelector("#issue-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      await issueStock(form.get("spareId"), Number(form.get("qty")), {
        note: form.get("note") || "",
        actor: state.user?.email || "unknown",
      });
      await ctx.log("issue", "issue", { spareId: form.get("spareId"), qty: Number(form.get("qty")) });
      event.target.reset();
      ctx.toast("Stock issued.");
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });
}
