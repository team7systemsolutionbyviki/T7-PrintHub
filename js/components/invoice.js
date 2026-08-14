/* ==========================================================================
   T7PRINTHUB - PRINTING INVOICE COMPONENT
   ========================================================================== */

import { formatCurrency, formatDate } from '../utils/formatters.js';

export const InvoiceComponent = {

  // Helper normalizer to compute/read precise printing specification breakdown
  getInvoiceDetails(order, shopSettings = {}) {
    const opts = order.options || {};
    const pricing = order.pricing || {};
    const files = Array.isArray(order.files) ? order.files : [];
    const saved = order.printing || {};

    // IMPORTANT:
    // The Admin Order Pipeline uses each file's saved options. Historical
    // orders can have a stale/incomplete `printing` object, so do not let
    // that object override a clear per-file colorMode.
    const normalizedMode = (value) => {
      const v = String(value || '').trim().toLowerCase();
      if (v === 'color' || v === 'full color' || v === 'colour' || v === 'full colour') return 'Color';
      if (v === 'custom split' || v === 'split' || v === 'mixed' || v === 'mixed color + b&w') return 'Custom Split';
      if (v === 'black & white' || v === 'black and white' || v === 'b&w' || v === 'bw' || v === 'blackwhite') return 'Black & White';
      return '';
    };

    const paperSize =
      saved.paperSize ||
      opts.paperSize ||
      files[0]?.options?.paperSize ||
      'A4';

    let gsm =
      saved.gsm ||
      opts.paperQuality ||
      files[0]?.options?.paperQuality ||
      '70 GSM';

    if (!String(gsm).toUpperCase().includes('GSM') &&
        !String(gsm).toUpperCase().includes('GLOSSY') &&
        !String(gsm).toUpperCase().includes('MATT')) {
      gsm = `${gsm} GSM`;
    }

    const rawSides =
      saved.sides ||
      opts.printSide ||
      files[0]?.options?.printSide ||
      'Single';

    const sides = String(rawSides).toLowerCase().includes('double')
      ? 'Double Side'
      : 'Single Side';

    const binding =
      saved.binding ||
      opts.binding ||
      files[0]?.options?.binding ||
      'None';

    let lamination =
      saved.lamination ||
      opts.lamination ||
      files[0]?.options?.lamination ||
      'None';

    if (lamination === 'No') lamination = 'None';

    // Use the same file-level options that Admin displays.
    const sourceFiles = files.length
      ? files
      : [{
          pages: Number(saved.totalPages || pricing.totalPages || 1),
          options: opts
        }];

    let colorPages = 0;
    let bwPages = 0;
    let colorCopies = 0;
    let bwCopies = 0;
    let totalColorPrints = 0;
    let totalBWPrints = 0;

    sourceFiles.forEach((file) => {
      const fo = file.options || opts || {};
      const pages = Math.max(
        0,
        Number(file.pages || fo.pages || 0) || 0
      );
      const copies = Math.max(
        1,
        parseInt(fo.copies || saved.colorCopies || saved.bwCopies || opts.copies || 1, 10) || 1
      );
      const mode = normalizedMode(fo.colorMode || opts.colorMode);

      let cPages = 0;
      let bPages = 0;

      if (mode === 'Color') {
        cPages = pages;
      } else if (mode === 'Custom Split') {
        // Prefer an explicit saved color page count/range.
        const explicit = Number(fo.colorPagesCount);
        if (Number.isFinite(explicit) && explicit >= 0) {
          cPages = Math.min(pages, explicit);
        } else {
          const range = String(fo.colorPageRange || '').trim();
          if (range) {
            const selected = new Set();
            range.split(',').forEach(part => {
              const piece = part.trim();
              if (!piece) return;
              const m = piece.match(/^(\d+)\s*-\s*(\d+)$/);
              if (m) {
                let a = Math.max(1, parseInt(m[1], 10));
                let z = Math.min(pages, parseInt(m[2], 10));
                if (z < a) [a, z] = [z, a];
                for (let n = a; n <= z; n++) selected.add(n);
              } else if (/^\d+$/.test(piece)) {
                const n = parseInt(piece, 10);
                if (n >= 1 && n <= pages) selected.add(n);
              }
            });
            cPages = selected.size;
          }
        }
        bPages = Math.max(0, pages - cPages);
      } else {
        bPages = pages;
      }

      colorPages += cPages;
      bwPages += bPages;

      if (cPages > 0) {
        colorCopies = colorCopies || copies;
        totalColorPrints += cPages * copies;
      }

      if (bPages > 0) {
        bwCopies = bwCopies || copies;
        totalBWPrints += bPages * copies;
      }
    });

    // If the saved printing object contains a more precise page breakdown
    // and the file options did not provide usable page information, use it.
    const filePageTotal = colorPages + bwPages;
    if (filePageTotal === 0) {
      colorPages = Math.max(0, Number(saved.colorPages || pricing.colorPagesCount || 0));
      bwPages = Math.max(0, Number(saved.bwPages || pricing.bwPagesCount || 0));
      colorCopies = Math.max(1, Number(saved.colorCopies || opts.copies || 1));
      bwCopies = Math.max(1, Number(saved.bwCopies || opts.copies || 1));
      totalColorPrints = Number(saved.totalColorPrints ?? (colorPages * colorCopies));
      totalBWPrints = Number(saved.totalBWPrints ?? (bwPages * bwCopies));
    }

    const totalPages =
      filePageTotal > 0
        ? filePageTotal
        : Math.max(
            Number(saved.totalPages || 0),
            Number(pricing.totalPages || 0),
            1
          );

    const totalCopies =
      sourceFiles.length
        ? Math.max(...sourceFiles.map(f => parseInt((f.options || opts).copies, 10) || 1))
        : Math.max(colorCopies, bwCopies, Number(opts.copies || 1));

    // IMPORTANT:
    // Prefer the saved order-level component amounts. This prevents the
    // invoice from inventing a new total when the order was historically
    // priced using a special/discounted calculation.
    let colorAmount = Number(
      pricing.colorCost ??
      saved.colorAmount ??
      0
    ) || 0;

    let bwAmount = Number(
      pricing.paperCost ??
      saved.bwAmount ??
      0
    ) || 0;

    // If there is no saved component amount, calculate it from the saved rate.
    let colorRate = Number(
      saved.colorRate ??
      pricing.colorPaperRate ??
      0
    ) || 0;

    let bwRate = Number(
      saved.bwRate ??
      pricing.basePaperRate ??
      0
    ) || 0;

    if (colorAmount <= 0 && totalColorPrints > 0) {
      colorRate = colorRate || 6;
      colorAmount = Number((totalColorPrints * colorRate).toFixed(2));
    }

    if (bwAmount <= 0 && totalBWPrints > 0) {
      bwRate = bwRate || 1.5;
      bwAmount = Number((totalBWPrints * bwRate).toFixed(2));
    }

    // For historical orders, derive the displayed rate from the actual saved
    // component amount when possible. This avoids displaying a current/default
    // rate that does not match the saved order amount.
    if (totalColorPrints > 0 && colorAmount > 0) {
      colorRate = Number((colorAmount / totalColorPrints).toFixed(2));
    }

    if (totalBWPrints > 0 && bwAmount > 0) {
      bwRate = Number((bwAmount / totalBWPrints).toFixed(2));
    }

    colorCopies = colorCopies || totalCopies;
    bwCopies = bwCopies || totalCopies;

    let printType = 'Black & White';
    if (totalColorPrints > 0 && totalBWPrints > 0) {
      printType = 'Mixed Color + B&W';
    } else if (totalColorPrints > 0) {
      printType = 'Color';
    }

    const totalPrints = totalColorPrints + totalBWPrints;

    return {
      paperSize,
      gsm,
      printType,
      sides,
      binding,
      lamination,
      totalPages,
      totalCopies,

      colorPages,
      colorCopies,
      colorRate,
      colorAmount,
      totalColorPrints,

      bwPages,
      bwCopies,
      bwRate,
      bwAmount,
      totalBWPrints,

      totalPrints
    };
  },

  renderHTML(order, shopSettings = {}, viewOptions = {}) {
    const isCustomerView = viewOptions.customerView === true;
    const pricing = order.pricing || {};
    const d = this.getInvoiceDetails(order, shopSettings);

    const paymentStatus = (order.payment?.status || order.paymentStatus || order.status || 'PAID').toUpperCase();
    const isPaid = paymentStatus.includes('PAID') || paymentStatus.includes('APPROVED') || paymentStatus.includes('VERIFIED') || paymentStatus.includes('COMPLETED');
    const isPartial = paymentStatus.includes('PARTIAL');
    
    const paidAmount = order.payment?.paidAmount || (isPaid ? pricing.total : 0);
    const balanceDue = Math.max(0, (pricing.total || 0) - paidAmount);

    return `
      <div class="invoice-container" id="printable-invoice" style="background:#fff; color:#0f172a; padding:2rem; border-radius:12px; max-width:800px; margin:0 auto; box-shadow:var(--shadow-lg); font-family:'Inter', system-ui, sans-serif;">
        
        <!-- Action bar (Hidden when printing) -->
        <div class="no-print" style="margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
          ${isCustomerView
            ? `<button type="button" class="btn btn-sm btn-secondary" onclick="if(window.ModalComponent?.close) window.ModalComponent.close(); else window.history.back();">← Back to Order</button>`
            : `<a href="#admin-orders" class="btn btn-sm btn-secondary">← Back to Orders</a>`}
          <div style="display:flex; gap:0.5rem;">
            <button onclick="if(window.sendWhatsAppInvoice) window.sendWhatsAppInvoice('${order.id}')" class="btn btn-sm btn-success">💬 Send via WhatsApp</button>
            <button onclick="window.print()" class="btn btn-sm btn-primary">🖨️ Print Invoice</button>
          </div>
        </div>

        <!-- Invoice Header -->
        <div class="invoice-header" style="display:flex; justify-content:space-between; border-bottom:2px solid #e2e8f0; padding-bottom:1.25rem; margin-bottom:1.25rem;">
          <div>
            <h2 style="color:var(--primary, #2563eb); font-size:1.6rem; font-weight:800; margin:0;">${shopSettings.shopName || 'T7PRINTHUB'}</h2>
            <p style="font-size:0.85rem; color:#64748b; margin:0.25rem 0 0 0;">${shopSettings.address || 'Chennai, Tamil Nadu'}</p>
            <p style="font-size:0.85rem; color:#64748b; margin:0.15rem 0 0 0;">Phone: ${shopSettings.phone || ''} | Email: ${shopSettings.email || ''}</p>
          </div>
          <div style="text-align:right;">
            <h1 style="font-size:1.65rem; letter-spacing:0.05em; color:#0f172a; margin:0; font-weight:800;">PRINTING INVOICE</h1>
            <p style="font-weight:700; font-size:1.05rem; color:var(--primary, #2563eb); margin:0.25rem 0 0 0;">${order.id}</p>
            <p style="font-size:0.85rem; color:#64748b; margin:0.15rem 0 0 0;">Date: ${formatDate(order.createdAt)}</p>
          </div>
        </div>

        <!-- Billed To -->
        <div style="background:#f8fafc; padding:1rem 1.25rem; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:1.25rem;">
          <h4 style="margin:0 0 0.35rem 0; font-size:0.8rem; text-transform:uppercase; color:#64748b; letter-spacing:0.5px;">BILLED TO</h4>
          <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
            <div>
              <p style="font-weight:700; font-size:1.05rem; margin:0;">${order.customerName || 'Valued Customer'}</p>
              <p style="font-size:0.875rem; color:#334155; margin:0.2rem 0 0 0;">Phone: ${order.customerPhone || 'N/A'}</p>
            </div>
            <div>
              ${order.customerEmail ? `<p style="font-size:0.875rem; color:#334155; margin:0;">Email: ${order.customerEmail}</p>` : ''}
              ${order.customerAddress ? `<p style="font-size:0.875rem; color:#334155; margin:0.2rem 0 0 0;">Address: ${order.customerAddress}</p>` : ''}
            </div>
          </div>
        </div>

        <!-- Section 3: PRINTING SPECIFICATION -->
        <div style="margin-bottom:1.25rem;">
          <h3 style="font-size:0.9rem; font-weight:800; text-transform:uppercase; color:#334155; letter-spacing:0.5px; border-bottom:1.5px solid #e2e8f0; padding-bottom:0.4rem; margin-bottom:0.75rem;">PRINTING SPECIFICATION</h3>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:0.6rem; font-size:0.875rem;">
            <div style="background:#f8fafc; padding:0.5rem 0.75rem; border-radius:6px; border:1px solid #f1f5f9;"><b>Paper Size:</b> ${d.paperSize}</div>
            <div style="background:#f8fafc; padding:0.5rem 0.75rem; border-radius:6px; border:1px solid #f1f5f9;"><b>Paper GSM:</b> ${d.gsm}</div>
            <div style="background:#f8fafc; padding:0.5rem 0.75rem; border-radius:6px; border:1px solid #f1f5f9;"><b>Print Type:</b> ${d.printType}</div>
            <div style="background:#f8fafc; padding:0.5rem 0.75rem; border-radius:6px; border:1px solid #f1f5f9;"><b>Sides:</b> ${d.sides}</div>
            <div style="background:#f8fafc; padding:0.5rem 0.75rem; border-radius:6px; border:1px solid #f1f5f9;"><b>Binding:</b> ${d.binding}</div>
            <div style="background:#f8fafc; padding:0.5rem 0.75rem; border-radius:6px; border:1px solid #f1f5f9;"><b>Lamination:</b> ${d.lamination}</div>
            <div style="background:#f8fafc; padding:0.5rem 0.75rem; border-radius:6px; border:1px solid #f1f5f9;"><b>Pages:</b> ${d.totalPages}</div>
            <div style="background:#f8fafc; padding:0.5rem 0.75rem; border-radius:6px; border:1px solid #f1f5f9;"><b>Copies:</b> ${d.totalCopies}</div>
          </div>
        </div>

        <!-- Section 4: COLOR PRINT BREAKDOWN (If Color prints exist) -->
        ${d.totalColorPrints > 0 ? `
          <div style="margin-bottom:1.25rem;">
            <h3 style="font-size:0.9rem; font-weight:800; text-transform:uppercase; color:#2563eb; letter-spacing:0.5px; border-bottom:1.5px solid #bfdbfe; padding-bottom:0.4rem; margin-bottom:0.75rem;">🎨 COLOR PRINT</h3>
            <table style="width:100%; border-collapse:collapse; font-size:0.875rem;">
              <thead>
                <tr style="background:#eff6ff; text-align:left; color:#1e40af;">
                  <th style="padding:0.5rem 0.75rem;">Pages</th>
                  <th style="padding:0.5rem 0.75rem;">Copies</th>
                  <th style="padding:0.5rem 0.75rem;">Total Color Prints</th>
                  <th style="padding:0.5rem 0.75rem;">Rate</th>
                  <th style="padding:0.5rem 0.75rem; text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:0.65rem 0.75rem;">${d.colorPages}</td>
                  <td style="padding:0.65rem 0.75rem;">${d.colorCopies}</td>
                  <td style="padding:0.65rem 0.75rem; font-weight:700;">${d.totalColorPrints}</td>
                  <td style="padding:0.65rem 0.75rem;">${formatCurrency(d.colorRate)} / print</td>
                  <td style="padding:0.65rem 0.75rem; text-align:right; font-weight:700; color:#1e293b;">${formatCurrency(d.colorAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- Section 5: BLACK & WHITE PRINT BREAKDOWN (If B&W prints exist) -->
        ${d.totalBWPrints > 0 ? `
          <div style="margin-bottom:1.25rem;">
            <h3 style="font-size:0.9rem; font-weight:800; text-transform:uppercase; color:#334155; letter-spacing:0.5px; border-bottom:1.5px solid #cbd5e1; padding-bottom:0.4rem; margin-bottom:0.75rem;">⬛ BLACK & WHITE PRINT</h3>
            <table style="width:100%; border-collapse:collapse; font-size:0.875rem;">
              <thead>
                <tr style="background:#f8fafc; text-align:left; color:#334155;">
                  <th style="padding:0.5rem 0.75rem;">Pages</th>
                  <th style="padding:0.5rem 0.75rem;">Copies</th>
                  <th style="padding:0.5rem 0.75rem;">Total B&W Prints</th>
                  <th style="padding:0.5rem 0.75rem;">Rate</th>
                  <th style="padding:0.5rem 0.75rem; text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:0.65rem 0.75rem;">${d.bwPages}</td>
                  <td style="padding:0.65rem 0.75rem;">${d.bwCopies}</td>
                  <td style="padding:0.65rem 0.75rem; font-weight:700;">${d.totalBWPrints}</td>
                  <td style="padding:0.65rem 0.75rem;">${formatCurrency(d.bwRate)} / print</td>
                  <td style="padding:0.65rem 0.75rem; text-align:right; font-weight:700; color:#1e293b;">${formatCurrency(d.bwAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- Section 7: PRINT SUMMARY -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:0.85rem 1.25rem; border-radius:8px; margin-bottom:1.25rem;">
          <h4 style="margin:0 0 0.5rem 0; font-size:0.8rem; font-weight:800; text-transform:uppercase; color:#64748b; letter-spacing:0.5px;">PRINT SUMMARY</h4>
          <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:1rem; font-size:0.9rem;">
            ${d.totalColorPrints > 0 ? `<div>Color Prints: <b>${d.totalColorPrints}</b></div>` : ''}
            ${d.totalBWPrints > 0 ? `<div>B&W Prints: <b>${d.totalBWPrints}</b></div>` : ''}
            <div style="font-weight:800; color:var(--primary, #2563eb);">TOTAL PRINTS: <span>${d.totalPrints}</span></div>
          </div>
        </div>

        <!-- Section 10 & 11: FINAL BILL TOTAL -->
        <div style="margin-bottom:1.5rem;">
          <h3 style="font-size:0.9rem; font-weight:800; text-transform:uppercase; color:#334155; letter-spacing:0.5px; border-bottom:1.5px solid #e2e8f0; padding-bottom:0.4rem; margin-bottom:0.75rem;">BILL SUMMARY</h3>
          <table style="width:100%; border-collapse:collapse; font-size:0.875rem;">
            <tbody>
              ${d.colorAmount > 0 ? `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:0.45rem 0.75rem;">Color Print Total</td>
                  <td style="padding:0.45rem 0.75rem; text-align:right; font-weight:600;">${formatCurrency(d.colorAmount)}</td>
                </tr>
              ` : ''}
              ${d.bwAmount > 0 ? `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:0.45rem 0.75rem;">B&W Print Total</td>
                  <td style="padding:0.45rem 0.75rem; text-align:right; font-weight:600;">${formatCurrency(d.bwAmount)}</td>
                </tr>
              ` : ''}
              ${pricing.bindingCost > 0 ? `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:0.45rem 0.75rem;">Binding (${d.binding})</td>
                  <td style="padding:0.45rem 0.75rem; text-align:right; font-weight:600;">${formatCurrency(pricing.bindingCost)}</td>
                </tr>
              ` : ''}
              ${pricing.laminationCost > 0 ? `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:0.45rem 0.75rem;">Lamination</td>
                  <td style="padding:0.45rem 0.75rem; text-align:right; font-weight:600;">${formatCurrency(pricing.laminationCost)}</td>
                </tr>
              ` : ''}
              ${pricing.deliveryFee > 0 ? `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:0.45rem 0.75rem;">Delivery Charge (${pricing.deliveryZone || 'Doorstep'})</td>
                  <td style="padding:0.45rem 0.75rem; text-align:right; font-weight:600;">${formatCurrency(pricing.deliveryFee)}</td>
                </tr>
              ` : ''}
              ${pricing.productsCost > 0 ? `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:0.45rem 0.75rem;">Stationery / Products</td>
                  <td style="padding:0.45rem 0.75rem; text-align:right; font-weight:600;">${formatCurrency(pricing.productsCost)}</td>
                </tr>
              ` : ''}
              ${pricing.discount > 0 ? `
                <tr style="border-bottom:1px solid #f1f5f9; color:#059669;">
                  <td style="padding:0.45rem 0.75rem;">Discount</td>
                  <td style="padding:0.45rem 0.75rem; text-align:right; font-weight:600;">-${formatCurrency(pricing.discount)}</td>
                </tr>
              ` : ''}
              <tr style="border-top:2px solid #0f172a; font-weight:800; font-size:1.15rem; color:var(--primary, #2563eb);">
                <td style="padding:0.75rem 0.75rem;">GRAND TOTAL</td>
                <td style="padding:0.75rem 0.75rem; text-align:right;">${formatCurrency(pricing.total || (d.colorAmount + d.bwAmount + (pricing.bindingCost||0) + (pricing.laminationCost||0) + (pricing.deliveryFee||0) - (pricing.discount||0)))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Section 12: PAYMENT STATUS FOOTER -->
        <div style="border-top:1.5px solid #e2e8f0; padding-top:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; font-size:0.875rem;">
          <div>
            <p style="margin:0; font-weight:700;">Payment Status: 
              <span style="color:${isPaid ? '#059669' : isPartial ? '#d97706' : '#2563eb'}; text-transform:uppercase;">${paymentStatus}</span>
            </p>
            ${isPartial ? `
              <p style="margin:0.2rem 0 0 0; font-size:0.8rem; color:#475569;">
                Paid: <b>${formatCurrency(paidAmount)}</b> | Balance Due: <b style="color:#dc2626;">${formatCurrency(balanceDue)}</b>
              </p>
            ` : ''}
            ${order.payment?.utr ? `<p style="margin:0.2rem 0 0 0; font-size:0.8rem; color:#64748b;">UPI Ref / UTR: <code>${order.payment.utr}</code></p>` : ''}
          </div>
          <div style="text-align:right;">
            <p style="font-weight:700; color:#0f172a; margin:0;">Thank you for choosing ${shopSettings.shopName || 'T7PrintHub'}!</p>
            <p style="font-size:0.78rem; color:#64748b; margin:0.2rem 0 0 0;">Computer Generated Printing Bill - Valid without signature.</p>
          </div>
        </div>
      </div>
    `;
  }
};

