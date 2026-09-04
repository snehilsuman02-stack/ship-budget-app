import { APP_BRAND } from "./constants.js";

export function renderSettings(container, state) {
  container.innerHTML = `
    <section class="card">
      <h2>Settings</h2>
      <p class="muted" style="margin-top: 8px;">Branding and runtime settings are scaffolded in PHASE 1.</p>
      <div class="form-grid" style="margin-top: 14px;">
        <label>Application Code<input value="${APP_BRAND.code}" disabled /></label>
        <label>Application Title<input value="${state.settings?.shipName || APP_BRAND.title}" disabled /></label>
        <label>Subtitle<input value="${state.settings?.subtitle || APP_BRAND.subtitle}" disabled /></label>
        <label>Currency<input value="${state.settings?.currency || "INR"}" disabled /></label>
      </div>
    </section>
  `;
}
