'use client';

import * as React from 'react';
import { useCartStore } from '@/store/useCartStore';
import { formatRupiah } from '@/lib/domain/money';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Trash2,
  Plus,
  Minus,
  Tag,
  FileText,
  User as UserIcon,
  ShoppingBag,
  PauseCircle,
  RotateCcw,
  Percent,
  CreditCard,
  UtensilsCrossed,
} from 'lucide-react';
import { CustomerModal } from './CustomerModal';
import { Customer, DiningTable, OrderType } from '@/types';
import { useToast } from '@/components/ui/toast';

interface CartPanelProps {
  onOpenCheckout: () => void;
  onHoldOrder: () => void;
  onOpenHeldOrders: () => void;
  heldOrdersCount: number;
  tables: DiningTable[];
}

export function CartPanel({
  onOpenCheckout,
  onHoldOrder,
  onOpenHeldOrders,
  heldOrdersCount,
  tables,
}: CartPanelProps) {
  const {
    items,
    selectedCustomer,
    selectedTable,
    orderType,
    transactionDiscount,
    totals,
    incrementQuantity,
    decrementQuantity,
    updateItemDiscount,
    updateItemNotes,
    removeItem,
    clearCart,
    setCustomer,
    setTable,
    setOrderType,
    setTransactionDiscount,
  } = useCartStore();

  const { showToast } = useToast();

  // Dialog states for item note and item discount
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [itemNoteText, setItemNoteText] = React.useState('');
  const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false);

  const [itemDiscountValue, setItemDiscountValue] = React.useState('');
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = React.useState(false);

  // Transaction Discount Dialog
  const [isTxDiscountDialogOpen, setIsTxDiscountDialogOpen] = React.useState(false);
  const [txDiscountType, setTxDiscountType] = React.useState<'percentage' | 'fixed'>('percentage');
  const [txDiscountValue, setTxDiscountValue] = React.useState('');

  // Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);

  // Table Selector Modal
  const [isTableModalOpen, setIsTableModalOpen] = React.useState(false);

  // Keyboard shortcut listener: F4 opens checkout
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        if (items.length > 0) {
          onOpenCheckout();
        } else {
          showToast('Keranjang masih kosong', 'info');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, onOpenCheckout, showToast]);

  const handleOpenItemNote = (itemId: string, currentNote: string = '') => {
    setEditingItemId(itemId);
    setItemNoteText(currentNote);
    setIsNoteDialogOpen(true);
  };

  const handleSaveItemNote = () => {
    if (editingItemId) {
      updateItemNotes(editingItemId, itemNoteText);
      setIsNoteDialogOpen(false);
      showToast('Catatan item disimpan', 'info');
    }
  };

  const handleOpenItemDiscount = (itemId: string, currentDiscount: number = 0) => {
    setEditingItemId(itemId);
    setItemDiscountValue(currentDiscount > 0 ? currentDiscount.toString() : '');
    setIsDiscountDialogOpen(true);
  };

  const handleSaveItemDiscount = () => {
    if (editingItemId) {
      const disc = parseInt(itemDiscountValue, 10) || 0;
      updateItemDiscount(editingItemId, disc);
      setIsDiscountDialogOpen(false);
      showToast('Diskon item diterapkan', 'success');
    }
  };

  const handleApplyTxDiscount = () => {
    const val = parseInt(txDiscountValue, 10) || 0;
    if (val > 0) {
      setTransactionDiscount({ type: txDiscountType, value: val });
      showToast('Diskon transaksi diterapkan', 'success');
    } else {
      setTransactionDiscount(null);
    }
    setIsTxDiscountDialogOpen(false);
  };

  return (
    <div className="w-full lg:w-[420px] xl:w-[460px] h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-lg select-none">
      {/* Top Header: Order Type, Table & Customer */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Order Type Pills */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
          {[
            { id: 'retail', label: 'Retail' },
            { id: 'dine_in', label: 'Dine In' },
            { id: 'takeaway', label: 'Bungkus' },
            { id: 'delivery', label: 'Kirim' },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setOrderType(type.id as OrderType)}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                orderType === type.id
                  ? 'bg-white text-slate-950 dark:bg-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Customer & Table Selectors */}
        <div className="flex items-center space-x-2">
          {/* Customer Button */}
          <button
            type="button"
            onClick={() => setIsCustomerModalOpen(true)}
            className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
          >
            <div className="flex items-center space-x-2 truncate">
              <UserIcon className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold truncate">
                {selectedCustomer ? selectedCustomer.name : 'Pilih Pelanggan'}
              </span>
            </div>
            {selectedCustomer && (
              <Badge variant="success" className="text-[10px] py-0 px-1 font-bold shrink-0">
                {selectedCustomer.points_balance} Poin
              </Badge>
            )}
          </button>

          {/* Table Selector (if Dine-in) */}
          {orderType === 'dine_in' && (
            <button
              type="button"
              onClick={() => setIsTableModalOpen(true)}
              className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
            >
              <div className="flex items-center space-x-2 truncate">
                <UtensilsCrossed className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-semibold truncate">
                  {selectedTable ? selectedTable.name : 'Pilih Meja'}
                </span>
              </div>
            </button>
          )}

          {/* Held Orders quick button */}
          <button
            type="button"
            onClick={onOpenHeldOrders}
            className="p-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-1 text-xs font-semibold shrink-0"
            title="Daftar Pesanan Disimpan (Hold)"
          >
            <PauseCircle className="h-4 w-4 text-amber-500" />
            <span>{heldOrdersCount}</span>
          </button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <ShoppingBag className="h-12 w-12 stroke-[1.5] mb-2 opacity-40 text-slate-400" />
            <p className="font-semibold text-sm">Keranjang Masih Kosong</p>
            <p className="text-xs text-slate-400 mt-1">
              Sentuh atau scan barcode produk di sebelah kiri untuk mulai transaksi
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm flex flex-col space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                    {item.product_name}
                  </h4>
                  {item.variant_name && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Varian: {item.variant_name}
                    </span>
                  )}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {item.modifiers.map((m, idx) => (
                        <span key={idx} className="mr-1.5">
                          +{m.option_name}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 italic mt-0.5">
                      &quot;{item.notes}&quot;
                    </p>
                  )}
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Price, Quantity Counter & Subtotal */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => decrementQuantity(item.id)}
                    className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center font-bold text-sm tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => incrementQuantity(item.id)}
                    className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>

                  {/* Actions: Notes & Discount */}
                  <button
                    type="button"
                    onClick={() => handleOpenItemNote(item.id, item.notes)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Tambah Catatan Item"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenItemDiscount(item.id, item.item_discount)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    title="Diskon Item"
                  >
                    <Tag className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="text-right">
                  {item.item_discount > 0 && (
                    <span className="text-[11px] text-red-500 block line-through">
                      {formatRupiah(item.subtotal)}
                    </span>
                  )}
                  <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatRupiah(item.final_price)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Financial Calculations Summary */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 space-y-2">
        {/* Discount Trigger Bar */}
        <div className="flex items-center justify-between text-xs pb-1">
          <button
            type="button"
            onClick={() => setIsTxDiscountDialogOpen(true)}
            className="flex items-center space-x-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold"
          >
            <Percent className="h-3.5 w-3.5" />
            <span>
              {transactionDiscount
                ? `Diskon: ${
                    transactionDiscount.type === 'percentage'
                      ? `${transactionDiscount.value}%`
                      : formatRupiah(transactionDiscount.value)
                  }`
                : '+ Tambah Diskon / Promo'}
            </span>
          </button>

          {transactionDiscount && (
            <button
              type="button"
              onClick={() => setTransactionDiscount(null)}
              className="text-[11px] text-red-500 hover:underline"
            >
              Hapus Diskon
            </button>
          )}
        </div>

        {/* Subtotal, Tax, Rounding breakdown */}
        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex justify-between">
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} item)</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {formatRupiah(totals.subtotal)}
            </span>
          </div>

          {totals.totalDiscount > 0 && (
            <div className="flex justify-between text-red-600 dark:text-red-400 font-medium">
              <span>Total Diskon</span>
              <span className="tabular-nums">-{formatRupiah(totals.totalDiscount)}</span>
            </div>
          )}

          {totals.taxAmount > 0 && (
            <div className="flex justify-between">
              <span>PPN (11%)</span>
              <span className="tabular-nums">{formatRupiah(totals.taxAmount)}</span>
            </div>
          )}

          {totals.serviceChargeAmount > 0 && (
            <div className="flex justify-between">
              <span>Biaya Layanan</span>
              <span className="tabular-nums">{formatRupiah(totals.serviceChargeAmount)}</span>
            </div>
          )}

          {totals.roundingAmount !== 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Pembulatan</span>
              <span className="tabular-nums">{formatRupiah(totals.roundingAmount)}</span>
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            TOTAL PEMBAYARAN
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatRupiah(totals.grandTotal)}
          </span>
        </div>

        {/* Big Action Buttons */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={clearCart}
            disabled={items.length === 0}
            className="h-14 rounded-xl flex flex-col items-center justify-center p-1 border-slate-300 dark:border-slate-700"
            title="Kosongkan Keranjang"
          >
            <RotateCcw className="h-4 w-4 mb-0.5 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Batal</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onHoldOrder}
            disabled={items.length === 0}
            className="h-14 rounded-xl flex flex-col items-center justify-center p-1 border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/30"
            title="Simpan Sementara (Hold)"
          >
            <PauseCircle className="h-4 w-4 mb-0.5 text-amber-600" />
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">Hold</span>
          </Button>

          <Button
            type="button"
            onClick={onOpenCheckout}
            disabled={items.length === 0}
            className="col-span-2 h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-lg flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all"
          >
            <CreditCard className="h-6 w-6" />
            <span>BAYAR [F4]</span>
          </Button>
        </div>
      </div>

      {/* Customer Modal */}
      <CustomerModal
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setCustomer}
      />

      {/* Table Selection Modal (F&B) */}
      <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
        <DialogContent onClose={() => setIsTableModalOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Meja Dine In</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 my-2">
            {tables.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTable(t);
                  setIsTableModalOpen(false);
                  showToast(`Meja ${t.name} dipilih`, 'info');
                }}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedTable?.id === t.id
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold dark:bg-emerald-950 dark:text-white'
                    : t.status === 'occupied'
                    ? 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'
                }`}
              >
                <div className="text-sm font-bold">{t.name}</div>
                <div className="text-[10px] text-slate-400">Kapasitas {t.capacity}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent onClose={() => setIsNoteDialogOpen(false)} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Catatan Khusus Item</DialogTitle>
          </DialogHeader>
          <div className="my-2">
            <Input
              value={itemNoteText}
              onChange={(e) => setItemNoteText(e.target.value)}
              placeholder="Contoh: Kurang es, pisah saus..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveItemNote} className="bg-emerald-600 hover:bg-emerald-700">
              Simpan Catatan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Discount Dialog */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent onClose={() => setIsDiscountDialogOpen(false)} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Diskon Item (Nominal Rupiah)</DialogTitle>
          </DialogHeader>
          <div className="my-2 space-y-2">
            <Input
              type="number"
              value={itemDiscountValue}
              onChange={(e) => setItemDiscountValue(e.target.value)}
              placeholder="Masukkan nominal rupiah, cth: 5000"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveItemDiscount} className="bg-emerald-600 hover:bg-emerald-700">
              Terapkan Diskon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Discount Dialog */}
      <Dialog open={isTxDiscountDialogOpen} onOpenChange={setIsTxDiscountDialogOpen}>
        <DialogContent onClose={() => setIsTxDiscountDialogOpen(false)} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Diskon / Promo Transaksi</DialogTitle>
          </DialogHeader>
          <div className="my-2 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxDiscountType('percentage')}
                className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                  txDiscountType === 'percentage'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                Persen (%)
              </button>
              <button
                type="button"
                onClick={() => setTxDiscountType('fixed')}
                className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                  txDiscountType === 'fixed'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                Nominal (Rp)
              </button>
            </div>

            <Input
              type="number"
              value={txDiscountValue}
              onChange={(e) => setTxDiscountValue(e.target.value)}
              placeholder={txDiscountType === 'percentage' ? 'Cth: 10 untuk 10%' : 'Cth: 15000'}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleApplyTxDiscount} className="bg-emerald-600 hover:bg-emerald-700">
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
