'use client';

import * as React from 'react';
import { Header } from '@/components/shared/Header';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { ReceiptModal } from '@/components/shared/ReceiptModal';
import { HoldOrdersModal } from '@/components/pos/HoldOrdersModal';
import { ShiftModal } from '@/components/pos/ShiftModal';
import { ManagerAuthModal } from '@/components/shared/ManagerAuthModal';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useShiftStore } from '@/store/useShiftStore';
import { getRepository } from '@/lib/repository';
import {
  Product,
  Category,
  InventoryItem,
  DiningTable,
  Order,
  ReceiptTemplate,
  TaxSettings,
  Shift,
} from '@/types';
import { useToast } from '@/components/ui/toast';
import { SEED_RECEIPT_TEMPLATE, SEED_TAX_SETTINGS } from '@/lib/db/seedData';
import { ShoppingCart } from 'lucide-react';
import { formatRupiah } from '@/lib/domain/money';

export default function PosPage() {
  const { currentUser, currentOutlet, initAuth, recordActivity } = useAuthStore();
  const { currentShift, refreshShift } = useShiftStore();
  const { items, totals, clearCart, loadHeldOrder } = useCartStore();
  const { showToast } = useToast();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [tables, setTables] = React.useState<DiningTable[]>([]);
  const [heldOrders, setHeldOrders] = React.useState<Order[]>([]);
  const [receiptTemplate, setReceiptTemplate] = React.useState<ReceiptTemplate>(SEED_RECEIPT_TEMPLATE);
  const [taxSettings, setTaxSettings] = React.useState<TaxSettings>(SEED_TAX_SETTINGS);
  const [lastCompletedOrder, setLastCompletedOrder] = React.useState<Order | null>(null);

  // Modal open states
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = React.useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = React.useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = React.useState(false);

  // Manager PIN modal state
  const [isManagerAuthOpen, setIsManagerAuthOpen] = React.useState(false);
  const [pendingManagerAction, setPendingManagerAction] = React.useState<(() => void) | null>(null);
  const [managerActionTitle, setManagerActionTitle] = React.useState('');

  // Initial load
  React.useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Load data for current outlet
  const loadOutletData = React.useCallback(async (outletId: string) => {
    try {
      const repo = getRepository();
      const [prods, cats, inv, tbls, hOrders, tmpl, taxes] = await Promise.all([
        repo.getProducts(),
        repo.getCategories(),
        repo.getInventory(outletId),
        repo.getDiningTables(outletId),
        repo.getHeldOrders(outletId),
        repo.getReceiptTemplate(outletId),
        repo.getTaxSettings(),
      ]);

      setProducts(prods);
      setCategories(cats);
      setInventory(inv);
      setTables(tbls);
      setHeldOrders(hOrders);
      setReceiptTemplate(tmpl);
      setTaxSettings(taxes);
    } catch (err) {
      console.error('Failed to load POS outlet data:', err);
    }
  }, []);

  React.useEffect(() => {
    if (currentOutlet) {
      loadOutletData(currentOutlet.id);
      refreshShift(currentOutlet.id, currentUser?.id);
    }
  }, [currentOutlet, currentUser?.id, loadOutletData, refreshShift]);

  // Realtime subscription for cross-tab event updates (stock, orders, shifts)
  React.useEffect(() => {
    const repo = getRepository();
    const unsubscribe = repo.subscribeToEvents((event) => {
      if (currentOutlet && event.outlet_id === currentOutlet.id) {
        if (event.event_type === 'stock.low') {
          showToast('Peringatan: Stok produk menipis di inventori!', 'info');
          repo.getInventory(currentOutlet.id).then(setInventory).catch(() => {});
        } else if (event.event_type === 'order.created' || event.event_type === 'order.voided') {
          repo.getInventory(currentOutlet.id).then(setInventory).catch(() => {});
        }
      }
    });
    return () => unsubscribe();
  }, [currentOutlet, showToast]);

  // Activity tracking for idle auto-lock
  React.useEffect(() => {
    const handleUserActivity = () => recordActivity();
    window.addEventListener('pointerdown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    return () => {
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [recordActivity]);

  const handleHoldCurrentOrder = async () => {
    if (!currentUser || !currentOutlet || items.length === 0) return;
    try {
      const repo = getRepository();
      const orderNumber = `HOLD-${Date.now().toString().slice(-4)}`;
      const held = await repo.holdOrder({
        business_id: currentOutlet.business_id,
        outlet_id: currentOutlet.id,
        shift_id: currentShift?.id || null,
        user_id: currentUser.id,
        order_number: orderNumber,
        order_type: 'retail',
        status: 'hold',
        payment_status: 'unpaid',
        subtotal: totals.subtotal,
        discount_amount: totals.totalDiscount,
        tax_rate: taxSettings.ppn_percentage,
        tax_amount: totals.taxAmount,
        service_charge_rate: taxSettings.service_charge_percentage,
        service_charge_amount: totals.serviceChargeAmount,
        rounding_amount: totals.roundingAmount,
        grand_total: totals.grandTotal,
        paid_amount: 0,
        change_amount: 0,
        items: items.map((i) => ({
          id: `oi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          order_id: '',
          business_id: currentOutlet.business_id,
          product_id: i.product_id,
          variant_id: i.variant_id || null,
          product_name: i.product_name,
          variant_name: i.variant_name || null,
          sku: i.sku,
          buy_price: i.buy_price,
          unit_price: i.unit_price,
          quantity: i.quantity,
          subtotal: i.subtotal,
          discount_amount: i.item_discount,
          final_price: i.final_price,
          notes: i.notes,
          modifiers: i.modifiers,
          created_at: new Date().toISOString(),
        })),
      });

      setHeldOrders((prev) => [held, ...prev]);
      clearCart();
      showToast(`Pesanan #${orderNumber} berhasil di-hold!`, 'success');
    } catch {
      showToast('Gagal menyimpan pesanan hold', 'error');
    }
  };

  const handleResumeHeldOrder = async (heldOrder: Order) => {
    loadHeldOrder(heldOrder);
    const repo = getRepository();
    await repo.deleteHeldOrder(heldOrder.id);
    setHeldOrders((prev) => prev.filter((o) => o.id !== heldOrder.id));
    showToast(`Pesanan #${heldOrder.order_number} dibuka kembali ke keranjang`, 'info');
  };

  const handleDeleteHeldOrder = async (orderId: string) => {
    const repo = getRepository();
    await repo.deleteHeldOrder(orderId);
    setHeldOrders((prev) => prev.filter((o) => o.id !== orderId));
    showToast('Pesanan hold dihapus', 'info');
  };

  const handleOrderCompleted = (completedOrder: Order) => {
    setLastCompletedOrder(completedOrder);
    setIsReceiptOpen(true);
    // Refresh inventory and shift
    if (currentOutlet) {
      const repo = getRepository();
      repo.getInventory(currentOutlet.id).then(setInventory).catch(() => {});
      refreshShift(currentOutlet.id, currentUser?.id);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Top Header */}
      <Header
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        activeSection="pos"
      />

      {/* Main Content: Split 60% Left Grid, 40% Right Cart */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Product Catalog Section (~60%) */}
        <div className="flex-1 h-full overflow-hidden flex flex-col">
          <ProductGrid
            products={products}
            categories={categories}
            inventory={inventory}
            allowNegativeStock={taxSettings.allow_negative_stock}
          />
        </div>

        {/* Right Cart Section (~40%) - Desktop Landscape */}
        <div className="hidden lg:flex h-full shrink-0">
          <CartPanel
            onOpenCheckout={() => setIsCheckoutOpen(true)}
            onHoldOrder={handleHoldCurrentOrder}
            onOpenHeldOrders={() => setIsHoldModalOpen(true)}
            heldOrdersCount={heldOrders.length}
            tables={tables}
          />
        </div>

        {/* Mobile / Portrait Bottom Cart Floating Button */}
        <div className="lg:hidden absolute bottom-4 right-4 z-40">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3.5 rounded-2xl shadow-xl shadow-emerald-600/40 active:scale-95 transition-all"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Keranjang ({items.reduce((s, i) => s + i.quantity, 0)})</span>
            <span className="font-extrabold tabular-nums pl-1">
              • {formatRupiah(totals.grandTotal)}
            </span>
          </button>
        </div>

        {/* Mobile Cart Drawer Overlay */}
        {isMobileCartOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-slate-950/60 backdrop-blur-sm animate-in fade-in-0">
            <div
              className="flex-1"
              onClick={() => setIsMobileCartOpen(false)}
            />
            <div className="h-[88vh] w-full bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom">
              <div className="p-3 border-b flex justify-between items-center">
                <span className="font-bold text-base">Keranjang Kasir</span>
                <button
                  onClick={() => setIsMobileCartOpen(false)}
                  className="text-xs font-semibold text-slate-500 p-1"
                >
                  Tutup
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <CartPanel
                  onOpenCheckout={() => {
                    setIsMobileCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  onHoldOrder={handleHoldCurrentOrder}
                  onOpenHeldOrders={() => {
                    setIsMobileCartOpen(false);
                    setIsHoldModalOpen(true);
                  }}
                  heldOrdersCount={heldOrders.length}
                  tables={tables}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        onOrderCompleted={handleOrderCompleted}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        order={lastCompletedOrder}
        template={receiptTemplate}
        cashier={currentUser || undefined}
      />

      {/* Held Orders Modal */}
      <HoldOrdersModal
        open={isHoldModalOpen}
        onOpenChange={setIsHoldModalOpen}
        heldOrders={heldOrders}
        onResumeOrder={handleResumeHeldOrder}
        onDeleteHeldOrder={handleDeleteHeldOrder}
      />

      {/* Shift Management Modal */}
      <ShiftModal
        open={isShiftModalOpen}
        onOpenChange={setIsShiftModalOpen}
        onShiftClosed={(closedShift) => {
          showToast(`Shift #${closedShift.id} berhasil ditutup`, 'success');
        }}
      />

      {/* Manager Auth Modal for Sensitive Operations */}
      <ManagerAuthModal
        open={isManagerAuthOpen}
        onOpenChange={setIsManagerAuthOpen}
        title={managerActionTitle}
        onAuthorized={(mgr) => {
          if (pendingManagerAction) {
            pendingManagerAction();
            setPendingManagerAction(null);
          }
        }}
      />
    </div>
  );
}
