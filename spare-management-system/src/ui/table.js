export function paginateAndSort(items, { page, pageSize, sortBy, sortDir, query, filterKey, filterValue }) {
  const q = String(query || "").toLowerCase().trim();
  let result = [...items];

  if (q) {
    result = result.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(q)));
  }

  if (filterKey && filterValue) {
    result = result.filter((row) => String(row[filterKey] || "") === String(filterValue));
  }

  if (sortBy) {
    result.sort((a, b) => {
      const av = a[sortBy] ?? "";
      const bv = b[sortBy] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "desc" ? bv - av : av - bv;
      }
      return sortDir === "desc"
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv));
    });
  }

  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const start = (normalizedPage - 1) * pageSize;
  const rows = result.slice(start, start + pageSize);

  return { rows, total, totalPages, page: normalizedPage };
}
