import { receiveStock } from "../services/inventory.js";

export function renderReceive(container, state, ctx) {
  const options = state.data.spares
    .map((s) => `<option value="${s.id}">${s.code || ""} - ${s.name || ""} (Qty: ${s.qty || 0})</option>`)
    .join("");

  container.innerHTML = `
    <section class="card grid">
      <h3>Receive Spares</h3>
      <form id="receive-form" class="toolbar">
        <select name="spareId" required><option value="">Select spare</option>${options}</select>
        <input class="input" name="qty" type="number" min="1" placeholder="Quantity" required />
        <input class="input" name="note" placeholder="Note" />
        <button class="primary" type="submit">Receive</button>
      </form>
    </section>
  `;

  container.querySelector("#receive-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      await receiveStock(form.get("spareId"), Number(form.get("qty")), {
        note: form.get("note") || "",
        actor: state.user?.email || "unknown",
      });
      await ctx.log("receive", "receive", { spareId: form.get("spareId"), qty: Number(form.get("qty")) });
      event.target.reset();
      ctx.toast("Stock received.");
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });
}
