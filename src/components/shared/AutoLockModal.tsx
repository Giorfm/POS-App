'use client';

import * as React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Lock, Delete, LogOut } from 'lucide-react';
import { soundFeedback } from '@/lib/audio';

export function AutoLockModal() {
  const { isLocked, currentUser, unlockWithPin, logout } = useAuthStore();
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState('');
  const [isUnlocking, setIsUnlocking] = React.useState(false);

  React.useEffect(() => {
    if (isLocked) {
      setPin('');
      setError('');
    }
  }, [isLocked]);

  if (!isLocked) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + num);
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

  const handleUnlock = async () => {
    if (!pin) {
      setError('Masukkan PIN untuk membuka');
      return;
    }
    setIsUnlocking(true);
    const ok = await unlockWithPin(pin);
    setIsUnlocking(false);
    if (ok) {
      soundFeedback.playPaymentSuccess();
    } else {
      soundFeedback.playError();
      setError('PIN tidak cocok');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl text-center text-white flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
          <Lock className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-bold">Layar Terkunci</h2>
        <p className="text-sm text-slate-400 mt-1 mb-4">
          Kasir: <span className="font-semibold text-slate-200">{currentUser?.name || 'Kasir'}</span>
        </p>

        {/* PIN Dots */}
        <div className="flex justify-center space-x-3 my-2">
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

        {error && <p className="text-xs font-medium text-red-400 my-1">{error}</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 w-full my-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl border border-slate-800 bg-slate-800/80 text-xl font-bold text-slate-100 hover:bg-slate-700 active:scale-95 transition-all"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl border border-slate-800 bg-slate-800/50 text-xs font-semibold text-slate-400 hover:bg-slate-700 active:scale-95 transition-all"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl border border-slate-800 bg-slate-800/80 text-xl font-bold text-slate-100 hover:bg-slate-700 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl border border-slate-800 bg-slate-800/50 flex items-center justify-center text-slate-400 hover:bg-slate-700 active:scale-95 transition-all"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>

        <Button
          onClick={handleUnlock}
          disabled={pin.length < 4 || isUnlocking}
          className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg"
        >
          {isUnlocking ? 'Membuka...' : 'Buka Layar'}
        </Button>

        <button
          onClick={logout}
          className="mt-4 flex items-center text-xs text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 mr-1" />
          Ganti Akun / Logout
        </button>
      </div>
    </div>
  );
}
