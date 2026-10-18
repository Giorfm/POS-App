'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useShiftStore } from '@/store/useShiftStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatRupiah } from '@/lib/domain/money';
import { formatDateTimeId } from '@/lib/utils';
import { Clock, ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle2, Printer, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { soundFeedback } from '@/lib/audio';
import { Shift } from '@/types';

interface ShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShiftClosed?: (closedShift: Shift) => void;
}

export function ShiftModal({ open, onOpenChange, onShiftClosed }: ShiftModalProps) {
  const { currentShift, openShift, recordCashMovement, closeShift } = useShiftStore();
  const { currentUser, currentOutlet } = useAuthStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = React.useState('summary');

  // Open shift state
  const [openingCashInput, setOpeningCashInput] = React.useState('200000');

  // Petty cash state
  const [cashMovementType, setCashMovementType] = React.useState<'cash_in' | 'cash_out'>('cash_in');
  const [cashMovementAmount, setCashMovementAmount] = React.useState('');
  const [cashMovementReason, setCashMovementReason] = React.useState('');

  // Close shift state
  const [actualCashInput, setActualCashInput] = React.useState('');
  const [discrepancyNote, setDiscrepancyNote] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (currentShift) {
        setActualCashInput(currentShift.expected_cash.toString());
        setActiveTab('summary');
      } else {
        setOpeningCashInput('200000');
      }
      setCashMovementAmount('');
      setCashMovementReason('');
      setDiscrepancyNote('');
      setIsSubmitting(false);
    }
  }, [open, currentShift]);

  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentOutlet) return;
    const amount = parseInt(openingCashInput, 10) || 0;
    setIsSubmitting(true);
    try {
      await openShift(currentOutlet.id, currentUser.id, amount);
      soundFeedback.playPaymentSuccess();
      showToast('Shift kasir berhasil dibuka!', 'success');
      setActiveTab('summary');
    } catch {
      showToast('Gagal membuka shift', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCashMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentOutlet || !currentShift) return;
    const amt = parseInt(cashMovementAmount, 10) || 0;
    if (amt <= 0 || !cashMovementReason.trim()) {
      showToast('Nominal dan alasan wajib diisi', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await recordCashMovement(
        currentOutlet.id,
        currentUser.id,
        cashMovementType,
        amt,
        cashMovementReason.trim()
      );
      soundFeedback.playPaymentSuccess();
      showToast(
        `Kas ${cashMovementType === 'cash_in' ? 'masuk' : 'keluar'} berhasil dicatat`,
        'success'
      );
      setCashMovementAmount('');
      setCashMovementReason('');
      setActiveTab('summary');
    } catch {
      showToast('Gagal mencatat kas', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const actualCash = parseInt(actualCashInput, 10) || 0;
  const expectedCash = currentShift ? currentShift.expected_cash : 0;
  const difference = actualCash - expectedCash;

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;
    if (difference !== 0 && !discrepancyNote.trim()) {
      showToast('Selisih kas terdeteksi! Wajib mengisi catatan alasan selisih.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const closed = await closeShift(actualCash, discrepancyNote.trim());
      soundFeedback.playPaymentSuccess();
      showToast('Shift kasir berhasil ditutup!', 'success');
      onOpenChange(false);
      if (onShiftClosed) onShiftClosed(closed);
    } catch {
      showToast('Gagal menutup shift', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg p-6">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            <DialogTitle>
              {currentShift ? 'Manajemen Shift Kasir' : 'Buka Shift Kasir Baru'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {currentShift
              ? `Shift aktif sejak ${formatDateTimeId(currentShift.start_time)}`
              : 'Masukkan modal kas awal di laci untuk memulai penjualan hari ini.'}
          </DialogDescription>
        </DialogHeader>

        {!currentShift ? (
          /* FORM BUKA SHIFT BARU */
          <form onSubmit={handleOpenShiftSubmit} className="space-y-4 my-3">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              Kasir aktif: <span className="font-bold">{currentUser?.name}</span> ({currentUser?.role})
              di <span className="font-bold">{currentOutlet?.name}</span>.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modal Kas Awal di Laci (Rp) *
              </label>
              <Input
                type="number"
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                placeholder="200000"
                className="h-12 text-lg font-bold font-mono"
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-400">
                Uang fisik pecahan kecil yang disiapkan di laci untuk uang kembalian pertama.
              </p>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold h-11 px-6"
              >
                {isSubmitting ? 'Membuka...' : 'Buka Shift Sekarang'}
              </Button>
            </div>
          </form>
        ) : (
          /* SHIFT AKTIF BERJALAN TABS */
          <div className="space-y-3 my-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full h-11 mb-3">
                <TabsTrigger value="summary">Ringkasan</TabsTrigger>
                <TabsTrigger value="movement">Kas Masuk/Keluar</TabsTrigger>
                <TabsTrigger value="close">Tutup Shift</TabsTrigger>
              </TabsList>

              {/* TAB 1: RINGKASAN */}
              <TabsContent value="summary" className="space-y-3">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kasir Aktif:</span>
                    <span className="font-bold">{currentUser?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Modal Kas Awal:</span>
                    <span className="font-bold">{formatRupiah(currentShift.opening_cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Penjualan Tunai (Cash):</span>
                    <span className="font-bold text-emerald-600">
                      +{formatRupiah(currentShift.total_sales_cash)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Kas Masuk (Lainnya):</span>
                    <span className="font-bold">+{formatRupiah(currentShift.total_cash_in)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Kas Keluar (Petty Cash):</span>
                    <span className="font-bold text-red-500">
                      -{formatRupiah(currentShift.total_cash_out)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    <span>Ekspektasi Uang Fisik di Laci:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(currentShift.expected_cash)}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs flex justify-between items-center">
                  <span className="text-slate-500">Penjualan Non-Tunai (QRIS & EDC):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatRupiah(currentShift.total_sales_non_cash)}
                  </span>
                </div>
              </TabsContent>

              {/* TAB 2: KAS MASUK / KELUAR */}
              <TabsContent value="movement">
                <form onSubmit={handleCashMovementSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCashMovementType('cash_in')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors ${
                        cashMovementType === 'cash_in'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                          : 'border-slate-200'
                      }`}
                    >
                      <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                      <span>Kas Masuk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashMovementType('cash_out')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors ${
                        cashMovementType === 'cash_out'
                          ? 'border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200'
                          : 'border-slate-200'
                      }`}
                    >
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                      <span>Kas Keluar</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Nominal Uang (Rp) *</label>
                    <Input
                      type="number"
                      value={cashMovementAmount}
                      onChange={(e) => setCashMovementAmount(e.target.value)}
                      placeholder="Cth: 50000"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Alasan / Keterangan *</label>
                    <Input
                      value={cashMovementReason}
                      onChange={(e) => setCashMovementReason(e.target.value)}
                      placeholder="Contoh: Beli es batu, beli plastik kresek..."
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold"
                  >
                    Simpan Pergerakan Kas
                  </Button>
                </form>
              </TabsContent>

              {/* TAB 3: TUTUP SHIFT */}
              <TabsContent value="close">
                <form onSubmit={handleCloseShiftSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Uang Fisik di Laci Kasir (Rp) *</label>
                    <Input
                      type="number"
                      value={actualCashInput}
                      onChange={(e) => setActualCashInput(e.target.value)}
                      className="h-12 text-lg font-bold font-mono"
                      required
                    />
                    <p className="text-[11px] text-slate-400">
                      Hitung seluruh uang fisik di laci saat ini dan masukkan nominal di atas.
                    </p>
                  </div>

                  {/* Discrepancy indicator */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      difference === 0
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">
                        {difference === 0 ? 'Kas Seimbang (Sesuai)' : 'Selisih Kas Fisik vs Sistem:'}
                      </span>
                      <span className="font-extrabold text-sm tabular-nums">
                        {difference === 0 ? 'Rp 0' : formatRupiah(difference)}
                      </span>
                    </div>
                    {difference === 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    )}
                  </div>

                  {/* Required note if discrepancy */}
                  {difference !== 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        Alasan Selisih Kas (Wajib Diisi) *
                      </label>
                      <Input
                        value={discrepancyNote}
                        onChange={(e) => setDiscrepancyNote(e.target.value)}
                        placeholder="Jelaskan alasan selisih..."
                        required
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-extrabold"
                  >
                    {isSubmitting ? 'Menutup Shift...' : 'Tutup Shift & Cetak Laporan Z'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
