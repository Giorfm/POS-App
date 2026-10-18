import { create } from 'zustand';
import { Shift, CashMovement } from '@/types';
import { getRepository } from '@/lib/repository';

interface ShiftState {
  currentShift: Shift | null;
  isLoading: boolean;
  error: string | null;

  refreshShift: (outletId: string, userId?: string) => Promise<Shift | null>;
  openShift: (outletId: string, userId: string, openingCash: number) => Promise<Shift>;
  recordCashMovement: (
    outletId: string,
    userId: string,
    type: 'cash_in' | 'cash_out',
    amount: number,
    reason: string
  ) => Promise<CashMovement>;
  closeShift: (actualCash: number, notes?: string) => Promise<Shift>;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentShift: null,
  isLoading: false,
  error: null,

  refreshShift: async (outletId: string, userId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const repo = getRepository();
      const shift = await repo.getActiveShift(outletId, userId);
      set({ currentShift: shift, isLoading: false });
      return shift;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat shift';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  openShift: async (outletId: string, userId: string, openingCash: number) => {
    set({ isLoading: true, error: null });
    try {
      const repo = getRepository();
      const shift = await repo.openShift({
        outletId,
        userId,
        openingCash,
      });
      set({ currentShift: shift, isLoading: false });
      return shift;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuka shift';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  recordCashMovement: async (outletId, userId, type, amount, reason) => {
    const { currentShift } = get();
    if (!currentShift) throw new Error('Tidak ada shift aktif');

    const repo = getRepository();
    const movement = await repo.recordCashMovement({
      shiftId: currentShift.id,
      outletId,
      userId,
      type,
      amount,
      reason,
    });

    // Refresh active shift state
    await get().refreshShift(outletId, userId);
    return movement;
  },

  closeShift: async (actualCash: number, notes?: string) => {
    const { currentShift } = get();
    if (!currentShift) throw new Error('Tidak ada shift aktif untuk ditutup');

    set({ isLoading: true, error: null });
    try {
      const repo = getRepository();
      const closed = await repo.closeShift({
        shiftId: currentShift.id,
        actualCash,
        notes,
      });
      set({ currentShift: null, isLoading: false });
      return closed;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menutup shift';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },
}));
