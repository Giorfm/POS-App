'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getRepository } from '@/lib/repository';
import { InventoryItem, Product, StockMovement, Outlet, StockOpname, StockTransfer } from '@/types';
import { formatDateTimeId } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/toast';
import {
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export default function InventoryPage() {
  const { currentOutlet, currentUser } = useAuthStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = React.useState('stock');
  const [products, setProducts] = React.useState<Product[]>([]);
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [opnames, setOpnames] = React.useState<StockOpname[]>([]);
  const [transfers, setTransfers] = React.useState<StockTransfer[]>([]);
  const [outlets, setOutlets] = React.useState<Outlet[]>([]);
  const [search, setSearch] = React.useState('');
  const [lowStockOnly, setLowStockOnly] = React.useState(false);

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = React.useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = React.useState<Product | null>(null);
  const [adjustDiffStr, setAdjustDiffStr] = React.useState('');
  const [adjustReason, setAdjustReason] = React.useState('');

  // Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);
  const [transferTargetOutletId, setTransferTargetOutletId] = React.useState('');
  const [transferProductId, setTransferProductId] = React.useState('');
  const [transferQty, setTransferQty] = React.useState('1');

  const loadData = React.useCallback(async () => {
    if (!currentOutlet) return;
    try {
      const repo = getRepository();
      const [prods, inv, sm, opn, trf, outs] = await Promise.all([
        repo.getProducts(),
        repo.getInventory(currentOutlet.id),
        repo.getStockMovements(currentOutlet.id, 100),
        repo.getStockOpnames(currentOutlet.id),
        repo.getStockTransfers(currentOutlet.id),
        repo.getOutlets(),
      ]);

      setProducts(prods);
      setInventory(inv);
      setMovements(sm);
      setOpnames(opn);
      setTransfers(trf);
      setOutlets(outs);
    } catch {
      showToast('Gagal memuat data inventori', 'error');
    }
  }, [currentOutlet, showToast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const getProductStock = React.useCallback(
    (productId: string) => {
      const inv = inventory.find((i) => i.product_id === productId);
      return inv ? inv.stock_quantity : 0;
    },
    [inventory]
  );

  const handleOpenAdjust = (prod: Product) => {
    setAdjustTargetProduct(prod);
    setAdjustDiffStr('');
    setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetProduct || !currentOutlet) return;
    const diff = parseInt(adjustDiffStr, 10);
    if (isNaN(diff) || diff === 0 || !adjustReason.trim()) {
      showToast('Perubahan stok dan alasan wajib diisi', 'error');
      return;
    }

    try {
      const repo = getRepository();
      await repo.adjustStock({
        outletId: currentOutlet.id,
        productId: adjustTargetProduct.id,
        quantityDiff: diff,
        reason: adjustReason.trim(),
        userId: currentUser?.id,
      });

      showToast(`Stok ${adjustTargetProduct.name} berhasil disesuaikan!`, 'success');
      setIsAdjustModalOpen(false);
      loadData();
    } catch {
      showToast('Gagal menyesuaikan stok', 'error');
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOutlet || !transferTargetOutletId || !transferProductId) return;
    const qty = parseInt(transferQty, 10) || 1;

    try {
      const repo = getRepository();
      const transferNumber = `TRF-${Date.now().toString().slice(-4)}`;
      await repo.createStockTransfer({
        business_id: currentOutlet.business_id,
        source_outlet_id: currentOutlet.id,
        destination_outlet_id: transferTargetOutletId,
        transfer_number: transferNumber,
        status: 'in_transit',
        sent_by: currentUser?.id,
        sent_at: new Date().toISOString(),
        items: [{ id: `ti_${Date.now()}`, stock_transfer_id: '', product_id: transferProductId, quantity: qty }],
      });

      showToast(`Transfer stok #${transferNumber} berhasil dibuat dan dikirim!`, 'success');
      setIsTransferModalOpen(false);
      loadData();
    } catch {
      showToast('Gagal membuat transfer stok', 'error');
    }
  };

  const handleReceiveTransfer = async (transferId: string) => {
    try {
      const repo = getRepository();
      await repo.updateStockTransferStatus(transferId, 'completed', currentUser?.id);
      showToast('Barang transfer berhasil diterima dan ditambahkan ke stok!', 'success');
      loadData();
    } catch {
      showToast('Gagal memproses penerimaan transfer', 'error');
    }
  };

  const filteredStockProducts = React.useMemo(() => {
    return products.filter((p) => {
      const stock = getProductStock(p.id);
      if (lowStockOnly && stock > p.min_stock_alert) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.includes(q)
        );
      }
      return true;
    });
  }, [products, lowStockOnly, search, getProductStock]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Inventori &amp; Kartu Stok
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen persediaan per cabang, mutasi real-time, opname, dan transfer barang
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => {
              setTransferTargetOutletId(outlets.find((o) => o.id !== currentOutlet?.id)?.id || '');
              setTransferProductId(products[0]?.id || '');
              setIsTransferModalOpen(true);
            }}
            className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
            Transfer Antar Cabang
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 max-w-md h-11 mb-4">
          <TabsTrigger value="stock" className="flex items-center space-x-1.5 font-bold">
            <Boxes className="h-4 w-4" />
            <span>Stok Cabang</span>
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center space-x-1.5 font-bold">
            <ClipboardList className="h-4 w-4" />
            <span>Kartu Mutasi</span>
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center space-x-1.5 font-bold">
            <ArrowLeftRight className="h-4 w-4" />
            <span>Transfer Stok</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: STOK CABANG */}
        <TabsContent value="stock" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari barang untuk cek stok..."
                  className="pl-9 h-10 text-xs"
                />
              </div>

              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-amber-600 dark:text-amber-400">Tampilkan Stok Menipis Saja</span>
              </label>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-3.5 pl-6">Produk</th>
                    <th className="p-3.5">SKU / Barcode</th>
                    <th className="p-3.5">Satuan</th>
                    <th className="p-3.5">Batas Minimum</th>
                    <th className="p-3.5">Sisa Stok Fisik</th>
                    <th className="p-3.5 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStockProducts.map((p) => {
                    const stock = getProductStock(p.id);
                    const isLow = stock <= p.min_stock_alert;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="p-3.5 pl-6 font-bold text-sm text-slate-900 dark:text-slate-100">
                          {p.name}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">{p.sku || '-'}</td>
                        <td className="p-3.5">{p.unit}</td>
                        <td className="p-3.5">{p.min_stock_alert} {p.unit}</td>
                        <td className="p-3.5">
                          <span
                            className={`font-black text-sm px-2.5 py-1 rounded-full tabular-nums inline-block ${
                              stock <= 0
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                                : isLow
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {stock} {p.unit}
                          </span>
                        </td>
                        <td className="p-3.5 pr-6 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAdjust(p)}
                            className="text-xs font-semibold"
                          >
                            Sesuaikan Stok
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: KARTU MUTASI STOK */}
        <TabsContent value="movements">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="text-base font-bold">Riwayat Kartu Mutasi Stok</CardTitle>
              <CardDescription className="text-xs">
                Satu-satunya sumber kebenaran (single source of truth) setiap pergerakan barang
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-3.5 pl-6">Waktu</th>
                    <th className="p-3.5">Produk</th>
                    <th className="p-3.5">Tipe Mutasi</th>
                    <th className="p-3.5">Jumlah (+/-)</th>
                    <th className="p-3.5">Saldo Awal</th>
                    <th className="p-3.5">Saldo Akhir</th>
                    <th className="p-3.5 pr-6">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {movements.map((m) => {
                    const prod = products.find((p) => p.id === m.product_id);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="p-3.5 pl-6 text-slate-500">{formatDateTimeId(m.created_at)}</td>
                        <td className="p-3.5 font-sans font-bold text-slate-900 dark:text-slate-100">
                          {prod?.name || m.product_id}
                        </td>
                        <td className="p-3.5 uppercase">
                          <Badge variant="outline" className="text-[10px]">
                            {m.type}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-bold">
                          <span className={m.quantity < 0 ? 'text-red-500' : 'text-emerald-600'}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">{m.previous_stock}</td>
                        <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{m.current_stock}</td>
                        <td className="p-3.5 pr-6 font-sans text-slate-500">{m.notes || m.reference_id || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: TRANSFER STOK */}
        <TabsContent value="transfers">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="text-base font-bold">Daftar Transfer Antar Cabang</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-3.5 pl-6">No. Transfer</th>
                    <th className="p-3.5">Waktu Kirim</th>
                    <th className="p-3.5">Asal &gt; Tujuan</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Belum ada riwayat transfer barang antar cabang.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((t) => {
                      const src = outlets.find((o) => o.id === t.source_outlet_id);
                      const dst = outlets.find((o) => o.id === t.destination_outlet_id);
                      const isDestination = currentOutlet?.id === t.destination_outlet_id;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                          <td className="p-3.5 pl-6 font-bold">{t.transfer_number}</td>
                          <td className="p-3.5 text-slate-500">{t.sent_at ? formatDateTimeId(t.sent_at) : '-'}</td>
                          <td className="p-3.5 font-medium">
                            {src?.name} &rarr; {dst?.name}
                          </td>
                          <td className="p-3.5 uppercase">
                            <Badge
                              variant={t.status === 'completed' ? 'success' : 'warning'}
                              className="text-[10px]"
                            >
                              {t.status}
                            </Badge>
                          </td>
                          <td className="p-3.5 pr-6 text-right">
                            {isDestination && t.status === 'in_transit' && (
                              <Button
                                size="sm"
                                onClick={() => handleReceiveTransfer(t.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                              >
                                Terima Barang
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjust Stock Modal */}
      <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
        <DialogContent onClose={() => setIsAdjustModalOpen(false)} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Penyesuaian Stok</DialogTitle>
            <DialogDescription>
              {adjustTargetProduct?.name} (Sisa saat ini: {adjustTargetProduct ? getProductStock(adjustTargetProduct.id) : 0})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAdjust} className="space-y-3 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Perubahan Stok (+/-) *</label>
              <Input
                type="number"
                value={adjustDiffStr}
                onChange={(e) => setAdjustDiffStr(e.target.value)}
                placeholder="Contoh: +10 atau -5"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Alasan Penyesuaian *</label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Contoh: Barang rusak, opname, penerimaan supplier..."
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdjustModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                Simpan Penyesuaian
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Stock Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent onClose={() => setIsTransferModalOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Stok Antar Cabang</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTransfer} className="space-y-3.5 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Cabang Tujuan *</label>
              <select
                value={transferTargetOutletId}
                onChange={(e) => setTransferTargetOutletId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                required
              >
                {outlets
                  .filter((o) => o.id !== currentOutlet?.id)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Pilih Produk *</label>
              <select
                value={transferProductId}
                onChange={(e) => setTransferProductId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stok: {getProductStock(p.id)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Jumlah Kuantitas Transfer *</label>
              <Input
                type="number"
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                min="1"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                Kirim Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
