import { APP_BRAND } from "./constants.js";

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function renderSettings(container, state, onSave) {
  const settings = state.settings || {};

  container.innerHTML = `
    <section class="card">
      <h2>Settings</h2>
      <p class="muted" style="margin-top: 8px;">Configure application branding, alerts, and display preferences.</p>
      <form id="settings-form" style="margin-top: 14px;">
        <div class="form-grid">
          <label>Application Code<input value="${APP_BRAND.code}" disabled /></label>
          <label for="settings-ship-name">Application Title<input id="settings-ship-name" name="shipName" value="${escapeAttribute(settings.shipName || APP_BRAND.title)}" required /></label>
          <label for="settings-subtitle">Subtitle<input id="settings-subtitle" name="subtitle" value="${escapeAttribute(settings.subtitle || APP_BRAND.subtitle)}" required /></label>
          <label for="settings-currency">Currency<select id="settings-currency" name="currency"><option value="INR" selected>INR (₹)</option></select></label>
          <label for="settings-theme">Theme<select id="settings-theme" name="theme"><option value="light" ${settings.theme === "light" ? "selected" : ""}>Light</option><option value="dark" ${settings.theme === "dark" ? "selected" : ""}>Dark</option></select></label>
          <label for="settings-date-format">Date Format<select id="settings-date-format" name="dateFormat"><option value="DD-MMM-YYYY" ${settings.dateFormat === "DD-MMM-YYYY" ? "selected" : ""}>DD-MMM-YYYY</option><option value="YYYY-MM-DD" ${settings.dateFormat === "YYYY-MM-DD" ? "selected" : ""}>YYYY-MM-DD</option></select></label>
          <label for="settings-stock-alert">Stock Alert Threshold<input id="settings-stock-alert" name="stockAlertThreshold" type="number" min="0" step="1" value="${Number(settings.stockAlertThreshold || 0)}" /></label>
          <label for="settings-expiry-days">Expiry Alert Days<input id="settings-expiry-days" name="expiryAlertDays" type="number" min="0" step="1" value="${Number(settings.expiryAlertDays || 0)}" /></label>
          <label for="settings-non-moving-days">Non-Moving Days<input id="settings-non-moving-days" name="nonMovingDays" type="number" min="0" step="1" value="${Number(settings.nonMovingDays || 0)}" /></label>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; margin-top: 14px;">
          <button type="submit" class="btn btn-primary">Save Settings</button>
          <button type="button" class="btn btn-secondary" id="settings-reset-btn">Reset Defaults</button>
          <span id="settings-message" class="form-message" aria-live="polite"></span>
        </div>
      </form>
    </section>
  `;

  const form = container.querySelector("#settings-form");
  const message = container.querySelector("#settings-message");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const nextSettings = {
      ...settings,
      shipName: String(values.shipName || APP_BRAND.title).trim(),
      subtitle: String(values.subtitle || APP_BRAND.subtitle).trim(),
      currency: "INR",
      theme: values.theme === "dark" ? "dark" : "light",
      dateFormat: values.dateFormat || "DD-MMM-YYYY",
      stockAlertThreshold: Math.max(0, Number(values.stockAlertThreshold || 0)),
      expiryAlertDays: Math.max(0, Number(values.expiryAlertDays || 0)),
      nonMovingDays: Math.max(0, Number(values.nonMovingDays || 0)),
    };

    onSave?.(nextSettings);
    if (message) message.textContent = "";
  });

  container.querySelector("#settings-reset-btn")?.addEventListener("click", () => onSave?.(null));
}
