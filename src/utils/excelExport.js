import ExcelJS from 'exceljs';

/**
 * Generate CA-Friendly Excel workbook (.xlsx) with EXACTLY 7 columns in ascending invoice order
 * 
 * Columns:
 * 1. S.No.
 * 2. Quantity
 * 3. Product
 * 4. Amount (Taxable item amount before GST)
 * 5. CGST
 * 6. SGST
 * 7. Total (Amount + CGST + SGST)
 * 
 * @param {Array} filteredSales - List of sales matching date range filter
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 */
export async function exportSalesToExcel(filteredSales, fromDate, toDate) {
  if (!filteredSales || filteredSales.length === 0) {
    throw new Error('No sales found for the selected date range.');
  }

  // Sort sales in ascending order by invoice number / ID (JCH-00001, JCH-00002, ...)
  const sortedSales = [...filteredSales].sort((a, b) => {
    if (a.id && b.id) return a.id - b.id;
    return (a.invoice_no || '').localeCompare(b.invoice_no || '', undefined, { numeric: true });
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Jagdamba Cloth House ERP';
  workbook.lastModifiedBy = 'Jagdamba Cloth House ERP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Sales Report', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  // EXACT 7 COLUMNS ONLY
  sheet.columns = [
    { header: 'S.No.', key: 'sno', width: 10 },
    { header: 'Quantity', key: 'quantity', width: 14 },
    { header: 'Product', key: 'product', width: 32 },
    { header: 'Amount', key: 'amount', width: 18 },
    { header: 'CGST', key: 'cgst', width: 16 },
    { header: 'SGST', key: 'sgst', width: 16 },
    { header: 'Total', key: 'total', width: 18 }
  ];

  // Header Row Styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10.5 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E293B' } // Dark Slate
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 26;

  sheet.autoFilter = { from: 'A1', to: 'G1' };

  let snoCounter = 1;

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

      // Item GST calculations
      const itemTax = item.tax_amount !== undefined ? parseFloat(item.tax_amount) : amount * (gstRate / 100);
      const cgst = item.cgst_amount !== undefined ? parseFloat(item.cgst_amount) : (itemTax / 2);
      const sgst = item.sgst_amount !== undefined ? parseFloat(item.sgst_amount) : (itemTax / 2);

      // Total = Amount + CGST + SGST
      const itemTotal = amount + cgst + sgst;

      const productName = item.product_name || item.name || 'Clothing Item';

      const row = sheet.addRow({
        sno: snoCounter,
        quantity: qty,
        product: productName,
        amount: amount,
        cgst: cgst,
        sgst: sgst,
        total: itemTotal
      });

      // Cell Alignment & Number Formatting
      row.getCell('sno').alignment = { horizontal: 'center' };
      row.getCell('quantity').alignment = { horizontal: 'center' };
      row.getCell('quantity').numFmt = Number.isInteger(qty) ? '#,##0' : '#,##0.00';
      
      row.getCell('product').alignment = { horizontal: 'left' };
      
      row.getCell('amount').alignment = { horizontal: 'right' };
      row.getCell('amount').numFmt = '₹#,##0.00';

      row.getCell('cgst').alignment = { horizontal: 'right' };
      row.getCell('cgst').numFmt = '₹#,##0.00';

      row.getCell('sgst').alignment = { horizontal: 'right' };
      row.getCell('sgst').numFmt = '₹#,##0.00';

      row.getCell('total').alignment = { horizontal: 'right' };
      row.getCell('total').numFmt = '₹#,##0.00';

      // Cell Borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        };
      });

      snoCounter++;
    });
  });

  // Write & Trigger Offline Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const fromStr = fromDate ? fromDate.split('-').reverse().join('-') : 'Start';
  const toStr = toDate ? toDate.split('-').reverse().join('-') : 'End';
  a.download = `Jagdamba_Sales_${fromStr}_to_${toStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
