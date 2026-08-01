export function exportInventoryPdf(title, columns, rows) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);

  doc.autoTable({
    startY: 26,
    head: [columns],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 140, 255] },
  });

  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
