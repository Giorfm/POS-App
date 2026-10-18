'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Order, ReceiptTemplate, User } from '@/types';
import { formatRupiah } from '@/lib/domain/money';
import { formatDateTimeId } from '@/lib/utils';
import { printService } from '@/lib/printer/printService';
import { Printer, Share2, Copy, Check, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  template: ReceiptTemplate;
  cashier?: User;
  onFinished?: () => void;
  initialDuplicate?: boolean;
}

export function ReceiptModal({
  open,
  onOpenChange,
  order,
  template,
  cashier,
  onFinished,
  initialDuplicate = false,
}: ReceiptModalProps) {
  const { showToast } = useToast();
  const [isDuplicate, setIsDuplicate] = React.useState(initialDuplicate);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  React.useEffect(() => {
    setIsDuplicate(initialDuplicate);
  }, [initialDuplicate, open]);

  if (!order) return null;

  const handlePrint = async (asDuplicate: boolean = false) => {
    setIsPrinting(true);
    const result = await printService.printReceipt(order, template, cashier, asDuplicate);
    setIsPrinting(false);
    if (result.success) {
      showToast(result.message, 'success');
      setIsDuplicate(true);
    } else {
      showToast(result.message, 'error');
    }
  };

  const digitalReceiptUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/receipt/${order.id}`
    : `https://nusantara-pos.app/receipt/${order.id}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(digitalReceiptUrl);
      setCopiedLink(true);
      showToast('Tautan struk digital berhasil disalin!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo! Berikut struk belanja Anda di *${template.header_title}*.\n` +
      `No. Nota: ${order.order_number}\n` +
      `Tanggal: ${formatDateTimeId(order.created_at)}\n` +
      `Total Belanja: *${formatRupiah(order.grand_total)}*\n` +
      `Metode: ${order.payment_method?.toUpperCase()}\n\n` +
      `Lihat struk digital lengkap di:\n${digitalReceiptUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleClose = () => {
    onOpenChange(false);
    if (onFinished) onFinished();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={handleClose} className="max-w-md p-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
        <DialogHeader className="p-4 pb-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-lg">Pratinjau Struk Belanja</DialogTitle>
        </DialogHeader>

        {/* Thermal Receipt Paper Viewport */}
        <div className="max-h-[60vh] overflow-y-auto p-4 flex justify-center">
          <div
            id="thermal-receipt-printable"
            className="w-[320px] bg-white p-5 font-mono text-xs leading-relaxed text-slate-900 shadow-md border border-slate-200 rounded-sm relative select-text"
            style={{ minHeight: '380px' }}
          >
            {/* Watermark SALINAN */}
            {isDuplicate && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <span className="text-4xl font-extrabold text-red-600 rotate-[-30deg] border-4 border-red-600 px-4 py-2 rounded-lg">
                  SALINAN
                </span>
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-3">
              <h1 className="text-base font-extrabold tracking-wide uppercase">
                {template.header_title}
              </h1>
              {template.address_line1 && <p className="text-[11px] text-slate-600">{template.address_line1}</p>}
              {template.address_line2 && <p className="text-[11px] text-slate-600">{template.address_line2}</p>}
              {template.phone && <p className="text-[11px] text-slate-600">Telp: {template.phone}</p>}
              <div className="border-b border-dashed border-slate-400 my-2" />
            </div>

            {/* Order Info */}
            <div className="space-y-0.5 text-[11px] mb-2">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{formatDateTimeId(order.created_at)}</span>
              </div>
              {template.show_cashier_name && (
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{cashier?.name || 'Kasir 1'}</span>
                </div>
              )}
              {order.queue_number && (
                <div className="flex justify-between font-bold text-slate-900">
                  <span>No. Antrean:</span>
                  <span>#{order.queue_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tipe:</span>
                <span className="uppercase">{order.order_type}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Item List */}
            <div className="space-y-2 text-[11px] mb-2">
              {order.items.map((item) => (
                <div key={item.id}>
                  <div className="font-semibold text-slate-900">
                    {item.product_name}
                    {item.variant_name ? ` (${item.variant_name})` : ''}
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>
                      {item.quantity} x {formatRupiah(item.unit_price)}
                    </span>
                    <span>{formatRupiah(item.final_price)}</span>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="pl-2 text-[10px] text-slate-500">
                      {item.modifiers.map((m, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>+ {m.option_name}</span>
                          {m.price > 0 && <span>{formatRupiah(m.price * item.quantity)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.discount_amount > 0 && (
                    <div className="flex justify-between text-[10px] text-red-600 pl-2">
                      <span>(Diskon Item)</span>
                      <span>-{formatRupiah(item.discount_amount)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Calculations */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon Transaksi</span>
                  <span>-{formatRupiah(order.discount_amount)}</span>
                </div>
              )}
              {template.show_tax_details && order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span>PPN ({order.tax_rate}%)</span>
                  <span>{formatRupiah(order.tax_amount)}</span>
                </div>
              )}
              {order.service_charge_amount > 0 && (
                <div className="flex justify-between">
                  <span>Biaya Layanan ({order.service_charge_rate}%)</span>
                  <span>{formatRupiah(order.service_charge_amount)}</span>
                </div>
              )}
              {order.rounding_amount !== 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Pembulatan</span>
                  <span>{formatRupiah(order.rounding_amount)}</span>
                </div>
              )}

              <div className="border-b border-double border-slate-800 my-1" />

              <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-0.5">
                <span>TOTAL</span>
                <span>{formatRupiah(order.grand_total)}</span>
              </div>

              <div className="border-b border-dashed border-slate-400 my-1" />

              <div className="flex justify-between pt-0.5">
                <span className="uppercase">Bayar ({order.payment_method || 'TUNAI'})</span>
                <span>{formatRupiah(order.paid_amount || order.grand_total)}</span>
              </div>
              {order.change_amount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Kembalian</span>
                  <span>{formatRupiah(order.change_amount)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-b border-dashed border-slate-400 my-3" />
            <div className="text-center text-[10px] text-slate-600 whitespace-pre-line">
              {template.footer_message}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handlePrint(false)}
              disabled={isPrinting}
              className="h-11 bg-emerald-600 hover:bg-emerald-700 font-bold"
            >
              <Printer className="mr-2 h-4 w-4" />
              {isPrinting ? 'Mencetak...' : 'Cetak Thermal'}
            </Button>
            <Button
              onClick={() => handlePrint(true)}
              disabled={isPrinting}
              variant="outline"
              className="h-11 font-semibold"
            >
              <Printer className="mr-2 h-4 w-4" />
              Cetak Salinan
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleSendWhatsApp}
              variant="outline"
              className="h-10 text-emerald-700 border-emerald-300 dark:border-emerald-800 dark:text-emerald-400 font-medium"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="h-10 text-slate-700 dark:text-slate-300 font-medium"
            >
              {copiedLink ? <Check className="mr-2 h-4 w-4 text-emerald-600" /> : <Copy className="mr-2 h-4 w-4" />}
              {copiedLink ? 'Tersalin' : 'Salin Tautan'}
            </Button>
          </div>

          <Button onClick={handleClose} variant="secondary" className="w-full h-10 mt-1 font-bold">
            Selesai / Transaksi Baru
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
