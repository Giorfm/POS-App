import { NextRequest, NextResponse } from 'next/server';
import { getServerRepository } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repo = getServerRepository();
    const order = await repo.getOrderById(id);

    if (!order) {
      return NextResponse.json({ success: false, error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat rincian pesanan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const repo = getServerRepository();

    const order = await repo.getOrderById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Handle Void
    if (body.action === 'void') {
      if (!body.reason || !body.manager_pin) {
        return NextResponse.json(
          { success: false, error: 'Alasan void dan PIN otorisasi manajer wajib diisi' },
          { status: 400 }
        );
      }
      const manager = await repo.verifyManagerPin(body.manager_pin);
      if (!manager) {
        return NextResponse.json(
          { success: false, error: 'PIN manajer tidak valid atau tidak memiliki wewenang' },
          { status: 403 }
        );
      }
      const voided = await repo.voidOrder({
        orderId: id,
        reason: body.reason,
        managerId: manager.id,
      });
      return NextResponse.json({ success: true, data: voided, message: 'Pesanan berhasil dibatalkan (void)' });
    }

    // Handle Refund
    if (body.action === 'refund') {
      if (!body.reason || !body.manager_pin) {
        return NextResponse.json(
          { success: false, error: 'Alasan refund dan PIN otorisasi manajer wajib diisi' },
          { status: 400 }
        );
      }
      const manager = await repo.verifyManagerPin(body.manager_pin);
      if (!manager) {
        return NextResponse.json(
          { success: false, error: 'PIN manajer tidak valid atau tidak memiliki wewenang' },
          { status: 403 }
        );
      }
      const refunded = await repo.refundOrder({
        orderId: id,
        reason: body.reason,
        managerId: manager.id,
        items: body.items,
      });
      return NextResponse.json({ success: true, data: refunded, message: 'Pesanan berhasil direfund' });
    }

    // Handle KDS kitchen status update
    if (body.action === 'kitchen_status' && body.kitchen_status) {
      const updated = await repo.updateKitchenStatus(id, body.kitchen_status);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak didukung' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui pesanan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
