import { NextRequest, NextResponse } from 'next/server';
import { getServerRepository } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;

    const repo = getServerRepository();
    const auditLogs = await repo.getAuditLogs(limit);

    return NextResponse.json({ success: true, data: auditLogs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat event/log';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.event_type || !body.payload) {
      return NextResponse.json(
        { success: false, error: 'Data event tidak lengkap (event_type dan payload wajib diisi)' },
        { status: 400 }
      );
    }

    const repo = getServerRepository();
    await repo.emitEvent({
      business_id: body.business_id || 'biz_nusantara_01',
      outlet_id: body.outlet_id || 'outlet_sudirman',
      event_type: body.event_type,
      payload: body.payload,
      status: body.status || 'pending',
    });

    if (body.user_id) {
      await repo.recordAuditLog({
        business_id: body.business_id || 'biz_nusantara_01',
        outlet_id: body.outlet_id || 'outlet_sudirman',
        user_id: body.user_id,
        action: body.event_type,
        resource: body.resource || 'webhook',
        details: body.payload,
      });
    }

    return NextResponse.json({ success: true, message: `Event ${body.event_type} berhasil diproses` }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memproses event';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
