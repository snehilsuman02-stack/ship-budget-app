export function showToast(message, type = "info", timeout = 3200) {
  const host = document.getElementById("toast-container");
  if (!host || !message) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  host.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, timeout);
}
