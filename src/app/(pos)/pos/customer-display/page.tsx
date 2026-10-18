'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { useCartStore } from '@/store/useCartStore';
import { formatRupiah } from '@/lib/domain/money';
import { getRepository } from '@/lib/repository';
import { Business } from '@/types';
import { SEED_BUSINESS } from '@/lib/db/seedData';
import { Store, ShoppingBag, QrCode, CheckCircle2, Sparkles } from 'lucide-react';

export default function CustomerDisplayPage() {
  const { items, totals } = useCartStore();
  const [business, setBusiness] = React.useState<Business>(SEED_BUSINESS);
  const [qrisDataUrl, setQrisDataUrl] = React.useState<string>('');
  const [isPaid, setIsPaid] = React.useState(false);

  React.useEffect(() => {
    const repo = getRepository();
    repo.getBusiness().then(setBusiness).catch(() => {});

    // Listen to completed orders
    const unsubscribe = repo.subscribeToEvents((event) => {
      if (event.event_type === 'order.created') {
        setIsPaid(true);
        setTimeout(() => setIsPaid(false), 4000);
      }
    });

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (totals.grandTotal > 0) {
      const payload = `00020101021226600016ID.CO.QRIS.WWW01189360052300000000000215ID1020000000010303UME51440014ID.LINKAJA.WWW01189360091100000000000215ID2020000000010303UME520458125303360540${totals.grandTotal}5802ID5915KEDAI NUSANTARA6007JAKARTA62070703A016304`;
      QRCode.toDataURL(payload, { width: 260, margin: 1 })
        .then((url) => setQrisDataUrl(url))
        .catch(() => {});
    }
  }, [totals.grandTotal]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-white font-sans select-none">
      {/* Top Banner */}
      <header className="h-20 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-500/20">
            P
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">{business.name}</h1>
            <p className="text-xs text-slate-400">Selamat Datang di Kasir Kami</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-4 py-2 rounded-xl">
          <Sparkles className="h-4 w-4" />
          <span>Layar Pelanggan Interaktif</span>
        </div>
      </header>

      {/* Main Body */}
      {isPaid ? (
        /* Thank You Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
          <div className="h-24 w-24 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-14 w-14" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">Pembayaran Berhasil!</h2>
          <p className="text-lg text-slate-300 mt-2">Terima kasih atas kunjungan Anda.</p>
          <p className="text-sm text-slate-500 mt-1">Silakan ambil struk belanja Anda di kasir.</p>
        </div>
      ) : items.length === 0 ? (
        /* Idle Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
          <ShoppingBag className="h-20 w-20 mb-4 stroke-[1.2] opacity-30" />
          <h2 className="text-2xl font-bold text-slate-300">Siap Melayani Anda</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            Rincian barang belanjaan Anda dan kode bayar QRIS akan langsung ditampilkan di layar ini saat kasir melakukan scan.
          </p>
        </div>
      ) : (
        /* Active Cart & QRIS Screen */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left: Items list (7 cols) */}
          <div className="lg:col-span-7 p-6 overflow-y-auto border-r border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Daftar Belanja Anda ({items.reduce((s, i) => s + i.quantity, 0)} item)
            </h3>

            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-base text-slate-100">{item.product_name}</h4>
                    {item.variant_name && (
                      <span className="text-xs font-semibold text-emerald-400">
                        Varian: {item.variant_name}
                      </span>
                    )}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {item.modifiers.map((m, idx) => (
                          <span key={idx} className="mr-2">
                            +{m.option_name}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-slate-400 block mt-1">
                      {item.quantity} x {formatRupiah(item.unit_price)}
                    </span>
                  </div>

                  <span className="font-extrabold text-lg text-white tabular-nums">
                    {formatRupiah(item.final_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Totals and QRIS (5 cols) */}
          <div className="lg:col-span-5 p-6 bg-slate-900/60 flex flex-col justify-between overflow-y-auto">
            {/* Calculation details */}
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-200 tabular-nums">
                  {formatRupiah(totals.subtotal)}
                </span>
              </div>
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-red-400 font-bold">
                  <span>Diskon:</span>
                  <span className="tabular-nums">-{formatRupiah(totals.totalDiscount)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>PPN (11%):</span>
                  <span className="tabular-nums">{formatRupiah(totals.taxAmount)}</span>
                </div>
              )}
              {totals.roundingAmount !== 0 && (
                <div className="flex justify-between text-slate-500 text-xs">
                  <span>Pembulatan:</span>
                  <span className="tabular-nums">{formatRupiah(totals.roundingAmount)}</span>
                </div>
              )}

              <div className="border-t border-slate-700/80 pt-3 flex justify-between items-center text-white">
                <span className="font-extrabold text-sm uppercase text-slate-300">Total Tagihan</span>
                <span className="text-3xl font-black text-emerald-400 tabular-nums">
                  {formatRupiah(totals.grandTotal)}
                </span>
              </div>
            </div>

            {/* QRIS Scan Box */}
            <div className="my-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center text-center">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300 mb-2">
                <QrColorIcon />
                <span>Pindai QRIS untuk Bayar Langsung</span>
              </div>

              {qrisDataUrl && (
                <div className="p-2.5 bg-white rounded-2xl shadow-xl mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrisDataUrl} alt="QRIS Pelanggan" className="h-44 w-44 mx-auto" />
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Mendukung m-BCA, Livin Mandiri, GoPay, OVO, ShopeePay, DANA &amp; semua aplikasi QRIS
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QrColorIcon() {
  return <QrCode className="h-4 w-4 text-emerald-400" />;
}
