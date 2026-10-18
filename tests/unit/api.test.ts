import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ServerInMemoryRepository } from '../../src/lib/repository/serverRepository.ts';

describe('Server Repository & API Boundary', () => {
  it('initializes with seed products and categories', async () => {
    const repo = new ServerInMemoryRepository();
    const products = await repo.getProducts();
    const categories = await repo.getCategories();

    assert.ok(products.length >= 30, 'Should have at least 30 seed products');
    assert.ok(categories.length >= 5, 'Should have seed categories');
    assert.strictEqual(products[0].business_id, 'biz_nusantara_01');
  });

  it('creates order, deducts stock, and records order properly', async () => {
    const repo = new ServerInMemoryRepository();
    const products = await repo.getProducts();
    const targetProduct = products[0];

    const initialInventory = await repo.getInventory('outlet_sudirman');
    const initialItem = initialInventory.find((i) => i.product_id === targetProduct.id);
    const initialStock = initialItem?.stock_quantity || 0;

    const order = await repo.createOrder({
      business_id: 'biz_nusantara_01',
      outlet_id: 'outlet_sudirman',
      user_id: 'user_cashier_1',
      order_number: 'TEST-ORD-001',
      order_type: 'takeaway',
      status: 'completed',
      payment_status: 'paid',
      subtotal: targetProduct.sell_price * 2,
      discount_amount: 0,
      tax_rate: 11,
      tax_amount: Math.round(targetProduct.sell_price * 2 * 0.11),
      service_charge_rate: 0,
      service_charge_amount: 0,
      rounding_amount: 0,
      grand_total: targetProduct.sell_price * 2 + Math.round(targetProduct.sell_price * 2 * 0.11),
      paid_amount: targetProduct.sell_price * 3,
      change_amount: targetProduct.sell_price,
      payment_method: 'cash',
      items: [
        {
          id: 'item-1',
          order_id: 'TEST-ORD-001',
          business_id: 'biz_nusantara_01',
          product_id: targetProduct.id,
          product_name: targetProduct.name,
          buy_price: targetProduct.buy_price,
          unit_price: targetProduct.sell_price,
          quantity: 2,
          subtotal: targetProduct.sell_price * 2,
          discount_amount: 0,
          final_price: targetProduct.sell_price * 2,
          modifiers: [],
          created_at: new Date().toISOString(),
        },
      ],
      payments: [
        {
          id: 'pay-1',
          order_id: 'TEST-ORD-001',
          business_id: 'biz_nusantara_01',
          outlet_id: 'outlet_sudirman',
          method: 'cash',
          amount: targetProduct.sell_price * 2 + Math.round(targetProduct.sell_price * 2 * 0.11),
          created_at: new Date().toISOString(),
        },
      ],
    });

    assert.ok(order.id, 'Order must have generated ID');
    assert.strictEqual(order.status, 'completed');

    const updatedInventory = await repo.getInventory('outlet_sudirman');
    const updatedItem = updatedInventory.find((i) => i.product_id === targetProduct.id);
    assert.strictEqual(updatedItem?.stock_quantity, initialStock - 2, 'Stock should be deducted by ordered quantity');
  });

  it('handles shift lifecycle: open, cash movements, and close with difference calculation', async () => {
    const repo = new ServerInMemoryRepository();

    // Open shift
    const shift = await repo.openShift({
      outletId: 'outlet_sudirman',
      userId: 'user_cashier_2',
      openingCash: 200000,
    });
    assert.strictEqual(shift.status, 'open');
    assert.strictEqual(shift.opening_cash, 200000);
    assert.strictEqual(shift.expected_cash, 200000);

    // Cash In
    await repo.recordCashMovement({
      shiftId: shift.id,
      outletId: 'outlet_sudirman',
      userId: 'user_cashier_2',
      type: 'cash_in',
      amount: 50000,
      reason: 'Pecahan kecil tambahan',
    });

    // Cash Out
    await repo.recordCashMovement({
      shiftId: shift.id,
      outletId: 'outlet_sudirman',
      userId: 'user_cashier_2',
      type: 'cash_out',
      amount: 20000,
      reason: 'Beli galon air',
    });

    // Close Shift with actual cash Rp 235.000 (Rp 200.000 + 50.000 - 20.000 = expected 230.000 -> difference +5.000)
    const closedShift = await repo.closeShift({
      shiftId: shift.id,
      actualCash: 235000,
      notes: 'Lebih Rp 5.000 dari tip pelanggan',
    });

    assert.strictEqual(closedShift.status, 'closed');
    assert.strictEqual(closedShift.expected_cash, 230000);
    assert.strictEqual(closedShift.actual_cash, 235000);
    assert.strictEqual(closedShift.difference_cash, 5000);
  });

  it('authorizes void only with valid manager PIN', async () => {
    const repo = new ServerInMemoryRepository();
    const orders = await repo.getOrders({ limit: 1 });
    const targetOrder = orders[0];

    // Invalid PIN
    const wrongManager = await repo.verifyManagerPin('999999');
    assert.strictEqual(wrongManager, null, 'Invalid PIN should not authorize');

    // Valid Manager PIN (Maya Putri: 889900)
    const validManager = await repo.verifyManagerPin('889900');
    assert.ok(validManager, 'Manager PIN 889900 should authenticate');
    assert.strictEqual(validManager.role, 'manager');

    // Perform void
    const voided = await repo.voidOrder({
      orderId: targetOrder.id,
      reason: 'Pelanggan membatalkan pesanan',
      managerId: validManager.id,
    });

    assert.strictEqual(voided.status, 'cancelled');
    assert.strictEqual(voided.void_reason, 'Pelanggan membatalkan pesanan');
  });
});
