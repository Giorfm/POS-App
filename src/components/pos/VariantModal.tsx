'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product, ProductVariant, OrderItemModifier } from '@/types';
import { formatRupiah } from '@/lib/domain/money';
import { Check, Plus } from 'lucide-react';

interface VariantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  currentStock?: number;
  onConfirm: (
    product: Product,
    variant: ProductVariant | null,
    modifiers: OrderItemModifier[]
  ) => void;
}

export function VariantModal({
  open,
  onOpenChange,
  product,
  currentStock = 100,
  onConfirm,
}: VariantModalProps) {
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | null>(null);
  const [selectedModifiers, setSelectedModifiers] = React.useState<OrderItemModifier[]>([]);

  React.useEffect(() => {
    if (product) {
      if (product.variants && product.variants.length > 0) {
        setSelectedVariant(product.variants[0]);
      } else {
        setSelectedVariant(null);
      }
      setSelectedModifiers([]);
    }
  }, [product, open]);

  if (!product) return null;

  const basePrice = selectedVariant ? selectedVariant.sell_price : product.sell_price;
  const modifiersPrice = selectedModifiers.reduce((sum, m) => sum + m.price, 0);
  const totalPrice = basePrice + modifiersPrice;

  const handleToggleModifierOption = (
    modifierId: string,
    modifierName: string,
    optionId: string,
    optionName: string,
    price: number,
    maxSelection: number
  ) => {
    const isSelected = selectedModifiers.some(
      (m) => m.modifier_id === modifierId && m.option_id === optionId
    );

    if (isSelected) {
      setSelectedModifiers((prev) =>
        prev.filter((m) => !(m.modifier_id === modifierId && m.option_id === optionId))
      );
    } else {
      if (maxSelection === 1) {
        // Single selection: replace existing option in this modifier group
        setSelectedModifiers((prev) => [
          ...prev.filter((m) => m.modifier_id !== modifierId),
          {
            modifier_id: modifierId,
            modifier_name: modifierName,
            option_id: optionId,
            option_name: optionName,
            price,
          },
        ]);
      } else {
        // Multi selection up to maxSelection
        const currentGroupCount = selectedModifiers.filter((m) => m.modifier_id === modifierId).length;
        if (currentGroupCount < maxSelection) {
          setSelectedModifiers((prev) => [
            ...prev,
            {
              modifier_id: modifierId,
              modifier_name: modifierName,
              option_id: optionId,
              option_name: optionName,
              price,
            },
          ]);
        }
      }
    }
  };

  const handleAdd = () => {
    onConfirm(product, selectedVariant, selectedModifiers);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <p className="text-sm text-slate-500">{product.description || 'Pilih varian dan opsi tambahan'}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 my-2 pr-1">
          {/* Variants section */}
          {product.variants && product.variants.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Pilih Varian
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariant(variant)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{variant.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        {formatRupiah(variant.sell_price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modifiers section */}
          {product.modifiers && product.modifiers.length > 0 && (
            <div className="space-y-4 pt-2">
              {product.modifiers.map((mod) => (
                <div key={mod.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {mod.name}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {mod.max_selection === 1 ? 'Pilih 1' : `Maksimal ${mod.max_selection}`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {mod.options.map((opt) => {
                      const isSelected = selectedModifiers.some(
                        (m) => m.modifier_id === mod.id && m.option_id === opt.id
                      );
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            handleToggleModifierOption(
                              mod.id,
                              mod.name,
                              opt.id,
                              opt.name,
                              opt.price,
                              mod.max_selection
                            )
                          }
                          className={`w-full p-2.5 rounded-lg border text-sm flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                              : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <span>{opt.name}</span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {opt.price > 0 ? `+${formatRupiah(opt.price)}` : 'Gratis'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500">Total Harga:</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatRupiah(totalPrice)}
            </span>
          </div>

          <Button onClick={handleAdd} className="h-11 px-6 font-bold bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-1.5 h-4 w-4" />
            Tambahkan ke Keranjang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
