export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

export function formatCurrency(value, currency = "INR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function createId(prefix) {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `${prefix}-${stamp}-${rand}`;
}

export function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function getHashRoute() {
  const route = (window.location.hash || "#dashboard").replace("#", "").trim();
  return route || "dashboard";
}

export function setHashRoute(route) {
  if (!route) return;
  if (window.location.hash !== `#${route}`) {
    window.location.hash = route;
  }
}
