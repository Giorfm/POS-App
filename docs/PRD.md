# Product Requirements Document (PRD) — Sistem POS & Dashboard Terintegrasi

**Versi:** 1.0.0 (Final Architecture & Implementation Spec)  
**Bahasa UI:** Bahasa Indonesia  
**Kode & Komentar:** TypeScript / English  

---

## 1. Ringkasan Eksekutif & Visi
Aplikasi POS terintegrasi Dashboard ini dirancang sebagai platform kasir dan operasional modern berbasis web (PWA) untuk usaha retail dan F&B skala kecil-menengah. 
- **Titik Transaksi (POS):** Layar kasir responsif berkecepatan tinggi, navigasi 3 ketukan, dukungan barcode scanner, keyboard shortcut, dual-display, cetak thermal ESC/POS, dan kemampuan offline-first yang tangguh.
- **Pusat Kendali (Dashboard Utama):** Pengelolaan multi-cabang, katalog produk, inventori dan kartu stok, shift kasir, loyalti pelanggan, analitik penjualan real-time, audit log, serta pengaturan perangkat dan template struk.
- **Satu Basis Data & Satu Sistem Auth:** Transaksi dan data operasional tersinkronisasi secara real-time ke Dashboard, dengan fallback mulus di Demo Mode (IndexedDB / Dexie) bila Supabase belum dikonfigurasi.

---

## 2. Target Pengguna & Role-Based Access Control (RBAC)

| Peran | Tanggung Jawab Utama | Hak Akses |
|---|---|---|
| **Owner** | Pemilik bisnis, memantau seluruh cabang, profitabilitas, konfigurasi master | Akses penuh POS & Dashboard seluruh cabang |
| **Manager** | Otorisasi aksi sensitif (void, refund, diskon besar), kontrol stok, laporan shift | POS + Dashboard cabang aktif + otorisasi supervisor |
| **Cashier** | Pelayanan penjualan harian, penerimaan pembayaran, buka/tutup shift | Layar kasir (POS), shift kasir, riwayat struk hari ini |
| **Warehouse** | Penerimaan barang (goods receipt), transfer stok, stok opname | Modul inventori, opname, dan transfer cabang |

---

## 3. Fitur per Fase Pengembangan

### Fase 1: Fondasi + MVP (P0)
1. **Autentikasi & RBAC:**
   - Login cepat PIN kasir dan login email/password admin/owner.
   - Auto-lock layar saat idle dengan modal unlock cepat PIN.
   - Audit trail untuk setiap aksi krusial.
2. **Katalog Produk:**
   - CRUD Produk: nama, SKU, barcode, kategori, harga modal, harga jual, foto, varian.
   - Kategori & filter produk favorit.
   - Impor/ekspor CSV dengan validasi skema.
3. **Layar Kasir (POS Core):**
   - Pencarian cepat & scanner barcode (kamera + USB scanner keyboard buffer).
   - Grid produk & tab kategori visual.
   - Keranjang belanja (ubah qty, catatan item per baris).
   - Diskon per item dan transaksi (nominal / persen), voucher promo.
   - Perhitungan PPN & service charge (inklusif / eksklusif).
   - Pembulatan Rupiah otomatis.
   - Fitur Hold / Pending Order & panggil ulang pesanan.
   - Void & Refund dengan alasan wajib + otorisasi PIN manager.
4. **Pembayaran:**
   - Tunai (saran pecahan cepat, kembalian otomatis).
   - QRIS dinamis (simulasi otomatis dengan QR dinamis).
   - Split payment (kombinasi tunai + nontunai).
5. **Struk & Pencetakan:**
   - Pratinjau struk thermal 58mm & 80mm.
   - ESC/POS via Web Serial / Bluetooth + fallback thermal `window.print()`.
   - Cetak ulang struk berlabel watermark "SALINAN".
   - Struk digital (tautan web & share WhatsApp).
6. **Stok Dasar:**
   - Pengurangan stok otomatis per cabang saat transaksi.
   - Peringatan stok minimum.
   - Kartu stok (`stock_movements`) sebagai single source of truth.
   - Proteksi penjualan saat stok habis (dapat dikonfigurasi izinkan/blokir).
7. **Shift & Kas:**
   - Buka shift dengan input modal awal.
   - Pencatatan kas masuk / kas keluar (petty cash) beserta alasan.
   - Tutup shift: rekonsiliasi kas fisik vs sistem, hitung selisih (wajib catatan jika ada selisih).
   - Cetak Laporan Z Shift.
8. **Dashboard Utama:**
   - Kartu KPI: Omzet, Transaksi, Rata-rata Nilai Transaksi, Laba Kotor.
   - Grafik tren penjualan & produk terlaris.
   - Distribusi penjualan per kasir, kategori, metode bayar, dan jam transaksi.
   - Laporan stok dan kartu mutasi.
   - Laporan void, refund, dan diskon.
   - Filter tanggal & ekspor ke CSV/Excel/PDF.

### Fase 2: Operasional (P1)
1. **Pelanggan & Loyalti:**
   - Database pelanggan (nama, nomor HP, email, level).
   - Pendaftaran kilat pelanggan di kasir (cukup input nomor HP).
   - Perolehan dan penukaran poin loyalti, tier membership (Bronze, Silver, Gold).
2. **Promosi & Diskon Lanjutan:**
   - Promo otomatis (Beli X Gratis Y, Happy Hour, diskon tier member).
   - Manajemen kode voucher & batas penggunaan.
3. **Inventori Lanjutan:**
   - Paket / bundling item.
   - Konversi multi-satuan (pcs, pack, dus).
   - Penerimaan barang (goods receipt) dari supplier.
   - Stok opname dengan pemindaian barcode dan penyesuaian selisih otomatis.
   - Transfer stok antar cabang dengan alur kirim dan terima.
4. **Metode Pembayaran Tambahan & Multi-Outlet:**
   - EDC manual (catat nomor kartu & approval code), E-Wallet, VA.
   - Split bill (pisah tagihan) dan gabung bill.
   - Multi-outlet penuh dengan seleksi cabang di header.
5. **Laporan & Konfigurasi Lanjutan:**
   - Laporan Laba/Rugi sederhana (Penjualan - HPP - Diskon).
   - Laporan Pajak PPN & Service Charge.
   - Template struk yang dapat dikustomisasi dari dashboard.
   - Pengaturan printer thermal dan peripheral.

### Fase 3: Mode F&B (Khusus Resto & Kafe)
1. **Denah Meja Interaktif:**
   - Tampilan denah meja interaktif (tersedia, terisi, reservasi).
   - Buka meja, pindah meja, dan gabung meja.
   - Tipe pesanan: Dine-In, Takeaway, Delivery.
2. **Modifier & Add-on:**
   - Opsi tambahan (level gula, jenis susu, topping, tingkat kepedasan).
3. **Kitchen Display System (KDS) & Tiket Dapur:**
   - Halaman KDS real-time untuk bagian dapur/bar.
   - Pembaruan status hidangan (Menunggu, Dimasak, Siap Saji).
   - Cetak tiket pesanan dapur.
   - Nomor antrean dan pemanggilan pesanan siap saji.
4. **Resep / Bill of Materials (BOM):**
   - Komposisi bahan baku per porsi menu.
   - Pengurangan otomatis bahan baku di inventori saat menu terjual.

### Fase 4: Polish, Customer Display, & Setup Wizard
1. **Customer-Facing Display (Layar Kedua):**
   - Halaman khusus `/pos/customer-display` menampilkan keranjang belanja secara real-time, total tagihan, dan QRIS dinamis untuk scan bayar pelanggan.
2. **Cetak Label Barcode:**
   - Generator dan cetak label barcode produk untuk ditempel di rak/kemasan.
3. **Analitik Lanjutan:**
   - Heatmap jam sibuk transaksi per hari/jam.
   - Rekomendasi prediksi restok inventori.
4. **Onboarding & Setup Wizard:**
   - Panduan interaktif bagi kasir baru & wizard penyiapan bisnis awal.

---

## 4. Standar UI/UX
- **Kecepatan & Ergonomi:** Aksi kasir (tambah produk, bayar, cetak struk) selesai maksimal dalam 3 sentuhan/klik.
- **Rupiah Integer:** Angka keuangan selalu diformat rapi (misal: `Rp 25.000`), menggunakan font tabular monospaced untuk keselarasan vertikal.
- **Tata Letak POS Landscape:** 60% kiri untuk pencarian, scanner, kategori, dan katalog; 40% kanan untuk keranjang, kalkulasi, dan tombol aksi "BAYAR" yang sangat jelas.
- **Umpan Balik Instan:** Suara bip sintesis Web Audio saat barcode terbaca, toast notification responsif, dan indikator status koneksi/sinkronisasi di header.
- **Aksesibilitas & Tema:** Dukungan Dark Mode dan Light Mode dengan rasio kontras WCAG AA.
