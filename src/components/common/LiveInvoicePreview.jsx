import React from 'react';
import { getSignaturePngDataUrl } from '../../utils/signatureHelper';
import { numberToWords } from '../../utils/numberToWords';
import { Eye, Printer, FileText, ShoppingBag } from 'lucide-react';

export function LiveInvoicePreview({ sale, shopSettings, typingItem, onPrint, onDownloadPDF }) {
  const shopName = 'JAGDAMBA CLOTH HOUSE';
  const shopAddress = 'Main Bazar, GHANOUR';
  const phone = '7876413356';
  const gstin = '03BMLPK3243D1ZH';
  const stateCode = '140702';
  const signaturePng = getSignaturePngDataUrl(shopSettings);

  let items = [...(sale?.items || [])];

  // Include active typing item into real-time layout preview
  const isTypingActive = typingItem && (typingItem.name.trim() !== '' || parseFloat(typingItem.unit_price) > 0);
  if (isTypingActive) {
    const qty = parseFloat(typingItem.quantity || 1);
    const rate = parseFloat(typingItem.unit_price || 0);
    const gstRate = parseFloat(typingItem.gst_rate || 0);
    const itemDiscount = parseFloat(typingItem.discount || 0);

    const sub = Math.round(qty * rate * 100) / 100;
    const tax = Math.round(sub * (gstRate / 100) * 100) / 100;
    const itemTotal = Math.max(0, Math.round((sub + tax - itemDiscount) * 100) / 100);

    items.push({
      name: typingItem.name.trim() || 'Item Entry Details...',
      design_no: typingItem.design_no,
      quantity: qty,
      unit_type: typingItem.unit_type || 'piece',
      unit_price: rate,
      gst_rate: gstRate,
      tax_amount: tax,
      discount: itemDiscount,
      total_amount: itemTotal,
      isTyping: true
    });
  }

  const customerNameStr = sale?.customer_name || 'Walk-in Customer';
  const customerPhoneStr = sale?.customer_phone || sale?.phone || '';
  const isWalkIn = customerNameStr === 'Walk-in Customer' || customerNameStr === 'Cash';
  const customerGstinStr = sale?.customer_gstin || (isWalkIn ? 'CASH' : 'CASH');

  // Calculations matching POS billing zero-rounding logic
  const rawSubtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0)), 0);
  const subtotal = Math.round(rawSubtotal * 100) / 100;
  
  const taxAmount = Math.round(items.reduce((sum, item) => sum + (parseFloat(item.tax_amount || 0)), 0) * 100) / 100;
  const itemDiscounts = Math.round(items.reduce((sum, item) => sum + (parseFloat(item.discount || 0)), 0) * 100) / 100;
  const billDiscount = parseFloat(sale?.discount || 0);
  const totalDiscount = billDiscount + itemDiscounts;

  const grandTotal = sale?.net_amount !== undefined 
    ? parseFloat(sale.net_amount) 
    : Math.max(0, Math.round((subtotal + taxAmount - totalDiscount) * 100) / 100);

  const paidAmount = sale?.paid_amount !== undefined && sale?.paid_amount !== '' 
    ? parseFloat(sale.paid_amount) 
    : (sale?.payment_mode === 'Credit' ? 0 : grandTotal);

  const balanceDue = Math.max(0, Math.round((grandTotal - paidAmount) * 100) / 100);

  const isFivePercentGst = taxAmount > 0;
  const cgstRateStr = isFivePercentGst ? '2.5%' : '0%';
  const sgstRateStr = isFivePercentGst ? '2.5%' : '0%';
  const cgstVal = isFivePercentGst ? (taxAmount / 2) : 0;
  const sgstVal = isFivePercentGst ? (taxAmount / 2) : 0;

  const invoiceNo = sale?.invoice_no || 'DRAFT-INVOICE';
  const dateStr = sale?.sale_date || new Date().toLocaleDateString('en-IN');
  const timeStr = sale?.sale_time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const wordsStr = numberToWords(grandTotal);

  return (
    <div className="bg-slate-100/70 rounded-xl p-2.5 sm:p-3 border border-slate-300 flex flex-col h-full overflow-hidden font-sans select-none w-full max-w-full">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Eye className="w-4 h-4 text-slate-700 flex-shrink-0" />
          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider truncate">
            POS Invoice Preview
          </h4>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {onPrint && (
            <button
              onClick={onPrint}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
              title="Print Current Draft Invoice"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          )}
          {onDownloadPDF && (
            <button
              onClick={onDownloadPDF}
              className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 rounded transition-colors border border-slate-300 flex items-center gap-1 cursor-pointer active:scale-95"
              title="Download PDF Draft"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
          )}
        </div>
      </div>

      {/* Printable Invoice Sheet Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-0.5 w-full">
        <div className="bg-white text-slate-900 p-3 sm:p-5 rounded-sm border border-slate-300 w-full max-w-[800px] mx-auto text-xs font-sans leading-relaxed">
          
          {/* 1. Header Section */}
          <div className="border border-slate-300 p-2.5 sm:p-3.5 mb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2.5">
              {/* Shop Details Left */}
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] font-bold tracking-widest text-slate-600 uppercase mb-0.5">
                  RETAIL TAX INVOICE
                </div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight leading-tight">
                  {shopName}
                </h1>
                <p className="text-slate-700 text-[10px] sm:text-[11px] font-medium mt-0.5">{shopAddress}</p>
                <div className="text-[10px] sm:text-[11px] text-slate-700 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span><strong>GSTIN:</strong> {gstin}</span>
                  <span className="text-slate-400 hidden sm:inline">|</span>
                  <span><strong>Mob.:</strong> {phone}</span>
                </div>
              </div>

              {/* Invoice Meta Right */}
              <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-300 pt-2 sm:pt-0 sm:pl-4 w-full sm:w-auto">
                <table className="text-[10px] sm:text-[11px] text-left border-collapse w-full sm:w-auto">
                  <tbody>
                    <tr>
                      <td className="pr-3 text-slate-600 font-medium py-0.5">Invoice No.:</td>
                      <td className="font-bold text-slate-900 py-0.5 text-right sm:text-left">{invoiceNo}</td>
                    </tr>
                    <tr>
                      <td className="pr-3 text-slate-600 font-medium py-0.5">Date:</td>
                      <td className="font-semibold text-slate-900 py-0.5 text-right sm:text-left">{dateStr}</td>
                    </tr>
                    <tr>
                      <td className="pr-3 text-slate-600 font-medium py-0.5">Time:</td>
                      <td className="font-semibold text-slate-900 py-0.5 text-right sm:text-left">{timeStr}</td>
                    </tr>
                    <tr>
                      <td className="pr-3 text-slate-600 font-medium py-0.5">State Code:</td>
                      <td className="font-semibold text-slate-900 py-0.5 text-right sm:text-left">{stateCode}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 2. Customer Information Grid (BILLED TO) */}
          <div className="border border-slate-300 p-2.5 sm:p-3 mb-3 bg-slate-50/50">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-600 tracking-wider mb-1.5 pb-1 border-b border-slate-200">
              Billed To (Customer Details)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10px] sm:text-[11px]">
              <div className="flex">
                <span className="text-slate-600 w-24 sm:w-28 flex-shrink-0">Customer Name:</span>
                <span className="font-bold text-slate-900 truncate">{customerNameStr}</span>
              </div>
              <div className="flex">
                <span className="text-slate-600 w-24 sm:w-28 flex-shrink-0">Payment Mode:</span>
                <span className="font-bold text-slate-900 uppercase">{sale?.payment_mode || 'Cash'}</span>
              </div>
              <div className="flex">
                <span className="text-slate-600 w-24 sm:w-28 flex-shrink-0">Mobile Number:</span>
                <span className="font-bold text-slate-900">{customerPhoneStr || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="text-slate-600 w-24 sm:w-28 flex-shrink-0">Customer GSTIN:</span>
                <span className="font-bold text-slate-900">{customerGstinStr}</span>
              </div>
            </div>
          </div>

          {/* 3. Items Table / Empty Cart State */}
          {items.length === 0 ? (
            <div className="border border-slate-300 py-4 px-3 text-center bg-slate-50/40 mb-3 rounded-sm">
              <div className="flex items-center justify-center gap-2 text-slate-700 mb-1">
                <ShoppingBag className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-xs text-slate-800">POS Cart is Empty</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Add items to POS cart to preview invoice details.
              </p>
            </div>
          ) : (
            <div className="border border-slate-300 mb-3 overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-[10px] sm:text-[11px] min-w-[380px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold text-[9px] sm:text-[10px] uppercase tracking-wide border-b border-slate-300">
                    <th className="py-1.5 px-2 w-10 text-center border-r border-slate-300 font-bold text-slate-900">S.NO.</th>
                    <th className="py-1.5 px-2 w-12 text-center border-r border-slate-300 font-bold text-slate-900">QTY</th>
                    <th className="py-1.5 px-2 text-left border-r border-slate-300 font-bold text-slate-900">ITEM DESCRIPTION</th>
                    <th className="py-1.5 px-2 w-20 text-right border-r border-slate-300 font-bold text-slate-900">RATE</th>
                    <th className="py-1.5 px-2 w-20 text-right font-bold text-slate-900">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, idx) => {
                    const qty = parseFloat(item.quantity || 1);
                    const rate = parseFloat(item.unit_price || 0);
                    const itemSub = Math.round(qty * rate * 100) / 100;
                    const particulars = item.name || item.product_name || 'Clothing Item';
                    const isDraftTyping = item.isTyping;
                    const unitType = item.unit_type ? item.unit_type.toUpperCase() : 'PCS';
                    const qtyDisplay = Number.isInteger(qty) ? `${qty} ${unitType}` : `${qty.toFixed(2)} ${unitType}`;

                    return (
                      <tr 
                        key={idx} 
                        className={`hover:bg-slate-50/50 transition-colors ${isDraftTyping ? 'bg-amber-50/60 font-semibold italic text-slate-700' : ''}`}
                      >
                        <td className="py-1.5 px-2 text-center border-r border-slate-200 text-slate-600 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2 text-center border-r border-slate-200 font-bold text-slate-900">
                          {qtyDisplay}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 font-medium text-slate-900">
                          <div>
                            {particulars}
                            {item.design_no && (
                              <span className="text-[10px] text-slate-500 font-normal ml-1">
                                (#{item.design_no})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-slate-200 font-mono text-slate-700">
                          ₹{rate.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                          ₹{itemSub.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Bottom Grid: Totals & Paid Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-3">
            <div className="flex flex-col gap-2">
              {/* Amount in Words */}
              <div className="border border-slate-300 p-2.5 bg-slate-50/30">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-600 tracking-wider block mb-0.5">
                  Amount in Words
                </span>
                <p className="font-semibold text-slate-900 text-[10px] sm:text-[11px] italic leading-tight">
                  {wordsStr}
                </p>
              </div>

              {/* Paid / Due Balance */}
              <div className="border border-slate-300 p-2.5">
                <div className="flex justify-between items-center text-[10px] sm:text-[11px] mb-1">
                  <span className="text-slate-600">Paid Amount:</span>
                  <span className="font-bold text-slate-900 font-mono">₹{paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] sm:text-[11px] border-t border-slate-200 pt-1">
                  <span className="text-slate-600">Balance Due:</span>
                  <span className="font-bold text-slate-900 font-mono">₹{balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Calculations & GST breakdown */}
            <div className="border border-slate-300 overflow-hidden">
              <div className="divide-y divide-slate-200 text-[10px] sm:text-[11px]">
                <div className="flex justify-between py-1.5 px-2.5">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-mono text-slate-800">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5">
                  <span className="text-slate-600">Discount:</span>
                  <span className="font-mono text-slate-800">-₹{totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5">
                  <span className="text-slate-600">CGST @ {cgstRateStr}:</span>
                  <span className="font-mono text-slate-800">₹{cgstVal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 px-2.5">
                  <span className="text-slate-600">SGST @ {sgstRateStr}:</span>
                  <span className="font-mono text-slate-800">₹{sgstVal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 px-2.5 bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-900">
                  <span className="uppercase text-[10px] sm:text-xs">Grand Total:</span>
                  <span className="font-mono text-xs sm:text-sm">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Terms & Conditions and Signature Section */}
          <div className="border border-slate-300 p-2.5 sm:p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[9px] sm:text-[10px]">
            <div>
              <strong className="text-slate-900 uppercase tracking-wide block mb-1">Terms & Conditions</strong>
              <ul className="list-decimal pl-3 space-y-0.5 text-slate-600 leading-tight">
                <li>Goods once sold will not be taken back.</li>
                <li>2% p.m. interest will be charged after 15 days.</li>
                <li>Fixed price, no exchange, no return.</li>
              </ul>
            </div>

            <div className="flex flex-col justify-between items-center sm:items-end border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3 text-center sm:text-right">
              <span className="font-bold text-slate-900">For Jagdamba Cloth House</span>
              {signaturePng ? (
                <img src={signaturePng} alt="Signature" className="max-h-7 sm:max-h-9 object-contain my-1" />
              ) : (
                <div className="h-6 sm:h-8"></div>
              )}
              <span className="text-slate-500 font-medium border-t border-slate-300 pt-0.5 w-32 text-center text-[9px] sm:text-[10px]">Authorized Signatory</span>
            </div>
          </div>

          {/* 6. Footer Thank You Note */}
          <div className="text-center mt-2.5 text-slate-500 text-[9px] sm:text-[10px] font-medium">
            Thank you for shopping with Jagdamba Cloth House!
          </div>

        </div>
      </div>
    </div>
  );
}
