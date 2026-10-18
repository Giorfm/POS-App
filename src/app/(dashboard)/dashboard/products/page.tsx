'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getRepository } from '@/lib/repository';
import { Product, Category } from '@/types';
import { formatRupiah } from '@/lib/domain/money';
import { Plus, Search, Download, Upload, Edit, Trash2, Star, Check } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/useAuthStore';

export default function ProductsPage() {
  const { currentOutlet } = useAuthStore();
  const { showToast } = useToast();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [isLoading, setIsLoading] = React.useState(true);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    category_id: '',
    sku: '',
    barcode: '',
    description: '',
    buy_price: '',
    sell_price: '',
    unit: 'pcs',
    is_favorite: false,
    track_stock: true,
    min_stock_alert: '5',
    business_type: 'retail' as 'retail' | 'fnb',
  });

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const repo = getRepository();
      const [prods, cats] = await Promise.all([repo.getProducts(), repo.getCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      showToast('Gagal memuat produk', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: categories[0]?.id || '',
      sku: `PRD-${Date.now().toString().slice(-4)}`,
      barcode: '',
      description: '',
      buy_price: '0',
      sell_price: '0',
      unit: 'pcs',
      is_favorite: false,
      track_stock: true,
      min_stock_alert: '5',
      business_type: 'retail',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category_id: p.category_id || '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      description: p.description || '',
      buy_price: p.buy_price.toString(),
      sell_price: p.sell_price.toString(),
      unit: p.unit || 'pcs',
      is_favorite: p.is_favorite,
      track_stock: p.track_stock,
      min_stock_alert: p.min_stock_alert.toString(),
      business_type: p.business_type,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Nama produk wajib diisi', 'error');
      return;
    }

    try {
      const repo = getRepository();
      const biz = await repo.getBusiness();
      const buyPrice = parseInt(formData.buy_price, 10) || 0;
      const sellPrice = parseInt(formData.sell_price, 10) || 0;
      const minStock = parseInt(formData.min_stock_alert, 10) || 5;

      if (editingProduct) {
        await repo.updateProduct(editingProduct.id, {
          name: formData.name.trim(),
          category_id: formData.category_id || null,
          sku: formData.sku.trim() || undefined,
          barcode: formData.barcode.trim() || undefined,
          description: formData.description.trim() || undefined,
          buy_price: buyPrice,
          sell_price: sellPrice,
          unit: formData.unit,
          is_favorite: formData.is_favorite,
          track_stock: formData.track_stock,
          min_stock_alert: minStock,
          business_type: formData.business_type,
        });
        showToast('Produk berhasil diperbarui', 'success');
      } else {
        await repo.createProduct({
          business_id: biz.id,
          name: formData.name.trim(),
          category_id: formData.category_id || null,
          sku: formData.sku.trim() || undefined,
          barcode: formData.barcode.trim() || undefined,
          description: formData.description.trim() || undefined,
          buy_price: buyPrice,
          sell_price: sellPrice,
          unit: formData.unit,
          is_favorite: formData.is_favorite,
          track_stock: formData.track_stock,
          min_stock_alert: minStock,
          business_type: formData.business_type,
          is_active: true,
        });
        showToast('Produk baru berhasil ditambahkan', 'success');
      }

      setIsModalOpen(false);
      loadData();
    } catch {
      showToast('Gagal menyimpan produk', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus produk "${name}"?`)) {
      try {
        const repo = getRepository();
        await repo.deleteProduct(id);
        showToast(`Produk "${name}" berhasil dihapus`, 'success');
        loadData();
      } catch {
        showToast('Gagal menghapus produk', 'error');
      }
    }
  };

  const handleExportCsv = () => {
    const header = 'Nama,SKU,Barcode,Kategori,Harga Modal,Harga Jual,Satuan,Favorit,Stok Alert\n';
    const rows = products
      .map(
        (p) =>
          `"${p.name}","${p.sku || ''}","${p.barcode || ''}","${p.category_id || ''}","${p.buy_price}","${p.sell_price}","${p.unit}","${p.is_favorite}","${p.min_stock_alert}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'katalog-produk-pos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Katalog CSV berhasil diunduh', 'success');
  };

  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
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
  }, [products, selectedCategory, search]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Katalog Produk &amp; Menu
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data master barang retail dan menu F&B, harga jual, dan varian
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={handleExportCsv}
            variant="outline"
            className="h-10 text-xs font-bold bg-white dark:bg-slate-900"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Ekspor CSV
          </Button>

          <Button
            onClick={handleOpenAdd}
            className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Tambah Produk Baru
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama produk, SKU, atau barcode..."
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div className="w-full sm:w-60">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 uppercase font-bold text-slate-500">
              <tr>
                <th className="p-3.5 pl-6">Produk</th>
                <th className="p-3.5">SKU / Barcode</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5">Harga Modal</th>
                <th className="p-3.5">Harga Jual</th>
                <th className="p-3.5">Tipe</th>
                <th className="p-3.5 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.category_id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 pl-6">
                        <div className="flex items-center space-x-2">
                          {p.is_favorite && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {p.name}
                          </span>
                        </div>
                        {p.variants && p.variants.length > 0 && (
                          <span className="text-[10px] text-emerald-600 font-semibold block">
                            {p.variants.length} Varian Tersedia
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">
                        <div>{p.sku || '-'}</div>
                        <div className="text-[10px] text-slate-400">{p.barcode || ''}</div>
                      </td>
                      <td className="p-3.5 font-medium">{cat?.name || 'Umum'}</td>
                      <td className="p-3.5 tabular-nums text-slate-500">{formatRupiah(p.buy_price)}</td>
                      <td className="p-3.5 tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(p.sell_price)}
                      </td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {p.business_type}
                        </Badge>
                      </td>
                      <td className="p-3.5 pr-6 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(p)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(p.id, p.name)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Product Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent onClose={() => setIsModalOpen(false)} className="max-w-lg max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-3.5 overflow-y-auto pr-1 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Nama Produk *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Kopi Gula Aren"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Kategori</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Tipe Usaha</label>
                <select
                  value={formData.business_type}
                  onChange={(e) => setFormData({ ...formData, business_type: e.target.value as 'retail' | 'fnb' })}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                >
                  <option value="retail">Retail (Barang Jadi)</option>
                  <option value="fnb">F&B (Makanan / Minuman)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">SKU</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="KOP-01"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Barcode</label>
                <Input
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="899100..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Harga Modal (Rp) *</label>
                <Input
                  type="number"
                  value={formData.buy_price}
                  onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Harga Jual (Rp) *</label>
                <Input
                  type="number"
                  value={formData.sell_price}
                  onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Satuan (Unit)</label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="pcs, cup, porsi, bungkus..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Batas Stok Minimum Alert</label>
                <Input
                  type="number"
                  value={formData.min_stock_alert}
                  onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_favorite}
                  onChange={(e) => setFormData({ ...formData, is_favorite: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>Jadikan Produk Favorit Kasir</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.track_stock}
                  onChange={(e) => setFormData({ ...formData, track_stock: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>Pantau Stok Inventori</span>
              </label>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                Simpan Produk
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
