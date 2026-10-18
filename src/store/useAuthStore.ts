import { create } from 'zustand';
import { User, Outlet } from '@/types';
import { getRepository } from '@/lib/repository';
import { SEED_OUTLETS, SEED_USERS } from '@/lib/db/seedData';

interface AuthState {
  currentUser: User | null;
  currentOutlet: Outlet | null;
  isLocked: boolean;
  isLoading: boolean;
  autoLockTimeoutMs: number;
  lastActiveTime: number;

  initAuth: () => Promise<void>;
  loginWithPin: (pin: string) => Promise<{ success: boolean; message?: string }>;
  loginAsUser: (user: User) => void;
  unlockWithPin: (pin: string) => Promise<boolean>;
  lockScreen: () => void;
  recordActivity: () => void;
  logout: () => void;
  setOutlet: (outlet: Outlet) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  currentOutlet: null,
  isLocked: false,
  isLoading: true,
  autoLockTimeoutMs: 5 * 60 * 1000, // 5 minutes idle lock
  lastActiveTime: Date.now(),

  initAuth: async () => {
    try {
      const repo = getRepository();
      const outlets = await repo.getOutlets();
      const defaultOutlet = outlets[0] || SEED_OUTLETS[0];

      // Restore session from localStorage if available
      if (typeof window !== 'undefined') {
        const savedUserId = localStorage.getItem('pos_active_user_id');
        const savedOutletId = localStorage.getItem('pos_active_outlet_id');

        let activeUser: User | null = null;
        if (savedUserId) {
          activeUser = await repo.getUserById(savedUserId);
        }
        if (!activeUser) {
          // Default to Kasir 1 for rapid instant onboarding
          activeUser = SEED_USERS[2];
        }

        let activeOutlet = defaultOutlet;
        if (savedOutletId) {
          const found = outlets.find((o) => o.id === savedOutletId);
          if (found) activeOutlet = found;
        }

        set({
          currentUser: activeUser,
          currentOutlet: activeOutlet,
          isLoading: false,
          isLocked: false,
          lastActiveTime: Date.now(),
        });
        return;
      }

      set({
        currentUser: SEED_USERS[2],
        currentOutlet: defaultOutlet,
        isLoading: false,
        isLocked: false,
      });
    } catch {
      set({
        currentUser: SEED_USERS[2],
        currentOutlet: SEED_OUTLETS[0],
        isLoading: false,
      });
    }
  },

  loginWithPin: async (pin: string) => {
    try {
      const repo = getRepository();
      const user = await repo.verifyUserPin(pin);
      if (!user) {
        return { success: false, message: 'PIN salah atau akun tidak aktif' };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_active_user_id', user.id);
      }

      set({
        currentUser: user,
        isLocked: false,
        lastActiveTime: Date.now(),
      });
      return { success: true };
    } catch {
      return { success: false, message: 'Terjadi kesalahan sistem' };
    }
  },

  loginAsUser: (user: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_active_user_id', user.id);
    }
    set({
      currentUser: user,
      isLocked: false,
      lastActiveTime: Date.now(),
    });
  },

  unlockWithPin: async (pin: string) => {
    const { currentUser } = get();
    if (!currentUser) return false;

    // Matches current user PIN or any manager/owner PIN
    if (currentUser.pin_hash === pin.trim()) {
      set({ isLocked: false, lastActiveTime: Date.now() });
      return true;
    }

    const repo = getRepository();
    const manager = await repo.verifyManagerPin(pin);
    if (manager) {
      set({ isLocked: false, lastActiveTime: Date.now() });
      return true;
    }

    return false;
  },

  lockScreen: () => {
    set({ isLocked: true });
  },

  recordActivity: () => {
    const { isLocked, autoLockTimeoutMs, lastActiveTime } = get();
    const now = Date.now();
    if (!isLocked && now - lastActiveTime > autoLockTimeoutMs) {
      set({ isLocked: true });
    } else {
      set({ lastActiveTime: now });
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_active_user_id');
    }
    set({
      currentUser: null,
      isLocked: false,
    });
  },

  setOutlet: (outlet: Outlet) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_active_outlet_id', outlet.id);
    }
    set({ currentOutlet: outlet });
  },
}));
