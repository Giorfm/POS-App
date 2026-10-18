'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Customer, LoyaltyTier } from '@/types';
import { getRepository } from '@/lib/repository';
import { useAuthStore } from '@/store/useAuthStore';
import { Search, UserPlus, Check, Award, Phone, User } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export function CustomerModal({
  open,
  onOpenChange,
  selectedCustomer,
  onSelectCustomer,
}: CustomerModalProps) {
  const { currentOutlet } = useAuthStore();
  const { showToast } = useToast();
  const [search, setSearch] = React.useState('');
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Quick Register mode state
  const [isRegisterMode, setIsRegisterMode] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newPhone, setNewPhone] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const fetchCustomers = React.useCallback(async (query: string = '') => {
    setIsLoading(true);
    try {
      const repo = getRepository();
      const list = await repo.getCustomers(query);
      setCustomers(list);
    } catch {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      setSearch('');
      setIsRegisterMode(false);
      setNewName('');
      setNewPhone('');
      fetchCustomers();
    }
  }, [open, fetchCustomers]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    fetchCustomers(val);
  };

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() || !newName.trim()) {
      showToast('Nama dan nomor HP wajib diisi', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const repo = getRepository();
      const biz = await repo.getBusiness();
      const created = await repo.createCustomer({
        business_id: biz.id,
        name: newName.trim(),
        phone: newPhone.trim(),
        membership_tier: 'bronze',
        is_active: true,
      });

      showToast(`Member baru ${created.name} berhasil didaftarkan!`, 'success');
      onSelectCustomer(created);
      onOpenChange(false);
    } catch {
      showToast('Gagal mendaftarkan member', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getTierBadge = (tier: LoyaltyTier) => {
    switch (tier) {
      case 'gold':
        return <Badge className="bg-amber-500 text-white font-bold text-[10px]">GOLD</Badge>;
      case 'silver':
        return <Badge className="bg-slate-400 text-white font-bold text-[10px]">SILVER</Badge>;
      default:
        return <Badge className="bg-amber-700 text-white font-bold text-[10px]">BRONZE</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isRegisterMode ? 'Daftar Member Kilat' : 'Pilih Pelanggan / Member'}
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="text-xs font-semibold"
            >
              {isRegisterMode ? (
                'Kembali ke Pencarian'
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Daftar Member Baru
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {isRegisterMode ? (
          /* Quick Register Form */
          <form onSubmit={handleQuickRegister} className="space-y-4 my-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              Pendaftaran kilat cukup nama dan nomor WhatsApp/HP. Pelanggan langsung mendapatkan poin loyalti transaksi pertama.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Lengkap Pelanggan *
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Budi Gunawan"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nomor WhatsApp / HP *
              </label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                type="tel"
                required
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRegisterMode(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan & Pilih Member'}
              </Button>
            </div>
          </form>
        ) : (
          /* Search & Select List */
          <div className="flex-1 flex flex-col space-y-3 overflow-hidden my-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari nama atau nomor HP..."
                className="pl-9"
                autoFocus
              />
            </div>

            {selectedCustomer && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Terpilih: </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedCustomer.name}</span>
                  <span className="text-slate-500 ml-1">({selectedCustomer.phone})</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectCustomer(null)}
                  className="text-red-600 hover:underline font-semibold"
                >
                  Lepas
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {customers.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  {isLoading ? 'Memuat pelanggan...' : 'Pelanggan tidak ditemukan.'}
                </div>
              ) : (
                customers.map((cust) => {
                  const isSelected = selectedCustomer?.id === cust.id;
                  return (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        onSelectCustomer(cust);
                        onOpenChange(false);
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
                          {cust.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {cust.name}
                            </span>
                            {getTierBadge(cust.membership_tier)}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {cust.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Award className="h-3.5 w-3.5" />
                          <span>{cust.points_balance} Poin</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-emerald-600 ml-auto mt-1" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
