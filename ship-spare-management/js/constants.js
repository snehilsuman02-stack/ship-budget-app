export const APP_BRAND = {
  code: "SSMS",
  title: "SHIP SPARE MANAGEMENT SYSTEM",
  subtitle: "Ship Spare Management System",
};

export const ROLES = {
  ADMIN: "admin",
  STOREKEEPER: "storekeeper",
  LOGISTICS: "logistics",
  ENGINEERING: "engineering",
  OPERATOR: "operator",
  VIEWER: "viewer",
};

export const THEME_STORAGE_KEY = "ssms-theme";
export const SIDEBAR_STATE_KEY = "ssms-sidebar-collapsed";

export const NAV_STRUCTURE = [
  {
    group: "Dashboard",
    items: [{ key: "dashboard", label: "Dashboard" }],
  },
  {
    group: "Inventory",
    items: [
      { key: "inventory", label: "All Spares" },
      { key: "critical-spares", label: "Critical Spares", badgeKey: "criticalCount" },
      { key: "low-stock", label: "Low Stock", badgeKey: "lowStockCount" },
      { key: "out-of-stock", label: "Out of Stock", badgeKey: "outOfStockCount" },
      { key: "expiring-items", label: "Expiring Items" },
    ],
  },
  {
    group: "Stock Transactions",
    items: [
      { key: "receive", label: "Receive Spare" },
      { key: "issue", label: "Issue Spare" },
      { key: "stock-ledger", label: "Stock Ledger" },
      { key: "adjust-stock", label: "Adjust Stock" },
    ],
  },
  {
    group: "Equipment",
    items: [
      { key: "equipment", label: "Equipment Register" },
      { key: "equipment-wise-spares", label: "Equipment-wise Spares" },
      { key: "critical-equipment", label: "Critical Equipment" },
    ],
  },
  {
    group: "Procurement",
    items: [
      { key: "purchase-requests", label: "Purchase Requests", badgeKey: "pendingPrCount" },
      { key: "pending-requests", label: "Pending Requests", badgeKey: "pendingPrCount" },
      { key: "purchase-history", label: "Purchase History" },
      { key: "vendors", label: "Vendors" },
    ],
  },
  {
    group: "Identification",
    items: [
      { key: "qr-management", label: "QR Management" },
      { key: "scan-qr", label: "Scan QR Code" },
      { key: "generate-labels", label: "Generate Labels" },
    ],
  },
  {
    group: "Analytics",
    items: [
      { key: "analytics", label: "Consumption Analytics" },
      { key: "stock-analytics", label: "Stock Analytics" },
      { key: "procurement-analytics", label: "Procurement Analytics" },
    ],
  },
  {
    group: "Reports",
    items: [
      { key: "reports", label: "Inventory Report" },
      { key: "stock-ledger-report", label: "Stock Ledger Report" },
      { key: "consumption-report", label: "Consumption Report" },
      { key: "critical-spare-report", label: "Critical Spare Report" },
      { key: "purchase-report", label: "Purchase Report" },
      { key: "audit-report", label: "Audit Report" },
    ],
  },
  {
    group: "Administration",
    items: [
      { key: "users", label: "Users" },
      { key: "audit-log", label: "Audit Log" },
      { key: "settings", label: "Settings" },
    ],
  },
  {
    group: "Support",
    items: [{ key: "help", label: "Help" }],
  },
];

export const DEFAULT_SETTINGS = {
  shipName: APP_BRAND.title,
  subtitle: APP_BRAND.subtitle,
  currency: "INR",
  dateFormat: "DD-MMM-YYYY",
  stockAlertThreshold: 0,
  expiryAlertDays: 90,
  nonMovingDays: 365,
  theme: "light",
};
