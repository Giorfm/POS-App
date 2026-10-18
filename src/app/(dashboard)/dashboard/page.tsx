'use client';

import * as React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { getRepository } from '@/lib/repository';
import { Order, Product, StockMovement } from '@/types';
import { formatRupiah } from '@/lib/domain/money';
import { formatDateOnlyId } from '@/lib/utils';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Percent,
  Download,
  AlertTriangle,
  Award,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function DashboardOverviewPage() {
  const { currentOutlet } = useAuthStore();
  const { showToast } = useToast();

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [period, setPeriod] = React.useState<'today' | '7days' | '30days'>('30days');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (currentOutlet) {
      setIsLoading(true);
      const repo = getRepository();
      Promise.all([
        repo.getOrders({ outletId: currentOutlet.id, status: 'completed' }),
        repo.getProducts(),
        repo.getStockMovements(currentOutlet.id, 50),
      ])
        .then(([ords, prods, sm]) => {
          setOrders(ords);
          setProducts(prods);
          setMovements(sm);
        })
        .finally(() => setIsLoading(false));
    }
  }, [currentOutlet]);

  // Filter orders by selected period
  const filteredOrders = React.useMemo(() => {
    const now = new Date();
    if (period === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      return orders.filter((o) => o.created_at.startsWith(todayStr));
    }
    const days = period === '7days' ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return orders.filter((o) => new Date(o.created_at) >= cutoff);
  }, [orders, period]);

  // Aggregate KPI metrics
  const totalOmzet = React.useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.grand_total, 0);
  }, [filteredOrders]);

  const totalTransactions = filteredOrders.length;

  const averageBasket = totalTransactions > 0 ? Math.round(totalOmzet / totalTransactions) : 0;

  // Calculate gross profit: Sum of (item.unit_price - item.buy_price) * qty
  const grossProfit = React.useMemo(() => {
    let profit = 0;
    for (const o of filteredOrders) {
      for (const item of o.items) {
        const itemProfit = (item.unit_price - (item.buy_price || 0)) * item.quantity;
        profit += itemProfit;
      }
      profit -= o.discount_amount || 0;
    }
    return Math.max(0, profit);
  }, [filteredOrders]);

  // Daily revenue trend data for charts
  const dailyChartData = React.useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...filteredOrders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const o of sorted) {
      const dateKey = o.created_at.split('T')[0];
      map.set(dateKey, (map.get(dateKey) || 0) + o.grand_total);
    }

    return Array.from(map.entries()).map(([date, revenue]) => {
      const d = new Date(date);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      return { date: label, fullDate: date, omzet: revenue };
    });
  }, [filteredOrders]);

  // Hourly peak distribution data
  const hourlyChartData = React.useMemo(() => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 to 21:00
    const counts = new Map<number, number>();
    for (const h of hours) counts.set(h, 0);

    for (const o of filteredOrders) {
      const d = new Date(o.created_at);
      const h = d.getHours();
      if (counts.has(h)) {
        counts.set(h, (counts.get(h) || 0) + 1);
      }
    }

    return Array.from(counts.entries()).map(([hour, count]) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      transaksi: count,
    }));
  }, [filteredOrders]);

  // Payment method breakdown
  const paymentMethodData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const o of filteredOrders) {
      const m = o.payment_method || 'cash';
      map.set(m, (map.get(m) || 0) + o.grand_total);
    }
    return Array.from(map.entries()).map(([method, amount]) => ({
      name: method === 'cash' ? 'Tunai' : method === 'qris' ? 'QRIS' : method.toUpperCase(),
      value: amount,
    }));
  }, [filteredOrders]);

  // Top 5 best selling products
  const topProducts = React.useMemo(() => {
    const productStats = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of filteredOrders) {
      for (const item of o.items) {
        const existing = productStats.get(item.product_id) || {
          name: item.product_name,
          qty: 0,
          revenue: 0,
        };
        existing.qty += item.quantity;
        existing.revenue += item.final_price;
        productStats.set(item.product_id, existing);
      }
    }
    return Array.from(productStats.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredOrders]);

  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      showToast('Tidak ada data transaksi untuk diekspor', 'info');
      return;
    }
    const header = 'No. Nota,Waktu,Kasir,Metode,Subtotal,Diskon,Pajak,Total\n';
    const rows = filteredOrders
      .map(
        (o) =>
          `"${o.order_number}","${o.created_at}","${o.user_id}","${o.payment_method}","${o.subtotal}","${o.discount_amount}","${o.tax_amount}","${o.grand_total}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `laporan-penjualan-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Laporan penjualan CSV berhasil diunduh!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Ringkasan Penjualan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Metrik performa finansial dan transaksi cabang {currentOutlet?.name}
          </p>
        </div>

        {/* Period Selector & Export */}
        <div className="flex items-center space-x-2">
          <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: '7days', label: '7 Hari' },
              { id: '30days', label: '30 Hari' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id as typeof period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === p.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            onClick={handleExportCsv}
            variant="outline"
            className="h-10 text-xs font-bold flex items-center space-x-1.5 bg-white dark:bg-slate-900"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omzet */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Omzet Penjualan
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
              {formatRupiah(totalOmzet)}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center font-semibold">
              <TrendingUp className="h-3 w-3 mr-1" />
              Stabil sesuai transaksi real-time
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Jumlah Transaksi */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Jumlah Transaksi
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
              {totalTransactions} Nota
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Dari {currentOutlet?.name || 'Cabang aktif'}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Rata-rata Keranjang (Basket Size) */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Rata-rata Nilai Belanja
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Percent className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
              {formatRupiah(averageBasket)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Per transaksi pelanggan</p>
          </CardContent>
        </Card>

        {/* Card 4: Estimasi Laba Kotor */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Laba Kotor (Gross Profit)
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatRupiah(grossProfit)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Total Penjualan − HPP/Modal</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section: Revenue Area Chart & Hourly Peak Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Daily Trend */}
        <Card className="lg:col-span-2 rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Tren Omzet Penjualan</CardTitle>
            <CardDescription className="text-xs">
              Grafik pendapatan harian dalam Rupiah selama periode {period}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val) => `Rp ${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(val: number) => [formatRupiah(val), 'Omzet']}
                  labelFormatter={(lbl, items) => {
                    const found = items?.[0]?.payload?.fullDate;
                    return found ? formatDateOnlyId(found) : lbl;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="omzet"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right Col: Peak Hours Bar Chart */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Jam Tersibuk Kasir</CardTitle>
            <CardDescription className="text-xs">
              Frekuensi transaksi per jam (Heatmap jam sibuk)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => [`${val} Transaksi`, 'Frekuensi']} />
                <Bar dataKey="transaksi" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Top Products & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Bestsellers */}
        <Card className="lg:col-span-2 rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">5 Produk Terlaris</CardTitle>
            <CardDescription className="text-xs">
              Menu dan barang retail dengan penjualan unit tertinggi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {topProducts.map((p, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {p.name}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      {p.qty} Terjual
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold tabular-nums">
                      {formatRupiah(p.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Metode Pembayaran</CardTitle>
            <CardDescription className="text-xs">
              Distribusi pembayaran tunai vs digital
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [formatRupiah(val), 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full space-y-1.5 mt-2">
              {paymentMethodData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold tabular-nums">{formatRupiah(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
