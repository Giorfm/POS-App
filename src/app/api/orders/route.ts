import { NextRequest, NextResponse } from 'next/server';
import { getServerRepository } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;

    const repo = getServerRepository();
    const orders = await repo.getOrders({
      outletId,
      startDate,
      endDate,
      status: status as 'pending' | 'hold' | 'processing' | 'completed' | 'cancelled' | 'refunded' | undefined,
      limit,
    });

    return NextResponse.json({ success: true, data: orders, count: orders.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat daftar pesanan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cashierId = body.user_id || body.cashier_id;

    if (!body.outlet_id || !cashierId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Data pesanan tidak valid (outlet, kasir, dan item pesanan wajib disertakan)' },
        { status: 400 }
      );
    }

    const repo = getServerRepository();

    // Check idempotency if provided
    const idempotencyKey = request.headers.get('x-idempotency-key') || body.idempotency_key;
    if (idempotencyKey) {
      const existing = await repo.getOrders({ outletId: body.outlet_id, limit: 100 });
      const dup = existing.find((o) => o.idempotency_key === idempotencyKey);
      if (dup) {
        return NextResponse.json({ success: true, data: dup, message: 'Pesanan telah diproses sebelumnya (idempoten)' });
      }
    }

    const orderNumber = body.order_number || `ORD-${Date.now().toString().slice(-6)}`;
    const grandTotal = Math.round(Number(body.grand_total ?? body.total_amount ?? 0));
    const subtotal = Math.round(Number(body.subtotal ?? 0));

    const order = await repo.createOrder({
      business_id: body.business_id || 'biz_nusantara_01',
      outlet_id: body.outlet_id,
      shift_id: body.shift_id || undefined,
      user_id: cashierId,
      customer_id: body.customer_id || undefined,
      dining_table_id: body.dining_table_id || body.table_id || undefined,
      order_number: orderNumber,
      order_type: body.order_type || 'takeaway',
      status: body.status || 'completed',
      payment_status: body.payment_status || 'paid',
      kitchen_status: body.kitchen_status || (body.order_type === 'dine_in' ? 'queued' : 'none'),
      subtotal,
      discount_amount: Math.round(Number(body.discount_amount || 0)),
      discount_type: body.discount_type || undefined,
      promo_code: body.promo_code || undefined,
      tax_rate: Number(body.tax_rate || 11),
      tax_amount: Math.round(Number(body.tax_amount || 0)),
      service_charge_rate: Number(body.service_charge_rate || 0),
      service_charge_amount: Math.round(Number(body.service_charge_amount || 0)),
      rounding_amount: Math.round(Number(body.rounding_amount || 0)),
      grand_total: grandTotal,
      paid_amount: Math.round(Number(body.paid_amount || grandTotal)),
      change_amount: Math.round(Number(body.change_amount || 0)),
      payment_method: body.payment_method || 'cash',
      items: body.items,
      payments: body.payments || [],
      notes: body.notes || undefined,
      void_reason: undefined,
      voided_by: undefined,
      refund_reason: undefined,
      refunded_by: undefined,
      idempotency_key: idempotencyKey || undefined,
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal membuat pesanan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
