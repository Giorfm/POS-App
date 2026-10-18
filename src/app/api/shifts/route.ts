import { NextRequest, NextResponse } from 'next/server';
import { getServerRepository } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId') || 'outlet_sudirman';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const repo = getServerRepository();

    if (activeOnly) {
      const active = await repo.getActiveShift(outletId);
      return NextResponse.json({ success: true, data: active });
    }

    const shifts = await repo.getShifts(outletId);
    return NextResponse.json({ success: true, data: shifts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat shift';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const repo = getServerRepository();

    // Buka shift
    if (body.action === 'open') {
      if (!body.outlet_id || !body.user_id || body.opening_cash === undefined) {
        return NextResponse.json(
          { success: false, error: 'Data pembukaan shift tidak lengkap (outlet, kasir, dan modal awal)' },
          { status: 400 }
        );
      }
      const existing = await repo.getActiveShift(body.outlet_id, body.user_id);
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Kasir sudah memiliki shift yang sedang aktif di cabang ini' },
          { status: 400 }
        );
      }
      const shift = await repo.openShift({
        outletId: body.outlet_id,
        userId: body.user_id,
        openingCash: Math.round(Number(body.opening_cash)),
      });
      return NextResponse.json({ success: true, data: shift, message: 'Shift kasir berhasil dibuka' }, { status: 201 });
    }

    // Kas Masuk / Keluar (Petty Cash)
    if (body.action === 'cash_movement') {
      if (!body.shift_id || !body.outlet_id || !body.user_id || !body.type || !body.amount || !body.reason) {
        return NextResponse.json({ success: false, error: 'Data kas masuk/keluar tidak lengkap' }, { status: 400 });
      }
      const movement = await repo.recordCashMovement({
        shiftId: body.shift_id,
        outletId: body.outlet_id,
        userId: body.user_id,
        type: body.type,
        amount: Math.round(Number(body.amount)),
        reason: body.reason,
      });
      return NextResponse.json({ success: true, data: movement });
    }

    // Tutup shift
    if (body.action === 'close') {
      if (!body.shift_id || body.actual_cash === undefined) {
        return NextResponse.json({ success: false, error: 'Shift ID dan hitungan kas fisik wajib disertakan' }, { status: 400 });
      }
      const closed = await repo.closeShift({
        shiftId: body.shift_id,
        actualCash: Math.round(Number(body.actual_cash)),
        notes: body.notes || undefined,
      });
      return NextResponse.json({ success: true, data: closed, message: 'Shift kasir berhasil ditutup' });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak didukung' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memproses shift';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
