import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface LedgerEntryItem {
  date: string;
  details: string;
  narration?: string;
  category?: string;
  type: string;
  paymentMethod?: string;
  debit: number;
  credit: number;
  runningBalance?: number;
}

export interface LedgerPdfOptions {
  title: string;
  subtitle?: string;
  ledgerType: 'bank' | 'credit-card' | 'category' | 'cash' | 'loan' | 'general' | 'expense' | 'income';
  accountInfo?: {
    accountNumber?: string;
    accountType?: string;
    identifier?: string;
    ifscCode?: string;
    limit?: number;
  };
  dateRange: {
    startDate?: string;
    endDate?: string;
    label: string;
  };
  openingBalance?: number;
  entries: LedgerEntryItem[];
  closingBalance?: number;
  totalDebit: number;
  totalCredit: number;
}

const formatPdfCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${formatted}`;
};

export const generateLedgerPdf = (options: LedgerPdfOptions): { doc: jsPDF; fileName: string; blob: Blob } => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  let currentY = margin;

  // 1. Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, currentY, pageWidth - margin * 2, 70, 'F');

  // Decorative Accent Bar
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(margin, currentY, 6, 70, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TRACK MY EXPENSES', margin + 18, currentY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(199, 210, 254); // indigo-200
  doc.text('STATEMENT OF ACCOUNT / FINANCIAL LEDGER', margin + 18, currentY + 39);

  // Generation timestamp on right
  const now = new Date();
  const timeStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated: ${timeStr}`, pageWidth - margin - 14, currentY + 24, { align: 'right' });
  doc.text(`Period: ${options.dateRange.label}`, pageWidth - margin - 14, currentY + 39, { align: 'right' });

  currentY += 82;

  // 2. Ledger Title & Metadata Sub-header
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(options.title, margin, currentY);

  if (options.subtitle) {
    currentY += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(options.subtitle, margin, currentY);
  }

  // Account Info Metadata Line
  if (options.accountInfo) {
    currentY += 13;
    const parts: string[] = [];
    if (options.accountInfo.accountType) parts.push(`Type: ${options.accountInfo.accountType}`);
    if (options.accountInfo.accountNumber) parts.push(`Account No: ${options.accountInfo.accountNumber}`);
    if (options.accountInfo.identifier) parts.push(`Card: ${options.accountInfo.identifier}`);
    if (options.accountInfo.ifscCode) parts.push(`IFSC: ${options.accountInfo.ifscCode}`);
    if (options.accountInfo.limit) parts.push(`Credit Limit: Rs. ${formatPdfCurrency(options.accountInfo.limit)}`);

    if (parts.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(parts.join('   |   '), margin, currentY);
    }
  }

  currentY += 16;

  // 3. Financial Summary Metric Cards (4 boxes)
  const isCreditCard = options.ledgerType === 'credit-card';
  const boxWidth = (pageWidth - margin * 2 - 18) / 4;
  const boxHeight = 44;

  const summaryBoxes = [
    {
      label: isCreditCard ? 'Opening Outstanding' : 'Opening Balance',
      value: options.openingBalance !== undefined ? `Rs. ${formatPdfCurrency(options.openingBalance)}` : 'N/A',
      bgColor: [248, 250, 252], // slate-50
      textColor: [15, 23, 42],
    },
    {
      label: isCreditCard ? 'Total Spends (Debits)' : 'Total Outflows (Debits)',
      value: `Rs. ${formatPdfCurrency(options.totalDebit)}`,
      bgColor: [255, 241, 242], // rose-50
      textColor: [190, 18, 60],  // rose-700
    },
    {
      label: isCreditCard ? 'Total Payments (Credits)' : 'Total Inflows (Credits)',
      value: `Rs. ${formatPdfCurrency(options.totalCredit)}`,
      bgColor: [236, 253, 245], // emerald-50
      textColor: [4, 120, 87],   // emerald-700
    },
    {
      label: isCreditCard ? 'Closing Outstanding' : 'Closing Balance',
      value: options.closingBalance !== undefined ? `Rs. ${formatPdfCurrency(options.closingBalance)}` : 'N/A',
      bgColor: [238, 242, 255], // indigo-50
      textColor: [67, 56, 202],  // indigo-700
    },
  ];

  summaryBoxes.forEach((b, idx) => {
    const x = margin + idx * (boxWidth + 6);
    doc.setFillColor(b.bgColor[0], b.bgColor[1], b.bgColor[2]);
    doc.roundedRect(x, currentY, boxWidth, boxHeight, 5, 5, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, currentY, boxWidth, boxHeight, 5, 5, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(b.label, x + 8, currentY + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(b.textColor[0], b.textColor[1], b.textColor[2]);
    doc.text(b.value, x + 8, currentY + 32);
  });

  currentY += boxHeight + 16;

  // 4. Build Table Rows
  const tableData = options.entries.map((entry, index) => {
    const particulars = entry.narration
      ? `${entry.details}\n${entry.narration}`
      : entry.details;

    const debitStr = entry.debit > 0 ? formatPdfCurrency(entry.debit) : '-';
    const creditStr = entry.credit > 0 ? formatPdfCurrency(entry.credit) : '-';
    const balStr = entry.runningBalance !== undefined ? formatPdfCurrency(entry.runningBalance) : '-';

    return [
      String(index + 1),
      entry.date || '-',
      particulars || '-',
      entry.category || '-',
      entry.paymentMethod || entry.type,
      debitStr,
      creditStr,
      balStr,
    ];
  });

  // Table Headers
  const tableHeaders = [
    '#',
    'Date',
    'Particulars / Details',
    'Category',
    'Mode / Type',
    'Debit (Rs.)',
    'Credit (Rs.)',
    'Balance (Rs.)',
  ];

  // Footer Row
  const footerRow = [
    '',
    '',
    `Total (${options.entries.length} Entries)`,
    '',
    '',
    formatPdfCurrency(options.totalDebit),
    formatPdfCurrency(options.totalCredit),
    options.closingBalance !== undefined ? formatPdfCurrency(options.closingBalance) : '-',
  ];

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableData,
    foot: [footerRow],
    theme: 'striped',
    margin: { left: margin, right: margin, bottom: 45 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 54, halign: 'left' },
      2: { cellWidth: 150, halign: 'left' },
      3: { cellWidth: 75, halign: 'left' },
      4: { cellWidth: 60, halign: 'left' },
      5: { cellWidth: 55, halign: 'right', textColor: [190, 18, 60], fontStyle: 'bold' },
      6: { cellWidth: 55, halign: 'right', textColor: [4, 120, 87], fontStyle: 'bold' },
      7: { cellWidth: 55, halign: 'right', textColor: [30, 41, 59], fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      // Running Page Footer
      const totalPagesExp = '{total_pages_count_string}';
      const pageStr = `Page ${data.pageNumber} of ${totalPagesExp}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400

      // Left footer
      doc.text('Track My Expenses · Confidential Personal Finance Ledger', margin, pageHeight - 20);
      // Right footer
      doc.text(pageStr, pageWidth - margin, pageHeight - 20, { align: 'right' });

      // Thin separator line above footer
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
    },
  });

  // Calculate total pages for all instances
  if (typeof (doc as any).putTotalPages === 'function') {
    (doc as any).putTotalPages('{total_pages_count_string}');
  }

  const safeTitle = options.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const dateStr = now.toISOString().slice(0, 10);
  const fileName = `ledger_${safeTitle}_${dateStr}.pdf`;
  const blob = doc.output('blob');

  return { doc, fileName, blob };
};

export const downloadLedgerPdf = (doc: jsPDF, fileName: string) => {
  doc.save(fileName);
};

export const shareLedgerPdf = async (
  blob: Blob,
  fileName: string,
  title: string
): Promise<{ success: boolean; method: 'native-share' | 'download-fallback'; message: string }> => {
  try {
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text: `Financial Ledger: ${title}`,
      });
      return { success: true, method: 'native-share', message: 'PDF shared successfully' };
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return { success: true, method: 'native-share', message: 'Share cancelled' };
    }
  }

  // Fallback: trigger download and alert user
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  return {
    success: true,
    method: 'download-fallback',
    message: 'PDF downloaded to your device',
  };
};
