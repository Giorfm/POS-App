'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getRepository } from '@/lib/repository';
import { User } from '@/types';
import { SEED_USERS } from '@/lib/db/seedData';
import { Lock, Delete, Store, UserCheck, Shield, KeyRound } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { soundFeedback } from '@/lib/audio';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPin, loginAsUser } = useAuthStore();
  const { showToast } = useToast();

  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [users, setUsers] = React.useState<User[]>(SEED_USERS);

  React.useEffect(() => {
    const repo = getRepository();
    repo.getUsers().then((list) => {
      if (list && list.length > 0) setUsers(list);
    }).catch(() => {});
  }, []);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('Silakan masukkan PIN');
      return;
    }
    setIsLoading(true);
    const result = await loginWithPin(pin);
    setIsLoading(false);
    if (result.success) {
      soundFeedback.playPaymentSuccess();
      showToast('Login berhasil! Selamat bertugas.', 'success');
      router.push('/pos');
    } else {
      soundFeedback.playError();
      setError(result.message || 'PIN salah');
    }
  };

  const handleQuickLoginAs = (user: User) => {
    loginAsUser(user);
    soundFeedback.playPaymentSuccess();
    showToast(`Login cepat sebagai ${user.name} (${user.role.toUpperCase()})`, 'success');
    if (user.role === 'owner' || user.role === 'manager') {
      router.push('/dashboard');
    } else {
      router.push('/pos');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between p-4 sm:p-8 select-none text-white">
      {/* Brand Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/20">
            P
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white leading-tight">
              POS NUSANTARA
            </h1>
            <p className="text-xs text-slate-400">Sistem Kasir & Dashboard Terintegrasi</p>
          </div>
        </div>

        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 font-semibold">
          Demo Mode Aktif
        </Badge>
      </div>

      {/* Main Login Container */}
      <div className="max-w-4xl w-full mx-auto my-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Quick PIN Numpad */}
        <div className="w-full max-w-sm mx-auto rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
            <KeyRound className="h-7 w-7" />
          </div>

          <h2 className="text-xl font-bold">Masuk Kasir dengan PIN</h2>
          <p className="text-xs text-slate-400 mt-1 mb-4 text-center">
            Ketik 4-6 digit PIN staf untuk membuka kasir
          </p>

          {/* PIN Dots Indicator */}
          <div className="flex justify-center space-x-3 my-3">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full border-2 transition-all ${
                  idx < pin.length
                    ? 'border-emerald-500 bg-emerald-500 scale-110'
                    : 'border-slate-700 bg-transparent'
                }`}
              />
            ))}
          </div>

          {error && <p className="text-xs font-semibold text-red-400 my-1">{error}</p>}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full my-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleKeyPress(d)}
                className="h-14 rounded-2xl border border-slate-800 bg-slate-800/80 text-xl font-bold text-slate-100 hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-14 rounded-2xl border border-slate-800 bg-slate-800/40 text-xs font-semibold text-slate-400 hover:bg-slate-700 active:scale-95 transition-all"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-14 rounded-2xl border border-slate-800 bg-slate-800/80 text-xl font-bold text-slate-100 hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 rounded-2xl border border-slate-800 bg-slate-800/40 flex items-center justify-center text-slate-400 hover:bg-slate-700 active:scale-95 transition-all"
            >
              <Delete className="h-6 w-6" />
            </button>
          </div>

          <Button
            onClick={() => handlePinSubmit()}
            disabled={pin.length < 4 || isLoading}
            className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20"
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}
          </Button>
        </div>

        {/* Right: 1-Click Demo Accounts Selector */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              <span>Pilih Akun Demo (1-Klik Masuk)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Klik nama staf di bawah untuk langsung mencoba aplikasi sesuai hak akses:
            </p>
          </div>

          <div className="space-y-2.5">
            {users.map((u) => {
              const roleBadge =
                u.role === 'owner'
                  ? 'bg-purple-950 text-purple-300 border-purple-800'
                  : u.role === 'manager'
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-800';

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLoginAs(u)}
                  className="w-full p-4 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-emerald-500/50 text-left flex items-center justify-between transition-all group active:scale-[0.99]"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="h-11 w-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-base text-emerald-400 group-hover:scale-105 transition-transform">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-100">{u.name}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${roleBadge}`}>
                          {u.role}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 block mt-0.5">{u.email}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">
                      PIN: {u.pin_hash}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Klik untuk masuk</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500">
        &copy; 2026 POS Nusantara. Dibangun untuk kehandalan kasir offline-first &amp; analitik dashboard real-time.
      </div>
    </div>
  );
}
