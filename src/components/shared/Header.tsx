'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore } from '@/store/useShiftStore';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  User as UserIcon,
  Clock,
  Wifi,
  WifiOff,
  Printer,
  Lock,
  LayoutDashboard,
  UtensilsCrossed,
  Monitor,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { getRepository } from '@/lib/repository';
import { Outlet } from '@/types';

interface HeaderProps {
  onOpenShiftModal?: () => void;
  activeSection?: 'pos' | 'dashboard' | 'kds';
}

export function Header({ onOpenShiftModal, activeSection = 'pos' }: HeaderProps) {
  const { currentUser, currentOutlet, lockScreen, logout, setOutlet } = useAuthStore();
  const { currentShift, refreshShift } = useShiftStore();
  const [isOnline, setIsOnline] = React.useState(true);
  const [outlets, setOutlets] = React.useState<Outlet[]>([]);
  const [isSyncing, setIsSyncing] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Fetch outlets
      const repo = getRepository();
      repo.getOutlets().then((res) => setOutlets(res)).catch(() => {});

      if (currentOutlet) {
        refreshShift(currentOutlet.id, currentUser?.id);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [currentOutlet, currentUser, refreshShift]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 800);
  };

  return (
    <header className="h-16 w-full bg-slate-900 text-white border-b border-slate-800 px-4 flex items-center justify-between select-none z-30">
      {/* Left: Brand & Outlet Selector */}
      <div className="flex items-center space-x-3">
        <Link href="/pos" className="flex items-center space-x-2 font-black tracking-tight text-lg text-white">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
            P
          </div>
          <span className="hidden sm:inline">POS NUSANTARA</span>
        </Link>

        <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Outlet Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60 text-xs">
          <Store className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <select
            value={currentOutlet?.id || ''}
            onChange={(e) => {
              const selected = outlets.find((o) => o.id === e.target.value);
              if (selected) setOutlet(selected);
            }}
            className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Center: Shift status & Mode Links */}
      <div className="hidden lg:flex items-center space-x-2">
        {/* Shift Badge & Quick Trigger */}
        <button
          onClick={onOpenShiftModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-xs transition-colors"
        >
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span>Shift:</span>
          {currentShift ? (
            <Badge variant="success" className="text-[10px] py-0 px-1.5 font-bold">
              AKTIF
            </Badge>
          ) : (
            <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-bold">
              TUTUP
            </Badge>
          )}
        </button>

        {/* Quick Nav Links */}
        <div className="h-5 w-px bg-slate-800 mx-1" />

        <Link
          href="/pos"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'pos'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Store className="h-3.5 w-3.5" />
          <span>Kasir</span>
        </Link>

        <Link
          href="/pos/kds"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'kds'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <UtensilsCrossed className="h-3.5 w-3.5" />
          <span>Dapur (KDS)</span>
        </Link>

        <Link
          href="/pos/customer-display"
          target="_blank"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center space-x-1.5 transition-colors"
        >
          <Monitor className="h-3.5 w-3.5" />
          <span>Layar Pelanggan</span>
        </Link>

        <Link
          href="/dashboard"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeSection === 'dashboard'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Right: Status Indicators & User Profile */}
      <div className="flex items-center space-x-2.5">
        {/* Network & Sync indicator */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/60 px-2 py-1 rounded-md border border-slate-800">
          {isOnline ? (
            <span className="flex items-center text-emerald-400 text-[11px] font-medium" title="Terhubung Online">
              <Wifi className="h-3.5 w-3.5 mr-1" />
              Online
            </span>
          ) : (
            <span className="flex items-center text-amber-400 text-[11px] font-medium" title="Mode Offline (Tersimpan Lokal)">
              <WifiOff className="h-3.5 w-3.5 mr-1" />
              Offline
            </span>
          )}

          <button
            onClick={handleSyncNow}
            title="Sinkronisasi Antrean"
            className="p-0.5 hover:text-white text-slate-400"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Printer status */}
        <div
          className="hidden sm:flex items-center text-[11px] text-slate-400 bg-slate-800/60 px-2 py-1 rounded-md border border-slate-800"
          title="Printer Siap (Thermal 58mm/80mm)"
        >
          <Printer className="h-3.5 w-3.5 text-emerald-400 mr-1" />
          <span>Thermal Siap</span>
        </div>

        {/* User Badge */}
        <div className="flex items-center space-x-2 pl-1">
          <div className="flex flex-col text-right leading-tight hidden md:flex">
            <span className="text-xs font-bold text-slate-100">{currentUser?.name || 'Kasir'}</span>
            <span className="text-[10px] text-emerald-400 uppercase font-semibold">
              {currentUser?.role || 'cashier'}
            </span>
          </div>

          {/* Quick Lock Button */}
          <button
            onClick={lockScreen}
            title="Kunci Layar (Auto-lock)"
            className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700/60 transition-colors"
          >
            <Lock className="h-4 w-4" />
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            title="Keluar / Ganti Pengguna"
            className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 flex items-center justify-center border border-slate-700/60 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
