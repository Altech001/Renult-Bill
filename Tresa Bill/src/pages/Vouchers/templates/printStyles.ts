// 5 columns x 15 rows = 75 voucher cards per A4 page.
// 150 vouchers therefore print across exactly 2 pages.
export const VOUCHERS_PER_PAGE = 75;

export const VOUCHER_PRINT_STYLES = `
  @media print {
    body {
      background: white !important;
      color: black !important;
    }
    .print-container {
      padding: 0 !important;
      margin: 0 !important;
      background: white !important;
      width: 190mm !important;
    }
    /* Hide sidebar, header and preview toolbar */
    .print\\:hidden, aside, header, .sticky {
      display: none !important;
    }
    @page {
      size: A4 portrait;
      margin: 8mm 10mm !important;
    }
    .print-card-grid {
      grid-template-columns: repeat(5, 1fr) !important;
      gap: 1.3mm !important;
      display: grid !important;
      background: white !important;
      width: 190mm !important;
    }
    .print-card {
      width: 36.8mm !important;
      height: 17.6mm !important;
      min-height: 17.6mm !important;
      max-height: 17.6mm !important;
      aspect-ratio: unset !important;
      margin: 0 !important;
      border-radius: 0.8mm !important;
      box-shadow: none !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    }
    .print-card-header {
      padding: 0.6mm 1.2mm !important;
      flex-shrink: 0 !important;
    }
    .print-card-icon {
      width: 2mm !important;
      height: 2mm !important;
    }
    .print-card-wifi {
      font-size: 4.6pt !important;
      letter-spacing: 0.05em !important;
    }
    .print-card-duration {
      font-size: 4.2pt !important;
      padding: 0.2mm 0.9mm !important;
    }
    .print-card-code {
      flex: 1 !important;
    }
    .print-card-code-text {
      font-size: 9pt !important;
      letter-spacing: 0.08em !important;
    }
    .print-card-footer {
      padding: 0.4mm 1.2mm !important;
      flex-shrink: 0 !important;
    }
    .print-card-price,
    .print-card-package {
      font-size: 4.4pt !important;
    }
  }
`;
