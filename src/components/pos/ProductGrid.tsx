'use client';

import * as React from 'react';
import { Product, Category, ProductVariant, OrderItemModifier, InventoryItem } from '@/types';
import { useCartStore } from '@/store/useCartStore';
import { formatRupiah } from '@/lib/domain/money';
import { Search, Scan, Star, Coffee, Utensils, Croissant, Cookie, ShoppingBag, Sparkles } from 'lucide-react';
import { VariantModal } from './VariantModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  inventory: InventoryItem[];
  allowNegativeStock?: boolean;
}

export function ProductGrid({
  products,
  categories,
  inventory,
  allowNegativeStock = false,
}: ProductGridProps) {
  const { addItem } = useCartStore();
  const { showToast } = useToast();

  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [activeVariantProduct, setActiveVariantProduct] = React.useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);

  // Keyboard shortcut listener for fast cashier search and scan (F2 search, F3 scan)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput) searchInput.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsScannerOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter products by search and category
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory === 'favorites') {
        if (!p.is_favorite) return false;
      } else if (selectedCategory !== 'all') {
        if (p.category_id !== selectedCategory) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        const matchBarcode = p.barcode?.includes(q);
        if (!matchName && !matchSku && !matchBarcode) return false;
      }

      return true;
    });
  }, [products, selectedCategory, search]);

  const getProductStock = (productId: string): number => {
    const inv = inventory.find((i) => i.product_id === productId);
    return inv ? inv.stock_quantity : 50;
  };

  const handleProductClick = (product: Product) => {
    const stock = getProductStock(product.id);
    if (!allowNegativeStock && product.track_stock && stock <= 0) {
      showToast(`Stok ${product.name} telah habis!`, 'error');
      return;
    }

    if (
      (product.variants && product.variants.length > 0) ||
      (product.modifiers && product.modifiers.length > 0)
    ) {
      setActiveVariantProduct(product);
    } else {
      addItem(product, null, [], stock);
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    const found = products.find(
      (p) => p.barcode === barcode || p.sku?.toLowerCase() === barcode.toLowerCase()
    );
    if (found) {
      handleProductClick(found);
      showToast(`Scan berhasil: ${found.name}`, 'success');
    } else {
      showToast(`Produk dengan barcode ${barcode} tidak ditemukan!`, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 border-r border-slate-200 dark:border-slate-800">
      {/* Search Bar + Barcode Scan Button */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <Input
            id="pos-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, SKU, atau barcode produk... [F2]"
            className="pl-10 h-11 text-sm bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-md px-1.5 py-0.5"
            >
              Hapus
            </button>
          )}
        </div>

        <Button
          onClick={() => setIsScannerOpen(true)}
          className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm font-semibold flex items-center space-x-1.5 shrink-0"
          title="Pindai Barcode Kamera [F3]"
        >
          <Scan className="h-4 w-4" />
          <span className="hidden md:inline">Scan [F3]</span>
        </Button>
      </div>

      {/* Category Horizontal Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 scale-[1.02]'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
          }`}
        >
          Semua Produk ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('favorites')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 shadow-sm ${
            selectedCategory === 'favorites'
              ? 'bg-amber-500 text-white scale-[1.02]'
              : 'bg-white text-amber-600 hover:bg-amber-50 border border-slate-200 dark:bg-slate-900 dark:text-amber-400 dark:border-slate-800'
          }`}
        >
          <Star className="h-3.5 w-3.5 fill-current" />
          <span>Favorit</span>
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                isSelected
                  ? 'bg-emerald-600 text-white scale-[1.02]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Product Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <ShoppingBag className="h-12 w-12 stroke-[1.5] mb-2 opacity-50" />
            <p className="font-semibold text-sm">Tidak ada produk yang cocok</p>
            <p className="text-xs text-slate-400 mt-1">Coba kata kunci lain atau pilih kategori berbeda</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredProducts.map((prod) => {
              const stock = getProductStock(prod.id);
              const isOutOfStock = prod.track_stock && stock <= 0;
              const hasVariants = prod.variants && prod.variants.length > 0;
              const hasModifiers = prod.modifiers && prod.modifiers.length > 0;

              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleProductClick(prod)}
                  disabled={!allowNegativeStock && isOutOfStock}
                  className={`group relative p-3 rounded-2xl border text-left flex flex-col justify-between bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md hover:border-emerald-500/60 active:scale-[0.98] select-none min-h-[120px] ${
                    isOutOfStock
                      ? 'opacity-60 bg-slate-100 border-slate-200 cursor-not-allowed dark:bg-slate-950 dark:border-slate-800'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Top: Category Tag & Favorite */}
                  <div className="flex items-start justify-between w-full mb-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate max-w-[80%]">
                      {prod.sku || 'SKU'}
                    </span>
                    {prod.is_favorite && (
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                  </div>

                  {/* Product Title */}
                  <div className="my-1">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-emerald-600 transition-colors">
                      {prod.name}
                    </h3>

                    {/* Variant / Modifier badges */}
                    <div className="flex items-center space-x-1 mt-1">
                      {hasVariants && (
                        <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                          {prod.variants!.length} Varian
                        </span>
                      )}
                      {hasModifiers && (
                        <span className="text-[9px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-1.5 py-0.5 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Price & Stock */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between w-full mt-2">
                    <span className="font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatRupiah(prod.sell_price)}
                    </span>

                    {prod.track_stock && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          stock <= 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                            : stock <= prod.min_stock_alert
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {stock <= 0 ? 'Habis' : `Stok: ${stock}`}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Variant & Modifier Modal */}
      <VariantModal
        open={Boolean(activeVariantProduct)}
        onOpenChange={(open) => !open && setActiveVariantProduct(null)}
        product={activeVariantProduct}
        currentStock={activeVariantProduct ? getProductStock(activeVariantProduct.id) : 100}
        onConfirm={(prod, variant, modifiers) => {
          addItem(prod, variant, modifiers, getProductStock(prod.id));
        }}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleBarcodeScanned}
      />
    </div>
  );
}
