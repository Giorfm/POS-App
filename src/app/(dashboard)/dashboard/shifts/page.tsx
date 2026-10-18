'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getRepository } from '@/lib/repository';
import { Shift, User } from '@/types';
import { formatRupiah } from '@/lib/domain/money';
import { formatDateTimeId } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { Clock, Printer, CheckCircle2, AlertTriangle, UserCheck } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function ShiftsPage() {
  const { currentOutlet } = useAuthStore();
  const { showToast } = useToast();

  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [selectedShift, setSelectedShift] = React.useState<Shift | null>(null);
  const [isZReportOpen, setIsZReportOpen] = React.useState(false);

  React.useEffect(() => {
    if (currentOutlet) {
      const repo = getRepository();
      Promise.all([repo.getShifts(currentOutlet.id, 50), repo.getUsers()]).then(
        ([sList, uList]) => {
          setShifts(sList);
          setUsers(uList);
        }
      );
    }
  }, [currentOutlet]);

  const handleOpenZReport = (shift: Shift) => {
    setSelectedShift(shift);
    setIsZReportOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Riwayat Shift Kasir &amp; Kas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit pembukaan kasir, kas masuk/keluar, rekonsiliasi kas fisik, dan cetak Laporan Z
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 uppercase font-bold text-slate-500">
              <tr>
                <th className="p-3.5 pl-6">ID &amp; Status</th>
                <th className="p-3.5">Kasir</th>
                <th className="p-3.5">Waktu Mulai - Selesai</th>
                <th className="p-3.5">Modal Awal</th>
                <th className="p-3.5">Penjualan Tunai</th>
                <th className="p-3.5">Non-Tunai</th>
                <th className="p-3.5">Ekspektasi Kas</th>
                <th className="p-3.5">Fisik di Laci</th>
                <th className="p-3.5">Selisih</th>
                <th className="p-3.5 pr-6 text-right">Laporan Z</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
              {shifts.map((s) => {
                const user = users.find((u) => u.id === s.user_id);
                const hasDiff = s.difference_cash && s.difference_cash !== 0;

                return (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                    <td className="p-3.5 pl-6">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{s.id}</div>
                      <Badge
                        variant={s.status === 'open' ? 'success' : 'secondary'}
                        className="text-[9px] uppercase font-bold mt-0.5"
                      >
                        {s.status === 'open' ? 'Shift Aktif' : 'Ditutup'}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-sans font-semibold">{user?.name || s.user_id}</td>
                    <td className="p-3.5 text-slate-500 font-sans">
                      <div>{formatDateTimeId(s.start_time)}</div>
                      <div className="text-[10px] text-slate-400">
                        {s.end_time ? formatDateTimeId(s.end_time) : 'Masih Berjalan'}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {formatRupiah(s.opening_cash)}
                    </td>
                    <td className="p-3.5 font-semibold text-emerald-600">
                      {formatRupiah(s.total_sales_cash)}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {formatRupiah(s.total_sales_non_cash)}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                      {formatRupiah(s.expected_cash)}
                    </td>
                    <td className="p-3.5 font-bold">
                      {s.actual_cash !== null && s.actual_cash !== undefined
                        ? formatRupiah(s.actual_cash)
                        : '-'}
                    </td>
                    <td className="p-3.5">
                      {hasDiff ? (
                        <span className="font-bold text-amber-600">
                          {formatRupiah(s.difference_cash!)}
                        </span>
                      ) : s.status === 'closed' ? (
                        <span className="text-emerald-600 font-semibold">Rp 0 (Pas)</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenZReport(s)}
                        className="text-xs font-semibold"
                      >
                        <Printer className="h-3.5 w-3.5 mr-1 text-slate-600" />
                        Laporan Z
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Laporan Z Modal */}
      <Dialog open={isZReportOpen} onOpenChange={setIsZReportOpen}>
        <DialogContent onClose={() => setIsZReportOpen(false)} className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Laporan Z Penutupan Shift</DialogTitle>
          </DialogHeader>

          {selectedShift && (
            <div className="space-y-3 font-mono text-xs my-2">
              <div
                id="thermal-receipt-printable"
                className="p-4 bg-white text-slate-900 border rounded-lg space-y-1.5"
              >
                <div className="text-center font-bold pb-2 border-b">
                  <div className="text-base uppercase font-black">LAPORAN Z SHIFT</div>
                  <div className="text-[11px] font-sans text-slate-500">KEDAI NUSANTARA</div>
                </div>

                <div className="text-[11px] space-y-0.5 pt-1">
                  <div className="flex justify-between">
                    <span>ID Shift:</span>
                    <span>{selectedShift.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{users.find((u) => u.id === selectedShift.user_id)?.name || 'Kasir'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mulai:</span>
                    <span>{formatDateTimeId(selectedShift.start_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selesai:</span>
                    <span>
                      {selectedShift.end_time ? formatDateTimeId(selectedShift.end_time) : '-'}
                    </span>
                  </div>
                </div>

                <div className="border-b my-2" />

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Modal Awal Kas</span>
                    <span>{formatRupiah(selectedShift.opening_cash)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Penjualan Tunai (+)</span>
                    <span>{formatRupiah(selectedShift.total_sales_cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kas Masuk Lain (+)</span>
                    <span>{formatRupiah(selectedShift.total_cash_in)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Kas Keluar (-)</span>
                    <span>{formatRupiah(selectedShift.total_cash_out)}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-bold">
                    <span>Ekspektasi Kas Laci</span>
                    <span>{formatRupiah(selectedShift.expected_cash)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Fisik Kas Dihitung</span>
                    <span>{formatRupiah(selectedShift.actual_cash || selectedShift.expected_cash)}</span>
                  </div>
                  {selectedShift.difference_cash !== null && selectedShift.difference_cash !== 0 && (
                    <div className="flex justify-between font-bold text-amber-600">
                      <span>Selisih Kas</span>
                      <span>{formatRupiah(selectedShift.difference_cash || 0)}</span>
                    </div>
                  )}
                </div>

                <div className="border-b my-2" />

                <div className="flex justify-between">
                  <span>Non-Tunai (QRIS & EDC)</span>
                  <span>{formatRupiah(selectedShift.total_sales_non_cash)}</span>
                </div>

                {selectedShift.notes && (
                  <div className="pt-2 text-[10px] text-slate-500 font-sans italic">
                    Catatan: &quot;{selectedShift.notes}&quot;
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Printer className="h-4 w-4 mr-1.5" />
                  Cetak Laporan Z
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
