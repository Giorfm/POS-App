'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Order } from '@/types';
import { formatRupiah } from '@/lib/domain/money';
import { formatDateTimeId } from '@/lib/utils';
import { PauseCircle, PlayCircle, Trash2, Clock, ShoppingCart } from 'lucide-react';

interface HoldOrdersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heldOrders: Order[];
  onResumeOrder: (order: Order) => void;
  onDeleteHeldOrder: (orderId: string) => void;
}

export function HoldOrdersModal({
  open,
  onOpenChange,
  heldOrders,
  onResumeOrder,
  onDeleteHeldOrder,
}: HoldOrdersModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg max-h-[80vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <PauseCircle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Daftar Pesanan Disimpan (Hold)</DialogTitle>
          </div>
          <DialogDescription>
            Pilih pesanan yang ingin dibuka kembali ke keranjang kasir.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2.5 my-2 pr-1">
          {heldOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Tidak ada pesanan yang di-hold</p>
            </div>
          ) : (
            heldOrders.map((order) => (
              <div
                key={order.id}
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm flex items-center justify-between transition-all hover:border-emerald-400"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {order.order_number}
                    </span>
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full uppercase">
                      {order.order_type}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center space-x-2">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDateTimeId(order.created_at)}
                    </span>
                    <span>• {order.items.length} item</span>
                  </div>

                  <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 pt-0.5">
                    {formatRupiah(order.grand_total)}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      onResumeOrder(order);
                      onOpenChange(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                  >
                    <PlayCircle className="h-3.5 w-3.5 mr-1" />
                    Buka Lagi
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteHeldOrder(order.id)}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
