/**
 * Generate Word Documents (.doc) for Jagdamba Cloth House ERP
 * Compatible with Microsoft Word, WPS Office, and LibreOffice Writer (100% Offline)
 */

import { getSignaturePngDataUrl } from './signatureHelper';
import { numberToWords } from './numberToWords';

/**
 * Generate an Individual Invoice Word document (.doc) matching Jagdamba Cloth House physical bill
 * 
 * @param {Object} sale - Complete sale record from SQLite database
 * @param {Object} shopSettings - Shop metadata
 */
export function generateSingleInvoiceWordDocument(sale, shopSettings) {
  if (!sale || !sale.invoice_no) {
    throw new Error('Invoice not found.');
  }

  const shopName = 'JAGDAMBA CLOTH HOUSE';
  const shopAddress = 'Main Bazar, GHANOUR';
  const phone = '7876413356';
  const gstin = '03BMLPK3243D1ZH';
  const stateCode = '140702';

  const isWalkIn = !sale.customer_name || sale.customer_name === 'Walk-in Customer' || sale.customer_name === 'Cash';
  const custName = sale.customer_name || 'Walk-in Customer';
  const custGstin = sale.customer_gstin || (isWalkIn ? 'CASH' : 'CASH');

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

  const signatureImg = getSignaturePngDataUrl(shopSettings);

  let sno = 1;
  const itemsHtml = items.map((item) => {
    const qty = parseFloat(item.quantity || 1);
    const rate = parseFloat(item.unit_price || 0);
    const itemSub = Math.round(qty * rate * 100) / 100;

    const particulars = item.product_name || item.name || 'Clothing Item';

    const qtyStr = Number.isInteger(qty) ? qty.toString() : qty.toFixed(2).replace(/\.?0+$/, '');

    return `
      <tr>
        <td style="text-align: center; padding: 6px; border: 1px solid #000;">${sno++}</td>
        <td style="text-align: center; padding: 6px; border: 1px solid #000;">${qtyStr}</td>
        <td style="text-align: left; padding: 6px; border: 1px solid #000; font-weight: bold;">${particulars}</td>
        <td style="text-align: right; padding: 6px; border: 1px solid #000;">${rate.toFixed(2)}</td>
        <td style="text-align: right; padding: 6px; border: 1px solid #000; font-weight: bold;">${itemSub.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const wordsStr = numberToWords(grandTotal);

  const htmlDocument = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Invoice - ${sale.invoice_no}</title>
        <style>
          body { font-family: 'Segoe UI', 'Arial', sans-serif; color: #0f172a; margin: 15px; font-size: 10pt; line-height: 1.4; }
          .invoice-card { border: 1px solid #cbd5e1; padding: 16px; border-radius: 6px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
          .tax-badge { background-color: #0f172a; color: #ffffff; padding: 2px 8px; font-weight: bold; font-size: 8pt; text-transform: uppercase; border-radius: 3px; display: inline-block; margin-bottom: 4px; }
          .shop-title { font-size: 18pt; font-weight: bold; text-transform: uppercase; color: #0f172a; margin: 2px 0; }
          .shop-sub { color: #475569; font-size: 9.5pt; font-weight: 500; }
          .meta-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 12px; font-size: 9.5pt; border: 1px solid #e2e8f0; background-color: #f8fafc; }
          .meta-table td { padding: 6px 10px; }
          .meta-title-bar { background-color: #f1f5f9; font-weight: bold; font-size: 8.5pt; text-transform: uppercase; color: #334155; padding: 4px 10px; border-bottom: 1px solid #e2e8f0; }
          .bill-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5pt; border: 1px solid #cbd5e1; }
          .bill-table th { background-color: #0f172a; color: #ffffff; padding: 6px 10px; font-weight: bold; text-align: left; }
          .bill-table td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
          .totals-table { width: 260px; margin-left: auto; border-collapse: collapse; font-size: 9.5pt; border: 1px solid #cbd5e1; margin-bottom: 12px; }
          .totals-table td { padding: 5px 10px; border-bottom: 1px solid #e2e8f0; }
          .gtotal-box { background-color: #0f172a; color: #ffffff; font-size: 10.5pt; font-weight: bold; }
          .payment-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; border: 1px solid #e2e8f0; background-color: #f8fafc; margin-bottom: 12px; }
          .payment-table td { padding: 6px 10px; }
          .words-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; border: 1px solid #e2e8f0; background-color: #f8fafc; margin-bottom: 12px; }
          .words-table td { padding: 6px 10px; }
          .footer-terms { border: 1px solid #e2e8f0; padding: 10px; font-size: 9pt; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <table class="header-table">
            <tr>
              <td style="vertical-align: top;">
                <span class="tax-badge">TAX INVOICE</span>
                <div class="shop-title">${shopName}</div>
                <div class="shop-sub">${shopAddress}</div>
                <div class="shop-sub" style="margin-top: 2px;"><strong>GSTIN:</strong> ${gstin} &bull; <strong>Mob:</strong> ${phone}</div>
              </td>
              <td style="text-align: right; vertical-align: top; width: 200px;">
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; background-color: #f8fafc; font-size: 9pt;">
                  <tr><td style="padding: 3px 8px; color: #64748b;">Invoice No:</td><td style="padding: 3px 8px; font-weight: bold; text-align: right;">${sale.invoice_no}</td></tr>
                  <tr><td style="padding: 3px 8px; color: #64748b;">Date:</td><td style="padding: 3px 8px; font-weight: bold; text-align: right;">${sale.sale_date || new Date().toLocaleDateString('en-IN')}</td></tr>
                  <tr><td style="padding: 3px 8px; color: #64748b;">Time:</td><td style="padding: 3px 8px; text-align: right;">${sale.sale_time || '03:15 PM'}</td></tr>
                  <tr><td style="padding: 3px 8px; color: #64748b;">State Code:</td><td style="padding: 3px 8px; text-align: right;">${stateCode}</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <div class="meta-title-bar">Billed To (Customer Details)</div>
          <table class="meta-table">
            <tr>
              <td style="width: 50%; border-right: 1px solid #e2e8f0;">
                <span style="color: #64748b;">Customer Name:</span> <strong>${custName}</strong><br/>
                <span style="color: #64748b;">Customer GSTIN:</span> <strong>${custGstin}</strong>
              </td>
              <td style="width: 50%;">
                <span style="color: #64748b;">Payment Mode:</span> <strong style="text-transform: uppercase;">${sale.payment_mode || 'Cash'}</strong><br/>
                <span style="color: #64748b;">State Code:</span> <strong>${stateCode}</strong>
              </td>
            </tr>
          </table>

          <table class="bill-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">S.No.</th>
                <th style="width: 50px; text-align: center;">Qty</th>
                <th>Particulars / Item Description</th>
                <th style="width: 100px; text-align: right;">Rate (₹)</th>
                <th style="width: 110px; text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <table class="totals-table">
            <tr><td style="color: #64748b;">Subtotal:</td><td style="text-align: right; font-weight: bold;">₹${subtotal.toFixed(2)}</td></tr>
            <tr><td style="color: #64748b;">Discount:</td><td style="text-align: right; font-weight: bold; color: #059669;">-₹${discount.toFixed(2)}</td></tr>
            <tr><td style="color: #64748b;">CGST @ ${cgstRateStr}:</td><td style="text-align: right; font-weight: bold;">₹${cgstVal.toFixed(2)}</td></tr>
            <tr><td style="color: #64748b;">SGST @ ${sgstRateStr}:</td><td style="text-align: right; font-weight: bold;">₹${sgstVal.toFixed(2)}</td></tr>
            <tr class="gtotal-box"><td>GRAND TOTAL:</td><td style="text-align: right;">₹${grandTotal.toFixed(2)}</td></tr>
          </table>

          <table class="payment-table">
            <tr>
              <td><span style="color: #64748b;">Payment Mode:</span> <strong style="text-transform: uppercase;">${sale.payment_mode || 'Cash'}</strong></td>
              <td style="text-align: center;"><span style="color: #64748b;">Paid Amount:</span> <strong style="color: #047857;">₹${paidAmount.toFixed(2)}</strong></td>
              <td style="text-align: right;"><span style="color: #64748b;">Balance Due:</span> <strong>₹${balance.toFixed(2)}</strong></td>
            </tr>
          </table>

          <table class="words-table">
            <tr>
              <td><strong style="color: #64748b; font-size: 8.5pt; text-transform: uppercase;">Amount in Words:</strong><br/><em style="font-weight: bold; color: #0f172a;">${wordsStr}</em></td>
            </tr>
          </table>

          <div class="footer-terms">
            <table style="width: 100%;">
              <tr>
                <td style="vertical-align: top; width: 60%;">
                  <strong style="text-transform: uppercase; color: #0f172a; font-size: 8.5pt;">Terms & Conditions</strong><br/>
                  <div style="color: #475569; margin-top: 4px; line-height: 1.5;">
                    1. Goods once sold will not be taken back.<br/>
                    2. 2% p.m. interest will be charged after 15 days.<br/>
                    3. Fixed price, no exchange, no return.
                  </div>
                </td>
                <td style="text-align: center; vertical-align: bottom; width: 40%;">
                  <strong>For ${shopName}</strong><br/>
                  <div style="margin: 4px 0 2px 0;">
                    <img src="${signatureImg}" style="max-height: 40px; max-width: 140px;" alt="Authorized Signature" />
                  </div>
                  <strong style="font-size: 9pt; border-top: 1px solid #cbd5e1; padding-top: 2px; display: inline-block; color: #334155;">Authorized Signatory</strong>
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 12px; font-size: 9.5pt; color: #64748b; font-style: italic;">
            Thank you for shopping with Jagdamba Cloth House!
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlDocument], { type: 'application/msword' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sale.invoice_no}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Generate a Consolidated Date-Range Sales Report Word document (.doc)
 * 
 * @param {Array} filteredSales - List of sales matching user date and search filters
 * @param {string} fromDate - Filter start date (YYYY-MM-DD)
 * @param {string} toDate - Filter end date (YYYY-MM-DD)
 * @param {Object} shopSettings - Shop metadata
 */
export function exportSalesToWord(filteredSales, fromDate, toDate, shopSettings) {
  if (!filteredSales || filteredSales.length === 0) {
    throw new Error('No sales found for the selected date range.');
  }

  // Sort sales in ascending order by invoice number / ID (JCH-00001, JCH-00002, ...)
  const sortedSales = [...filteredSales].sort((a, b) => {
    if (a.id && b.id) return a.id - b.id;
    return (a.invoice_no || '').localeCompare(b.invoice_no || '', undefined, { numeric: true });
  });

  const shopName = 'Jagdamba Cloth House';
  const shopAddress = (shopSettings?.address && !shopSettings.address.includes('Main Market')) ? shopSettings.address : 'Main Bazar, GHANOUR';
  const phone = (shopSettings?.phone && !shopSettings.phone.includes('98765')) ? shopSettings.phone : '7876413356';
  const gstin = (shopSettings?.gstin && !shopSettings.gstin.includes('07A')) ? shopSettings.gstin : '03BMLPK3243D1ZH';

  const fromStr = fromDate ? fromDate.split('-').reverse().join('-') : 'Start';
  const toStr = toDate ? toDate.split('-').reverse().join('-') : 'End';
  const currentDate = new Date().toLocaleDateString('en-IN');

  let snoCounter = 1;
  let totalItemsSold = 0;
  let totalTaxableAmount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let grandTotalSales = 0;

  const rowsHtml = [];

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

      const amount = qty * rate;
      const itemTax = item.tax_amount !== undefined ? parseFloat(item.tax_amount) : amount * (gstRate / 100);
      const cgst = item.cgst_amount !== undefined ? parseFloat(item.cgst_amount) : (itemTax / 2);
      const sgst = item.sgst_amount !== undefined ? parseFloat(item.sgst_amount) : (itemTax / 2);
      const itemTotal = amount + cgst + sgst;

      totalItemsSold += qty;
      totalTaxableAmount += amount;
      totalCgst += cgst;
      totalSgst += sgst;
      grandTotalSales += itemTotal;

      const productName = item.product_name || item.name || 'Clothing Item';
      const qtyStr = Number.isInteger(qty) ? qty.toString() : qty.toFixed(2).replace(/\.?0+$/, '');

      rowsHtml.push(`
        <tr>
          <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${snoCounter}</td>
          <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${qtyStr}</td>
          <td style="text-align: left; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${productName}</td>
          <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">₹${amount.toFixed(2)}</td>
          <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">₹${cgst.toFixed(2)}</td>
          <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">₹${sgst.toFixed(2)}</td>
          <td style="text-align: right; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">₹${itemTotal.toFixed(2)}</td>
        </tr>
      `);

      snoCounter++;
    });
  });

  const totalGst = totalCgst + totalSgst;

  const htmlDocument = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Sales Report - ${shopName}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; color: #0f172a; margin: 20px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .shop-title { text-align: center; font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; }
          .shop-subtitle { text-align: center; font-size: 12px; color: #475569; margin: 2px 0 10px 0; }
          .report-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0 5px 0; }
          .date-range { text-align: center; font-size: 11px; color: #475569; margin-bottom: 15px; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          .data-table th { background-color: #1e293b; color: #ffffff; padding: 8px; font-weight: bold; border: 1px solid #1e293b; }
          .summary-box { width: 320px; margin-left: auto; border: 2px solid #0f172a; padding: 12px; font-size: 11px; margin-bottom: 30px; background-color: #f8fafc; }
          .summary-row { display: flex; justify-content: space-between; padding: 3px 0; }
          .summary-gtotal { font-size: 13px; font-weight: bold; border-top: 1px solid #0f172a; padding-top: 6px; margin-top: 4px; }
          .footer { border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 10px; color: #64748b; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="font-size: 11px; font-weight: bold;">GSTIN: ${gstin}</td>
            <td style="text-align: right; font-size: 11px; font-weight: bold;">Mobile: ${phone}</td>
          </tr>
        </table>

        <div class="shop-title">${shopName}</div>
        <div class="shop-subtitle">${shopAddress}</div>
        <hr style="border: none; border-top: 1px solid #0f172a;" />

        <div class="report-title">SALES REPORT</div>
        <div class="date-range">From: <strong>${fromStr}</strong> &nbsp;&nbsp;&nbsp; To: <strong>${toStr}</strong></div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">S.No.</th>
              <th style="width: 60px; text-align: center;">Quantity</th>
              <th>Product</th>
              <th style="width: 90px; text-align: right;">Amount</th>
              <th style="width: 75px; text-align: right;">CGST</th>
              <th style="width: 75px; text-align: right;">SGST</th>
              <th style="width: 90px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.join('')}
          </tbody>
        </table>

        <div class="summary-box">
          <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">SUMMARY TOTALS</div>
          <table style="width: 100%; font-size: 11px;">
            <tr><td>Total Items Sold:</td><td style="text-align: right; font-weight: bold;">${totalItemsSold.toFixed(Number.isInteger(totalItemsSold) ? 0 : 2)}</td></tr>
            <tr><td>Total Taxable Amount:</td><td style="text-align: right; font-weight: bold;">₹${totalTaxableAmount.toFixed(2)}</td></tr>
            <tr><td>Total CGST:</td><td style="text-align: right; font-weight: bold;">₹${totalCgst.toFixed(2)}</td></tr>
            <tr><td>Total SGST:</td><td style="text-align: right; font-weight: bold;">₹${totalSgst.toFixed(2)}</td></tr>
            <tr><td>Total GST:</td><td style="text-align: right; font-weight: bold;">₹${totalGst.toFixed(2)}</td></tr>
            <tr style="font-weight: bold; font-size: 12px; border-top: 1px solid #0f172a;">
              <td style="padding-top: 6px;">GRAND TOTAL SALES:</td>
              <td style="text-align: right; padding-top: 6px; color: #0284c7;">₹${grandTotalSales.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <table style="width: 100%;">
            <tr>
              <td>Generated on: ${currentDate}<br/>This is a computer-generated sales report.</td>
              <td style="text-align: right; font-weight: bold; font-size: 11px;">For ${shopName}</td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlDocument], { type: 'application/msword' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Jagdamba_Sales_${fromStr}_to_${toStr}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
