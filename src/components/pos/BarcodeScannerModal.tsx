'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Scan, AlertCircle } from 'lucide-react';
import { soundFeedback } from '@/lib/audio';

interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScannerModal({
  open,
  onOpenChange,
  onScan,
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = React.useState('');
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    if (open) {
      setManualCode('');
      setCameraError(null);

      // Start webcam stream
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'environment' } })
          .then((stream) => {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          })
          .catch((err) => {
            console.warn('Camera access error:', err);
            setCameraError('Kamera tidak dapat diakses atau izin ditolak. Anda tetap dapat memasukkan barcode/SKU manual di bawah.');
          });
      }
    } else {
      // Stop webcam stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [open]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      soundFeedback.playScanSuccess();
      onScan(manualCode.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2 dark:bg-emerald-950 dark:text-emerald-400">
            <Scan className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Pemindai Barcode Kamera</DialogTitle>
          <DialogDescription className="text-center">
            Arahkan kamera ke barcode produk atau ketik nomor barcode di bawah.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Camera Viewport or Fallback */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
            {cameraError ? (
              <div className="p-4 text-center text-slate-400 flex flex-col items-center">
                <AlertCircle className="h-8 w-8 text-amber-400 mb-2" />
                <p className="text-xs leading-relaxed">{cameraError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {/* Laser scan line overlay */}
                <div className="absolute inset-x-8 top-1/2 h-0.5 bg-red-500 shadow-lg shadow-red-500/50 animate-pulse" />
                <div className="absolute top-2 right-2 bg-slate-900/80 text-emerald-400 text-[10px] px-2 py-1 rounded-full flex items-center space-x-1 backdrop-blur-sm">
                  <Camera className="h-3 w-3" />
                  <span>Kamera Aktif</span>
                </div>
              </>
            )}
          </div>

          {/* Quick Demo Scan Buttons for immediate testing */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 mb-1.5 block">
              Simulasi Pindai Cepat (Klik Barcode Demo):
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundFeedback.playScanSuccess();
                  onScan('899100100001');
                  onOpenChange(false);
                }}
                className="text-left p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-850 text-xs font-mono"
              >
                <div className="font-sans font-bold text-slate-800 dark:text-slate-200">Kopi Susu Aren</div>
                <div className="text-[10px] text-slate-400">899100100001</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFeedback.playScanSuccess();
                  onScan('899600160026');
                  onOpenChange(false);
                }}
                className="text-left p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-850 text-xs font-mono"
              >
                <div className="font-sans font-bold text-slate-800 dark:text-slate-200">Le Minerale 600ml</div>
                <div className="text-[10px] text-slate-400">899600160026</div>
              </button>
            </div>
          </div>

          {/* Manual Barcode / SKU input */}
          <form onSubmit={handleManualSubmit} className="flex space-x-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ketik barcode atau SKU..."
              className="flex-1 font-mono text-sm"
              autoFocus
            />
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              Pindai
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
