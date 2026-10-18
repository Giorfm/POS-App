import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';
import { AutoLockModal } from '@/components/shared/AutoLockModal';
import { ServiceWorkerRegister } from '@/components/shared/ServiceWorkerRegister';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'POS Nusantara — Sistem Kasir & Dashboard Terintegrasi',
  description: 'Sistem POS modern offline-first, cepat, dan terintegrasi lengkap dengan Dashboard Utama.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 font-sans selection:bg-emerald-500 selection:text-white">
        <ToastProvider>
          {children}
          <AutoLockModal />
          <ServiceWorkerRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
