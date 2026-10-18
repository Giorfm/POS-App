'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { getRepository } from '@/lib/repository';
import { Outlet } from '@/types';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Clock,
  Users,
  BarChart3,
  Settings,
  Store,
  LogOut,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentUser, currentOutlet, initAuth, setOutlet, logout } = useAuthStore();
  const [outlets, setOutlets] = React.useState<Outlet[]>([]);

  React.useEffect(() => {
    initAuth();
    const repo = getRepository();
    repo.getOutlets().then(setOutlets).catch(() => {});
  }, [initAuth]);

  const navItems = [
    { href: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { href: '/dashboard/products', label: 'Produk & Katalog', icon: Package },
    { href: '/dashboard/inventory', label: 'Inventori & Stok', icon: Boxes },
    { href: '/dashboard/shifts', label: 'Shift Kasir', icon: Clock },
    { href: '/dashboard/customers', label: 'Pelanggan & Loyalti', icon: Users },
    { href: '/dashboard/reports', label: 'Laporan & Analitik', icon: BarChart3 },
    { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans select-none">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0 border-r border-slate-800 z-20">
        <div>
          {/* Brand header */}
          <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-2.5 font-black text-white text-base">
              <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-extrabold text-sm shadow-md shadow-emerald-500/20">
                P
              </div>
              <span>DASHBOARD</span>
            </Link>
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5">
              Admin
            </Badge>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User & POS Link */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* Switch to POS screen */}
          <Link
            href="/pos"
            className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kasir (POS)</span>
          </Link>

          {/* User profile */}
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="font-bold text-xs text-white block truncate">
                {currentUser?.name || 'Owner'}
              </span>
              <span className="text-[10px] uppercase text-emerald-400 font-semibold">
                {currentUser?.role || 'owner'}
              </span>
            </div>
            <button
              onClick={logout}
              title="Keluar"
              className="text-slate-400 hover:text-red-400 p-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cabang Aktif:
            </span>
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Store className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <select
                value={currentOutlet?.id || ''}
                onChange={(e) => {
                  const target = outlets.find((o) => o.id === e.target.value);
                  if (target) setOutlet(target);
                }}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id} className="dark:bg-slate-900">
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-xs font-medium border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
              Sinkronisasi Realtime Terhubung
            </Badge>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
