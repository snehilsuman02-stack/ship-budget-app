(function () {
  const NAV_GROUPS = [
    {
      label: "Dashboard",
      icon: "bi-speedometer2",
      items: [
        { label: "Home", href: "index.html", icon: "bi-house-door" },
        { label: "Analytics", href: "analytics.html", icon: "bi-graph-up-arrow" },
        { label: "Reports", href: "reports.html", icon: "bi-file-earmark-bar-graph" },
      ],
    },
    {
      label: "Budget",
      icon: "bi-wallet2",
      items: [
        { label: "Budget Allocation", href: "tracker.html?module=allocation", icon: "bi-pie-chart" },
        { label: "Expenditure", href: "tracker.html?module=expenditure", icon: "bi-cash-stack" },
        { label: "Budget Tracker", href: "tracker.html", icon: "bi-kanban" },
        { label: "Budget Status", href: "tracker.html?module=status", icon: "bi-activity" },
        { label: "Budget Forecast", href: "tracker.html?module=forecast", icon: "bi-clipboard2-data" },
      ],
    },
    {
      label: "Finance",
      icon: "bi-bank",
      items: [
        { label: "Transactions", href: "transactions.html", icon: "bi-arrow-left-right" },
        { label: "Import Data", href: "transactions.html?module=import", icon: "bi-cloud-arrow-down" },
        { label: "Export Data", href: "transactions.html?module=export", icon: "bi-cloud-arrow-up" },
      ],
    },
    {
      label: "Management",
      icon: "bi-people",
      items: [
        { label: "Users", href: "users.html", icon: "bi-person-badge" },
        { label: "Audit Log", href: "audit.html", icon: "bi-journal-text" },
        { label: "Settings", href: "settings.html", icon: "bi-gear" },
      ],
    },
    {
      label: "Tools",
      icon: "bi-tools",
      items: [
        { label: "Calculator", href: "settings.html?module=calculator", icon: "bi-calculator" },
        { label: "Notifications", href: "settings.html?module=notifications", icon: "bi-bell" },
        { label: "Backup & Restore", href: "settings.html?module=backup", icon: "bi-hdd-network" },
      ],
    },
    {
      label: "Help",
      icon: "bi-question-circle",
      items: [
        { label: "User Guide", href: "reports.html?module=guide", icon: "bi-book" },
        { label: "About", href: "reports.html?module=about", icon: "bi-info-circle" },
      ],
    },
  ];

  const MODULE_COPY = {
    analytics: {
      heading: "Analytics Workspace",
      subtitle: "Interactive KPIs, trend maps, and spend velocity insights will appear here.",
    },
    reports: {
      heading: "Reports Center",
      subtitle: "Generate regulatory summaries, printable breakdowns, and executive snapshots.",
    },
    tracker: {
      heading: "Budget Operations",
      subtitle: "Manage allocations, expenditure movement, and upcoming financial forecasts.",
    },
    transactions: {
      heading: "Finance Transactions",
      subtitle: "Review transaction entries, import batches, and manage export pipelines.",
    },
    users: {
      heading: "User Administration",
      subtitle: "Role-based access control, profile auditability, and fleet-wide permissions.",
    },
    settings: {
      heading: "System Settings",
      subtitle: "Configure tools, alerts, calculation settings, and recovery workflows.",
    },
    audit: {
      heading: "Audit Log",
      subtitle: "Operational timelines, security events, and compliance checkpoints.",
    },
  };

  function normalizeUrl(url) {
    const parsed = new URL(url, window.location.origin);
    return {
      pathname: parsed.pathname.split("/").pop(),
      module: (parsed.searchParams.get("module") || "").toLowerCase(),
    };
  }

  function isItemActive(href) {
    const current = normalizeUrl(window.location.href);
    const target = normalizeUrl(href);
    if (current.pathname !== target.pathname) return false;
    if (!target.module) return current.module === "";
    return current.module === target.module;
  }

  function groupIsActive(group) {
    return group.items.some((item) => isItemActive(item.href));
  }

  function createNavMarkup() {
    const groupsHtml = NAV_GROUPS.map((group, index) => {
      const activeGroup = groupIsActive(group) ? "is-active" : "";
      const itemsHtml = group.items
        .map((item) => {
          const active = isItemActive(item.href) ? "active" : "";
          return '<li><a class="' + active + '" href="' + item.href + '"><i class="bi ' + item.icon + '"></i><span>' + item.label + '</span></a></li>';
        })
        .join("");
      return (
        '<li class="nav-group ' + activeGroup + '" data-group-index="' + index + '">' +
          '<button class="nav-group-button" type="button">' +
            '<span><i class="bi ' + group.icon + '"></i> ' + group.label + '</span>' +
            '<i class="bi bi-chevron-down chevron"></i>' +
          '</button>' +
          '<ul class="dropdown">' + itemsHtml + '</ul>' +
        '</li>'
      );
    }).join("");

    return (
      '<div class="top-nav-wrap">' +
        '<nav class="top-nav" aria-label="Primary navigation">' +
          '<div class="nav-header">' +
            '<a class="brand" href="index.html" aria-label="Ship Budget home">' +
              '<span class="brand-mark">SB</span>' +
              '<span>Ship Budget Console</span>' +
            '</a>' +
            '<button id="mobile-menu-btn" class="mobile-menu-btn" type="button" aria-expanded="false" aria-controls="nav-groups">' +
              '<i class="bi bi-list"></i><span>Menu</span>' +
            '</button>' +
          '</div>' +
          '<ul id="nav-groups" class="nav-groups">' + groupsHtml + '</ul>' +
        '</nav>' +
      '</div>'
    );
  }

  function wireMobileMenu() {
    const nav = document.querySelector(".top-nav");
    const menuButton = document.getElementById("mobile-menu-btn");
    const groups = Array.from(document.querySelectorAll(".nav-group"));
    if (!nav || !menuButton) return;

    menuButton.addEventListener("click", function () {
      const expanded = nav.classList.toggle("menu-expanded");
      menuButton.setAttribute("aria-expanded", String(expanded));
    });

    groups.forEach((group) => {
      const button = group.querySelector(".nav-group-button");
      if (!button) return;
      button.addEventListener("click", function () {
        if (window.innerWidth > 900) return;
        const willOpen = !group.classList.contains("menu-open");
        groups.forEach((entry) => entry.classList.remove("menu-open"));
        if (willOpen) group.classList.add("menu-open");
      });
    });
  }

  function wirePageTransitions() {
    document.body.classList.add("page-enter");
    const links = Array.from(document.querySelectorAll("a[href]"));

    links.forEach((link) => {
      link.addEventListener("click", function (event) {
        const href = link.getAttribute("href");
        if (!href) return;
        if (/^https?:/i.test(href)) return;
        if (href.startsWith("#")) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        event.preventDefault();
        document.body.classList.add("page-leave");
        window.setTimeout(function () {
          window.location.href = href;
        }, 170);
      });
    });
  }

  function renderSharedFooter() {
    const footerSlot = document.querySelector("[data-shared-footer]");
    if (!footerSlot) return;
    const year = new Date().getFullYear();
    footerSlot.innerHTML =
      '<footer class="app-footer">' +
      '<span>Ship Budget Management Platform</span>' +
      '<span>Operations Governance Console · ' + year + '</span>' +
      '</footer>';
  }

  function renderModuleTitle() {
    const pageKey = document.body.getAttribute("data-page-key");
    if (!pageKey || pageKey === "home") return;

    const titleNode = document.querySelector("[data-module-title]");
    const subtitleNode = document.querySelector("[data-module-subtitle]");
    const moduleNode = document.querySelector("[data-module-name]");
    if (!titleNode || !subtitleNode || !moduleNode) return;

    const descriptor = MODULE_COPY[pageKey] || MODULE_COPY.reports;
    const search = new URLSearchParams(window.location.search);
    const moduleName = search.get("module") || "overview";
    const readable = moduleName
      .split("-")
      .join(" ")
      .replace(/\b\w/g, function (ch) {
        return ch.toUpperCase();
      });

    titleNode.textContent = descriptor.heading;
    subtitleNode.textContent = descriptor.subtitle;
    moduleNode.textContent = readable + " Module";
  }

  function renderSharedNav() {
    const navSlot = document.querySelector("[data-shared-nav]");
    if (!navSlot) return;
    navSlot.innerHTML = createNavMarkup();
  }

  window.addEventListener("DOMContentLoaded", function () {
    renderSharedNav();
    renderSharedFooter();
    renderModuleTitle();
    wireMobileMenu();
    wirePageTransitions();
  });
})();
