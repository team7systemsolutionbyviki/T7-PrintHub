/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - AUTOMATIC PRICING ENGINE
   Firebase-backed: reads/writes pricing via DBService (Firestore)
   In-memory cache for instant synchronous use by the calculator UI
   ========================================================================== */

import { DEFAULT_PRICING } from '../config/default-data.js';

// In-memory pricing cache — populated by DBService.getPricing()
// The UI accesses this synchronously via getPricingData() after preload
let _pricingMemory = null;

export const PricingEngine = {

  // Called once at startup (or after pricing save) to prime the sync cache
  async preload(dbService) {
    try {
      _pricingMemory = await dbService.getPricing();
    } catch (e) {
      _pricingMemory = { ...DEFAULT_PRICING };
    }
    return _pricingMemory;
  },

  // Synchronous getter — returns in-memory pricing (guaranteed after preload)
  getPricingData() {
    if (_pricingMemory) return _pricingMemory;
    // Fallback if preload hasn't finished yet
    return { ...DEFAULT_PRICING };
  },

  // Save pricing via DBService (Firebase)
  async savePricingData(newPricing, dbService) {
    _pricingMemory = { ...newPricing };
    if (dbService) await dbService.savePricing(newPricing);
  },

  // ── Page Range Parser ─────────────────────────────────────────────────────
  parsePageRanges(rangeStr, maxPages = 1) {
    if (!rangeStr || typeof rangeStr !== 'string') return new Set();
    const clean = rangeStr.trim();
    if (!clean || clean.toLowerCase() === 'all') {
      const s = new Set();
      for (let i = 1; i <= maxPages; i++) s.add(i);
      return s;
    }
    const pageSet = new Set();
    const parts   = clean.split(/[,;\s]+/);
    for (let part of parts) {
      if (!part) continue;
      if (part.includes('-')) {
        const pieces = part.split('-');
        if (pieces.length !== 2) continue;
        let [start, end] = pieces.map(Number);
        if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
        if (start > end) [start, end] = [end, start];
        if (start < 1 || end > maxPages) continue;
        for (let p = start; p <= end; p++) pageSet.add(p);
      } else {
        const p = Number(part);
        if (Number.isInteger(p) && p >= 1 && p <= maxPages) pageSet.add(p);
      }
    }
    return pageSet;
  },

  validatePageRange(rangeStr, maxPages = 1, allowEmpty = true) {
    if (rangeStr == null) return { valid: allowEmpty, message: allowEmpty ? '' : 'Enter page numbers or ranges.' };
    const clean = String(rangeStr).trim();
    if (!clean) return { valid: allowEmpty, message: allowEmpty ? '' : 'Enter page numbers or ranges.' };
    if (clean.toLowerCase() === 'all') return { valid: true, message: '' };
    const invalid = [];
    const parts = clean.split(/[,;\s]+/).filter(Boolean);
    for (const part of parts) {
      if (/^\d+$/.test(part)) {
        const n = Number(part);
        if (n < 1 || n > maxPages) invalid.push(part);
      } else if (/^\d+-\d+$/.test(part)) {
        const [a, b] = part.split('-').map(Number);
        if (a < 1 || b < 1 || a > maxPages || b > maxPages || a > b) invalid.push(part);
      } else {
        invalid.push(part);
      }
    }
    return invalid.length
      ? { valid: false, message: `Invalid page range: ${invalid.join(', ')}. Use numbers/ranges from 1-${maxPages}, e.g. 1, 3, 5-8.` }
      : { valid: true, message: '' };
  },

  // ── Quote Calculator ──────────────────────────────────────────────────────
  calculateQuote(options = {}, totalPages = 1) {
    const pricing      = this.getPricingData();
    const paperSize    = options.paperSize    || 'A4';
    const paperQuality = options.paperQuality || '70 GSM';
    const colorMode    = options.colorMode    || 'Black & White';
    const printSide    = options.printSide    || 'Single';
    const copies       = Math.max(1, parseInt(options.copies) || 1);
    const colorCopies  = Math.max(1, parseInt(options.colorCopies) || copies);
    const bwCopies     = Math.max(1, parseInt(options.bwCopies) || copies);
    const binding      = options.binding      || 'None';
    const lamination   = options.lamination   || 'No';
    const deliveryZone = options.deliveryZone || 'Pickup';

    const maxDocPages      = Math.max(1, parseInt(totalPages) || 1);
    const printPagesSet    = this.parsePageRanges(options.pageRange || 'All', maxDocPages);
    const printedPagesCount = printPagesSet.size > 0 ? printPagesSet.size : maxDocPages;

    let colorPagesCount = 0, bwPagesCount = 0;
    let effectiveColorCopies = copies;
    let effectiveBwCopies = copies;

    if (colorMode === 'Color') {
      colorPagesCount = printedPagesCount;
    } else if (colorMode === 'Black & White') {
      bwPagesCount = printedPagesCount;
    } else if (colorMode === 'Color + B&W Copies') {
      // The same document is printed completely in both modes.
      colorPagesCount = printedPagesCount;
      bwPagesCount = printedPagesCount;
      effectiveColorCopies = colorCopies;
      effectiveBwCopies = bwCopies;
    } else {
      // Custom Split: selected pages are Color and the rest are B&W.
      const explicitColorSet = this.parsePageRanges(options.colorPageRange || '', maxDocPages);
      for (const p of printPagesSet) {
        if (explicitColorSet.has(p)) colorPagesCount++;
      }
      bwPagesCount = Math.max(0, printedPagesCount - colorPagesCount);
    }

    const sizeConfig    = pricing.paperSizes?.[paperSize]       || { baseRate: 1.50 };
    const qualityConfig = pricing.paperQualities?.[paperQuality] || { multiplier: 1.0 };
    const sideConfig    = pricing.sides?.[printSide]             || { multiplier: 1.0 };
    const colorExtraRate = pricing.colorModes?.['Color']?.costPerPage || 1.50;

    const basePaperRate  = sizeConfig.baseRate * qualityConfig.multiplier * sideConfig.multiplier;
    const colorPaperRate = basePaperRate + colorExtraRate;

    const paperCost    = Number((bwPagesCount    * basePaperRate  * effectiveBwCopies).toFixed(2));
    const colorCost    = Number((colorPagesCount * colorPaperRate * effectiveColorCopies).toFixed(2));
    const totalColorPrints = colorPagesCount * effectiveColorCopies;
    const totalBWPrints = bwPagesCount * effectiveBwCopies;
    const totalCopySets = colorMode === 'Color + B&W Copies'
      ? (effectiveColorCopies + effectiveBwCopies)
      : copies;
    const totalPrint   = Number((paperCost + colorCost).toFixed(2));

    const bindingConfig    = pricing.bindings?.[binding]       || { price: 0 };
    const laminationConfig = pricing.lamination?.[lamination]  || { pricePerPage: 0 };
    const deliveryConfig   = (pricing.deliveryZones || DEFAULT_PRICING.deliveryZones)?.[deliveryZone] || { fee: 0 };

    const bindingCost    = Number((bindingConfig.price                              * totalCopySets).toFixed(2));
    const laminationPrintCopies = colorMode === 'Color + B&W Copies'
      ? (effectiveColorCopies + effectiveBwCopies)
      : copies;
    const laminationCost = Number((laminationConfig.pricePerPage * printedPagesCount * laminationPrintCopies).toFixed(2));
    const deliveryFee    = Number((deliveryConfig.fee || 0).toFixed(2));

    let discountPercent = 0;
    if (totalCopySets >= 10) discountPercent = 0.10;
    else if (totalCopySets >= 5) discountPercent = 0.05;

    const subtotal = Number((totalPrint + bindingCost + laminationCost + deliveryFee).toFixed(2));
    const discount = Number((subtotal * discountPercent).toFixed(2));
    const total    = Number((subtotal - discount).toFixed(2));

    return {
      paperCost, colorCost, bindingCost, laminationCost, deliveryFee, deliveryZone,
      subtotal, gst: 0, discount, total,
      totalPages: maxDocPages, printedPagesCount, colorPagesCount, bwPagesCount,
      colorCopies: colorPagesCount > 0 ? effectiveColorCopies : 0,
      bwCopies: bwPagesCount > 0 ? effectiveBwCopies : 0,
      totalColorPrints,
      totalBWPrints,
      totalPrints: totalColorPrints + totalBWPrints,
      totalCopySets,
      basePaperRate, colorPaperRate, copies
    };
  }
};
