// Settings stays silent about offline state; sync is handled automatically.

export function renderSettings(container, state, ctx) {
  const currentTheme = document.documentElement.dataset.theme || "dark";

  container.innerHTML = `
    <section class="card grid">
      <h3>Settings</h3>
      <p class="meta">Manage local preferences and role diagnostics.</p>
      <div class="toolbar">
        <label>Theme
          <select id="theme-picker">
            <option value="dark" ${currentTheme === "dark" ? "selected" : ""}>Dark</option>
            <option value="light" ${currentTheme === "light" ? "selected" : ""}>Light</option>
          </select>
        </label>
        <button id="sync-now-btn" type="button">Sync now</button>
      </div>
      <p class="meta">Current user: ${state.user?.email || "-"} | Role: ${state.role}</p>
    </section>
  `;

  container.querySelector("#theme-picker").addEventListener("change", (e) => {
    const next = e.target.value;
    document.documentElement.dataset.theme = next;
    localStorage.setItem("sms-theme", next);
    ctx.toast(`Theme switched to ${next}.`);
  });

  container.querySelector("#sync-now-btn").addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("sms-sync-now"));
  });
}
