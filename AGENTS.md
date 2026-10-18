# Agent Conventions & Engineering Rules

## 1. Core Principles
- **Autonomous & Deterministic:** Build complete, functional implementations. No placeholders, no TODOs, no empty stubs, no fake hardcoded mock buttons.
- **Strict Typing:** All TypeScript must pass `tsc --noEmit` without errors or `any` shortcuts where strict typing can be defined.
- **Language Boundaries:**
  - Code, identifiers, database columns, types, and comments: **English**.
  - UI labels, messages, prompts, error descriptions, and dialogues: **Bahasa Indonesia** (clear, natural, everyday terms).
- **Financial Calculations:**
  - Currency is ALWAYS integer IDR (Rupiah). Never floating point.
  - Rounding, discounts, taxes, and service charges calculated through deterministic pure functions in `@/lib/domain/money.ts`.
- **Zero-Config Demo Mode:**
  - If `.env` lacks Supabase credentials, the app defaults transparently to `DexieLocalRepository` using IndexedDB + in-memory event bus.
  - Out-of-the-box experience must work immediately with `npm install && npm run dev`.

---

## 2. Directory Structure Conventions
```
/
├── .agent/rules                 # Project rules mirror
├── docs/                        # PRD, TASKS, DECISIONS
├── public/                      # Static assets, icons, manifest.json, sw.js
├── supabase/
│   └── migrations/              # SQL schema, RLS policies, seeds
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/           # Quick PIN & admin login
│   │   ├── (pos)/
│   │   │   └── pos/             # Fast cashier checkout
│   │   │       ├── kds/         # Kitchen Display System
│   │   │       └── customer-display/ # Secondary display
│   │   ├── (dashboard)/
│   │   │   └── dashboard/       # Management, products, stock, reports
│   │   ├── api/                 # Next.js route handlers
│   │   ├── layout.tsx
│   │   └── page.tsx             # Root redirect to POS or Dashboard
│   ├── components/
│   │   ├── ui/                  # shadcn/ui inspired primitives
│   │   ├── pos/                 # POS specific components
│   │   ├── dashboard/           # Dashboard specific widgets
│   │   └── shared/              # Shared modals, receipt view, audio feedback
│   ├── hooks/                   # Custom React hooks (scanner, printer, offline)
│   ├── lib/
│   │   ├── db/                  # Dexie schema, Supabase client, seed data
│   │   ├── domain/              # Pure domain calculations (money, taxes, promos, stock)
│   │   ├── repository/          # Repository interface + Dexie & Supabase adapters
│   │   ├── printer/             # ESC/POS byte generator & thermal CSS
│   │   └── utils.ts             # Tailwind merging, currency formatting
│   ├── store/                   # Zustand stores (cart, auth, shift, settings)
│   └── types/                   # TypeScript entity definitions
├── tests/
│   ├── unit/                    # Vitest pure function tests
│   └── e2e/                     # Playwright flows
└── package.json
```

---

## 3. UI/UX Rules
- **Touch & Accessibility:** Touch targets minimum 48x48px.
- **3-Tap Rule:** Most frequent actions (add item, pay, print) must take <= 3 taps.
- **Instant Feedback:** Web Audio API synth beep on successful barcode scan, toast notifications for errors and updates.
- **Keyboard Shortcuts:** Support F-keys, Enter, Esc for high-speed counter operations.
- **Layout:**
  - POS Landscape: ~60% left (search, barcode scanner, category tabs, product grid) : ~40% right (cart list, subtotal/tax/discount, big PAY button).
  - POS Mobile: Product grid full width with cart as an expandable bottom sheet.
