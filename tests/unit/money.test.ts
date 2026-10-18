import { describe, it } from 'node:test';
import { expect } from '../expect.ts';
import {
  formatRupiah,
  parseRupiah,
  calculateRounding,
  calculateCartTotals,
  calculateChange,
  calculateQuickCashSuggestions,
  calculateLoyaltyPoints,
  calculatePointsDiscount,
  calculateStockAfterSale,
} from '../../src/lib/domain/money.ts';
import type { CartItem } from '../../src/types/index.ts';

describe('Domain: Money & Financial Calculations', () => {
  describe('formatRupiah', () => {
    it('formats positive integers to standard Rupiah format', () => {
      expect(formatRupiah(25000)).toBe('Rp 25.000');
      expect(formatRupiah(1500000)).toBe('Rp 1.500.000');
      expect(formatRupiah(0)).toBe('Rp 0');
    });

    it('formats negative integers with leading minus', () => {
      expect(formatRupiah(-5000)).toBe('-Rp 5.000');
    });

    it('handles rounding floating numbers if any passed by mistake', () => {
      expect(formatRupiah(25000.8)).toBe('Rp 25.001');
    });
  });

  describe('parseRupiah', () => {
    it('parses formatted strings back to integer', () => {
      expect(parseRupiah('Rp 25.000')).toBe(25000);
      expect(parseRupiah('Rp 1.500.000')).toBe(1500000);
      expect(parseRupiah('10000')).toBe(10000);
      expect(parseRupiah('')).toBe(0);
      expect(parseRupiah(-5000)).toBe(-5000);
    });
  });

  describe('calculateRounding', () => {
    it('rounds to nearest 100 correctly', () => {
      // 25.030 -> rounds down to 25.000 (diff -30)
      const res1 = calculateRounding(25030, 100);
      expect(res1.roundedAmount).toBe(25000);
      expect(res1.roundingDiff).toBe(-30);

      // 25.070 -> rounds up to 25.100 (diff +30)
      const res2 = calculateRounding(25070, 100);
      expect(res2.roundedAmount).toBe(25100);
      expect(res2.roundingDiff).toBe(30);

      // 25.050 -> half way rounds up to 25.100 (diff +50)
      const res3 = calculateRounding(25050, 100);
      expect(res3.roundedAmount).toBe(25100);
      expect(res3.roundingDiff).toBe(50);
    });

    it('leaves already rounded amount unchanged', () => {
      const res = calculateRounding(25000, 100);
      expect(res.roundedAmount).toBe(25000);
      expect(res.roundingDiff).toBe(0);
    });
  });

  describe('calculateCartTotals', () => {
    const sampleItems: CartItem[] = [
      {
        id: '1',
        product_id: 'p1',
        product_name: 'Kopi Susu Gula Aren',
        buy_price: 8000,
        unit_price: 20000,
        quantity: 2,
        subtotal: 40000,
        item_discount: 0,
        final_price: 40000,
        modifiers: [
          {
            modifier_id: 'm1',
            modifier_name: 'Topping',
            option_id: 'o1',
            option_name: 'Jelly',
            price: 3000,
          },
        ],
        track_stock: true,
        stock_quantity: 50,
      },
      {
        id: '2',
        product_id: 'p2',
        product_name: 'Croissant Butter',
        buy_price: 10000,
        unit_price: 25000,
        quantity: 1,
        subtotal: 25000,
        item_discount: 5000, // item discount Rp 5.000
        final_price: 20000,
        modifiers: [],
        track_stock: true,
        stock_quantity: 20,
      },
    ];

    it('calculates standard subtotal, discount, exclusive PPN 11%, and rounding', () => {
      // Item 1: (20000 + 3000) * 2 = 46.000. Item discount = 0.
      // Item 2: 25000 * 1 = 25.000. Item discount = 5.000.
      // Subtotal = 46.000 + 25.000 = 71.000
      // Total Item Discount = 5.000
      // Net after item disc = 66.000
      // Transaction Discount 10%: 10% of 66.000 = 6.600
      // Net after disc = 59.400
      // Taxable: 59.400
      // PPN 11%: 59.400 * 0.11 = 6.534
      // Raw Total: 59.400 + 6.534 = 65.934
      // Rounding to 100: 65.934 -> 65.900 (diff -34)
      const res = calculateCartTotals({
        items: sampleItems,
        transactionDiscount: { type: 'percentage', value: 10 },
        taxRate: 11,
        isTaxEnabled: true,
        isTaxInclusive: false,
        roundingUnit: 100,
      });

      expect(res.subtotal).toBe(71000);
      expect(res.totalItemDiscount).toBe(5000);
      expect(res.transactionDiscountAmount).toBe(6600);
      expect(res.totalDiscount).toBe(11600);
      expect(res.netAfterDiscount).toBe(59400);
      expect(res.taxAmount).toBe(6534);
      expect(res.rawTotal).toBe(65934);
      expect(res.grandTotal).toBe(65900);
      expect(res.roundingAmount).toBe(-34);
    });

    it('handles inclusive tax without increasing the grand total', () => {
      // 1 item @ 22.200 (inclusive PPN 11%)
      const singleItem: CartItem[] = [
        {
          id: '1',
          product_id: 'p1',
          product_name: 'Buku Tulis',
          buy_price: 10000,
          unit_price: 22200,
          quantity: 1,
          subtotal: 22200,
          item_discount: 0,
          final_price: 22200,
          modifiers: [],
          track_stock: true,
          stock_quantity: 10,
        },
      ];

      const res = calculateCartTotals({
        items: singleItem,
        taxRate: 11,
        isTaxEnabled: true,
        isTaxInclusive: true,
        roundingUnit: 100,
      });

      expect(res.subtotal).toBe(22200);
      // Tax = 22200 - (22200 / 1.11) = 22200 - 20000 = 2200
      expect(res.taxAmount).toBe(2200);
      expect(res.rawTotal).toBe(22200);
      expect(res.grandTotal).toBe(22200);
    });

    it('handles empty cart safely', () => {
      const res = calculateCartTotals({
        items: [],
      });
      expect(res.subtotal).toBe(0);
      expect(res.grandTotal).toBe(0);
      expect(res.taxAmount).toBe(0);
    });
  });

  describe('calculateChange', () => {
    it('calculates positive change when tender is sufficient', () => {
      const res = calculateChange(45000, 50000);
      expect(res.changeAmount).toBe(5000);
      expect(res.isSufficient).toBe(true);
    });

    it('handles exact tender', () => {
      const res = calculateChange(50000, 50000);
      expect(res.changeAmount).toBe(0);
      expect(res.isSufficient).toBe(true);
    });

    it('detects insufficient tender', () => {
      const res = calculateChange(60000, 50000);
      expect(res.changeAmount).toBe(0);
      expect(res.isSufficient).toBe(false);
    });
  });

  describe('calculateQuickCashSuggestions', () => {
    it('generates practical cash bill suggestions', () => {
      const suggestions = calculateQuickCashSuggestions(37500);
      // Must include exact 37.500, next 40.000, 50.000, 100.000
      expect(suggestions).toContain(37500);
      expect(suggestions).toContain(40000);
      expect(suggestions).toContain(50000);
      expect(suggestions).toContain(100000);
      expect(suggestions[0]).toBe(37500);
    });
  });

  describe('Loyalty & Points Calculation', () => {
    it('calculates points earned correctly (1 point per Rp 10.000)', () => {
      expect(calculateLoyaltyPoints(25000)).toBe(2);
      expect(calculateLoyaltyPoints(9999)).toBe(0);
      expect(calculateLoyaltyPoints(100000)).toBe(10);
    });

    it('calculates points discount with optional cap', () => {
      // 50 points * 100 = Rp 5.000
      expect(calculatePointsDiscount(50, 100)).toBe(5000);
      // Capped at Rp 3.000
      expect(calculatePointsDiscount(50, 100, 3000)).toBe(3000);
    });
  });

  describe('Stock Movement Edge Cases', () => {
    it('allows negative stock when configured and flags warning', () => {
      const res = calculateStockAfterSale(2, 5, true);
      expect(res.newStock).toBe(-3);
      expect(res.isNegativeWarning).toBe(true);
      expect(res.isValid).toBe(true);
    });

    it('blocks negative stock when disabled', () => {
      const res = calculateStockAfterSale(2, 5, false);
      expect(res.newStock).toBe(-3);
      expect(res.isNegativeWarning).toBe(true);
      expect(res.isValid).toBe(false);
    });
  });
});
