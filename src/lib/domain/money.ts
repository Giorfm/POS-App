import type { CartItem } from '../../types/index.ts';

/**
 * Format integer IDR to Indonesian standard currency string
 * Example: 25000 -> "Rp 25.000"
 */
export function formatRupiah(amount: number): string {
  const integerAmount = Math.round(amount || 0);
  const formatted = Math.abs(integerAmount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return integerAmount < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

/**
 * Parse currency string or raw number input back into clean integer Rupiah
 */
export function parseRupiah(input: string | number): number {
  if (typeof input === 'number') {
    return Math.round(Number.isFinite(input) ? input : 0);
  }
  const clean = input.replace(/[^0-9-]/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate roundings to specified unit (e.g. 100 Rupiah)
 * Standard retail rounding: rounds to nearest multiple of unit
 */
export function calculateRounding(
  amount: number,
  unit: number = 100
): { roundedAmount: number; roundingDiff: number } {
  const safeUnit = unit <= 0 ? 1 : Math.round(unit);
  const intAmount = Math.round(amount);
  
  if (safeUnit === 1) {
    return { roundedAmount: intAmount, roundingDiff: 0 };
  }

  const remainder = intAmount % safeUnit;
  if (remainder === 0) {
    return { roundedAmount: intAmount, roundingDiff: 0 };
  }

  // Round up to nearest unit if remainder >= half, else round down
  const halfUnit = safeUnit / 2;
  let roundingDiff = 0;
  if (remainder >= halfUnit) {
    roundingDiff = safeUnit - remainder;
  } else {
    roundingDiff = -remainder;
  }

  const roundedAmount = intAmount + roundingDiff;
  return { roundedAmount, roundingDiff };
}

export interface CartCalculationInput {
  items: CartItem[];
  transactionDiscount?: {
    type: 'percentage' | 'fixed';
    value: number; // percentage (0-100) or fixed Rupiah amount
  };
  taxRate?: number; // e.g. 11 for 11% PPN
  isTaxEnabled?: boolean;
  isTaxInclusive?: boolean; // true if sell_price already includes tax
  serviceChargeRate?: number; // e.g. 5 for 5%
  isServiceChargeEnabled?: boolean;
  roundingUnit?: number; // default 100
}

export interface CartCalculationResult {
  subtotal: number;
  totalItemDiscount: number;
  transactionDiscountAmount: number;
  totalDiscount: number;
  netAfterDiscount: number;
  serviceChargeAmount: number;
  taxableAmount: number;
  taxAmount: number;
  rawTotal: number;
  roundingAmount: number;
  grandTotal: number;
}

/**
 * Deterministic pure calculation of cart financial totals
 * Guarantees integer Rupiah everywhere with no fractional drift
 */
export function calculateCartTotals(input: CartCalculationInput): CartCalculationResult {
  const {
    items = [],
    transactionDiscount,
    taxRate = 11,
    isTaxEnabled = true,
    isTaxInclusive = false,
    serviceChargeRate = 0,
    isServiceChargeEnabled = false,
    roundingUnit = 100,
  } = input;

  let subtotal = 0;
  let totalItemDiscount = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.round(item.quantity));
    const unitPrice = Math.max(0, Math.round(item.unit_price));
    const modifierTotal = (item.modifiers || []).reduce(
      (acc, mod) => acc + Math.max(0, Math.round(mod.price)),
      0
    );
    const itemBasePrice = unitPrice + modifierTotal;
    const itemSubtotal = itemBasePrice * qty;
    const itemDiscount = Math.min(itemSubtotal, Math.max(0, Math.round(item.item_discount || 0)));

    subtotal += itemSubtotal;
    totalItemDiscount += itemDiscount;
  }

  const subtotalAfterItemDiscounts = Math.max(0, subtotal - totalItemDiscount);

  // Transaction-level discount calculation
  let transactionDiscountAmount = 0;
  if (transactionDiscount && transactionDiscount.value > 0) {
    if (transactionDiscount.type === 'percentage') {
      const pct = Math.min(100, Math.max(0, transactionDiscount.value));
      transactionDiscountAmount = Math.round((subtotalAfterItemDiscounts * pct) / 100);
    } else {
      transactionDiscountAmount = Math.min(
        subtotalAfterItemDiscounts,
        Math.max(0, Math.round(transactionDiscount.value))
      );
    }
  }

  const totalDiscount = totalItemDiscount + transactionDiscountAmount;
  const netAfterDiscount = Math.max(0, subtotal - totalDiscount);

  // Service charge calculation
  let serviceChargeAmount = 0;
  if (isServiceChargeEnabled && serviceChargeRate > 0) {
    serviceChargeAmount = Math.round((netAfterDiscount * serviceChargeRate) / 100);
  }

  // Tax (PPN) calculation
  let taxAmount = 0;
  let taxableAmount = netAfterDiscount + serviceChargeAmount;

  if (isTaxEnabled && taxRate > 0) {
    if (isTaxInclusive) {
      // If price already includes tax: Tax = Amount - (Amount / (1 + Rate))
      taxAmount = Math.round(taxableAmount - taxableAmount / (1 + taxRate / 100));
    } else {
      // Exclusive tax: Tax = Amount * Rate
      taxAmount = Math.round((taxableAmount * taxRate) / 100);
    }
  }

  // Raw total calculation before rounding
  let rawTotal = 0;
  if (isTaxInclusive) {
    // Tax is already inside netAfterDiscount
    rawTotal = netAfterDiscount + serviceChargeAmount;
  } else {
    rawTotal = netAfterDiscount + serviceChargeAmount + taxAmount;
  }

  // Rounding
  const { roundedAmount: grandTotal, roundingDiff: roundingAmount } = calculateRounding(
    rawTotal,
    roundingUnit
  );

  return {
    subtotal,
    totalItemDiscount,
    transactionDiscountAmount,
    totalDiscount,
    netAfterDiscount,
    serviceChargeAmount,
    taxableAmount,
    taxAmount,
    rawTotal,
    roundingAmount,
    grandTotal: Math.max(0, grandTotal),
  };
}

/**
 * Calculate change and whether tender is sufficient
 */
export function calculateChange(
  grandTotal: number,
  tenderAmount: number
): { changeAmount: number; isSufficient: boolean } {
  const safeGrandTotal = Math.max(0, Math.round(grandTotal));
  const safeTender = Math.max(0, Math.round(tenderAmount));
  const diff = safeTender - safeGrandTotal;
  return {
    changeAmount: Math.max(0, diff),
    isSufficient: diff >= 0,
  };
}

/**
 * Generate smart cash suggestion buttons for cashiers
 * Includes: exact amount, next clean 5.000, 10.000, 20.000, 50.000, 100.000 bills
 */
export function calculateQuickCashSuggestions(grandTotal: number): number[] {
  const total = Math.max(0, Math.round(grandTotal));
  if (total === 0) return [0];

  const suggestions = new Set<number>();
  suggestions.add(total); // Uang pas

  const denominations = [5000, 10000, 20000, 50000, 100000];
  for (const denom of denominations) {
    if (total <= denom) {
      suggestions.add(denom);
    } else {
      const nextMultiple = Math.ceil(total / denom) * denom;
      if (nextMultiple > total && nextMultiple <= total + denom * 2) {
        suggestions.add(nextMultiple);
      }
    }
  }

  // Add round 50k and 100k above total if not already included
  const next50k = Math.ceil(total / 50000) * 50000;
  if (next50k > total) suggestions.add(next50k);
  const next100k = Math.ceil(total / 100000) * 100000;
  if (next100k > total) suggestions.add(next100k);

  return Array.from(suggestions).sort((a, b) => a - b).slice(0, 6);
}

/**
 * Calculate loyalty points earned from order total (default: 1 point per Rp 10.000)
 */
export function calculateLoyaltyPoints(
  totalSpent: number,
  ratePerRupiah: number = 10000
): number {
  if (totalSpent <= 0 || ratePerRupiah <= 0) return 0;
  return Math.floor(totalSpent / ratePerRupiah);
}

/**
 * Calculate discount amount given loyalty points to redeem (default: 1 point = Rp 100)
 */
export function calculatePointsDiscount(
  pointsToRedeem: number,
  pointValueRupiah: number = 100,
  maxAllowedDiscount?: number
): number {
  if (pointsToRedeem <= 0 || pointValueRupiah <= 0) return 0;
  const calculated = Math.round(pointsToRedeem * pointValueRupiah);
  if (typeof maxAllowedDiscount === 'number') {
    return Math.min(Math.max(0, maxAllowedDiscount), calculated);
  }
  return calculated;
}

/**
 * Stock check and deduction helper
 */
export function calculateStockAfterSale(
  currentStock: number,
  quantitySold: number,
  allowNegative: boolean = false
): { newStock: number; isNegativeWarning: boolean; isValid: boolean } {
  const newStock = currentStock - quantitySold;
  const isNegative = newStock < 0;
  const isValid = allowNegative ? true : !isNegative;
  return {
    newStock,
    isNegativeWarning: isNegative,
    isValid,
  };
}
