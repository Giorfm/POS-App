import { NextRequest, NextResponse } from 'next/server';
import { getServerRepository } from '@/lib/repository';
import type { Order, CashMovement } from '@/types';

export const dynamic = 'force-dynamic';

interface SyncBatchPayload {
  outlet_id: string;
  items: Array<{
    id: string;
    type: 'order' | 'cash_movement' | 'shift_close';
    idempotency_key?: string;
    payload: Record<string, unknown>;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncBatchPayload = await request.json();

    if (!body.outlet_id || !Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, error: 'Format antrean sinkronisasi tidak valid (outlet_id dan array items wajib diisi)' },
        { status: 400 }
      );
    }

    const repo = getServerRepository();
    const syncedIds: string[] = [];
    const skippedIds: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const item of body.items) {
      try {
        if (item.type === 'order') {
          const orderData = item.payload as Partial<Order> & {
            id?: string;
            cashier_id?: string;
            table_id?: string;
            total_amount?: number;
          };
          const existing = await repo.getOrderById(orderData.id || item.id);
          if (existing) {
            skippedIds.push(item.id);
            continue;
          }

          const grandTotal = Math.round(Number(orderData.grand_total ?? orderData.total_amount ?? 0));

          await repo.createOrder({
            business_id: orderData.business_id || 'biz_nusantara_01',
            outlet_id: body.outlet_id,
            shift_id: orderData.shift_id || undefined,
            user_id: orderData.user_id || orderData.cashier_id || 'user_cashier_1',
            customer_id: orderData.customer_id || undefined,
            dining_table_id: orderData.dining_table_id || orderData.table_id || undefined,
            order_number: orderData.order_number || `ORD-${item.id.slice(-6)}`,
            order_type: orderData.order_type || 'takeaway',
            status: orderData.status || 'completed',
            payment_status: orderData.payment_status || 'paid',
            kitchen_status: orderData.kitchen_status || undefined,
            subtotal: orderData.subtotal || grandTotal,
            discount_amount: orderData.discount_amount || 0,
            discount_type: orderData.discount_type || undefined,
            promo_code: orderData.promo_code || undefined,
            tax_rate: orderData.tax_rate || 11,
            tax_amount: orderData.tax_amount || 0,
            service_charge_rate: orderData.service_charge_rate || 0,
            service_charge_amount: orderData.service_charge_amount || 0,
            rounding_amount: orderData.rounding_amount || 0,
            grand_total: grandTotal,
            paid_amount: orderData.paid_amount || grandTotal,
            change_amount: orderData.change_amount || 0,
            payment_method: orderData.payment_method || 'cash',
            items: orderData.items || [],
            payments: orderData.payments || [],
            notes: orderData.notes || undefined,
            void_reason: undefined,
            voided_by: undefined,
            refund_reason: undefined,
            refunded_by: undefined,
            idempotency_key: item.idempotency_key || orderData.idempotency_key || item.id,
          });

          syncedIds.push(item.id);
        } else if (item.type === 'cash_movement') {
          const mv = item.payload as Partial<CashMovement>;
          if (mv.shift_id && mv.user_id && mv.type && mv.amount && mv.reason) {
            await repo.recordCashMovement({
              shiftId: mv.shift_id,
              outletId: body.outlet_id,
              userId: mv.user_id,
              type: mv.type,
              amount: mv.amount,
              reason: mv.reason,
            });
            syncedIds.push(item.id);
          } else {
            skippedIds.push(item.id);
          }
        } else {
          skippedIds.push(item.id);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal sinkron';
        errors.push({ id: item.id, error: message });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        synced_count: syncedIds.length,
        synced_ids: syncedIds,
        skipped_count: skippedIds.length,
        skipped_ids: skippedIds,
        errors,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memproses sinkronisasi batch';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
