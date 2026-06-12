import { DEFAULT_VOUCHER_THEME_ID, getVoucherTheme, VoucherThemePdfColors } from "./voucherThemes";

export interface VoucherPdfRow {
  code: string;
  packageName: string;
  duration: string;
  price: number;
  status: string;
  batchId?: string;
  wifiName?: string;
}

// A4 page in points, 5 columns x 15 rows -> 75 cards/page (150 vouchers = 2 pages).
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 18;
const COLS = 5;
const ROWS = 15;
const GAP = 4;
const CARD_W = (PAGE_W - 2 * MARGIN - (COLS - 1) * GAP) / COLS;
const CARD_H = (PAGE_H - 2 * MARGIN - (ROWS - 1) * GAP) / ROWS;
const PER_PAGE = COLS * ROWS;
const HEADER_H = 14;
const FOOTER_H = 11;

function pdfText(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function num(value: number) {
  return value.toFixed(2);
}

function rgb(color: [number, number, number]) {
  return `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)}`;
}

function textAt(x: number, y: number, font: "F1" | "F2", size: number, color: [number, number, number], text: string) {
  return [
    "BT",
    `/${font} ${size} Tf`,
    `${rgb(color)} rg`,
    `1 0 0 1 ${num(x)} ${num(y)} Tm`,
    `(${pdfText(text)}) Tj`,
    "ET",
  ].join("\n");
}

// Helvetica/Helvetica-Bold average glyph width as a fraction of font size.
const CHAR_WIDTH_FACTOR = 0.58;

function estimateWidth(text: string, size: number) {
  return text.length * size * CHAR_WIDTH_FACTOR;
}

function cardCommands(row: VoucherPdfRow, x: number, yTop: number, theme: VoucherThemePdfColors, showWifi: boolean) {
  const yBottom = yTop - CARD_H;
  const codeH = CARD_H - HEADER_H - FOOTER_H;
  const commands: string[] = [];

  // Card border
  commands.push(`${rgb(theme.border)} RG`, "0.6 w", `${num(x)} ${num(yBottom)} ${num(CARD_W)} ${num(CARD_H)} re S`);

  // Header band (colored)
  commands.push(`${rgb(theme.header)} rg`, `${num(x)} ${num(yTop - HEADER_H)} ${num(CARD_W)} ${num(HEADER_H)} re f`);

  // Header text - wifi name (left, white)
  if (showWifi) {
    const wifiText = (row.wifiName || "TRESA WIFI").toUpperCase();
    commands.push(textAt(x + 4, yTop - 9.5, "F2", 6, [1, 1, 1], wifiText));
  }

  // Header text - duration badge (right, white)
  const durationText = row.duration.toUpperCase();
  const durationWidth = estimateWidth(durationText, 6);
  commands.push(textAt(x + CARD_W - durationWidth - 4, yTop - 9.5, "F2", 6, [1, 1, 1], durationText));

  // Code section background
  commands.push(`${rgb(theme.codeBg)} rg`, `${num(x)} ${num(yBottom + FOOTER_H)} ${num(CARD_W)} ${num(codeH)} re f`);

  // Code text - centered
  const codeText = row.code.toUpperCase();
  const codeFontSize = 13;
  const codeWidth = estimateWidth(codeText, codeFontSize);
  const codeX = x + Math.max(2, (CARD_W - codeWidth) / 2);
  const codeY = yBottom + FOOTER_H + codeH / 2 - codeFontSize * 0.35;
  commands.push(textAt(codeX, codeY, "F2", codeFontSize, theme.codeText, codeText));

  // Footer divider
  commands.push(`${rgb(theme.border)} RG`, "0.4 w", `${num(x)} ${num(yBottom + FOOTER_H)} m ${num(x + CARD_W)} ${num(yBottom + FOOTER_H)} l S`);

  // Footer text - price (left)
  commands.push(textAt(x + 3, yBottom + 3.6, "F1", 5.5, theme.footerText, `UGX ${row.price.toLocaleString()}`));

  // Footer text - package (right, truncated)
  let pkgText = row.packageName.toUpperCase();
  if (pkgText.length > 14) pkgText = `${pkgText.slice(0, 13)}...`;
  const pkgWidth = estimateWidth(pkgText, 5.5);
  commands.push(textAt(x + CARD_W - pkgWidth - 3, yBottom + 3.6, "F1", 5.5, theme.codeText, pkgText));

  return commands.join("\n");
}

function makePageContent(rows: VoucherPdfRow[], theme: VoucherThemePdfColors) {
  const commands: string[] = [];
  rows.forEach((row, index) => {
    const col = index % COLS;
    const line = Math.floor(index / COLS);
    const x = MARGIN + col * (CARD_W + GAP);
    const yTop = PAGE_H - MARGIN - line * (CARD_H + GAP);
    const showWifi = row.wifiName !== undefined;
    commands.push(cardCommands(row, x, yTop, theme, showWifi));
  });
  return commands.join("\n");
}

/**
 * Generates and downloads a colorful voucher PDF.
 * Layout matches the on-screen print template: 5 columns x 15 rows (75 per
 * page), so a 150-voucher batch prints across exactly 2 pages.
 */
export function downloadVoucherPdf(rows: VoucherPdfRow[], filename: string, themeId: string = DEFAULT_VOUCHER_THEME_ID) {
  if (rows.length === 0) return;
  const theme = getVoucherTheme(themeId).pdf;

  const chunks: string[] = [];
  for (let index = 0; index < rows.length; index += PER_PAGE) {
    chunks.push(makePageContent(rows.slice(index, index + PER_PAGE), theme));
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
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
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
