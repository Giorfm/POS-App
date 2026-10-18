import { NextRequest, NextResponse } from 'next/server';
import { getServerRepository } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const search = searchParams.get('search') || undefined;
    const favoriteOnly = searchParams.get('favoriteOnly') === 'true';

    const repo = getServerRepository();
    const products = await repo.getProducts({ categoryId, search, favoriteOnly });

    return NextResponse.json({ success: true, data: products });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat produk';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sellPrice = body.sell_price ?? body.selling_price;
    const buyPrice = body.buy_price ?? body.cost_price ?? 0;

    if (!body.name || sellPrice === undefined || !body.category_id) {
      return NextResponse.json(
        { success: false, error: 'Data produk tidak lengkap (nama, harga jual, dan kategori wajib diisi)' },
        { status: 400 }
      );
    }

    const repo = getServerRepository();
    const product = await repo.createProduct({
      business_id: body.business_id || 'biz_nusantara_01',
      category_id: body.category_id,
      name: body.name,
      sku: body.sku || undefined,
      barcode: body.barcode || undefined,
      description: body.description || undefined,
      sell_price: Math.round(Number(sellPrice)),
      buy_price: Math.round(Number(buyPrice)),
      unit: body.unit || 'pcs',
      image_url: body.image_url || undefined,
      is_favorite: Boolean(body.is_favorite),
      track_stock: body.track_stock !== undefined ? Boolean(body.track_stock) : true,
      min_stock_alert: Number(body.min_stock_alert || body.min_stock || 10),
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      business_type: body.business_type || 'retail',
      variants: body.variants || [],
      modifiers: body.modifiers || [],
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal membuat produk';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
