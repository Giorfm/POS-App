'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getRepository } from '@/lib/repository';
import { Order, User, Category } from '@/types';
import { formatRupiah } from '@/lib/domain/money';
import { formatDateTimeId } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { BarChart3, Download, ShieldAlert, DollarSign, Printer, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function ReportsPage() {
  const { currentOutlet } = useAuthStore();
  const { showToast } = useToast();

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [activeTab, setActiveTab] = React.useState('financial');

  React.useEffect(() => {
    if (currentOutlet) {
      const repo = getRepository();
      Promise.all([
        repo.getOrders({ outletId: currentOutlet.id }),
        repo.getUsers(),
        repo.getCategories(),
      ]).then(([ordList, uList, catList]) => {
        setOrders(ordList);
        setUsers(uList);
        setCategories(catList);
      });
    }
  }, [currentOutlet]);

  const completedOrders = React.useMemo(() => {
    return orders.filter((o) => o.status === 'completed');
  }, [orders]);

  const voidedAndRefundedOrders = React.useMemo(() => {
    return orders.filter((o) => o.status === 'cancelled' || o.status === 'refunded');
  }, [orders]);

  // Financial aggregates
  const totalGrossSales = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalDiscounts = completedOrders.reduce((sum, o) => sum + o.discount_amount, 0);
  const totalNetSales = Math.max(0, totalGrossSales - totalDiscounts);
  const totalTaxPpn = completedOrders.reduce((sum, o) => sum + o.tax_amount, 0);
  const totalServiceCharge = completedOrders.reduce((sum, o) => sum + o.service_charge_amount, 0);
  const totalGrandRevenue = completedOrders.reduce((sum, o) => sum + o.grand_total, 0);

  // COGS / HPP
  const totalHpp = completedOrders.reduce((sum, o) => {
    const orderCost = o.items.reduce((s, i) => s + (i.buy_price || 0) * i.quantity, 0);
    return sum + orderCost;
  }, 0);

  const grossProfit = Math.max(0, totalNetSales - totalHpp);
  const grossMarginPct = totalNetSales > 0 ? ((grossProfit / totalNetSales) * 100).toFixed(1) : '0';

  // Sales per cashier
  const salesByCashier = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const o of completedOrders) {
      const prev = map.get(o.user_id) || { count: 0, total: 0 };
      prev.count += 1;
      prev.total += o.grand_total;
      map.set(o.user_id, prev);
    }
    return Array.from(map.entries()).map(([userId, stats]) => {
      const u = users.find((user) => user.id === userId);
      return {
        name: u?.name || userId,
        role: u?.role || 'cashier',
        count: stats.count,
        total: stats.total,
      };
    });
  }, [completedOrders, users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Laporan Finansial &amp; Pajak
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laba/rugi sederhana, perpajakan PPN, kinerja staf kasir, dan audit pencegahan kecurangan
          </p>
        </div>

        <Button
          onClick={() => window.print()}
          variant="outline"
          className="h-10 text-xs font-bold bg-white dark:bg-slate-900"
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Cetak Laporan
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 max-w-md h-11 mb-4">
          <TabsTrigger value="financial" className="font-bold text-xs">
            Laba &amp; Rugi
          </TabsTrigger>
          <TabsTrigger value="cashiers" className="font-bold text-xs">
            Kinerja Kasir
          </TabsTrigger>
          <TabsTrigger value="audit" className="font-bold text-xs">
            Audit Void &amp; Refund
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: LABA RUGI & PAJAK */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Laba Rugi */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <span>Laporan Laba Rugi Sederhana</span>
              </CardTitle>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Penjualan Bruto (Gross Sales):</span>
                  <span className="font-bold tabular-nums">{formatRupiah(totalGrossSales)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-red-600">
                  <span>Potongan Diskon &amp; Promo:</span>
                  <span className="font-bold tabular-nums">-{formatRupiah(totalDiscounts)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">
                  <span>Penjualan Bersih (Net Sales):</span>
                  <span className="tabular-nums">{formatRupiah(totalNetSales)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-500">
                  <span>HPP / Harga Pokok Penjualan (COGS):</span>
                  <span className="tabular-nums">-{formatRupiah(totalHpp)}</span>
                </div>
                <div className="flex justify-between pt-2 font-black text-base text-emerald-600 dark:text-emerald-400">
                  <span>LABA KOTOR (GROSS PROFIT):</span>
                  <span className="tabular-nums">{formatRupiah(grossProfit)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Persentase Margin Laba Kotor:</span>
                  <span className="font-bold">{grossMarginPct}%</span>
                </div>
              </div>
            </Card>

            {/* Pajak PPN & Service Charge */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>Rekapitulasi Pajak PPN &amp; Layanan</span>
              </CardTitle>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Dasar Pengenaan Pajak (DPP):</span>
                  <span className="font-bold tabular-nums">{formatRupiah(totalNetSales)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">PPN Terkumpul (Tarif 11%):</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    {formatRupiah(totalTaxPpn)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Biaya Layanan (Service Charge):</span>
                  <span className="font-bold tabular-nums">{formatRupiah(totalServiceCharge)}</span>
                </div>
                <div className="flex justify-between pt-2 font-black text-sm text-slate-900 dark:text-slate-100">
                  <span>TOTAL OMZET FINAL (BRUTO + PAJAK):</span>
                  <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatRupiah(totalGrandRevenue)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: KINERJA KASIR */}
        <TabsContent value="cashiers">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="text-base font-bold">Produktivitas &amp; Penjualan Kasir</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-3.5 pl-6">Nama Kasir</th>
                    <th className="p-3.5">Peran</th>
                    <th className="p-3.5">Jumlah Transaksi</th>
                    <th className="p-3.5">Rata-rata Nota</th>
                    <th className="p-3.5 pr-6 text-right">Total Omzet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                  {salesByCashier.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                      <td className="p-3.5 pl-6 font-bold text-sm text-slate-900 dark:text-slate-100">
                        {c.name}
                      </td>
                      <td className="p-3.5 uppercase font-medium">
                        <Badge variant="outline" className="text-[10px]">
                          {c.role}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-bold">{c.count} Nota</td>
                      <td className="p-3.5 text-slate-500">
                        {c.count > 0 ? formatRupiah(Math.round(c.total / c.count)) : '-'}
                      </td>
                      <td className="p-3.5 pr-6 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(c.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: AUDIT VOID & REFUND */}
        <TabsContent value="audit">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <CardTitle className="text-base font-bold">
                  Audit Log Pembatalan &amp; Pengembalian (Fraud Prevention)
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Setiap aksi void dan refund wajib memiliki alasan tertulis dan otorisasi PIN manajer
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-3.5 pl-6">No. Nota</th>
                    <th className="p-3.5">Waktu</th>
                    <th className="p-3.5">Tipe Aksi</th>
                    <th className="p-3.5">Nilai Transaksi</th>
                    <th className="p-3.5">Alasan Pembatalan</th>
                    <th className="p-3.5 pr-6">Supervisor Otorisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {voidedAndRefundedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Tidak ada transaksi void atau refund pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    voidedAndRefundedOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="p-3.5 pl-6 font-bold">{o.order_number}</td>
                        <td className="p-3.5 text-slate-500">{formatDateTimeId(o.updated_at || o.created_at)}</td>
                        <td className="p-3.5 uppercase font-bold">
                          <Badge variant="destructive" className="text-[10px]">
                            {o.status === 'cancelled' ? 'VOID' : 'REFUND'}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-bold tabular-nums">{formatRupiah(o.grand_total)}</td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-300 italic">
                          &quot;{o.void_reason || o.refund_reason || 'Tidak ada alasan'}&quot;
                        </td>
                        <td className="p-3.5 pr-6 font-semibold text-slate-600 dark:text-slate-300">
                          {o.voided_by || o.refunded_by || 'Manager Maya Putri'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
