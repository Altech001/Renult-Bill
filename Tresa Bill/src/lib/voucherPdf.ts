export interface VoucherPdfRow {
  code: string;
  packageName: string;
  duration: string;
  price: number;
  status: string;
  batchId?: string;
  wifiName?: string;
}

function pdfText(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function makePageContent(rows: VoucherPdfRow[]) {
  const commands = ["0.15 0.15 0.18 rg"];
  rows.forEach((row, index) => {
    const column = index % 2;
    const line = Math.floor(index / 2);
    const x = 40 + column * 278;
    const y = 782 - line * 182;
    commands.push(
      `${x} ${y - 142} 250 154 re S`,
      "BT",
      `/F1 9 Tf ${x + 14} ${y - 24} Td (TRESA WIFI VOUCHER) Tj`,
      `/F2 17 Tf 0 -30 Td (${pdfText(row.code)}) Tj`,
      `/F1 9 Tf 0 -24 Td (Package: ${pdfText(row.packageName)}) Tj`,
      `0 -16 Td (Duration: ${pdfText(row.duration)}) Tj`,
      `0 -16 Td (Price: UGX ${pdfText(row.price.toLocaleString())}) Tj`,
      `0 -16 Td (Status: ${pdfText(row.status)}) Tj`,
      `0 -16 Td (Batch: ${pdfText(row.batchId || "Single")}) Tj`,
      row.wifiName ? `0 -16 Td (WiFi: ${pdfText(row.wifiName)}) Tj` : "",
      "ET",
    );
  });
  return commands.filter(Boolean).join("\n");
}

export function downloadVoucherPdf(rows: VoucherPdfRow[], filename: string) {
  if (rows.length === 0) return;
  const chunks: string[] = [];
  for (let index = 0; index < rows.length; index += 8) {
    chunks.push(makePageContent(rows.slice(index, index + 8)));
  }

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  const pageObjectIds = chunks.map((_, index) => 5 + index * 2);
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${chunks.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  chunks.forEach((content, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
