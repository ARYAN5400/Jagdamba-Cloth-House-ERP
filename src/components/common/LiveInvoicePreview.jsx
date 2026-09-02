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
    <div className="bg-slate-100/70 rounded-xl p-3 border border-slate-300 flex flex-col h-full overflow-hidden font-sans select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-slate-700" />
          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
            POS Invoice Preview
          </h4>
        </div>

        <div className="flex items-center gap-2">
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
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="bg-white text-slate-900 p-5 rounded-sm border border-slate-300 max-w-[800px] mx-auto text-xs font-sans leading-relaxed">
          
          {/* 1. Header Section */}
          <div className="border border-slate-300 p-3.5 mb-3">
            <div className="flex justify-between items-start">
              {/* Shop Details Left */}
              <div>
                <div className="text-[10px] font-bold tracking-widest text-slate-600 uppercase mb-0.5">
                  RETAIL TAX INVOICE
                </div>
                <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tight leading-tight">
                  {shopName}
                </h1>
                <p className="text-slate-700 text-[11px] font-medium mt-0.5">{shopAddress}</p>
                <div className="text-[11px] text-slate-700 mt-1 space-x-2">
                  <span><strong>GSTIN:</strong> {gstin}</span>
                  <span className="text-slate-400">|</span>
                  <span><strong>Mob.:</strong> {phone}</span>
                </div>
              </div>

              {/* Invoice Meta Right */}
              <div className="text-right border-l border-slate-300 pl-4">
                <table className="text-[11px] text-left border-collapse">
                  <tbody>
                    <tr>
                      <td className="pr-3 text-slate-600 font-medium py-0.5">Invoice No.:</td>
                      <td className="font-bold text-slate-900 py-0.5">{invoiceNo}</td>
                    </tr>
                    <tr>
                      <td className="pr-3 text-slate-600 font-medium py-0.5">Date:</td>
                      <td className="font-semibold text-slate-900 py-0.5">{dateStr}</td>
                    </tr>
                    <tr>
                      <td className="pr-3 text-slate-600 font-medium py-0.5">Time:</td>
                      <td className="font-semibold text-slate-900 py-0.5">{timeStr}</td>
                    </tr>
                    <tr>
                      <td className="pr-3 text-slate-600 font-medium py-0.5">State Code:</td>
                      <td className="font-semibold text-slate-900 py-0.5">{stateCode}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 2. Customer Information Grid (BILLED TO) */}
          <div className="border border-slate-300 p-3 mb-3 bg-slate-50/50">
            <div className="text-[10px] font-bold uppercase text-slate-600 tracking-wider mb-1.5 pb-1 border-b border-slate-200">
              Billed To (Customer Details)
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <div className="flex">
                <span className="text-slate-600 w-28 flex-shrink-0">Customer Name:</span>
                <span className="font-bold text-slate-900">{customerNameStr}</span>
              </div>
              <div className="flex">
                <span className="text-slate-600 w-28 flex-shrink-0">Payment Mode:</span>
                <span className="font-bold text-slate-900 uppercase">{sale?.payment_mode || 'Cash'}</span>
              </div>
              <div className="flex">
                <span className="text-slate-600 w-28 flex-shrink-0">Mobile Number:</span>
                <span className="font-bold text-slate-900">{customerPhoneStr || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="text-slate-600 w-28 flex-shrink-0">Customer GSTIN:</span>
                <span className="font-bold text-slate-900">{customerGstinStr}</span>
              </div>
            </div>
          </div>

          {/* 3. Items Table / Empty Cart State */}
          {items.length === 0 ? (
            <div className="border border-slate-300 py-5 px-4 text-center bg-slate-50/40 mb-3 rounded-sm">
              <div className="flex items-center justify-center gap-2 text-slate-700 mb-1">
                <ShoppingBag className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-xs text-slate-800">POS Cart is Empty</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Add items to POS cart to preview invoice details.
              </p>
            </div>
          ) : (
            <div className="border border-slate-300 mb-3 overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold text-[10px] uppercase tracking-wide border-b border-slate-300">
                    <th className="py-2 px-2.5 w-12 text-center border-r border-slate-300 font-bold text-slate-900">S.NO.</th>
                    <th className="py-2 px-2.5 w-14 text-center border-r border-slate-300 font-bold text-slate-900">QTY</th>
                    <th className="py-2 px-3 text-left border-r border-slate-300 font-bold text-slate-900">PARTICULARS / ITEM DESCRIPTION</th>
                    <th className="py-2 px-3 w-24 text-right border-r border-slate-300 font-bold text-slate-900">RATE (Rs.)</th>
                    <th className="py-2 px-3 w-28 text-right font-bold text-slate-900">AMOUNT (Rs.)</th>
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
                        className={isDraftTyping ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50/60'}
                      >
                        <td className="py-2 px-2.5 text-center text-slate-600 border-r border-slate-200">{idx + 1}</td>
                        <td className="py-2 px-2.5 text-center font-medium text-slate-900 border-r border-slate-200">{qtyDisplay}</td>
                        <td className="py-2 px-3 text-slate-900 border-r border-slate-200">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{particulars}</span>
                            {item.design_no && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                (Des: #{item.design_no})
                              </span>
                            )}
                            {isDraftTyping && (
                              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                                (Typing...)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-800 border-r border-slate-200 font-mono">
                          ₹{rate.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900 font-mono">
                          ₹{itemSub.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Totals & Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {/* Left Side: Amount in Words & Payment status */}
            <div className="space-y-2">
              <div className="border border-slate-300 p-2.5 bg-slate-50/30">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Amount in Words</span>
                <p className="font-semibold italic text-slate-900 text-[11px] leading-snug">
                  {wordsStr}
                </p>
              </div>

              <div className="border border-slate-300 p-2.5 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Paid Amount:</span>
                  <span className="font-bold text-slate-900 font-mono">₹{paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-600">Balance Due:</span>
                  <span className="font-bold text-slate-900 font-mono">₹{balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Right Side: Clean Right-Aligned Totals Block */}
            <div className="border border-slate-300 text-[11px]">
              <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-900 font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                <span className="text-slate-600">Discount</span>
                <span className="font-semibold text-slate-900 font-mono">-₹{totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                <span className="text-slate-600">CGST @ {cgstRateStr}</span>
                <span className="font-semibold text-slate-900 font-mono">₹{cgstVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 border-b border-slate-200">
                <span className="text-slate-600">SGST @ {sgstRateStr}</span>
                <span className="font-semibold text-slate-900 font-mono">₹{sgstVal.toFixed(2)}</span>
              </div>
              {/* Subtle Clean Highlighted GRAND TOTAL */}
              <div className="flex justify-between px-3 py-2 bg-slate-100 border-t-2 border-slate-900 font-bold text-slate-900 text-xs">
                <span>GRAND TOTAL</span>
                <span className="font-mono text-xs">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 5. Terms & Conditions and Signature Section */}
          <div className="border border-slate-300 p-3 grid grid-cols-2 gap-4 text-[10px]">
            <div>
              <span className="font-bold text-slate-900 uppercase block mb-1">Terms & Conditions</span>
              <ul className="text-slate-600 space-y-0.5 list-disc list-inside">
                <li>Goods once sold will not be taken back.</li>
                <li>2% p.m. interest will be charged after 15 days.</li>
                <li>Fixed price, no exchange, no return.</li>
              </ul>
            </div>

            <div className="text-center flex flex-col justify-between items-center pl-3 border-l border-slate-300">
              <span className="font-bold text-slate-900 text-[10px]">For Jagdamba Cloth House</span>
              {signaturePng ? (
                <img src={signaturePng} alt="Authorized Signature" className="h-8 object-contain my-0.5" />
              ) : (
                <div className="h-8"></div>
              )}
              <span className="border-t border-slate-400 w-3/4 pt-0.5 font-semibold text-slate-700">
                Authorized Signatory
              </span>
            </div>
          </div>

          {/* Thank You Note */}
          <div className="text-center mt-2.5 text-slate-600 text-[10px] font-medium">
            Thank you for shopping with Jagdamba Cloth House!
          </div>
        </div>
      </div>
    </div>
  );
}

