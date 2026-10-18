import { NextRequest, NextResponse } from 'next/server';
import { getServerRepository } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const repo = getServerRepository();
    const orders = await repo.getOrders({ outletId, startDate, endDate, status: 'completed' });
    const products = await repo.getProducts();
    const categories = await repo.getCategories();

    const totalRevenue = orders.reduce((sum, o) => sum + o.grand_total, 0);
    const totalTransactions = orders.length;
    const averageOrderValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    // Approximate Cost of Goods Sold (COGS / HPP)
    const productCostMap = new Map<string, number>();
    products.forEach((p) => productCostMap.set(p.id, p.buy_price || 0));

    let totalCogs = 0;
    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    const categorySalesMap = new Map<string, number>();
    const paymentMethodMap = new Map<string, number>();
    const hourMap = new Array(24).fill(0);

    for (const order of orders) {
      // Payment methods
      if (order.payments) {
        for (const p of order.payments) {
          paymentMethodMap.set(p.method, (paymentMethodMap.get(p.method) || 0) + p.amount);
        }
      }

      // Hour distribution
      const hour = new Date(order.created_at).getHours();
      hourMap[hour]++;

      // Items & Products
      for (const item of order.items) {
        const cost = (productCostMap.get(item.product_id) || item.buy_price || 0) * item.quantity;
        totalCogs += cost;

        const current = productSalesMap.get(item.product_id) || {
          name: item.product_name,
          quantity: 0,
          revenue: 0,
        };
        current.quantity += item.quantity;
        current.revenue += item.subtotal;
        productSalesMap.set(item.product_id, current);

        const prod = products.find((p) => p.id === item.product_id);
        const catId = prod?.category_id || 'other';
        categorySalesMap.set(catId, (categorySalesMap.get(catId) || 0) + item.subtotal);
      }
    }

    const grossProfit = totalRevenue - totalCogs;

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const salesByCategory = Array.from(categorySalesMap.entries()).map(([catId, amount]) => {
      const cat = categories.find((c) => c.id === catId);
      return {
        category_id: catId,
        category_name: cat?.name || 'Lainnya',
        amount,
      };
    });

    const salesByPayment = Array.from(paymentMethodMap.entries()).map(([method, amount]) => ({
      method,
      amount,
    }));

    const peakHours = hourMap.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      transactions: count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        total_revenue: totalRevenue,
        total_transactions: totalTransactions,
        average_order_value: averageOrderValue,
        gross_profit: grossProfit,
        top_products: topProducts,
        sales_by_category: salesByCategory,
        sales_by_payment: salesByPayment,
        peak_hours: peakHours,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghasilkan laporan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
