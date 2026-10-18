# Implementation Checklist (TASKS.md)

Status Legend:
- [ ] Belum dikerjakan (Pending)
- [/] Sedang dikerjakan (In Progress)
- [x] Selesai & Terverifikasi (Completed)

---

## Fase 1 — Fondasi + MVP (P0)
- [x] **1.1 Inisialisasi Proyek & Konfigurasi**
  - [x] Inisialisasi Next.js 15+ (App Router), TypeScript strict mode, Tailwind CSS, shadcn/ui.
  - [x] Konfigurasi Lucide icons, Vitest, Playwright, TanStack Query, Zustand, Dexie.
  - [x] Buat file konfigurasi `.env.example`, `supabase/migrations/001_initial_schema.sql`.
  - [x] Implementasi Repository Layer: `PosRepository` interface, `DexieLocalRepository`, dan `SupabaseRepository`.
  - [x] Seed data awal: 1 bisnis, 2 cabang, 4 pengguna (Owner, Manager, 2 Kasir), 40+ produk, 30 pelanggan, 30 hari data transaksi.
- [x] **1.2 Autentikasi, RBAC & Auto-lock**
  - [x] Login email/password untuk Owner/Manager dan login cepat PIN untuk Kasir.
  - [x] Role-Based Access Control (Owner, Manager, Cashier, Warehouse).
  - [x] Dialog otorisasi PIN Manager untuk aksi sensitif (void, refund, diskon besar, ubah harga).
  - [x] Fitur Auto-lock saat idle + PIN quick unlock modal.
  - [x] Audit log trail untuk pencatatan aktivitas kasir.
- [x] **1.3 Modul Katalog & Produk**
  - [x] CRUD produk (nama, SKU, barcode, kategori, harga modal, harga jual, foto, varian).
  - [x] Kategori bertingkat & penanda produk favorit.
  - [x] Impor & Ekspor katalog via CSV dengan validasi skema.
- [x] **1.4 Layar Kasir & Keranjang (POS Core)**
  - [x] Layout responsif (Desktop/Tablet landscape 60:40 & Mobile bottom sheet).
  - [x] Pencarian instan dan scanner barcode (kamera live feed + keyboard USB barcode buffer).
  - [x] Feedback audio "bip" (Web Audio API) saat scan berhasil.
  - [x] Grid produk interaktif dengan varian modal.
  - [x] Keranjang belanja: ubah kuantitas, catatan per item, diskon per item/transaksi, kode promo.
  - [x] Perhitungan otomatis PPN, service charge, dan pembulatan ke Rupiah terdekat.
  - [x] Fitur Hold pesanan (Multi-keranjang) dan Restore pesanan.
  - [x] Fitur Void item/pesanan & Refund dengan alasan wajib + otorisasi supervisor.
  - [x] Shortcut keyboard kasir (F-keys, Enter, Esc, dll).
- [x] **1.5 Pembayaran & Struk**
  - [x] Pembayaran Tunai dengan tombol uang pas dan pecahan cepat (Rp 10rb, 20rb, 50rb, 100rb) + hitung kembalian instan.
  - [x] Pembayaran QRIS dinamis (simulasi verifikasi status otomatis).
  - [x] Split Payment (kombinasi tunai dan QRIS).
  - [x] Pratinjau struk thermal 58mm/80mm.
  - [x] ESC/POS binary generator + thermal CSS `window.print()` fallback.
  - [x] Cetak ulang struk bertanda watermark "SALINAN".
  - [x] Struk digital (tautan publik & tautan WhatsApp).
- [x] **1.6 Manajemen Stok Dasar & Shift Kasir**
  - [x] Pengurangan stok otomatis saat pesanan dibuat.
  - [x] Kartu stok mutasi (`stock_movements`) per cabang.
  - [x] Peringatan stok menipis & opsi cegah penjualan jika stok habis.
  - [x] Buka shift kasir dengan input kas modal awal.
  - [x] Kas masuk dan kas keluar (petty cash) beserta alasan.
  - [x] Tutup shift kasir: hitung kas fisik vs sistem, hitung selisih, input catatan selisih.
  - [x] Cetak Laporan Z Shift thermal.
- [x] **1.7 Dashboard Utama Ringkasan**
  - [x] Kartu metrik KPI: Omzet, Jumlah Transaksi, Rata-rata Nilai Transaksi, Laba Kotor.
  - [x] Grafik tren omzet harian & jam sibuk.
  - [x] Tabel produk terlaris, penjualan per kasir, per kategori, dan per metode bayar.
  - [x] Laporan inventori stok dan log void/refund/diskon.
  - [x] Filter rentang tanggal & tombol ekspor CSV/Excel/PDF.
- [x] **1.8 Pengujian & Verifikasi Fase 1**
  - [x] Unit test: perhitungan uang, pajak, diskon, pembulatan, dan kartu stok (17/17 lulus).
  - [x] Typecheck, lint, dan build sukses tanpa error (0 error, 0 warning).

---

## Fase 2 — Operasional (P1)
- [x] **2.1 Pelanggan & Loyalti**
  - [x] Database pelanggan & modal pendaftaran kilat di kasir (cukup nomor HP).
  - [x] Perhitungan poin loyalti dan level membership (Bronze, Silver, Gold).
  - [x] Penukaran poin loyalti untuk pemotongan tagihan di kasir.
- [x] **2.2 Promosi Otomatis & Voucher**
  - [x] Aturan promo otomatis (Beli X Gratis Y, Happy Hour, Diskon Member).
  - [x] Penggunaan voucher promosi dan kode kupon.
- [x] **2.3 Inventori Lanjutan & Multi-Outlet**
  - [x] Produk paket/bundling.
  - [x] Multi-satuan unit konversi (pcs, lusin, karton).
  - [x] Penerimaan barang dari supplier (Goods Receipt).
  - [x] Stok opname dengan scanner barcode dan rekonsiliasi selisih otomatis.
  - [x] Transfer stok antar cabang (status in_transit, diterima/completed).
- [x] **2.4 Pembayaran Tambahan & Struk Lanjutan**
  - [x] EDC manual (Debit/Kredit dengan nomor ref/kartu), E-Wallet, VA.
  - [x] Split bill dan gabung bill di POS.
  - [x] Template struk yang dapat dikustomisasi di Dashboard Settings.
  - [x] Pengaturan perangkat printer thermal dan barcode scanner.
- [x] **2.5 Laporan Lanjutan**
  - [x] Laporan Laba Rugi sederhana.
  - [x] Laporan Pajak PPN & Service Charge.
  - [x] Ekspor laporan berkala ke CSV.

---

## Fase 3 — Mode F&B
- [x] **3.1 Denah Meja Interaktif**
  - [x] Denah meja visual (tersedia, terisi, dipesan).
  - [x] Buka pesanan per meja, pindah meja, dan gabung meja.
  - [x] Pilihan tipe pesanan: Dine-in, Takeaway, Delivery.
- [x] **3.2 Modifier & Add-On Produk**
  - [x] Pilihan modifier (topping, level manis, level kepedasan).
  - [x] Tambahan biaya modifier terhitung di keranjang dan struk.
- [x] **3.3 Kitchen Display System (KDS)**
  - [x] Halaman KDS real-time (`/pos/kds`) untuk staf dapur/bar.
  - [x] Ubah status pesanan dapur (Menunggu -> Diproses -> Siap Saji).
  - [x] Cetak tiket pesanan dapur.
  - [x] Panggilan nomor antrean pesanan.
- [x] **3.4 Resep & Bill of Materials (BOM)**
  - [x] Hubungan menu jadi ke bahan baku.
  - [x] Pengurangan bahan baku otomatis saat menu terjual.

---

## Fase 4 — Polish, Customer Display & Final Verification
- [x] **4.1 Customer-Facing Display**
  - [x] Layar kedua `/pos/customer-display` real-time via BroadcastChannel.
  - [x] Tampilan item keranjang aktif, total, dan QRIS interaktif.
- [x] **4.2 Cetak Label Barcode & Tooling**
  - [x] Generator cetak label barcode produk (ukuran standar label 50x30mm).
- [x] **4.3 Heatmap Jam Sibuk & Analitik Prediktif**
  - [x] Visualisasi tren jam sibuk (peak hours) dalam sehari.
  - [x] Rekomendasi stok menipis dan peringatan minimum stock.
- [x] **4.4 Setup Wizard & Onboarding**
  - [x] 1-Click quick demo user login buttons & switch branch dropdown di POS dan Dashboard.
- [x] **4.5 Verifikasi Akhir & Pengujian E2E**
  - [x] Suite unit test Node/Vitest lengkap hijau (21/21 tests passing).
  - [x] Playwright E2E test suite (`tests/e2e/checkout-flow.spec.ts`).
  - [x] Build produksi Next.js hijau tanpa error/warning (21 routes dynamic server-rendered).
  - [x] Dokumentasi lengkap README.md (daftar akun, PIN demo, panduan Supabase & printer, F&B toggle).
- [x] **4.6 REST API Boundary & PWA Offline Infrastructure**
  - [x] Route Handlers `/api/products` (GET, POST).
  - [x] Route Handlers `/api/orders` dan `/api/orders/[id]` (GET, POST, PATCH void/refund/kds).
  - [x] Route Handlers `/api/shifts` (GET, POST open/close/cash movements).
  - [x] Route Handlers `/api/inventory` (GET, POST adjust/opname/transfer).
  - [x] Route Handlers `/api/reports` (GET aggregated KPIs, sales by category/payment/hour).
  - [x] Route Handlers `/api/events` (GET, POST webhook dispatcher `order.created`, `stock.low`, `shift.closed`).
  - [x] Route Handlers `/api/sync` (POST batch sync outbox dengan idempotency key).
  - [x] PWA manifest icons (192x192 & 512x512) di `public/icon.png`.
  - [x] PWA Service Worker `public/sw.js` dengan offline asset precaching, network-first navigations, dan background sync listener.
  - [x] Client component `ServiceWorkerRegister.tsx` terintegrasi di Root Layout.
