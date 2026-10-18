import { Order, ReceiptTemplate, User } from '@/types';
import { formatRupiah } from '@/lib/domain/money';
import { formatDateTimeId } from '@/lib/utils';

export class EscPosBuilder {
  private buffer: number[] = [];
  private charWidth: number; // 32 for 58mm, 42/48 for 80mm

  constructor(paperWidth: 58 | 80 = 58) {
    this.charWidth = paperWidth === 58 ? 32 : 42;
    this.init();
  }

  public init(): this {
    this.buffer.push(0x1b, 0x40); // ESC @
    return this;
  }

  public alignLeft(): this {
    this.buffer.push(0x1b, 0x61, 0x00);
    return this;
  }

  public alignCenter(): this {
    this.buffer.push(0x1b, 0x61, 0x01);
    return this;
  }

  public alignRight(): this {
    this.buffer.push(0x1b, 0x61, 0x02);
    return this;
  }

  public bold(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  public doubleSize(enable: boolean = true): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00); // double height & width
    return this;
  }

  public text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  public newLine(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  public line(str: string = ''): this {
    this.text(str);
    this.newLine();
    return this;
  }

  public divider(char: string = '-'): this {
    this.text(char.repeat(this.charWidth));
    this.newLine();
    return this;
  }

  public twoColumns(left: string, right: string): this {
    const available = this.charWidth;
    const rightLen = right.length;
    const maxLeftLen = available - rightLen - 1;
    let cleanLeft = left;
    if (left.length > maxLeftLen) {
      cleanLeft = left.substring(0, maxLeftLen);
    }
    const spacesNeeded = available - cleanLeft.length - rightLen;
    const spaces = ' '.repeat(Math.max(1, spacesNeeded));
    this.text(cleanLeft + spaces + right);
    this.newLine();
    return this;
  }

  public cut(): this {
    this.newLine(3);
    this.buffer.push(0x1d, 0x56, 0x41, 0x10); // GS V A 16 (Cut paper)
    return this;
  }

  public kickDrawer(): this {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // Pulse cash drawer
    return this;
  }

  public getUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Generate standard receipt ESC/POS byte array from Order & Template
 */
export function buildReceiptEscPos(
  order: Order,
  template: ReceiptTemplate,
  cashier?: User,
  isDuplicate: boolean = false
): Uint8Array {
  const builder = new EscPosBuilder(template.paper_width || 58);

  // Cash drawer open on cash transaction
  if (order.payment_method === 'cash') {
    builder.kickDrawer();
  }

  builder.alignCenter();
  if (isDuplicate) {
    builder.bold(true).line('*** SALINAN RESMI ***').bold(false);
    builder.newLine();
  }

  builder.bold(true).doubleSize(true).line(template.header_title || 'KEDAI NUSANTARA').doubleSize(false);
  builder.bold(false);
  if (template.address_line1) builder.line(template.address_line1);
  if (template.address_line2) builder.line(template.address_line2);
  if (template.phone) builder.line(`Telp: ${template.phone}`);
  builder.divider('=');

  // Metadata
  builder.alignLeft();
  builder.twoColumns('No. Nota:', order.order_number);
  builder.twoColumns('Waktu:', formatDateTimeId(order.created_at));
  if (template.show_cashier_name) {
    builder.twoColumns('Kasir:', cashier?.name || 'Kasir 1');
  }
  if (order.queue_number) {
    builder.twoColumns('No. Antrean:', `#${order.queue_number}`);
  }
  builder.twoColumns('Tipe:', order.order_type.toUpperCase());
  builder.divider('-');

  // Items
  for (const item of order.items) {
    builder.line(item.product_name + (item.variant_name ? ` (${item.variant_name})` : ''));
    const qtyPrice = `${item.quantity} x ${formatRupiah(item.unit_price)}`;
    const lineTotal = formatRupiah(item.final_price);
    builder.twoColumns(`  ${qtyPrice}`, lineTotal);

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        builder.twoColumns(`   + ${mod.option_name}`, formatRupiah(mod.price * item.quantity));
      }
    }
    if (item.discount_amount > 0) {
      builder.twoColumns('   (Diskon Item)', `-${formatRupiah(item.discount_amount)}`);
    }
  }

  builder.divider('-');

  // Financials
  builder.twoColumns('Subtotal', formatRupiah(order.subtotal));
  if (order.discount_amount > 0) {
    builder.twoColumns('Diskon Transaksi', `-${formatRupiah(order.discount_amount)}`);
  }
  if (template.show_tax_details && order.tax_amount > 0) {
    builder.twoColumns(`PPN (${order.tax_rate}%)`, formatRupiah(order.tax_amount));
  }
  if (order.service_charge_amount > 0) {
    builder.twoColumns(`Layanan (${order.service_charge_rate}%)`, formatRupiah(order.service_charge_amount));
  }
  if (order.rounding_amount !== 0) {
    builder.twoColumns('Pembulatan', formatRupiah(order.rounding_amount));
  }

  builder.divider('=');
  builder.bold(true).twoColumns('TOTAL', formatRupiah(order.grand_total)).bold(false);
  builder.divider('-');

  // Payments
  const methodLabel =
    order.payment_method === 'cash'
      ? 'TUNAI'
      : order.payment_method === 'qris'
      ? 'QRIS'
      : order.payment_method?.toUpperCase() || 'PEMBAYARAN';

  builder.twoColumns(`Bayar (${methodLabel})`, formatRupiah(order.paid_amount || order.grand_total));
  if (order.change_amount > 0) {
    builder.twoColumns('Kembalian', formatRupiah(order.change_amount));
  }

  // Footer
  builder.newLine();
  builder.alignCenter();
  if (template.footer_message) {
    const lines = template.footer_message.split('\n');
    for (const l of lines) {
      builder.line(l);
    }
  }

  builder.cut();
  return builder.getUint8Array();
}
