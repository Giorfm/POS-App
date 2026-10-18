'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore } from '@/store/useShiftStore';
import { formatRupiah, calculateChange, calculateQuickCashSuggestions } from '@/lib/domain/money';
import { soundFeedback } from '@/lib/audio';
import { getRepository } from '@/lib/repository';
import { Order, PaymentMethod, Payment } from '@/types';
import { Banknote, QrCode, Split, CreditCard, Delete, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCompleted: (order: Order) => void;
}

export function CheckoutModal({
  open,
  onOpenChange,
  onOrderCompleted,
}: CheckoutModalProps) {
  const {
    items,
    totals,
    selectedCustomer,
    selectedTable,
    orderType,
    transactionDiscount,
    promoCode,
    notes,
    clearCart,
  } = useCartStore();

  const { currentUser, currentOutlet } = useAuthStore();
  const { currentShift } = useShiftStore();
  const { showToast } = useToast();

  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod | 'split'>('cash');
  const [tenderAmountStr, setTenderAmountStr] = React.useState<string>('');
  const [qrisQrDataUrl, setQrisQrDataUrl] = React.useState<string>('');
  const [qrisStatus, setQrisStatus] = React.useState<'pending' | 'success'>('pending');
  const [edcRefNumber, setEdcRefNumber] = React.useState('');
  const [splitCashStr, setSplitCashStr] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const grandTotal = totals.grandTotal;
  const tenderAmount = parseInt(tenderAmountStr, 10) || 0;
  const { changeAmount, isSufficient } = calculateChange(grandTotal, tenderAmount);
  const quickSuggestions = React.useMemo(() => calculateQuickCashSuggestions(grandTotal), [grandTotal]);

  // Reset and prepare QR code when modal opens
  React.useEffect(() => {
    if (open) {
      setPaymentMethod('cash');
      setTenderAmountStr(grandTotal.toString());
      setQrisStatus('pending');
      setEdcRefNumber('');
      setSplitCashStr(Math.round(grandTotal / 2).toString());
      setIsProcessing(false);

      // Generate dynamic QRIS string
      const qrisPayload = `00020101021226600016ID.CO.QRIS.WWW01189360052300000000000215ID1020000000010303UME51440014ID.LINKAJA.WWW01189360091100000000000215ID2020000000010303UME520458125303360540${grandTotal}5802ID5915KEDAI NUSANTARA6007JAKARTA62070703A016304`;
      QRCode.toDataURL(qrisPayload, { width: 220, margin: 1 })
        .then((url) => setQrisQrDataUrl(url))
        .catch(() => {});
    }
  }, [open, grandTotal]);

  const handleNumpadPress = (val: string) => {
    if (val === 'C') {
      setTenderAmountStr('');
    } else if (val === 'BACK') {
      setTenderAmountStr((prev) => prev.slice(0, -1));
    } else {
      setTenderAmountStr((prev) => prev + val);
    }
  };

  const handleProcessPayment = async () => {
    if (!currentUser || !currentOutlet) {
      showToast('Sesi kasir tidak valid', 'error');
      return;
    }

    if (paymentMethod === 'cash' && !isSufficient) {
      soundFeedback.playError();
      showToast('Uang pembayaran tunai kurang dari total belanja!', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const repo = getRepository();
      const biz = await repo.getBusiness();
      const taxSettings = await repo.getTaxSettings();

      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      const nowIso = new Date().toISOString();

      const payments: Payment[] = [];

      let paidAmount = grandTotal;
      let finalChange = 0;

      if (paymentMethod === 'cash') {
        paidAmount = tenderAmount;
        finalChange = changeAmount;
        payments.push({
          id: `pay_${Date.now()}_1`,
          order_id: '',
          business_id: biz.id,
          outlet_id: currentOutlet.id,
          shift_id: currentShift?.id || null,
          method: 'cash',
          amount: grandTotal,
          tender_amount: tenderAmount,
          change_amount: changeAmount,
          created_at: nowIso,
        });
      } else if (paymentMethod === 'qris') {
        payments.push({
          id: `pay_${Date.now()}_1`,
          order_id: '',
          business_id: biz.id,
          outlet_id: currentOutlet.id,
          shift_id: currentShift?.id || null,
          method: 'qris',
          amount: grandTotal,
          reference_number: `QRIS-${Date.now()}`,
          gateway_provider: 'Midtrans Sandbox / Simulator',
          gateway_status: 'settlement',
          created_at: nowIso,
        });
      } else if (paymentMethod === 'split') {
        const cashPart = parseInt(splitCashStr, 10) || 0;
        const nonCashPart = Math.max(0, grandTotal - cashPart);
        paidAmount = grandTotal;
        payments.push({
          id: `pay_${Date.now()}_1`,
          order_id: '',
          business_id: biz.id,
          outlet_id: currentOutlet.id,
          shift_id: currentShift?.id || null,
          method: 'cash',
          amount: cashPart,
          tender_amount: cashPart,
          change_amount: 0,
          created_at: nowIso,
        });
        payments.push({
          id: `pay_${Date.now()}_2`,
          order_id: '',
          business_id: biz.id,
          outlet_id: currentOutlet.id,
          shift_id: currentShift?.id || null,
          method: 'qris',
          amount: nonCashPart,
          reference_number: `SPLIT-${Date.now()}`,
          created_at: nowIso,
        });
      } else {
        payments.push({
          id: `pay_${Date.now()}_1`,
          order_id: '',
          business_id: biz.id,
          outlet_id: currentOutlet.id,
          shift_id: currentShift?.id || null,
          method: paymentMethod as PaymentMethod,
          amount: grandTotal,
          reference_number: edcRefNumber || `REF-${Date.now()}`,
          created_at: nowIso,
        });
      }

      const queueNumber = Math.floor(1 + Math.random() * 99);

      const createdOrder = await repo.createOrder({
        business_id: biz.id,
        outlet_id: currentOutlet.id,
        shift_id: currentShift?.id || null,
        user_id: currentUser.id,
        customer_id: selectedCustomer?.id || null,
        dining_table_id: selectedTable?.id || null,
        order_number: orderNumber,
        order_type: orderType,
        status: 'completed',
        payment_status: 'paid',
        subtotal: totals.subtotal,
        discount_amount: totals.totalDiscount,
        discount_type: transactionDiscount?.type || null,
        promo_code: promoCode,
        tax_rate: taxSettings.ppn_percentage,
        tax_amount: totals.taxAmount,
        service_charge_rate: taxSettings.service_charge_percentage,
        service_charge_amount: totals.serviceChargeAmount,
        rounding_amount: totals.roundingAmount,
        grand_total: grandTotal,
        paid_amount: paidAmount,
        change_amount: finalChange,
        payment_method: paymentMethod,
        notes,
        kitchen_status: orderType === 'retail' ? 'none' : 'queued',
        queue_number: queueNumber,
        items: items.map((i) => ({
          id: `oi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          order_id: '',
          business_id: biz.id,
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
          created_at: nowIso,
        })),
        payments,
      });

      // Sound chime
      soundFeedback.playPaymentSuccess();
      showToast(`Transaksi #${orderNumber} Berhasil Diselesaikan!`, 'success');

      // Clear cart
      clearCart();
      onOpenChange(false);

      // Trigger receipt modal
      onOrderCompleted(createdOrder);
    } catch (err: unknown) {
      console.error('Payment checkout error:', err);
      soundFeedback.playError();
      showToast('Gagal memproses pembayaran transaksi', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl p-0 overflow-hidden">
        {/* Header with Prominent Grand Total */}
        <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 block">
              Total Tagihan Belanja
            </span>
            <span className="text-3xl font-black tabular-nums">
              {formatRupiah(grandTotal)}
            </span>
          </div>

          <Badge className="bg-emerald-700/80 text-white text-xs px-3 py-1 font-semibold uppercase">
            {orderType} {selectedTable ? `• ${selectedTable.name}` : ''}
          </Badge>
        </div>

        {/* Payment Methods Tabs */}
        <div className="p-5">
          <Tabs value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as PaymentMethod | 'split')}>
            <TabsList className="grid grid-cols-4 w-full h-12 mb-4 bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="cash" className="flex items-center space-x-1.5 font-bold">
                <Banknote className="h-4 w-4" />
                <span>Tunai</span>
              </TabsTrigger>
              <TabsTrigger value="qris" className="flex items-center space-x-1.5 font-bold">
                <QrCode className="h-4 w-4" />
                <span>QRIS</span>
              </TabsTrigger>
              <TabsTrigger value="edc_debit" className="flex items-center space-x-1.5 font-bold">
                <CreditCard className="h-4 w-4" />
                <span>EDC / Kartu</span>
              </TabsTrigger>
              <TabsTrigger value="split" className="flex items-center space-x-1.5 font-bold">
                <Split className="h-4 w-4" />
                <span>Split Bayar</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: TUNAI (CASH) */}
            <TabsContent value="cash" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Quick Cash Suggestion buttons */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Pecahan Cepat Uang Tunai
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {quickSuggestions.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTenderAmountStr(amt.toString())}
                        className={`p-3 rounded-xl border text-sm font-bold text-center transition-all ${
                          tenderAmount === amt
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 dark:bg-emerald-950 dark:text-emerald-100'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850'
                        }`}
                      >
                        {amt === grandTotal ? 'UANG PAS' : formatRupiah(amt)}
                      </button>
                    ))}
                  </div>

                  {/* Kembalian Display Box */}
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between ${
                      isSufficient
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                        : 'border-red-300 bg-red-50 text-red-950 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-semibold block">
                        {isSufficient ? 'Uang Kembalian:' : 'Uang Kurang:'}
                      </span>
                      <span className="text-2xl font-black tabular-nums">
                        {isSufficient ? formatRupiah(changeAmount) : formatRupiah(grandTotal - tenderAmount)}
                      </span>
                    </div>
                    {isSufficient ? (
                      <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-7 w-7 text-red-500" />
                    )}
                  </div>
                </div>

                {/* Right: Keypad */}
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">Rp</span>
                    <Input
                      type="text"
                      value={tenderAmountStr}
                      onChange={(e) => setTenderAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Nominal uang diterima..."
                      className="pl-10 text-lg font-bold font-mono h-12 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '00'].map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleNumpadPress(key)}
                        className="h-11 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 text-base font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: QRIS */}
            <TabsContent value="qris" className="space-y-4">
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Pindai QRIS Dinamis Pelanggan
                </span>

                {qrisQrDataUrl ? (
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrisQrDataUrl} alt="QRIS Dinamis" className="h-48 w-48 mx-auto" />
                  </div>
                ) : (
                  <div className="h-48 w-48 bg-slate-200 animate-pulse rounded-2xl mb-3" />
                )}

                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Kedai Nusantara (Midtrans Sandbox / Auto Sim)
                  </p>
                  <p className="text-xs text-slate-500">
                    Mendukung BCA, Mandiri, GoPay, OVO, ShopeePay, DANA, dan semua m-Banking
                  </p>
                </div>

                {/* Simulation Button */}
                <div className="mt-4 flex space-x-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setQrisStatus('success');
                      soundFeedback.playPaymentSuccess();
                      showToast('Simulasi: Notifikasi pembayaran QRIS berhasil diterima!', 'success');
                    }}
                    className={`h-10 px-4 text-xs font-bold ${
                      qrisStatus === 'success'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    {qrisStatus === 'success' ? 'QRIS Terbayar (Lunas)' : 'Simulasi Pembayaran QRIS Masuk'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: EDC / KARTU */}
            <TabsContent value="edc_debit" className="space-y-3">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Pencatatan Transaksi Mesin EDC Manual
                </span>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nomor Referensi / Approval Code Mesin EDC *
                  </label>
                  <Input
                    value={edcRefNumber}
                    onChange={(e) => setEdcRefNumber(e.target.value)}
                    placeholder="Contoh: 849204 / 4111-XXXX-XXXX-1234"
                    className="font-mono"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400">
                    Gesek atau masukkan kartu ke mesin EDC fisik, lalu masukkan kode approval di sini untuk rekonsiliasi.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: SPLIT PAYMENT */}
            <TabsContent value="split" className="space-y-3">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Pembayaran Campuran (Tunai + QRIS / Non-Tunai)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bagian Tunai (Rp)
                    </label>
                    <Input
                      type="number"
                      value={splitCashStr}
                      onChange={(e) => setSplitCashStr(e.target.value)}
                      placeholder="Nominal tunai..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bagian Non-Tunai / QRIS (Rp)
                    </label>
                    <div className="h-11 px-3 flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg font-bold text-sm tabular-nums">
                      {formatRupiah(Math.max(0, grandTotal - (parseInt(splitCashStr, 10) || 0)))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Confirm & Process Button */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 mt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 px-6"
            >
              Kembali
            </Button>

            <Button
              type="button"
              onClick={handleProcessPayment}
              disabled={isProcessing}
              className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all"
            >
              {isProcessing ? 'Memproses...' : 'SELESAIKAN PEMBAYARAN & CETAK'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
