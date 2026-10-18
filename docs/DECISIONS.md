# Project Architecture & System Decisions (DECISIONS.md)

This document tracks all architectural and design decisions made to ensure autonomous, zero-friction execution and complete standalone reliability.

---

### DEC-001: Integer Rupiah Storage & Calculation
- **Context:** Currency floating-point errors can cause reconciliation discrepancies between POS, shifts, and reports.
- **Decision:** All financial values (prices, subtotal, discounts, tax, service charges, rounding, payments, cash amounts) are stored and computed strictly as integers (IDR). No float math in database or domain calculations.
- **Consequence:** Formatter functions handle display (e.g. `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`), while domain logic operates on integer amounts.

### DEC-002: Dual-Mode Repository Pattern (Demo / Dexie vs Supabase)
- **Context:** The system must run immediately out-of-the-box with `npm install && npm run dev` without requiring external Supabase credentials, yet remain fully compatible with Supabase when configured in `.env`.
- **Decision:** Implement a clean repository interface layer (`interface PosRepository`) with two interchangeable adapters:
  1. `DexieLocalRepository` (IndexedDB via Dexie with full seed data, in-browser real-time event bus, outbox queue).
  2. `SupabaseRepository` (Postgres tables, Supabase Auth, Realtime channels, RLS).
- A repository factory checks `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`. If empty/missing or if running offline, it seamlessly provides the local IndexedDB/Dexie adapter.

### DEC-003: Route Group Hierarchy & API Boundaries
- **Context:** Unified database and single auth system, but distinct workflows for cashier and management, with clear boundary for future extraction.
- **Decision:** Next.js App Router structure:
  - `(auth)/login` - Staff selection & quick PIN login + Admin email/password login
  - `(pos)/pos` - High-speed, touch/keyboard optimized POS screen, drawer, checkout, hold bills, printer status, offline queue
  - `(pos)/pos/kds` - Kitchen Display System for F&B mode
  - `(pos)/pos/customer-display` - Customer-facing secondary display (totals & dynamic QRIS)
  - `(dashboard)/dashboard/...` - Management console (analytics, products, inventory, shifts, customers, reports, settings, table layouts, receipt templates)
  - `/api/...` - Dedicated route handlers acting as clean service boundary.

### DEC-004: Thermal Printing & ESC/POS Implementation
- **Context:** Cashiers use varied thermal receipt printers (58mm and 80mm) via Web Serial, Web USB, Web Bluetooth, or system printers (Windows/Mac/Android).
- **Decision:** Provide a unified printer service:
  - ESC/POS byte builder supporting text formatting, alignments, cut paper, cash drawer kick pulse.
  - Web Serial/Web Bluetooth connection hooks where supported by browser.
  - Automatic fallback to high-fidelity thermal CSS styling via `window.print()` with `@media print { @page { size: 58mm / 80mm; margin: 0; } }`.
  - Duplicate receipts marked prominently with watermark and label `"SALINAN"`.
  - WhatsApp & web digital receipt generator.

### DEC-005: Zero External Asset Dependency & Web Audio Sound Feedback
- **Context:** Scanning and POS interactions require instant audio-visual feedback ("beep" sound), barcode rendering, and icons. Missing asset files or network-dependent CDNs would break offline functionality.
- **Decision:**
  - Barcode & QR rendering generated via canvas/SVG utilities (`qrcode` / `jsbarcode`).
  - Barcode scanner camera input implemented via `@zxing/browser` or canvas video stream analyzer.
  - Audio "bip" feedback generated dynamically using browser Web Audio API (`AudioContext` oscillator beep frequency 1200Hz for 80ms) - works 100% offline with zero external audio files.
  - Lucide icons bundled with project.

### DEC-006: Seed Data Architecture
- **Context:** First launch must immediately look lively and populated with realistic business data.
- **Decision:** Seed data includes:
  - 1 Business ("Kedai Nusantara & Retail Hub")
  - 2 Outlets ("Cabang Sudirman Utama", "Cabang Gandaria Express")
  - 4 Users with known PINs:
    - Owner: Budi Santoso (PIN: `112233`, Email: `owner@nusantara.pos`)
    - Manager: Maya Putri (PIN: `889900`, Email: `manager@nusantara.pos`)
    - Cashier 1: Rizky Pratama (PIN: `1234`, Email: `kasir1@nusantara.pos`)
    - Cashier 2: Siti Rahma (PIN: `4321`, Email: `kasir2@nusantara.pos`)
  - 40+ products across retail (groceries, snacks, drinks) and F&B (coffee, main courses, desserts) with variants, barcodes, categories, and stock per branch.
  - 30 customers with tiers (Bronze, Silver, Gold) and points.
  - 30 days of historical sales transactions with realistic time distributions for analytics graphs.

### DEC-007: Event Bus & Webhook Table
- **Context:** Real-time updates to dashboard and external system hooks.
- **Decision:** Store events (`order.created`, `stock.low`, `shift.closed`) in an `events` table / IndexedDB store, and dispatch them to the local in-tab / broadcast channel event bus in Demo Mode and Supabase Realtime in production mode.

### DEC-008: Test Runner Handling for Workspace Path with '#' Character
- **Context:** The workspace directory path is `d:\Nived\POS #2`. Vite (and therefore Vitest) treats `#` in filesystem paths as an URL fragment/hash, failing with `The project root contains the "#" character ... Failed to load url /@vite/env`.
- **Decision:** Provide a test runner leveraging Node 24 native TypeScript execution (`--experimental-strip-types`) with `node:test` and a Vitest/Jest-compatible assertion wrapper. Both Vitest (when in non-hash path) and `node --test` are supported, and `npm test` runs cleanly and green.

### DEC-009: Webpack & Node.js Null-Byte Sanitization for '#' in Path
- **Context:** When the workspace directory contains the '#' character (`d:\Nived\POS #2`), Webpack 5's internal normalizer encodes '#' as `\0#` in module resource paths. Node.js `fs` methods reject null bytes with `TypeError: The argument 'path' must be a string, Uint8Array, or URL without null bytes`.
- **Decision:** Configured `next.config.ts` with transparent runtime path sanitization for `node:fs` methods and Webpack's `compilation.inputFileSystem` to strip `\0` null-bytes before file operations, enabling 100% clean Next.js production builds (`npm run build`) in any directory containing '#'.

### DEC-010: React Server Components (RSC) Manifest Key Normalization in Dev Mode
- **Context:** In Next.js dev mode (`next dev`), Webpack creates `clientReferenceManifest.clientModules` dictionary with keys containing `\0#` (e.g. `'D:\\Nived\\POS \0#2\\...'`). However, React Server Components (`react-server-dom-webpack-server`) slices off `#ComponentName` from `clientReference.$$id` using the real filesystem path (without `\0`). Looking up `config[modulePath]` returned `undefined`, causing Next.js to throw `Error: Could not find the module "..." in the React Client Manifest`.
- **Decision:** Implemented a permanent, multi-layered solution:
  1. `next.config.ts`: Added Webpack compilation hook (`NormalizeManifestAssetsPlugin`) and `fs.readFileSync` wrapper that duplicates manifest entries with clean (non-null) keys for `clientModules`, `ssrModuleMapping`, and `rscModuleMapping`.
  2. `scripts/patch-next.cjs`: Automated postinstall script that wraps `clientModules` and module mappings returned by Next.js `loadClientReferenceManifest` in a `makeNullResistantProxy` to guarantee that lookups with or without null bytes always resolve the target client module seamlessly.
  3. Configured `package.json` `"postinstall"` and `"dev"` scripts to automatically maintain the patch on clean installs.

### DEC-011: Server In-Memory Repository & Full REST API Boundary
- **Context:** To ensure the Dashboard and external systems can be cleanly extracted or integrated via REST API, the architecture requires clear API boundaries (Route Handlers under `src/app/api/...`) that work seamlessly in both Demo Mode and Supabase Mode.
- **Decision:** Created `ServerInMemoryRepository` implementing `IPosRepository` pre-populated with deterministic seed data on the server side. Implemented full Next.js App Router route handlers (`/api/products`, `/api/orders`, `/api/orders/[id]`, `/api/shifts`, `/api/inventory`, `/api/reports`, `/api/events`, and `/api/sync`) with idempotency key checking, strict TypeScript types, and comprehensive automated unit tests.


