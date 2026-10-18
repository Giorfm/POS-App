import { NextRequest, NextResponse } from 'next/server';
import { getServerRepository } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId') || 'outlet_sudirman';

    const repo = getServerRepository();
    const inventory = await repo.getInventory(outletId);
    const products = await repo.getProducts();

    const enriched = inventory.map((item) => {
      const prod = products.find((p) => p.id === item.product_id);
      return {
        ...item,
        product_name: prod?.name || 'Produk',
        sku: prod?.sku || '-',
        barcode: prod?.barcode || '-',
        is_low_stock: item.stock_quantity <= item.min_stock,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat inventori';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const repo = getServerRepository();

    if (body.action === 'adjust') {
      if (!body.outlet_id || !body.product_id || body.quantity_diff === undefined || !body.reason) {
        return NextResponse.json({ success: false, error: 'Data penyesuaian stok tidak lengkap' }, { status: 400 });
      }
      const movement = await repo.adjustStock({
        outletId: body.outlet_id,
        productId: body.product_id,
        variantId: body.variant_id || undefined,
        quantityDiff: Number(body.quantity_diff),
        reason: body.reason,
        userId: body.user_id,
      });
      return NextResponse.json({ success: true, data: movement });
    }

    if (body.action === 'opname') {
      if (!body.outlet_id || !Array.isArray(body.items)) {
        return NextResponse.json({ success: false, error: 'Data stok opname tidak lengkap' }, { status: 400 });
      }
      const totalSystem = body.items.reduce((s: number, i: { system_quantity?: number }) => s + (i.system_quantity || 0), 0);
      const totalPhysical = body.items.reduce((s: number, i: { physical_quantity?: number }) => s + (i.physical_quantity || 0), 0);
      const opname = await repo.createStockOpname({
        business_id: body.business_id || 'biz_nusantara_01',
        outlet_id: body.outlet_id,
        opname_number: body.opname_number || `OPN-${Date.now().toString().slice(-6)}`,
        conducted_by: body.conducted_by || undefined,
        conducted_at: new Date().toISOString(),
        status: body.status || 'completed',
        total_system_qty: totalSystem,
        total_physical_qty: totalPhysical,
        total_difference_qty: totalPhysical - totalSystem,
        notes: body.notes || undefined,
        items: body.items,
      });
      return NextResponse.json({ success: true, data: opname });
    }

    if (body.action === 'transfer') {
      const fromOutlet = body.source_outlet_id || body.from_outlet_id;
      const toOutlet = body.destination_outlet_id || body.to_outlet_id;
      if (!fromOutlet || !toOutlet || !Array.isArray(body.items)) {
        return NextResponse.json({ success: false, error: 'Data transfer stok tidak lengkap' }, { status: 400 });
      }
      const transfer = await repo.createStockTransfer({
        business_id: body.business_id || 'biz_nusantara_01',
        source_outlet_id: fromOutlet,
        destination_outlet_id: toOutlet,
        transfer_number: body.transfer_number || `TRF-${Date.now().toString().slice(-6)}`,
        status: 'in_transit',
        notes: body.notes || undefined,
        sent_by: body.sent_by || 'admin',
        received_by: undefined,
        sent_at: new Date().toISOString(),
        received_at: undefined,
        items: body.items,
      });
      return NextResponse.json({ success: true, data: transfer });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak didukung' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memproses inventori';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
