export function exportToExcel(filename, rows) {
  if (!window.XLSX) throw new Error("XLSX library not loaded");
  const worksheet = window.XLSX.utils.json_to_sheet(rows);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  window.XLSX.writeFile(workbook, filename);
}

export async function importFromExcel(file) {
  if (!window.XLSX) throw new Error("XLSX library not loaded");
  const arrayBuffer = await file.arrayBuffer();
  const workbook = window.XLSX.read(arrayBuffer, { type: "array" });
  const first = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[first];
  return window.XLSX.utils.sheet_to_json(worksheet, { defval: "" });
}
