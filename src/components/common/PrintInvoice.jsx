import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { getSignaturePngDataUrl } from '../../utils/signatureHelper';
import { numberToWords } from '../../utils/numberToWords';

// Generate Professional Clean A4 PDF GST Tax Invoice for Jagdamba Cloth House
export function generatePDFDocument(sale, shopSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const shopName = 'JAGDAMBA CLOTH HOUSE';
  const shopAddress = 'Main Bazar, GHANOUR';
  const phone = '7876413356';
  const gstin = '03BMLPK3243D1ZH';
  const stateCode = '140702';
  const signaturePng = getSignaturePngDataUrl(shopSettings);

  // Outer Clean Page Frame
  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.rect(10, 10, 190, 277);

  // 1. Header Box
  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 14, 182, 28);

  // TAX INVOICE subtitle
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RETAIL TAX INVOICE', 18, 19);

  // Shop Name & Address
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(shopName, 18, 26);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(shopAddress, 18, 31);
  doc.text(`GSTIN: ${gstin}   |   Mob.: ${phone}`, 18, 36.5);

  // Invoice Metadata Right (Dividing line)
  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.line(130, 14, 130, 42);

  const isWalkIn = !sale.customer_name || sale.customer_name === 'Walk-in Customer' || sale.customer_name === 'Cash';
  const customerNameStr = sale.customer_name || 'Walk-in Customer';
  const customerPhoneStr = sale.customer_phone || sale.phone || '';
  const customerGstinStr = sale.customer_gstin || (isWalkIn ? 'CASH' : 'CASH');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Invoice No.:', 134, 20); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text(sale.invoice_no || 'JCH-00001', 192, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  doc.text('Date:', 134, 25); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text(sale.sale_date || new Date().toLocaleDateString('en-IN'), 192, 25, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  doc.text('Time:', 134, 30); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text(sale.sale_time || '03:15 PM', 192, 30, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  doc.text('State Code:', 134, 35); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text(stateCode, 192, 35, { align: 'right' });

  // 2. Customer Information Grid (BILLED TO)
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 45, 182, 22, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 45, 182, 22, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('BILLED TO (CUSTOMER DETAILS)', 18, 49.5);
  doc.line(14, 51, 196, 51);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  // Left Column
  doc.text('Customer Name:', 18, 57); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text(customerNameStr, 48, 57);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  doc.text('Mobile Number:', 18, 63); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text(customerPhoneStr || 'N/A', 48, 63);

  // Right Column
  doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  doc.text('Payment Mode:', 108, 57); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text((sale.payment_mode || 'Cash').toUpperCase(), 138, 57);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  doc.text('Customer GSTIN:', 108, 63); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text(customerGstinStr, 138, 63);

  // 3. Items Table
  const items = sale.items || [];
  let sno = 1;
  const tableRows = items.map((item) => {
    const qty = parseFloat(item.quantity || 1);
    const rate = parseFloat(item.unit_price || 0);
    const itemSub = Math.round(qty * rate * 100) / 100;
    const particulars = item.product_name || item.name || 'Clothing Item';
    const unitType = item.unit_type ? item.unit_type.toUpperCase() : 'PCS';
    const qtyStr = Number.isInteger(qty) ? `${qty} ${unitType}` : `${qty.toFixed(2)} ${unitType}`;

    return [
      (sno++).toString(),
      qtyStr,
      particulars + (item.design_no ? ` (Des: #${item.design_no})` : ''),
      `Rs. ${rate.toFixed(2)}`,
      `Rs. ${itemSub.toFixed(2)}`
    ];
  });

  if (tableRows.length === 0) {
    tableRows.push(['', '', 'POS Cart is Empty - Add items to preview invoice details.', '', '']);
  }

  doc.autoTable({
    startY: 70,
    margin: { left: 14, right: 14 },
    head: [['S.NO.', 'QTY', 'PARTICULARS / ITEM DESCRIPTION', 'RATE (Rs.)', 'AMOUNT (Rs.)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      lineWidth: 0.3,
      lineColor: [203, 213, 225]
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 8.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'left' },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 38 }
    },
    styles: {
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      cellPadding: 3.5
    }
  });

  const finalY = doc.lastAutoTable.finalY;

  // 4. Calculations & GST
  const subtotal = Math.round((sale.subtotal !== undefined ? parseFloat(sale.subtotal) : items.reduce((acc, i) => acc + (parseFloat(i.quantity || 1) * parseFloat(i.unit_price || 0)), 0)) * 100) / 100;
  const taxAmount = Math.round((sale.tax_amount !== undefined ? parseFloat(sale.tax_amount) : items.reduce((acc, i) => acc + (parseFloat(i.tax_amount || 0)), 0)) * 100) / 100;
  const discount = parseFloat(sale.discount || 0);
  const grandTotal = sale.net_amount !== undefined ? parseFloat(sale.net_amount) : Math.max(0, subtotal + taxAmount - discount);
  const paidAmount = sale.paid_amount !== undefined ? parseFloat(sale.paid_amount) : grandTotal;
  const balance = sale.due_amount !== undefined ? parseFloat(sale.due_amount) : Math.max(0, grandTotal - paidAmount);

  const isFivePercentGst = taxAmount > 0;
  const cgstRateStr = isFivePercentGst ? '2.5%' : '0%';
  const sgstRateStr = isFivePercentGst ? '2.5%' : '0%';
  const cgstVal = isFivePercentGst ? (taxAmount / 2) : 0;
  const sgstVal = isFivePercentGst ? (taxAmount / 2) : 0;

  // 5. Totals Box (Right Side)
  const totalsY = Math.max(finalY + 4, 155);
  const totalsBoxX = 114;
  const totalsBoxW = 82;

  doc.setDrawColor(203, 213, 225);
  doc.rect(totalsBoxX, totalsY, totalsBoxW, 38);

  const totalsRows = [
    { label: 'Subtotal', val: `Rs. ${subtotal.toFixed(2)}` },
    { label: 'Discount', val: `-Rs. ${discount.toFixed(2)}` },
    { label: `CGST @ ${cgstRateStr}`, val: `Rs. ${cgstVal.toFixed(2)}` },
    { label: `SGST @ ${sgstRateStr}`, val: `Rs. ${sgstVal.toFixed(2)}` }
  ];

  let tY = totalsY + 5.5;
  totalsRows.forEach((r) => {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(r.label, totalsBoxX + 3.5, tY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(r.val, totalsBoxX + totalsBoxW - 3.5, tY, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.line(totalsBoxX, tY + 2, totalsBoxX + totalsBoxW, tY + 2);
    tY += 7;
  });

  // GRAND TOTAL Subtle Highlighted Row
  const gtY = totalsY + 29;
  doc.setFillColor(241, 245, 249);
  doc.rect(totalsBoxX, gtY, totalsBoxW, 9, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(totalsBoxX, gtY, totalsBoxX + totalsBoxW, gtY);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('GRAND TOTAL', totalsBoxX + 3.5, gtY + 6);
  doc.text(`Rs. ${grandTotal.toFixed(2)}`, totalsBoxX + totalsBoxW - 3.5, gtY + 6, { align: 'right' });

  // 6. Payment Info & Amount in Words (Left Side)
  const infoLeftW = 92;

  // Amount in Words
  doc.setFillColor(248, 250, 252);
  doc.rect(14, totalsY, infoLeftW, 16, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(14, totalsY, infoLeftW, 16, 'S');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('AMOUNT IN WORDS', 17, totalsY + 4.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(15, 23, 42);
  const wordsLines = doc.splitTextToSize(numberToWords(grandTotal), infoLeftW - 6);
  doc.text(wordsLines, 17, totalsY + 9.5);

  // Paid & Balance Box
  const paidY = totalsY + 19;
  doc.rect(14, paidY, infoLeftW, 19, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Paid Amount:', 17, paidY + 6);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text(`Rs. ${paidAmount.toFixed(2)}`, 102, paidY + 6, { align: 'right' });

  doc.line(14, paidY + 9.5, 14 + infoLeftW, paidY + 9.5);

  doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  doc.text('Balance Due:', 17, paidY + 15);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text(`Rs. ${balance.toFixed(2)}`, 102, paidY + 15, { align: 'right' });

  // 7. Terms & Conditions and Signature Section
  const bottomY = totalsY + 42;
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, bottomY, 182, 23);
  doc.line(105, bottomY, 105, bottomY + 23);

  // Left: Terms
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TERMS & CONDITIONS', 17, bottomY + 5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('1. Goods once sold will not be taken back.', 17, bottomY + 9.5);
  doc.text('2. 2% p.m. interest will be charged after 15 days.', 17, bottomY + 13.5);
  doc.text('3. Fixed price, no exchange, no return.', 17, bottomY + 17.5);

  // Right: Signature
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('For Jagdamba Cloth House', 150, bottomY + 5, { align: 'center' });

  try {
    if (signaturePng && signaturePng.startsWith('data:image/')) {
      const format = signaturePng.includes('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(signaturePng, format, 130, bottomY + 5.5, 40, 10);
    }
  } catch (e) {
    console.error('jsPDF Signature image error:', e);
  }

  doc.setLineWidth(0.3);
  doc.setDrawColor(148, 163, 184);
  doc.line(125, bottomY + 17.5, 175, bottomY + 17.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Signatory', 150, bottomY + 21, { align: 'center' });

  // Footer Note Centered
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for shopping with Jagdamba Cloth House!', 105, 281, { align: 'center' });

  return doc;
}

// Generate Printable HTML Layout for Web & Thermal/Desktop Printing
export function printThermalReceipt(sale, shopSettings) {
  const shopName = 'JAGDAMBA CLOTH HOUSE';
  const shopAddress = 'Main Bazar, GHANOUR';
  const phone = '7876413356';
  const gstin = '03BMLPK3243D1ZH';
  const stateCode = '140702';
  const signaturePng = getSignaturePngDataUrl(shopSettings);

  const items = sale.items || [];
  const subtotal = Math.round((sale.subtotal !== undefined ? parseFloat(sale.subtotal) : items.reduce((acc, i) => acc + (parseFloat(i.quantity || 1) * parseFloat(i.unit_price || 0)), 0)) * 100) / 100;
  const taxAmount = Math.round((sale.tax_amount !== undefined ? parseFloat(sale.tax_amount) : items.reduce((acc, i) => acc + (parseFloat(i.tax_amount || 0)), 0)) * 100) / 100;
  const discount = parseFloat(sale.discount || 0);
  const grandTotal = sale.net_amount !== undefined ? parseFloat(sale.net_amount) : Math.max(0, subtotal + taxAmount - discount);
  const paidAmount = sale.paid_amount !== undefined ? parseFloat(sale.paid_amount) : grandTotal;
  const balance = sale.due_amount !== undefined ? parseFloat(sale.due_amount) : Math.max(0, grandTotal - paidAmount);

  const isFivePercentGst = taxAmount > 0;
  const cgstRateStr = isFivePercentGst ? '2.5%' : '0%';
  const sgstRateStr = isFivePercentGst ? '2.5%' : '0%';
  const cgstVal = isFivePercentGst ? (taxAmount / 2) : 0;
  const sgstVal = isFivePercentGst ? (taxAmount / 2) : 0;

  const isWalkIn = !sale.customer_name || sale.customer_name === 'Walk-in Customer' || sale.customer_name === 'Cash';
  const customerNameStr = sale.customer_name || 'Walk-in Customer';
  const customerPhoneStr = sale.customer_phone || sale.phone || '';
  const customerGstinStr = sale.customer_gstin || (isWalkIn ? 'CASH' : 'CASH');

  let sno = 1;
  const tableRowsHtml = items.map((item) => {
    const qty = parseFloat(item.quantity || 1);
    const rate = parseFloat(item.unit_price || 0);
    const itemSub = Math.round(qty * rate * 100) / 100;
    const particulars = item.product_name || item.name || 'Clothing Item';
    const unitType = item.unit_type ? item.unit_type.toUpperCase() : 'PCS';
    const qtyStr = Number.isInteger(qty) ? `${qty} ${unitType}` : `${qty.toFixed(2)} ${unitType}`;

    return `
      <tr>
        <td style="padding: 5px 8px; text-align: center; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; color: #334155;">${sno++}</td>
        <td style="padding: 5px 8px; text-align: center; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; color: #0f172a;">${qtyStr}</td>
        <td style="padding: 5px 10px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-weight: 500; color: #0f172a;">${particulars}${item.design_no ? ` <span style="font-size: 10px; color: #64748b;">(Des: #${item.design_no})</span>` : ''}</td>
        <td style="padding: 5px 10px; text-align: right; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-family: monospace; color: #334155;">₹${rate.toFixed(2)}</td>
        <td style="padding: 5px 10px; text-align: right; border-bottom: 1px solid #cbd5e1; font-family: monospace; font-weight: 600; color: #0f172a;">₹${itemSub.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const emptyCartHtml = items.length === 0 ? `
    <tr>
      <td colSpan="5" style="padding: 16px; text-align: center; color: #64748b;">
        <div style="font-weight: 600; font-size: 12px; color: #1e293b;">POS Cart is Empty</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Add items to POS cart to preview invoice details.</div>
      </td>
    </tr>
  ` : '';

  const wordsStr = numberToWords(grandTotal);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice - ${sale.invoice_no || 'DRAFT'}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: Arial, Inter, -apple-system, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 12px; font-size: 11px; line-height: 1.4; }
          
          .invoice-card {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #cbd5e1;
            padding: 20px;
            box-sizing: border-box;
          }

          .header-box { border: 1px solid #cbd5e1; padding: 12px; margin-bottom: 12px; }
          .header-flex { display: flex; justify-content: space-between; align-items: flex-start; }
          .tax-badge { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
          .shop-title { font-size: 18px; font-weight: 700; text-transform: uppercase; margin: 0; color: #0f172a; }
          .shop-sub { color: #334155; font-size: 11px; margin-top: 2px; }
          .shop-meta { font-size: 11px; color: #334155; margin-top: 4px; }

          .meta-table { font-size: 11px; border-collapse: collapse; }
          .meta-table td { padding: 2px 0; }
          .meta-label { color: #475569; padding-right: 12px; }
          .meta-val { font-weight: 700; color: #0f172a; }

          .billed-box { border: 1px solid #cbd5e1; background: #f8fafc; padding: 10px 12px; margin-bottom: 12px; }
          .billed-header { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; }
          .billed-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 11px; }
          .billed-row { display: flex; }
          .billed-lbl { width: 110px; color: #475569; flex-shrink: 0; }
          .billed-val { font-weight: 700; color: #0f172a; }

          .bill-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1px solid #cbd5e1; font-size: 11px; }
          .bill-table th { background: #f1f5f9; color: #0f172a; font-weight: 700; font-size: 10px; text-transform: uppercase; padding: 6px 8px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
          .bill-table th:last-child { border-right: none; }

          .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
          .info-box { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; }
          .info-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; display: block; }
          
          .totals-box { border: 1px solid #cbd5e1; font-size: 11px; }
          .totals-row { display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #e2e8f0; }
          .totals-row:last-child { border-bottom: none; }
          .gtotal-row { background: #f1f5f9; border-top: 2px solid #0f172a; font-weight: 700; color: #0f172a; font-size: 11px; }

          .footer-box { border: 1px solid #cbd5e1; padding: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 10px; }
          .terms-list { color: #475569; padding-left: 14px; margin: 4px 0 0 0; line-height: 1.5; }
          .sign-col { text-align: center; border-left: 1px solid #cbd5e1; padding-left: 12px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; }
          .sign-title { font-weight: 700; font-size: 10px; color: #0f172a; }
          .sign-img { max-height: 36px; max-width: 130px; object-fit: contain; margin: 2px 0; }
          .sign-footer { border-top: 1px solid #94a3b8; width: 75%; padding-top: 2px; font-weight: 600; color: #334155; }

          .thank-you { text-align: center; margin-top: 10px; color: #475569; font-size: 10px; font-weight: 500; }

          @media print {
            body { padding: 0; }
            .invoice-card { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <div class="header-box">
            <div class="header-flex">
              <div>
                <div class="tax-badge">RETAIL TAX INVOICE</div>
                <h1 class="shop-title">${shopName}</h1>
                <div class="shop-sub">${shopAddress}</div>
                <div class="shop-meta">GSTIN: ${gstin} &bull; Mob.: ${phone}</div>
              </div>
              <div style="border-left: 1px solid #cbd5e1; padding-left: 12px;">
                <table class="meta-table">
                  <tr><td class="meta-label">Invoice No.:</td><td class="meta-val">${sale.invoice_no || 'DRAFT-INVOICE'}</td></tr>
                  <tr><td class="meta-label">Date:</td><td class="meta-val">${sale.sale_date || new Date().toLocaleDateString('en-IN')}</td></tr>
                  <tr><td class="meta-label">Time:</td><td class="meta-val">${sale.sale_time || '03:15 PM'}</td></tr>
                  <tr><td class="meta-label">State Code:</td><td class="meta-val">${stateCode}</td></tr>
                </table>
              </div>
            </div>
          </div>

          <div class="billed-box">
            <div class="billed-header">Billed To (Customer Details)</div>
            <div class="billed-grid">
              <div class="billed-row"><span class="billed-lbl">Customer Name:</span><span class="billed-val">${customerNameStr}</span></div>
              <div class="billed-row"><span class="billed-lbl">Payment Mode:</span><span class="billed-val">${(sale.payment_mode || 'Cash').toUpperCase()}</span></div>
              <div class="billed-row"><span class="billed-lbl">Mobile Number:</span><span class="billed-val">${customerPhoneStr || 'N/A'}</span></div>
              <div class="billed-row"><span class="billed-lbl">Customer GSTIN:</span><span class="billed-val">${customerGstinStr}</span></div>
            </div>
          </div>

          <table class="bill-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">S.NO.</th>
                <th style="width: 50px; text-align: center;">QTY</th>
                <th style="text-align: left;">PARTICULARS / ITEM DESCRIPTION</th>
                <th style="width: 90px; text-align: right;">RATE (Rs.)</th>
                <th style="width: 100px; text-align: right;">AMOUNT (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${emptyCartHtml}
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="bottom-grid">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div class="info-box">
                <span class="info-title">Amount in Words</span>
                <div style="font-weight: 600; font-style: italic; color: #0f172a;">${wordsStr}</div>
              </div>
              <div class="info-box">
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span style="color: #475569;">Paid Amount:</span><span style="font-weight: 700; font-family: monospace; color: #0f172a;">₹${paidAmount.toFixed(2)}</span></div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 2px;"><span style="color: #475569;">Balance Due:</span><span style="font-weight: 700; font-family: monospace; color: #0f172a;">₹${balance.toFixed(2)}</span></div>
              </div>
            </div>

            <div class="totals-box">
              <div class="totals-row"><span style="color: #475569;">Subtotal</span><span style="font-weight: 600; font-family: monospace;">₹${subtotal.toFixed(2)}</span></div>
              <div class="totals-row"><span style="color: #475569;">Discount</span><span style="font-weight: 600; font-family: monospace;">-₹${discount.toFixed(2)}</span></div>
              <div class="totals-row"><span style="color: #475569;">CGST @ ${cgstRateStr}</span><span style="font-weight: 600; font-family: monospace;">₹${cgstVal.toFixed(2)}</span></div>
              <div class="totals-row"><span style="color: #475569;">SGST @ ${sgstRateStr}</span><span style="font-weight: 600; font-family: monospace;">₹${sgstVal.toFixed(2)}</span></div>
              <div class="totals-row gtotal-row"><span>GRAND TOTAL</span><span style="font-family: monospace;">₹${grandTotal.toFixed(2)}</span></div>
            </div>
          </div>

          <div class="footer-box">
            <div>
              <strong style="color: #0f172a; text-transform: uppercase;">Terms & Conditions</strong>
              <ul class="terms-list">
                <li>Goods once sold will not be taken back.</li>
                <li>2% p.m. interest will be charged after 15 days.</li>
                <li>Fixed price, no exchange, no return.</li>
              </ul>
            </div>
            <div class="sign-col">
              <div class="sign-title">For Jagdamba Cloth House</div>
              ${signaturePng ? `<img src="${signaturePng}" class="sign-img" alt="Authorized Signature" />` : '<div style="height: 36px;"></div>'}
              <div class="sign-footer">Authorized Signatory</div>
            </div>
          </div>

          <div class="thank-you">Thank you for shopping with Jagdamba Cloth House!</div>
        </div>
      </body>
    </html>
  `;
}

// Universal Document Printing Helper (Electron Native + Web Browser Popup Print)
export async function printDocumentHtml(htmlContent) {
  // 1. Electron Desktop App Native Print
  if (window.electronAPI?.printDocument) {
    try {
      const res = await window.electronAPI.printDocument(htmlContent);
      if (res && res.success !== false) {
        return res;
      }
    } catch (err) {
      console.warn('[Print] Electron native print error, attempting web fallback:', err);
    }
  }

  // 2. Web Browser Mode: Direct Popup Print Screen
  return new Promise((resolve) => {
    try {
      const printWin = window.open('', '_blank', 'width=850,height=900,scrollbars=yes');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();

        const triggerPrint = () => {
          try {
            printWin.focus();
            printWin.print();
          } catch (e) {
            console.error('[Print] Print window error:', e);
          }
          resolve({ success: true });
        };

        if (printWin.document.readyState === 'complete') {
          setTimeout(triggerPrint, 150);
        } else {
          printWin.onload = () => setTimeout(triggerPrint, 150);
          setTimeout(triggerPrint, 400);
        }
        return;
      }

      // Iframe Fallback if popups are blocked
      const frameId = 'app-print-iframe';
      const oldFrame = document.getElementById(frameId);
      if (oldFrame) oldFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = frameId;
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';

      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.error('[Print] Iframe print error:', e);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
            resolve({ success: true });
          }, 1000);
        }
      }, 250);
    } catch (err) {
      console.error('[Print] Critical print error:', err);
      resolve({ success: false, error: err.message });
    }
  });
}

