let scanner = null;

export async function startScanner(elementId, onSuccess) {
  if (!window.Html5Qrcode) throw new Error("Scanner library not loaded");
  scanner = new window.Html5Qrcode(elementId);
  await scanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 220, height: 220 } },
    (decodedText) => onSuccess(decodedText),
    () => {}
  );
}

export async function stopScanner() {
  if (scanner) {
    await scanner.stop();
    await scanner.clear();
    scanner = null;
  }
}
