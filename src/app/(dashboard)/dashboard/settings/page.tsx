'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getRepository } from '@/lib/repository';
import { Business, ReceiptTemplate, TaxSettings } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/toast';
import { printService, PrinterDeviceConfig } from '@/lib/printer/printService';
import { Settings, Printer, Store, Receipt, Sliders, Database, Save, Check } from 'lucide-react';
import { SEED_RECEIPT_TEMPLATE, SEED_TAX_SETTINGS, SEED_BUSINESS } from '@/lib/db/seedData';

export default function SettingsPage() {
  const { currentOutlet } = useAuthStore();
  const { showToast } = useToast();

  const [business, setBusiness] = React.useState<Business>(SEED_BUSINESS);
  const [taxSettings, setTaxSettings] = React.useState<TaxSettings>(SEED_TAX_SETTINGS);
  const [receiptTemplate, setReceiptTemplate] = React.useState<ReceiptTemplate>(SEED_RECEIPT_TEMPLATE);
  const [printerConfig, setPrinterConfig] = React.useState<PrinterDeviceConfig>(printService.getConfig());
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    const repo = getRepository();
    Promise.all([
      repo.getBusiness(),
      repo.getTaxSettings(),
      repo.getReceiptTemplate(currentOutlet?.id),
    ]).then(([biz, tax, tmpl]) => {
      if (biz) setBusiness(biz);
      if (tax) setTaxSettings(tax);
      if (tmpl) setReceiptTemplate(tmpl);
    });
  }, [currentOutlet]);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const repo = getRepository();
      const updated = await repo.updateBusiness(business);
      setBusiness(updated);
      showToast('Profil usaha berhasil disimpan!', 'success');
    } catch {
      showToast('Gagal menyimpan profil usaha', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTaxSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const repo = getRepository();
      const updated = await repo.updateTaxSettings(taxSettings);
      setTaxSettings(updated);
      showToast('Pengaturan pajak & kasir berhasil disimpan!', 'success');
    } catch {
      showToast('Gagal menyimpan pengaturan pajak', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReceiptTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const repo = getRepository();
      const updated = await repo.updateReceiptTemplate({
        ...receiptTemplate,
        outlet_id: currentOutlet?.id || null,
      });
      setReceiptTemplate(updated);
      showToast('Template struk belanja berhasil disimpan!', 'success');
    } catch {
      showToast('Gagal menyimpan template struk', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrinterConfig = (e: React.FormEvent) => {
    e.preventDefault();
    printService.updateConfig(printerConfig);
    showToast('Pengaturan printer thermal berhasil diperbarui!', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Pengaturan Sistem &amp; Perangkat
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Konfigurasi profil usaha, mode F&B/retail, pajak PPN, template struk, dan printer thermal
        </p>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="grid grid-cols-4 w-full h-11 mb-4">
          <TabsTrigger value="business" className="font-bold text-xs flex items-center space-x-1.5">
            <Store className="h-4 w-4" />
            <span>Profil Usaha</span>
          </TabsTrigger>
          <TabsTrigger value="tax" className="font-bold text-xs flex items-center space-x-1.5">
            <Sliders className="h-4 w-4" />
            <span>Pajak &amp; Kasir</span>
          </TabsTrigger>
          <TabsTrigger value="receipt" className="font-bold text-xs flex items-center space-x-1.5">
            <Receipt className="h-4 w-4" />
            <span>Template Struk</span>
          </TabsTrigger>
          <TabsTrigger value="hardware" className="font-bold text-xs flex items-center space-x-1.5">
            <Printer className="h-4 w-4" />
            <span>Printer &amp; DB</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PROFIL USAHA */}
        <TabsContent value="business">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <form onSubmit={handleSaveBusiness} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Nama Bisnis / Toko *</label>
                <Input
                  value={business.name}
                  onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Mode Operasional Usaha</label>
                <select
                  value={business.business_type}
                  onChange={(e) =>
                    setBusiness({ ...business, business_type: e.target.value as 'retail' | 'fnb' })
                  }
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="retail">Retail (Toko Kelontong, Mart, Minimarket)</option>
                  <option value="fnb">F&amp;B (Restoran, Kafe, Kedai Kopi - Denah Meja &amp; KDS Dapur)</option>
                </select>
                <p className="text-[11px] text-slate-400">
                  Mode F&amp;B mengaktifkan fitur meja makan dine-in, modifier/topping, dan Kitchen Display System.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Alamat Kantor / Toko</label>
                <Input
                  value={business.address || ''}
                  onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Nomor Telepon</label>
                <Input
                  value={business.phone || ''}
                  onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                  <Save className="mr-1.5 h-4 w-4" />
                  Simpan Profil Usaha
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 2: PAJAK & ATURAN KASIR */}
        <TabsContent value="tax">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <form onSubmit={handleSaveTaxSettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Tarif PPN (%)</label>
                  <Input
                    type="number"
                    value={taxSettings.ppn_percentage}
                    onChange={(e) =>
                      setTaxSettings({ ...taxSettings, ppn_percentage: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Biaya Layanan Service Charge (%)</label>
                  <Input
                    type="number"
                    value={taxSettings.service_charge_percentage}
                    onChange={(e) =>
                      setTaxSettings({
                        ...taxSettings,
                        service_charge_percentage: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Unit Pembulatan Rupiah</label>
                <select
                  value={taxSettings.rounding_unit}
                  onChange={(e) =>
                    setTaxSettings({ ...taxSettings, rounding_unit: parseInt(e.target.value, 10) || 100 })
                  }
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value={1}>Tanpa Pembulatan (Rp 1)</option>
                  <option value={50}>Kelipatan Rp 50</option>
                  <option value={100}>Kelipatan Rp 100 (Standar Retail)</option>
                  <option value={500}>Kelipatan Rp 500</option>
                  <option value={1000}>Kelipatan Rp 1.000</option>
                </select>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxSettings.is_ppn_enabled}
                    onChange={(e) => setTaxSettings({ ...taxSettings, is_ppn_enabled: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Aktifkan Perhitungan Pajak PPN di Kasir</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxSettings.is_tax_inclusive}
                    onChange={(e) => setTaxSettings({ ...taxSettings, is_tax_inclusive: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Harga Jual Sudah Termasuk Pajak (Tax Inclusive)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxSettings.is_service_charge_enabled}
                    onChange={(e) =>
                      setTaxSettings({ ...taxSettings, is_service_charge_enabled: e.target.checked })
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Aktifkan Biaya Layanan (Service Charge)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxSettings.allow_negative_stock}
                    onChange={(e) =>
                      setTaxSettings({ ...taxSettings, allow_negative_stock: e.target.checked })
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Izinkan Penjualan Saat Stok Habis (Stok Negatif Ditandai untuk Review)</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                  <Save className="mr-1.5 h-4 w-4" />
                  Simpan Pengaturan
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 3: TEMPLATE STRUK */}
        <TabsContent value="receipt">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <form onSubmit={handleSaveReceiptTemplate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Judul Header Struk *</label>
                <Input
                  value={receiptTemplate.header_title}
                  onChange={(e) => setReceiptTemplate({ ...receiptTemplate, header_title: e.target.value })}
                  placeholder="KEDAI & MART NUSANTARA"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Baris Alamat 1</label>
                  <Input
                    value={receiptTemplate.address_line1}
                    onChange={(e) =>
                      setReceiptTemplate({ ...receiptTemplate, address_line1: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Baris Alamat 2 / NPWP</label>
                  <Input
                    value={receiptTemplate.address_line2}
                    onChange={(e) =>
                      setReceiptTemplate({ ...receiptTemplate, address_line2: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Nomor Telepon di Struk</label>
                  <Input
                    value={receiptTemplate.phone}
                    onChange={(e) => setReceiptTemplate({ ...receiptTemplate, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Lebar Kertas Thermal</label>
                  <select
                    value={receiptTemplate.paper_width}
                    onChange={(e) =>
                      setReceiptTemplate({
                        ...receiptTemplate,
                        paper_width: parseInt(e.target.value, 10) as 58 | 80,
                      })
                    }
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value={58}>Thermal 58 mm (32 Karakter)</option>
                    <option value={80}>Thermal 80 mm (42 Karakter)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Pesan Penutup Footer Struk</label>
                <textarea
                  rows={3}
                  value={receiptTemplate.footer_message}
                  onChange={(e) =>
                    setReceiptTemplate({ ...receiptTemplate, footer_message: e.target.value })
                  }
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                  <Save className="mr-1.5 h-4 w-4" />
                  Simpan Template Struk
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 4: PRINTER & SUPABASE INTEGRATION */}
        <TabsContent value="hardware" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <CardTitle className="text-base font-bold flex items-center space-x-2">
              <Printer className="h-5 w-5 text-emerald-600" />
              <span>Pengaturan Printer Thermal</span>
            </CardTitle>

            <form onSubmit={handleSavePrinterConfig} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Metode Koneksi Printer</label>
                  <select
                    value={printerConfig.type}
                    onChange={(e) =>
                      setPrinterConfig({
                        ...printerConfig,
                        type: e.target.value as PrinterDeviceConfig['type'],
                      })
                    }
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="system">Sistem Browser / Print Dialog (Standar)</option>
                    <option value="serial">Web Serial USB (Direct ESC/POS)</option>
                    <option value="bluetooth">Web Bluetooth Thermal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Lebar Kertas</label>
                  <select
                    value={printerConfig.paperWidth}
                    onChange={(e) =>
                      setPrinterConfig({
                        ...printerConfig,
                        paperWidth: parseInt(e.target.value, 10) as 58 | 80,
                      })
                    }
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value={58}>58 mm</option>
                    <option value={80}>80 mm</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printerConfig.autoPrintReceipt}
                    onChange={(e) =>
                      setPrinterConfig({ ...printerConfig, autoPrintReceipt: e.target.checked })
                    }
                    className="rounded border-slate-300 text-emerald-600 h-4 w-4"
                  />
                  <span>Otomatis Cetak Struk Setelah Pembayaran Berhasil</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printerConfig.openDrawerOnCash}
                    onChange={(e) =>
                      setPrinterConfig({ ...printerConfig, openDrawerOnCash: e.target.checked })
                    }
                    className="rounded border-slate-300 text-emerald-600 h-4 w-4"
                  />
                  <span>Kirim Pulsa Buka Laci Kasir (Cash Drawer) pada Transaksi Tunai</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                  Simpan Konfigurasi Printer
                </Button>
              </div>
            </form>
          </Card>

          {/* Supabase Status Card */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-3">
            <CardTitle className="text-base font-bold flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <span>Status Integrasi Database Supabase</span>
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Aplikasi ini beroperasi dalam <span className="font-bold text-emerald-600">Demo Mode</span> menggunakan adapter IndexedDB (Dexie) dengan data simulasi lengkap. Untuk beralih ke Supabase Cloud live, salin <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">.env.example</code> ke <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">.env</code> dan isi <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> serta <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </CardDescription>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
