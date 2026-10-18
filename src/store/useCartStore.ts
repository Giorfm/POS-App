import { create } from 'zustand';
import {
  CartItem,
  Product,
  ProductVariant,
  OrderItemModifier,
  Customer,
  DiningTable,
  OrderType,
  Order,
  TaxSettings,
} from '@/types';
import { calculateCartTotals, CartCalculationResult } from '@/lib/domain/money';
import { soundFeedback } from '@/lib/audio';

interface CartState {
  items: CartItem[];
  selectedCustomer: Customer | null;
  selectedTable: DiningTable | null;
  orderType: OrderType;
  transactionDiscount: {
    type: 'percentage' | 'fixed';
    value: number;
  } | null;
  promoCode: string | null;
  notes: string;
  heldOrderId: string | null;

  // Cached calculation
  totals: CartCalculationResult;

  // Actions
  addItem: (
    product: Product,
    variant?: ProductVariant | null,
    modifiers?: OrderItemModifier[],
    currentStock?: number
  ) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  incrementQuantity: (cartItemId: string) => void;
  decrementQuantity: (cartItemId: string) => void;
  updateItemDiscount: (cartItemId: string, discount: number) => void;
  updateItemNotes: (cartItemId: string, notes: string) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;

  setCustomer: (customer: Customer | null) => void;
  setTable: (table: DiningTable | null) => void;
  setOrderType: (orderType: OrderType) => void;
  setTransactionDiscount: (
    discount: { type: 'percentage' | 'fixed'; value: number } | null
  ) => void;
  setPromoCode: (code: string | null) => void;
  setNotes: (notes: string) => void;
  recomputeTotals: (taxSettings?: TaxSettings) => void;
  loadHeldOrder: (order: Order) => void;
}

const initialTotals = calculateCartTotals({ items: [] });

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  selectedCustomer: null,
  selectedTable: null,
  orderType: 'retail',
  transactionDiscount: null,
  promoCode: null,
  notes: '',
  heldOrderId: null,
  totals: initialTotals,

  addItem: (product, variant = null, modifiers = [], currentStock = 100) => {
    const { items, transactionDiscount } = get();

    // Sound feedback
    soundFeedback.playScanSuccess();

    // Create unique key for item based on product + variant + modifiers
    const modKey = (modifiers || [])
      .map((m) => `${m.modifier_id}:${m.option_id}`)
      .sort()
      .join('|');
    const cartItemId = `${product.id}_${variant?.id || 'base'}_${modKey}`;

    const existingIndex = items.findIndex((i) => i.id === cartItemId);
    const unitPrice = variant ? variant.sell_price : product.sell_price;
    const buyPrice = variant ? variant.buy_price : product.buy_price;

    let updatedItems: CartItem[];

    if (existingIndex >= 0) {
      updatedItems = [...items];
      const existing = updatedItems[existingIndex];
      const newQty = existing.quantity + 1;
      const modTotal = modifiers.reduce((acc, m) => acc + m.price, 0);
      const subtotal = (unitPrice + modTotal) * newQty;
      updatedItems[existingIndex] = {
        ...existing,
        quantity: newQty,
        subtotal,
        final_price: subtotal - existing.item_discount,
      };
    } else {
      const modTotal = modifiers.reduce((acc, m) => acc + m.price, 0);
      const subtotal = unitPrice + modTotal;
      const newItem: CartItem = {
        id: cartItemId,
        product_id: product.id,
        variant_id: variant?.id || null,
        product_name: product.name,
        variant_name: variant?.name || null,
        sku: variant?.sku || product.sku,
        buy_price: buyPrice,
        unit_price: unitPrice,
        quantity: 1,
        subtotal,
        item_discount: 0,
        final_price: subtotal,
        notes: '',
        modifiers: modifiers || [],
        track_stock: product.track_stock,
        stock_quantity: currentStock,
      };
      updatedItems = [...items, newItem];
    }

    const totals = calculateCartTotals({
      items: updatedItems,
      transactionDiscount: transactionDiscount || undefined,
    });

    set({ items: updatedItems, totals });
  },

  updateQuantity: (cartItemId, quantity) => {
    const { items, transactionDiscount } = get();
    const safeQty = Math.max(1, Math.round(quantity));

    const updatedItems = items.map((item) => {
      if (item.id === cartItemId) {
        const modTotal = item.modifiers.reduce((acc, m) => acc + m.price, 0);
        const subtotal = (item.unit_price + modTotal) * safeQty;
        return {
          ...item,
          quantity: safeQty,
          subtotal,
          final_price: Math.max(0, subtotal - item.item_discount),
        };
      }
      return item;
    });

    const totals = calculateCartTotals({
      items: updatedItems,
      transactionDiscount: transactionDiscount || undefined,
    });

    set({ items: updatedItems, totals });
  },

  incrementQuantity: (cartItemId) => {
    const { items } = get();
    const target = items.find((i) => i.id === cartItemId);
    if (target) {
      get().updateQuantity(cartItemId, target.quantity + 1);
    }
  },

  decrementQuantity: (cartItemId) => {
    const { items } = get();
    const target = items.find((i) => i.id === cartItemId);
    if (target) {
      if (target.quantity <= 1) {
        get().removeItem(cartItemId);
      } else {
        get().updateQuantity(cartItemId, target.quantity - 1);
      }
    }
  },

  updateItemDiscount: (cartItemId, discount) => {
    const { items, transactionDiscount } = get();
    const safeDiscount = Math.max(0, Math.round(discount));

    const updatedItems = items.map((item) => {
      if (item.id === cartItemId) {
        return {
          ...item,
          item_discount: Math.min(item.subtotal, safeDiscount),
          final_price: Math.max(0, item.subtotal - safeDiscount),
        };
      }
      return item;
    });

    const totals = calculateCartTotals({
      items: updatedItems,
      transactionDiscount: transactionDiscount || undefined,
    });

    set({ items: updatedItems, totals });
  },

  updateItemNotes: (cartItemId, notes) => {
    const { items } = get();
    const updatedItems = items.map((item) => {
      if (item.id === cartItemId) {
        return { ...item, notes };
      }
      return item;
    });
    set({ items: updatedItems });
  },

  removeItem: (cartItemId) => {
    const { items, transactionDiscount } = get();
    const updatedItems = items.filter((i) => i.id !== cartItemId);
    const totals = calculateCartTotals({
      items: updatedItems,
      transactionDiscount: transactionDiscount || undefined,
    });
    set({ items: updatedItems, totals });
  },

  clearCart: () => {
    set({
      items: [],
      selectedCustomer: null,
      selectedTable: null,
      transactionDiscount: null,
      promoCode: null,
      notes: '',
      heldOrderId: null,
      totals: initialTotals,
    });
  },

  setCustomer: (customer) => set({ selectedCustomer: customer }),
  setTable: (table) => set({ selectedTable: table }),
  setOrderType: (orderType) => set({ orderType }),

  setTransactionDiscount: (discount) => {
    const { items } = get();
    const totals = calculateCartTotals({
      items,
      transactionDiscount: discount || undefined,
    });
    set({ transactionDiscount: discount, totals });
  },

  setPromoCode: (promoCode) => set({ promoCode }),
  setNotes: (notes) => set({ notes }),

  recomputeTotals: (taxSettings) => {
    const { items, transactionDiscount } = get();
    const totals = calculateCartTotals({
      items,
      transactionDiscount: transactionDiscount || undefined,
      taxRate: taxSettings?.ppn_percentage ?? 11,
      isTaxEnabled: taxSettings?.is_ppn_enabled ?? true,
      isTaxInclusive: taxSettings?.is_tax_inclusive ?? false,
      serviceChargeRate: taxSettings?.service_charge_percentage ?? 0,
      isServiceChargeEnabled: taxSettings?.is_service_charge_enabled ?? false,
      roundingUnit: taxSettings?.rounding_unit ?? 100,
    });
    set({ totals });
  },

  loadHeldOrder: (order) => {
    const loadedItems: CartItem[] = order.items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      product_name: item.product_name,
      variant_name: item.variant_name || null,
      sku: item.sku,
      buy_price: item.buy_price,
      unit_price: item.unit_price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      item_discount: item.discount_amount,
      final_price: item.final_price,
      notes: item.notes,
      modifiers: item.modifiers || [],
      track_stock: true,
      stock_quantity: 100,
    }));

    const discount =
      order.discount_amount > 0
        ? {
            type: (order.discount_type as 'percentage' | 'fixed') || 'fixed',
            value: order.discount_amount,
          }
        : null;

    const totals = calculateCartTotals({
      items: loadedItems,
      transactionDiscount: discount || undefined,
      taxRate: order.tax_rate,
      serviceChargeRate: order.service_charge_rate,
    });

    set({
      items: loadedItems,
      heldOrderId: order.id,
      orderType: order.order_type,
      transactionDiscount: discount,
      promoCode: order.promo_code || null,
      notes: order.notes || '',
      totals,
    });
  },
}));
