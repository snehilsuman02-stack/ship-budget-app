export function renderQrCode(targetElement, value) {
  targetElement.innerHTML = "";
  if (!window.QRCode) throw new Error("QRCode library not loaded");
  new window.QRCode(targetElement, {
    text: String(value),
    width: 130,
    height: 130,
    colorDark: "#0f172a",
    colorLight: "#ffffff",
  });
}
