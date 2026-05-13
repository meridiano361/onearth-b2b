import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export async function generateOrderPDF(order: Order): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;

  // --- Color palette ---
  const colorPrimary: [number, number, number] = [28, 28, 28];
  const colorAccent: [number, number, number] = [196, 168, 130];
  const colorBg: [number, number, number] = [250, 250, 247];
  const colorCream: [number, number, number] = [245, 239, 230];
  const colorBorder: [number, number, number] = [232, 226, 217];
  const colorGray: [number, number, number] = [138, 132, 128];

  // --- Background ---
  doc.setFillColor(...colorBg);
  doc.rect(0, 0, pageW, pageH, 'F');

  // --- Header block ---
  doc.setFillColor(...colorPrimary);
  doc.rect(0, 0, pageW, 42, 'F');

  // Brand name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setCharSpace(3);
  doc.text('MERIDIANO 361', margin, 14);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'light');
  doc.setCharSpace(8);
  doc.text('ON EARTH', margin, 27);

  doc.setCharSpace(0);

  // Gold accent line
  doc.setDrawColor(...colorAccent);
  doc.setLineWidth(0.4);
  doc.line(margin, 32, margin + 60, 32);

  // Collection label
  doc.setFontSize(7);
  doc.setTextColor(...colorAccent);
  doc.setCharSpace(2);
  doc.text('CASA 2027', margin, 38);
  doc.setCharSpace(0);

  // "ORDER SUMMARY" label on right
  doc.setFontSize(7);
  doc.setTextColor(...colorGray as unknown as [number, number, number]);
  doc.setCharSpace(2);
  doc.text('ORDER SUMMARY', pageW - margin, 22, { align: 'right' });
  doc.setCharSpace(0);

  // --- Order meta ---
  let y = 55;

  // Order ID and date
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorPrimary);
  doc.text('ORDER REFERENCE', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`#${order.id.slice(0, 8).toUpperCase()}`, margin, y + 6);

  // Status badge
  const statusX = margin + 60;
  doc.setFillColor(...colorCream);
  doc.roundedRect(statusX, y - 1, 28, 9, 1.5, 1.5, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...colorGray as unknown as [number, number, number]);
  doc.setCharSpace(1);
  doc.text(order.status, statusX + 14, y + 5, { align: 'center' });
  doc.setCharSpace(0);

  y += 18;

  // Customer + Date in two columns
  const col1 = margin;
  const col2 = pageW / 2;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorGray as unknown as [number, number, number]);
  doc.setCharSpace(1.5);
  doc.text('CUSTOMER', col1, y);
  doc.text('ORDER DATE', col2, y);
  doc.setCharSpace(0);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...colorPrimary);
  doc.text(order.customer?.companyName || '—', col1, y);
  doc.text(formatDate(order.createdAt, 'long'), col2, y);

  y += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(...colorGray as unknown as [number, number, number]);
  doc.text(order.customer?.customerCode || '', col1, y);
  doc.text(order.customer?.email || '', col2, y);

  y += 12;

  // Divider
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // --- Items table ---
  // Group by category
  const grouped = new Map<string, typeof order.items>();
  order.items?.forEach((item) => {
    const cat = item.product?.category?.name || 'Other';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  });

  const tableBody: any[] = [];
  grouped.forEach((items, category) => {
    // Category header row
    tableBody.push([
      { content: category.toUpperCase(), colSpan: 5, styles: {
        fillColor: colorCream,
        textColor: colorGray,
        fontSize: 6.5,
        fontStyle: 'bold',
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      }},
    ]);

    items!.forEach((item) => {
      tableBody.push([
        item.product?.code || '',
        item.product?.name || '',
        item.quantity,
        formatCurrency(Number(item.unitPrice)),
        formatCurrency(Number(item.subtotal)),
      ]);
    });
  });

  autoTable(doc, {
    startY: y,
    head: [[
      { content: 'CODE', styles: { halign: 'left' } },
      { content: 'PRODUCT', styles: { halign: 'left' } },
      { content: 'QTY', styles: { halign: 'center' } },
      { content: 'UNIT PRICE', styles: { halign: 'right' } },
      { content: 'SUBTOTAL', styles: { halign: 'right' } },
    ]],
    body: tableBody,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: colorPrimary,
      textColor: [255, 255, 255],
      fontSize: 6.5,
      fontStyle: 'bold',
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      lineWidth: 0,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: colorPrimary,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      lineColor: colorBorder,
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [252, 252, 250],
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold', fontSize: 7, textColor: colorGray },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    tableLineColor: colorBorder,
    tableLineWidth: 0.2,
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // --- Summary box ---
  const boxW = 70;
  const boxX = pageW - margin - boxW;

  doc.setFillColor(...colorCream);
  doc.roundedRect(boxX, finalY, boxW, 28, 2, 2, 'F');
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, finalY, boxW, 28, 2, 2, 'S');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colorGray as unknown as [number, number, number]);
  doc.text('Total Lines', boxX + 6, finalY + 8);
  doc.text('Total Pieces', boxX + 6, finalY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorPrimary);
  doc.text(String(order.items?.length || 0), boxX + boxW - 6, finalY + 8, { align: 'right' });
  doc.text(String(order.totalItems), boxX + boxW - 6, finalY + 15, { align: 'right' });

  // Total amount
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.2);
  doc.line(boxX + 4, finalY + 18, boxX + boxW - 4, finalY + 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colorGray as unknown as [number, number, number]);
  doc.text('Order Total (ex-works)', boxX + 6, finalY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colorPrimary);
  doc.text(formatCurrency(Number(order.totalValue)), boxX + boxW - 6, finalY + 24, { align: 'right' });

  // Notes
  if (order.notes) {
    const notesY = finalY + 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colorGray as unknown as [number, number, number]);
    doc.text('NOTES', margin, notesY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colorPrimary);
    doc.text(order.notes, margin, notesY + 5, {
      maxWidth: boxX - margin - 8,
    });
  }

  // --- Footer ---
  const footerY = pageH - 12;
  doc.setDrawColor(...colorBorder);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 4, pageW - margin, footerY - 4);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colorGray as unknown as [number, number, number]);
  doc.setCharSpace(0.5);
  doc.text('MERIDIANO 361 — ON EARTH B2B Platform — CASA 2027', pageW / 2, footerY, { align: 'center' });
  doc.setCharSpace(0);
  doc.text(`Generated ${new Date().toLocaleString('it-IT')}`, pageW - margin, footerY, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}
