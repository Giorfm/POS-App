import { Order, ReceiptTemplate, User } from '@/types';
import { buildReceiptEscPos } from './escpos';

export type PrinterConnectionType = 'system' | 'serial' | 'bluetooth';

export interface PrinterDeviceConfig {
  type: PrinterConnectionType;
  paperWidth: 58 | 80;
  deviceName?: string;
  autoPrintReceipt: boolean;
  openDrawerOnCash: boolean;
}

class PrintService {
  private config: PrinterDeviceConfig = {
    type: 'system',
    paperWidth: 58,
    autoPrintReceipt: true,
    openDrawerOnCash: true,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pos_printer_config');
        if (saved) {
          this.config = { ...this.config, ...JSON.parse(saved) };
        }
      } catch {}
    }
  }

  public getConfig(): PrinterDeviceConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<PrinterDeviceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_printer_config', JSON.stringify(this.config));
    }
  }

  /**
   * Print order receipt.
   * If hardware Web Serial/Bluetooth is configured, sends raw ESC/POS bytes.
   * Otherwise falls back seamlessly to browser thermal window.print().
   */
  public async printReceipt(
    order: Order,
    template: ReceiptTemplate,
    cashier?: User,
    isDuplicate: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Hardware Serial/Bluetooth check
      if (this.config.type === 'serial' && typeof navigator !== 'undefined' && 'serial' in navigator) {
        // Serial port print attempt
        try {
          const nav = navigator as unknown as {
            serial: {
              requestPort: () => Promise<{
                open: (options: { baudRate: number }) => Promise<void>;
                writable: { getWriter: () => { write: (bytes: Uint8Array) => Promise<void>; releaseLock: () => void } };
                close: () => Promise<void>;
              }>;
            };
          };
          const port = await nav.serial.requestPort();
          await port.open({ baudRate: 9600 });
          const writer = port.writable.getWriter();
          const bytes = buildReceiptEscPos(order, template, cashier, isDuplicate);
          await writer.write(bytes);
          writer.releaseLock();
          await port.close();
          return { success: true, message: 'Struk berhasil dicetak ke printer serial' };
        } catch (err: unknown) {
          console.warn('Serial print failed, falling back to system print:', err);
        }
      }

      // Default browser thermal window.print() fallback
      if (typeof window !== 'undefined') {
        window.print();
        return { success: true, message: 'Dialog cetak struk berhasil dibuka' };
      }

      return { success: false, message: 'Lingkungan browser tidak tersedia' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencetak struk';
      return { success: false, message: msg };
    }
  }
}

export const printService = new PrintService();
