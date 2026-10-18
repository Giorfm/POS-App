'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { getRepository } from '@/lib/repository';
import { Order, ReceiptTemplate } from '@/types';
import { formatRupiah } from '@/lib/domain/money';
import { formatDateTimeId } from '@/lib/utils';
import { SEED_RECEIPT_TEMPLATE } from '@/lib/db/seedData';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle2 } from 'lucide-react';

export default function DigitalReceiptPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = React.useState<Order | null>(null);
  const [template, setTemplate] = React.useState<ReceiptTemplate>(SEED_RECEIPT_TEMPLATE);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (orderId) {
      const repo = getRepository();
      Promise.all([repo.getOrderById(orderId), repo.getReceiptTemplate()])
        .then(([ord, tmpl]) => {
          if (ord) setOrder(ord);
          if (tmpl) setTemplate(tmpl);
        })
        .finally(() => setIsLoading(false));
    }
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">Memuat struk digital...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border text-center shadow-lg max-w-sm">
          <p className="font-bold text-slate-800 dark:text-slate-200">Struk Tidak Ditemukan</p>
          <p className="text-xs text-slate-400 mt-1">Nomor nota atau tautan tidak valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Thermal receipt card */}
      <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-xl border border-slate-200 font-mono text-xs text-slate-900 relative">
        <div className="text-center mb-3">
          <div className="mx-auto h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-base font-extrabold uppercase tracking-wide">
            {template.header_title}
          </h1>
          {template.address_line1 && <p className="text-[11px] text-slate-600">{template.address_line1}</p>}
          {template.phone && <p className="text-[11px] text-slate-600">Telp: {template.phone}</p>}
          <div className="border-b border-dashed border-slate-400 my-2" />
        </div>

        {/* Metadata */}
        <div className="space-y-0.5 text-[11px] mb-2">
          <div className="flex justify-between">
            <span>No. Nota:</span>
            <span className="font-bold">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Waktu:</span>
            <span>{formatDateTimeId(order.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-bold text-emerald-700 uppercase">LUNAS</span>
          </div>
        </div>

        <div className="border-b border-dashed border-slate-400 my-2" />

        {/* Items */}
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
            </div>
          ))}
        </div>

        <div className="border-b border-dashed border-slate-400 my-2" />

        {/* Calculation */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Diskon</span>
              <span>-{formatRupiah(order.discount_amount)}</span>
            </div>
          )}
          {order.tax_amount > 0 && (
            <div className="flex justify-between">
              <span>PPN ({order.tax_rate}%)</span>
              <span>{formatRupiah(order.tax_amount)}</span>
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
          <div className="flex justify-between pt-0.5">
            <span className="uppercase">Metode Bayar</span>
            <span className="font-bold uppercase">{order.payment_method || 'TUNAI'}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-slate-400 my-3" />
        <div className="text-center text-[10px] text-slate-600 whitespace-pre-line">
          {template.footer_message}
        </div>
      </div>

      <Button
        onClick={() => window.print()}
        className="mt-4 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold"
      >
        <Printer className="mr-2 h-4 w-4" />
        Cetak / Simpan PDF
      </Button>
    </div>
  );
}
