import { isOfflineModeEnabled, setOfflineMode } from "../services/firebase.js";

const SYNC_PENDING_KEY = "sms-sync-pending";

export function renderSettings(container, state, ctx) {
  const currentTheme = document.documentElement.dataset.theme || "dark";
  const offlineEnabled = isOfflineModeEnabled();

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
        <label>Offline mode
          <select id="offline-picker">
            <option value="0" ${offlineEnabled ? "" : "selected"}>Disabled</option>
            <option value="1" ${offlineEnabled ? "selected" : ""}>Enabled</option>
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

  container.querySelector("#offline-picker").addEventListener("change", (e) => {
    const enabled = e.target.value === "1";
    if (!enabled && offlineEnabled) {
      localStorage.setItem(SYNC_PENDING_KEY, "1");
    }
    setOfflineMode(enabled);
    ctx.toast(enabled ? "Offline mode enabled. Reloading app." : "Offline mode disabled. Reloading app.");
    setTimeout(() => window.location.reload(), 250);
  });

  container.querySelector("#sync-now-btn").addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("sms-sync-now"));
  });
}
