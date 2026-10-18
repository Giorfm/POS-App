'use client';

import * as React from 'react';
import Link from 'next/link';
import { getRepository } from '@/lib/repository';
import { Order, DiningTable } from '@/types';
import { formatTimeOnlyId } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { soundFeedback } from '@/lib/audio';
import { useToast } from '@/components/ui/toast';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  BellRing,
  ArrowLeft,
  Printer,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function KitchenDisplayPage() {
  const { currentOutlet } = useAuthStore();
  const { showToast } = useToast();

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [tables, setTables] = React.useState<DiningTable[]>([]);
  const [filter, setFilter] = React.useState<'all' | 'queued' | 'preparing' | 'ready'>('all');

  const loadKdsOrders = React.useCallback(async () => {
    if (!currentOutlet) return;
    try {
      const repo = getRepository();
      const [ordList, tblList] = await Promise.all([
        repo.getKdsOrders(currentOutlet.id),
        repo.getDiningTables(currentOutlet.id),
      ]);
      setOrders(ordList);
      setTables(tblList);
    } catch (err) {
      console.error('KDS load error:', err);
    }
  }, [currentOutlet]);

  React.useEffect(() => {
    loadKdsOrders();

    // Subscribe to new orders realtime
    const repo = getRepository();
    const unsubscribe = repo.subscribeToEvents((event) => {
      if (event.event_type === 'order.created') {
        soundFeedback.playScanSuccess();
        loadKdsOrders();
      }
    });

    const timer = setInterval(() => {
      loadKdsOrders();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [loadKdsOrders]);

  const handleUpdateStatus = async (orderId: string, nextStatus: Order['kitchen_status']) => {
    try {
      const repo = getRepository();
      await repo.updateKitchenStatus(orderId, nextStatus);
      soundFeedback.playPaymentSuccess();
      loadKdsOrders();
      showToast(`Status pesanan diperbarui menjadi: ${nextStatus?.toUpperCase()}`, 'success');
    } catch {
      showToast('Gagal memperbarui status dapur', 'error');
    }
  };

  const handleCallQueue = (order: Order) => {
    soundFeedback.playPaymentSuccess();
    showToast(`Memanggil Antrean #${order.queue_number || order.order_number}`, 'info');
  };

  const filteredOrders = React.useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.kitchen_status === filter);
  }, [orders, filter]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-white font-sans select-none">
      {/* Top KDS Bar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <Link
            href="/pos"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">KITCHEN DISPLAY SYSTEM (KDS)</h1>
              <p className="text-[11px] text-slate-400">
                Layar Antrean Pesanan Dapur &amp; Bar • {currentOutlet?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-800 p-1 rounded-xl">
          {[
            { id: 'all', label: 'Semua Antrean' },
            { id: 'queued', label: 'Menunggu' },
            { id: 'preparing', label: 'Dimasak' },
            { id: 'ready', label: 'Siap Saji' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Orders Columns / Cards Grid */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
        {filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <UtensilsCrossed className="h-16 w-16 mb-3 stroke-[1.2] opacity-30" />
            <h2 className="text-lg font-bold text-slate-400">Tidak Ada Pesanan di Dapur</h2>
            <p className="text-xs text-slate-500 mt-1">
              Pesanan baru dari kasir dengan tipe F&amp;B akan otomatis muncul di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const table = tables.find((t) => t.id === order.dining_table_id);
              const isQueued = order.kitchen_status === 'queued';
              const isPreparing = order.kitchen_status === 'preparing';
              const isReady = order.kitchen_status === 'ready';

              const cardBorder = isReady
                ? 'border-emerald-500 shadow-emerald-500/10'
                : isPreparing
                ? 'border-amber-500 shadow-amber-500/10'
                : 'border-slate-800';

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border bg-slate-900 shadow-lg flex flex-col justify-between overflow-hidden transition-all ${cardBorder}`}
                >
                  {/* Card Header */}
                  <div
                    className={`p-3.5 border-b flex items-center justify-between ${
                      isReady
                        ? 'bg-emerald-950/40 border-emerald-900/60'
                        : isPreparing
                        ? 'bg-amber-950/40 border-amber-900/60'
                        : 'bg-slate-850 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-base text-white">
                          #{order.queue_number || order.order_number}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {order.order_type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeOnlyId(order.created_at)}</span>
                        {table && <span className="font-bold text-amber-400">• {table.name}</span>}
                      </div>
                    </div>

                    <Badge
                      className={`text-[10px] uppercase font-bold ${
                        isReady
                          ? 'bg-emerald-600 text-white'
                          : isPreparing
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isReady ? 'SIAP SAJI' : isPreparing ? 'DIMASAK' : 'MENUNGGU'}
                    </Badge>
                  </div>

                  {/* Order Items List */}
                  <div className="p-4 flex-1 space-y-3 divide-y divide-slate-800/80">
                    {order.items.map((item, idx) => (
                      <div key={idx} className={idx > 0 ? 'pt-2' : ''}>
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-sm text-slate-100 leading-snug">
                            {item.quantity}x {item.product_name}
                          </span>
                        </div>

                        {item.variant_name && (
                          <div className="text-xs font-semibold text-emerald-400 pl-4">
                            Varian: {item.variant_name}
                          </div>
                        )}

                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="text-[11px] text-slate-400 pl-4 space-y-0.5 mt-0.5">
                            {item.modifiers.map((m, mIdx) => (
                              <div key={mIdx}>+ {m.option_name}</div>
                            ))}
                          </div>
                        )}

                        {item.notes && (
                          <div className="text-[11px] text-amber-400 pl-4 italic mt-0.5 font-medium">
                            Catatan: &quot;{item.notes}&quot;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-3 bg-slate-850 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleCallQueue(order)}
                      title="Panggil Nomor Antrean"
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    >
                      <BellRing className="h-4 w-4" />
                    </button>

                    {isQueued && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                        className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                      >
                        <Flame className="h-4 w-4 mr-1.5" />
                        Mulai Masak
                      </Button>
                    )}

                    {isPreparing && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, 'ready')}
                        className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Tandai Siap Saji
                      </Button>
                    )}

                    {isReady && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, 'served')}
                        className="flex-1 h-10 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Selesai Disajikan
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
