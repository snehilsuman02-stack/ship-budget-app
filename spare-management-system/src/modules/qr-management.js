import { renderQrCode } from "../services/qr.js";
import { startScanner, stopScanner } from "../services/scanner.js";

export function renderQrManagement(container, state, ctx) {
  const options = state.data.spares
    .map((s) => `<option value="${s.id}">${s.code || ""} - ${s.name || ""}</option>`)
    .join("");

  container.innerHTML = `
    <section class="card grid">
      <h3>QR Code Management</h3>
      <div class="toolbar">
        <select id="qr-spare-select"><option value="">Select spare</option>${options}</select>
        <button id="qr-generate" type="button">Generate QR</button>
      </div>
      <div id="qr-output"></div>
      <hr />
      <h4>Scan Barcode / QR</h4>
      <div class="toolbar">
        <button id="scan-start" type="button">Start Camera Scan</button>
        <button id="scan-stop" type="button">Stop Scan</button>
      </div>
      <div id="scanner" style="max-width: 380px;"></div>
      <p id="scan-result" class="meta"></p>
    </section>
  `;

  container.querySelector("#qr-generate").addEventListener("click", () => {
    const spareId = container.querySelector("#qr-spare-select").value;
    if (!spareId) {
      ctx.toast("Select a spare first.", "error");
      return;
    }
    const spare = state.data.spares.find((x) => x.id === spareId);
    if (!spare) return;

    try {
      renderQrCode(container.querySelector("#qr-output"), JSON.stringify({
        id: spare.id,
        code: spare.code,
        name: spare.name,
      }));
      ctx.toast("QR generated.");
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });

  container.querySelector("#scan-start").addEventListener("click", async () => {
    try {
      await startScanner("scanner", (decodedText) => {
        container.querySelector("#scan-result").textContent = `Decoded: ${decodedText}`;
      });
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });

  container.querySelector("#scan-stop").addEventListener("click", async () => {
    try {
      await stopScanner();
    } catch (error) {
      ctx.toast(error.message, "error");
    }
  });
}
