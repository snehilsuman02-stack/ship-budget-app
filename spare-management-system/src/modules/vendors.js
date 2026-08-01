import { create } from "../services/database.js";

export function renderVendors(container, state, ctx) {
  const rows = state.data.vendors;

  container.innerHTML = `
    <section class="card grid">
      <h3>Vendors</h3>
      <form id="vendor-form" class="toolbar">
        <input class="input" name="name" placeholder="Vendor name" required />
        <input class="input" name="phone" placeholder="Phone" />
        <input class="input" name="email" placeholder="Email" />
        <button class="primary" type="submit">Add Vendor</button>
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Email</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows.map((r) => `<tr><td>${r.name || ""}</td><td>${r.phone || ""}</td><td>${r.email || ""}</td></tr>`).join("")
                : `<tr><td colspan="3">No vendors yet.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;

  container.querySelector("#vendor-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      await create("vendors", {
        name: form.get("name"),
        phone: form.get("phone") || "",
        email: form.get("email") || "",
        createdAt: Date.now(),
      });
      await ctx.log("create", "vendors", { name: form.get("name") });
      event.target.reset();
      ctx.toast("Vendor added.");
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });
}
