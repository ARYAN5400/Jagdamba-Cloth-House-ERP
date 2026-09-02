import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate a Consolidated Date-Range Sales Report PDF
 * 
 * @param {Array} filteredSales - List of sales matching user date and search filters
 * @param {string} fromDate - Filter start date (YYYY-MM-DD)
 * @param {string} toDate - Filter end date (YYYY-MM-DD)
 * @param {Object} shopSettings - Shop metadata
 */
export function generateSalesReportPDF(filteredSales, fromDate, toDate, shopSettings) {
  if (!filteredSales || filteredSales.length === 0) {
    throw new Error('No sales found for the selected date range.');
  }

  // Sort sales in ascending order by invoice number / ID (JCH-00001, JCH-00002, ...)
  const sortedSales = [...filteredSales].sort((a, b) => {
    if (a.id && b.id) return a.id - b.id;
    return (a.invoice_no || '').localeCompare(b.invoice_no || '', undefined, { numeric: true });
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const shopName = 'Jagdamba Cloth House';
  const shopAddress = (shopSettings?.address && !shopSettings.address.includes('Main Market')) ? shopSettings.address : 'Main Bazar, GHANOUR';
  const phone = (shopSettings?.phone && !shopSettings.phone.includes('98765')) ? shopSettings.phone : '7876413356';
  const gstin = (shopSettings?.gstin && !shopSettings.gstin.includes('07A')) ? shopSettings.gstin : '03BMLPK3243D1ZH';

  // 1. Report Header Line: GSTIN Left | Mob. Right
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');

  doc.text(`GSTIN: ${gstin}`, 14, 14);
  doc.text(`Mobile: ${phone}`, 196, 14, { align: 'right' });

  // Centered Shop Name & Address
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(shopName, 105, 22, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(shopAddress, 105, 27, { align: 'center' });

  // Divider Line
  doc.setLineWidth(0.4);
  doc.setDrawColor(0, 0, 0);
  doc.line(14, 31, 196, 31);

  // Report Title & Date Range Block
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SALES REPORT', 105, 38, { align: 'center' });

  const fromStr = fromDate ? fromDate.split('-').reverse().join('-') : 'Start';
  const toStr = toDate ? toDate.split('-').reverse().join('-') : 'End';

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`From: ${fromStr}       To: ${toStr}`, 105, 43, { align: 'center' });

  // 2. Prepare 7-Column Table Data
  const tableRows = [];
  let snoCounter = 1;

  let totalItemsSold = 0;
  let totalTaxableAmount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let grandTotalSales = 0;

  sortedSales.forEach((sale) => {
    const items = sale.items && sale.items.length > 0 ? sale.items : [{
      product_name: 'Item',
      quantity: 1,
      unit_price: sale.subtotal || sale.net_amount || 0,
      gst_rate: 5,
      tax_amount: sale.tax_amount || 0,
      total_amount: sale.net_amount || 0
    }];

    items.forEach((item) => {
      const qty = parseFloat(item.quantity || 1);
      const rate = parseFloat(item.unit_price || 0);
      const gstRate = parseFloat(item.gst_rate !== undefined ? item.gst_rate : 5);

      // Amount = Taxable item amount before GST (Qty × Rate)
      const amount = qty * rate;

      // CGST & SGST calculations
      const itemTax = item.tax_amount !== undefined ? parseFloat(item.tax_amount) : amount * (gstRate / 100);
      const cgst = item.cgst_amount !== undefined ? parseFloat(item.cgst_amount) : (itemTax / 2);
      const sgst = item.sgst_amount !== undefined ? parseFloat(item.sgst_amount) : (itemTax / 2);

      // Total = Amount + CGST + SGST
      const itemTotal = amount + cgst + sgst;

      totalItemsSold += qty;
      totalTaxableAmount += amount;
      totalCgst += cgst;
      totalSgst += sgst;
      grandTotalSales += itemTotal;

      const productName = item.product_name || item.name || 'Clothing Item';
      const qtyStr = Number.isInteger(qty) ? qty.toString() : qty.toFixed(2).replace(/\.?0+$/, '');

      tableRows.push([
        `${snoCounter}`,
        qtyStr,
        productName,
        `Rs. ${amount.toFixed(2)}`,
        `Rs. ${cgst.toFixed(2)}`,
        `Rs. ${sgst.toFixed(2)}`,
        `Rs. ${itemTotal.toFixed(2)}`
      ]);

      snoCounter++;
    });
  });

  // Render Table via autoTable
  doc.autoTable({
    startY: 47,
    head: [['S.No.', 'Quantity', 'Product', 'Amount', 'CGST', 'SGST', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      lineWidth: 0.3,
      lineColor: [203, 213, 225]
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 8.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'left' }, // Product is widest
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', cellWidth: 28 }
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: 2.5
    }
  });

  let finalY = doc.lastAutoTable.finalY + 8;

  // Check page overflow for Summary Box
  if (finalY + 45 > 280) {
    doc.addPage();
    finalY = 20;
  }

  // 3. Summary Box at Bottom
  const totalGst = totalCgst + totalSgst;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY TOTALS', 125, finalY);

  doc.setLineWidth(0.4);
  doc.rect(123, finalY + 2, 73, 38);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');

  doc.text('Total Items Sold:', 125, finalY + 7);
  doc.text(`${totalItemsSold.toFixed(Number.isInteger(totalItemsSold) ? 0 : 2)}`, 194, finalY + 7, { align: 'right' });

  doc.text('Total Taxable Amount:', 125, finalY + 13);
  doc.text(`Rs. ${totalTaxableAmount.toFixed(2)}`, 194, finalY + 13, { align: 'right' });

  doc.text('Total CGST:', 125, finalY + 19);
  doc.text(`Rs. ${totalCgst.toFixed(2)}`, 194, finalY + 19, { align: 'right' });

  doc.text('Total SGST:', 125, finalY + 25);
  doc.text(`Rs. ${totalSgst.toFixed(2)}`, 194, finalY + 25, { align: 'right' });

  doc.text('Total GST:', 125, finalY + 31);
  doc.text(`Rs. ${totalGst.toFixed(2)}`, 194, finalY + 31, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('GRAND TOTAL SALES:', 125, finalY + 37);
  doc.text(`Rs. ${grandTotalSales.toFixed(2)}`, 194, finalY + 37, { align: 'right' });

  // 4. Terms / Footer
  const footerY = Math.max(finalY + 46, 275);
  doc.setLineWidth(0.3);
  doc.line(14, footerY, 196, footerY);

  const currentDate = new Date().toLocaleDateString('en-IN');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${currentDate}`, 14, footerY + 5);
  doc.text('This is a computer-generated sales report.', 14, footerY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('For Jagdamba Cloth House', 196, footerY + 5, { align: 'right' });

  return doc;
}
