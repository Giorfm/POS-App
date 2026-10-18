'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getRepository } from '@/lib/repository';
import { soundFeedback } from '@/lib/audio';
import { ShieldAlert, Delete, Check } from 'lucide-react';
import { User } from '@/types';

interface ManagerAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onAuthorized: (manager: User) => void;
}

export function ManagerAuthModal({
  open,
  onOpenChange,
  title = 'Otorisasi Supervisor / Manajer',
  description = 'Masukkan PIN Manajer atau Pemilik untuk melanjutkan aksi sensitif ini.',
  onAuthorized,
}: ManagerAuthModalProps) {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setPin('');
      setError('');
    }
  }, [open]);

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

  const handleSubmit = async () => {
    if (!pin) {
      setError('Silakan masukkan PIN');
      return;
    }
    setIsVerifying(true);
    setError('');

    try {
      const repo = getRepository();
      const manager = await repo.verifyManagerPin(pin);
      if (manager) {
        soundFeedback.playPaymentSuccess();
        onAuthorized(manager);
        onOpenChange(false);
      } else {
        soundFeedback.playError();
        setError('PIN salah atau tidak memiliki hak akses Manajer (Coba: 889900 atau 112233)');
      }
    } catch {
      setError('Gagal memverifikasi PIN');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-2 dark:bg-amber-950 dark:text-amber-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 my-2">
          {/* PIN Dots Display */}
          <div className="flex justify-center space-x-3 my-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full border-2 transition-all ${
                  idx < pin.length
                    ? 'border-emerald-600 bg-emerald-600 scale-110'
                    : 'border-slate-300 dark:border-slate-700 bg-transparent'
                }`}
              />
            ))}
          </div>

          {error && <p className="text-xs font-medium text-red-600 text-center">{error}</p>}

          {/* On-screen Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-14 rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-800 hover:bg-slate-200 active:scale-95 transition-all dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-14 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600 hover:bg-slate-200 active:scale-95 transition-all dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-14 rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-800 hover:bg-slate-200 active:scale-95 transition-all dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            >
              <Delete className="h-6 w-6" />
            </button>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={pin.length < 4 || isVerifying}
            className="w-full max-w-xs h-12 text-base font-bold mt-2"
          >
            <Check className="mr-2 h-5 w-5" />
            {isVerifying ? 'Memverifikasi...' : 'Otorisasi Sekarang'}
          </Button>

          <p className="text-xs text-slate-400 text-center">
            Demo Manager PIN: <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">889900</span> atau Owner: <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">112233</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
