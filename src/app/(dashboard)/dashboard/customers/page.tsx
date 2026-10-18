'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getRepository } from '@/lib/repository';
import { Customer, LoyaltyTier } from '@/types';
import { formatRupiah } from '@/lib/domain/money';
import { formatDateTimeId } from '@/lib/utils';
import { Users, UserPlus, Search, Award, Phone, Mail, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function CustomersPage() {
  const { showToast } = useToast();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [search, setSearch] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    membership_tier: 'bronze' as LoyaltyTier,
  });

  const loadCustomers = React.useCallback(async (query: string = '') => {
    try {
      const repo = getRepository();
      const list = await repo.getCustomers(query);
      setCustomers(list);
    } catch {
      showToast('Gagal memuat pelanggan', 'error');
    }
  }, [showToast]);

  React.useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    loadCustomers(val);
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      membership_tier: 'bronze',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      membership_tier: c.membership_tier,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('Nama dan nomor HP wajib diisi', 'error');
      return;
    }

    try {
      const repo = getRepository();
      const biz = await repo.getBusiness();

      if (editingCustomer) {
        await repo.updateCustomer(editingCustomer.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          membership_tier: formData.membership_tier,
        });
        showToast('Data pelanggan berhasil diperbarui', 'success');
      } else {
        await repo.createCustomer({
          business_id: biz.id,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          membership_tier: formData.membership_tier,
          is_active: true,
        });
        showToast('Pelanggan baru berhasil didaftarkan', 'success');
      }

      setIsModalOpen(false);
      loadCustomers(search);
    } catch {
      showToast('Gagal menyimpan pelanggan', 'error');
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Pelanggan &amp; Loyalti
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Database keanggotaan member, akumulasi poin loyalti, dan riwayat belanja
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <UserPlus className="mr-1.5 h-4 w-4" />
          Tambah Pelanggan Baru
        </Button>
      </div>

      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari pelanggan berdasarkan nama atau nomor HP..."
            className="pl-9 h-10 text-xs"
          />
        </div>
      </Card>

      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b uppercase font-bold text-slate-500">
              <tr>
                <th className="p-3.5 pl-6">Nama Pelanggan</th>
                <th className="p-3.5">Kontak</th>
                <th className="p-3.5">Level Tier</th>
                <th className="p-3.5">Saldo Poin</th>
                <th className="p-3.5">Total Belanja</th>
                <th className="p-3.5 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                  <td className="p-3.5 pl-6 font-bold text-sm text-slate-900 dark:text-slate-100">
                    {c.name}
                  </td>
                  <td className="p-3.5 text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3 w-3" />
                      <span>{c.phone}</span>
                    </div>
                    {c.email && (
                      <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5">
                        <Mail className="h-3 w-3" />
                        <span>{c.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3.5">{getTierBadge(c.membership_tier)}</td>
                  <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {c.points_balance} Poin
                  </td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatRupiah(c.total_spent)}
                  </td>
                  <td className="p-3.5 pr-6 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(c)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3.5 w-3.5 text-slate-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Customer Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent onClose={() => setIsModalOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Edit Data Pelanggan' : 'Daftar Pelanggan Baru'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 my-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Nama Lengkap *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Rian Gunawan"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Nomor HP / WhatsApp *</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="08123456789"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rian@example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Tingkat Membership</label>
              <select
                value={formData.membership_tier}
                onChange={(e) =>
                  setFormData({ ...formData, membership_tier: e.target.value as LoyaltyTier })
                }
                className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value="bronze">Bronze (Standar)</option>
                <option value="silver">Silver (Diskon 5%)</option>
                <option value="gold">Gold (Diskon 10%)</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
