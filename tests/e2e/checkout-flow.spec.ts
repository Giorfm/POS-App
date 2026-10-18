import { test, expect } from '@playwright/test';

test.describe('POS Nusantara End-to-End Test Suite', () => {
  test('1. Full Flow: Login PIN -> Open Shift -> Add Products -> Checkout -> Receipt -> Dashboard Verification', async ({ page }) => {
    // 1. Visit Login page
    await page.goto('/login');
    await expect(page).toHaveTitle(/POS Nusantara/);
    await expect(page.getByRole('heading', { name: 'POS NUSANTARA' })).toBeVisible();

    // 2. Click Quick Login as Kasir 1 (Rizky Pratama)
    const kasirBtn = page.locator('button', { hasText: 'Rizky Pratama' });
    await expect(kasirBtn).toBeVisible({ timeout: 5000 });
    await kasirBtn.click();

    // 3. Navigate to /pos
    await page.waitForURL('**/pos');
    await expect(page.locator('header').getByText('POS NUSANTARA')).toBeVisible();

    // 4. Check if Shift Modal is open (if open, confirm start shift)
    const openShiftTitle = page.locator('text=Buka Shift Kasir Baru');
    if (await openShiftTitle.isVisible({ timeout: 2000 }).catch(() => false)) {
      const openShiftBtn = page.locator('button', { hasText: 'Buka Shift Kasir' });
      await openShiftBtn.click();
    }

    // 5. Add a product to cart (e.g. Matcha Latte Artisan)
    const productItem = page.locator('text=Matcha Latte Artisan').first();
    await expect(productItem).toBeVisible({ timeout: 5000 });
    await productItem.click();

    // If variant or modifier modal popped up, confirm addition
    const addModalBtn = page.locator('button', { hasText: 'Tambah ke Pesanan' });
    if (await addModalBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await addModalBtn.click();
    }

    // 6. Verify cart item appears
    const cartItem = page.locator('text=Matcha Latte Artisan').first();
    await expect(cartItem).toBeVisible({ timeout: 5000 });

    // 7. Click BAYAR button
    const payBtn = page.locator('button', { hasText: 'BAYAR' });
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // 8. Checkout Modal opens (Total Tagihan Belanja)
    const checkoutModalHeader = page.locator('text=Total Tagihan Belanja');
    await expect(checkoutModalHeader).toBeVisible({ timeout: 5000 });

    // 9. Choose 'Uang Pas' cash suggestion pill if available
    const exactCashPill = page.locator('button', { hasText: 'Uang Pas' });
    if (await exactCashPill.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exactCashPill.click();
    }

    // 10. Complete Payment
    const submitPaymentBtn = page.locator('button', { hasText: 'SELESAIKAN PEMBAYARAN' });
    await expect(submitPaymentBtn).toBeVisible({ timeout: 5000 });
    await submitPaymentBtn.click();

    // 11. Receipt Modal displays
    const receiptTitle = page.locator('text=Pratinjau Struk');
    await expect(receiptTitle).toBeVisible({ timeout: 8000 });

    // 12. Finish transaction
    const finishBtn = page.locator('button', { hasText: 'Transaksi Baru' });
    if (await finishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await finishBtn.click();
    }

    // 13. Navigate to Dashboard and verify data
    await page.goto('/dashboard');
    await expect(page.locator('text=Ringkasan Penjualan')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Total Omzet Penjualan')).toBeVisible({ timeout: 10000 });
  });

  test('2. Dashboard Catalog & Inventory Navigation', async ({ page }) => {
    await page.goto('/dashboard/products');
    await expect(page.locator('text=Katalog Produk')).toBeVisible({ timeout: 10000 });

    await page.goto('/dashboard/inventory');
    await expect(page.locator('text=Inventori & Kartu Stok')).toBeVisible({ timeout: 10000 });

    await page.goto('/dashboard/shifts');
    await expect(page.locator('text=Riwayat Shift Kasir')).toBeVisible({ timeout: 10000 });

    await page.goto('/dashboard/customers');
    await expect(page.getByRole('heading', { name: 'Pelanggan & Loyalti' })).toBeVisible({ timeout: 10000 });

    await page.goto('/dashboard/reports');
    await expect(page.locator('text=Laporan Finansial & Pajak')).toBeVisible({ timeout: 10000 });
  });

  test('3. Kitchen Display System (KDS) & Customer Display', async ({ page }) => {
    await page.goto('/pos/kds');
    await expect(page.locator('text=KITCHEN DISPLAY')).toBeVisible({ timeout: 10000 });

    await page.goto('/pos/customer-display');
    await expect(page.locator('text=Layar Pelanggan Interaktif')).toBeVisible({ timeout: 10000 });
  });
});
