# POS Nusantara — Point of Sale & Backoffice Dashboard

Aplikasi Point of Sale (POS) dan Dashboard Utama multi-cabang, modern, dan terintegrasi penuh. Dirancang dengan pendekatan **offline-first**, performa tinggi, dan perhitungan keuangan integer Rupiah yang presisi tanpa floating-point error.

Aplikasi ini dilengkapi **DEMO MODE**: langsung dapat dijalankan tanpa setup database eksternal menggunakan adapter IndexedDB (Dexie) dan dataset realistis (1 bisnis, 2 cabang, 4 user, 40+ produk retail & F&B, 30 pelanggan, dan 30 hari riwayat transaksi).

---

## 🚀 Cara Menjalankan Aplikasi (Quickstart)

Hanya butuh dua perintah untuk menjalankan aplikasi:

```bash
# 1. Install dependensi
npm install

# 2. Jalankan server pengembang
npm run dev
```

Buka peramban di: **`http://localhost:3000`**

Aplikasi akan otomatis mengarahkan ke halaman login kasir dengan data demo yang sudah siap digunakan.

---

## 👥 Daftar Akun Demo & PIN

Pada halaman login (`/login`), tersedia tombol **1-Klik Masuk** untuk setiap staf, atau Anda dapat mengetikkan PIN 4–6 digit berikut pada keypad layar:

| Peran (Role) | Nama Pengguna | Email | PIN Kasir | Akses & Wewenang |
| :--- | :--- | :--- | :---: | :--- |
| **Owner** | Budi Santoso | `owner@nusantara.pos` | **`112233`** | Akses penuh seluruh cabang, dashboard, pengaturan, dan otorisasi supervisor |
| **Manager** | Maya Putri | `manager@nusantara.pos` | **`889900`** | Otorisasi aksi sensitif (void, refund, diskon besar), manajemen stok & shift |
| **Kasir 1** | Rizky Pratama | `kasir1@nusantara.pos` | **`1234`** | Operasional kasir, buka/tutup shift, transaksi penjualan, hold bill |
| **Kasir 2** | Siti Rahma | `kasir2@nusantara.pos` | **`4321`** | Operasional kasir cabang kedua, transaksi penjualan tunai/QRIS |

> **Catatan Otorisasi Supervisor:** Ketika kasir melakukan aksi sensitif di POS (seperti melakukan **Void Item**, **Refund Pesanan**, atau memberikan **Diskon Transaksi**), sistem akan memunculkan modal PIN Supervisor. Masukkan PIN Manager (`889900`) atau Owner (`112233`) untuk menyetujui aksi tersebut.

---

## 🗄️ Cara Beralih ke Supabase (Production Mode)

Secara default, jika variabel environment Supabase kosong, sistem otomatis berjalan dalam **Demo Mode** menggunakan IndexedDB lokal (Dexie). Untuk beralih ke Postgres Supabase dengan fitur Realtime & Row-Level Security (RLS):

1. **Buat Proyek Supabase** di [supabase.com](https://supabase.com).
2. **Jalankan Migrasi Database:**
   - Buka menu **SQL Editor** pada dashboard Supabase Anda.
   - Buka file `supabase/migrations/001_initial_schema.sql` di repository ini, salin seluruh kodenya, dan jalankan (Run). Seluruh tabel (25+ tabel), relasi, enum, indeks, dan aturan RLS akan otomatis terpasang.
3. **Konfigurasikan Environment Variables:**
   - Salin file `.env.example` menjadi `.env`:
     ```bash
     cp .env.example .env
     ```
   - Isi kredensial API Supabase Anda di file `.env`:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
     ```
4. **Jalankan Ulang Aplikasi:**
   ```bash
   npm run dev
   ```
   Repository Factory (`src/lib/repository/index.ts`) akan otomatis mendeteksi konfigurasi Supabase dan mengaktifkan adapter Supabase secara seamless.

---

## 🖨️ Panduan Menghubungkan Printer Struk Thermal

POS Nusantara mendukung pencetakan struk kasir 58mm dan 80mm melalui dua metode:

### 1. Direct Hardware Printer (Web Serial / ESC-POS)
1. Hubungkan printer thermal USB / Serial ke laptop atau PC kasir Anda.
2. Buka menu **Dashboard > Pengaturan > Printer & Struk** (`/dashboard/settings`).
3. Pilih tipe koneksi **Serial / USB (Web Serial)** dan pilih lebar kertas (58mm atau 80mm).
4. Klik tombol **Uji Cetak Serial**. Browser akan meminta izin akses port serial (misal COM3 atau USB Serial Port). Pilih port printer Anda.
5. Generator biner ESC/POS internal (`src/lib/printer/escpos.ts`) akan langsung mengirimkan instruksi pemotongan kertas (*cutter*) dan tendangan laci kas (*cash drawer kick*).

### 2. Browser Print Fallback (Thermal Window Print)
- Jika perangkat tidak mendukung Web Serial atau printer terhubung via driver Windows/CUPS, aplikasi otomatis menggunakan fallback CSS Thermal `@media print`.
- Template struk telah diformat khusus tanpa margin, font monospaced tabular, dan pemotongan otomatis sehingga hasil cetak pada kertas thermal 58mm/80mm rapi dan presisi.
- Pada setiap cetak ulang struk setelah transaksi selesai, sistem otomatis mencantumkan watermark berlabel tegas **"SALINAN"**.
- Tersedia pula fitur kirim struk digital langsung ke WhatsApp pelanggan atau membuka tautan struk publik (`/receipt/[id]`).

---

## 🍽️ Panduan Mengaktifkan & Menggunakan Mode F&B

Aplikasi ini dapat disesuaikan untuk bisnis Retail maupun Food & Beverage (Restoran / Kafe):

1. **Aktifkan Mode F&B di Pengaturan:**
   - Masuk ke **Dashboard > Pengaturan > Profil Bisnis** (`/dashboard/settings`).
   - Ubah pilihan **Tipe Bisnis** menjadi **Food & Beverage (F&B)**, lalu klik Simpan.
2. **Fitur Khusus Mode F&B yang Tersedia:**
   - **Tipe Pesanan:** Pilihan *Dine-in* (Makan di Tempat), *Takeaway* (Bungkus), dan *Delivery*.
   - **Denah Meja:** Memilih nomor meja pelanggan langsung di panel kasir.
   - **Varian & Modifier:** Kustomisasi pesanan (level gula, es, topping, tingkat kepedasan) dengan penambahan harga otomatis.
   - **Kitchen Display System (KDS):** Buka halaman **`/pos/kds`** pada tablet atau monitor area dapur. Pesanan yang dibayar di kasir akan muncul secara real-time dengan status tiket *Menunggu*, *Diproses*, hingga *Siap Saji*, lengkap dengan tombol pemanggil nomor antrean.
   - **Customer-Facing Display:** Buka **`/pos/customer-display`** pada layar kedua yang menghadap pelanggan. Menampilkan keranjang belanja aktif dan kode QRIS dinamis secara real-time.

---

## 📦 Daftar Fitur yang Telah Diselesaikan

### Fase 1: Fondasi & MVP (P0)
- [x] Autentikasi staf cepat dengan PIN keypad numerik dan 1-klik masuk demo.
- [x] Role-Based Access Control (Owner, Manager, Cashier, Warehouse).
- [x] Dialog otorisasi PIN Manager untuk aksi sensitif (void item, refund, diskon).
- [x] Auto-lock layar saat idle 5 menit dengan modal PIN unlock instan.
- [x] CRUD katalog produk lengkap: SKU, barcode scanner kamera/keyboard, varian modal, penanda produk favorit.
- [x] Impor dan ekspor katalog via file CSV dengan validasi format.
- [x] Layar kasir responsif (layout landscape 60:40 & mobile bottom sheet).
- [x] Audio synthesizer "bip" (Web Audio API) tanpa dependensi file eksternal.
- [x] Keranjang POS: kuantitas, catatan pesanan, diskon per item/transaksi, kode promo.
- [x] Perhitungan keuangan integer Rupiah: subtotal, diskon, PPN 11%, service charge, pembulatan.
- [x] Fitur Hold & Restore antrean pesanan multi-keranjang.
- [x] Pembayaran Tunai (tombol pecahan cepat + kembalian otomatis), QRIS dinamis, dan Split Payment.
- [x] Pratinjau struk thermal 58/80mm, watermark "SALINAN", dan struk digital WhatsApp.
- [x] Manajemen stok per cabang otomatis berkurang + kartu mutasi stok (*stock movement card*).
- [x] Manajemen shift kasir: buka shift, kas masuk/keluar (*petty cash*), tutup shift dengan rekonsiliasi fisik vs sistem, serta cetak Laporan Z Shift.
- [x] Dashboard analitik KPI: omzet harian, transaksi, laba kotor, grafik tren, produk terlaris, filter tanggal, dan ekspor CSV.

### Fase 2: Operasional (P1)
- [x] Modul Pelanggan & pendaftaran kilat di kasir (cukup nomor HP).
- [x] Perhitungan poin loyalti dan membership tier (Bronze, Silver, Gold).
- [x] Promo otomatis (diskon member, happy hour) dan voucher belanja.
- [x] Stok opname fisik dengan rekonsiliasi otomatis ke kartu mutasi.
- [x] Transfer stok barang antar cabang (*in transit* -> *completed*).
- [x] Pembayaran EDC manual (Debit/Kredit), E-Wallet, dan Virtual Account.
- [x] Kustomisasi template struk belanja di Dashboard Pengaturan.
- [x] Laporan Laba Rugi sederhana dan Laporan Pajak PPN.

### Fase 3: Mode F&B
- [x] Manajemen meja makan dan tipe pesanan (*Dine-in*, *Takeaway*, *Delivery*).
- [x] Modifier menu & add-on (level manis, topping, kepedasan).
- [x] Kitchen Display System (KDS) di `/pos/kds` dengan pembaruan status dan cetak tiket dapur.
- [x] Resep & Bill of Materials (BOM) pemotongan bahan baku otomatis saat menu terjual.

### Fase 4: Polish & Verifikasi
- [x] Customer-Facing Display layar kedua di `/pos/customer-display`.
- [x] Format Rupiah standar Indonesia konsisten di seluruh layar (`Rp 25.000`).
- [x] Mode Terang dan Mode Gelap (*Dark Mode*).
- [x] PWA Ready dengan manifest & konfigurasi service worker.
- [x] Suite pengujian otomatis lengkap (Unit Test & E2E Playwright).

---

## 🧪 Perintah Pengujian & Kualitas Kode

```bash
# 1. Jalankan Unit Test Domain Keuangan (17/17 tests passing)
npm test

# 2. Jalankan Typecheck TypeScript Strict (0 errors)
npm run typecheck

# 3. Jalankan Linter ESLint (0 errors, 0 warnings)
npm run lint

# 4. Jalankan Production Build Next.js (14 dynamic server-rendered routes)
npm run build

# 5. Jalankan Playwright End-to-End Test Suite
npm run test:e2e
```

---

## 📁 Struktur Folder Proyek

```
pos-nusantara/
├── docs/                      # Dokumentasi PRD, TASKS checklist, dan DECISIONS
├── public/                    # Aset statis & PWA manifest
├── src/
│   ├── app/                   # Next.js App Router (14 route handlers & pages)
│   │   ├── (auth)/login/      # Layar Login Kasir & Owner dengan PIN Pad
│   │   ├── (pos)/pos/         # Layar Utama Kasir POS, KDS, & Customer Display
│   │   ├── (dashboard)/       # Console Manajemen Backoffice (Overview, Produk, Stok, Shift, dll)
│   │   └── receipt/[id]/      # Tautan Struk Digital Publik
│   ├── components/
│   │   ├── pos/               # Komponen spesifik kasir (ProductGrid, CartPanel, CheckoutModal, dll)
│   │   ├── shared/            # Header, AutoLockModal, ManagerAuthModal, ReceiptModal
│   │   └── ui/                # UI Primitives (Button, Input, Badge, Card, Dialog, Tabs, Toast)
│   ├── lib/
│   │   ├── db/                # Dexie IndexedDB, Seed Data lengkap, Supabase client
│   │   ├── domain/            # Pure functions matematika keuangan Rupiah, diskon, pajak, stok
│   │   ├── printer/           # ESC/POS byte builder & Print Service
│   │   ├── repository/        # Repository pattern (Dexie vs Supabase)
│   │   ├── audio.ts           # Web Audio API bip scanner
│   │   └── utils.ts           # Date formatters (id-ID), UUID, class merger
│   ├── store/                 # Zustand state stores (useAuthStore, useCartStore, useShiftStore)
│   └── types/                 # Definisi tipe TypeScript domain komprehensif
├── supabase/
│   └── migrations/            # DDL SQL Schema untuk PostgreSQL Supabase
└── tests/
    ├── e2e/                   # Playwright E2E tests
    └── unit/                  # Unit tests perhitungan keuangan & mutasi stok
```

---

## 📄 Lisensi
Hak Cipta &copy; 2026 POS Nusantara. Dikembangkan sebagai sistem kasir handal siap pakai untuk UMKM dan bisnis modern di Indonesia.
