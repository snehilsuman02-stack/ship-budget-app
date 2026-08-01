export function showToast(message, type = "info") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const node = document.createElement("div");
  node.className = `toast ${type === "error" ? "error" : ""}`;
  node.textContent = message;
  root.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}
