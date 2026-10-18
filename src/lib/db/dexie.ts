import Dexie, { Table } from 'dexie';
import {
  Business,
  Outlet,
  User,
  Category,
  Product,
  ProductVariant,
  InventoryItem,
  StockMovement,
  Supplier,
  PurchaseOrder,
  StockOpname,
  StockTransfer,
  Customer,
  LoyaltyTransaction,
  Promotion,
  Voucher,
  DiningTable,
  Shift,
  CashMovement,
  Order,
  Payment,
  Refund,
  TaxSettings,
  ReceiptTemplate,
  AuditLog,
  SystemEvent,
} from '@/types';
import {
  SEED_BUSINESS,
  SEED_OUTLETS,
  SEED_USERS,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_CUSTOMERS,
  SEED_DINING_TABLES,
  SEED_TAX_SETTINGS,
  SEED_RECEIPT_TEMPLATE,
  generateSeedHistoricalData,
} from './seedData';

export interface OutboxItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export class PosDatabase extends Dexie {
  businesses!: Table<Business, string>;
  outlets!: Table<Outlet, string>;
  users!: Table<User, string>;
  categories!: Table<Category, string>;
  products!: Table<Product, string>;
  product_variants!: Table<ProductVariant, string>;
  inventory_items!: Table<InventoryItem, string>;
  stock_movements!: Table<StockMovement, string>;
  suppliers!: Table<Supplier, string>;
  purchase_orders!: Table<PurchaseOrder, string>;
  stock_opnames!: Table<StockOpname, string>;
  stock_transfers!: Table<StockTransfer, string>;
  customers!: Table<Customer, string>;
  loyalty_transactions!: Table<LoyaltyTransaction, string>;
  promotions!: Table<Promotion, string>;
  vouchers!: Table<Voucher, string>;
  dining_tables!: Table<DiningTable, string>;
  shifts!: Table<Shift, string>;
  cash_movements!: Table<CashMovement, string>;
  orders!: Table<Order, string>;
  payments!: Table<Payment, string>;
  refunds!: Table<Refund, string>;
  tax_settings!: Table<TaxSettings, string>;
  receipt_templates!: Table<ReceiptTemplate, string>;
  audit_logs!: Table<AuditLog, string>;
  events!: Table<SystemEvent, string>;
  outbox!: Table<OutboxItem, string>;

  constructor() {
    super('PosNusantaraDB');
    this.version(1).stores({
      businesses: 'id, business_type',
      outlets: 'id, business_id, is_active',
      users: 'id, business_id, outlet_id, role, email',
      categories: 'id, business_id, slug, sort_order',
      products: 'id, business_id, category_id, sku, barcode, is_favorite, is_active',
      product_variants: 'id, product_id, business_id, is_active',
      inventory_items: 'id, [outlet_id+product_id], business_id',
      stock_movements: 'id, business_id, outlet_id, product_id, type, created_at',
      suppliers: 'id, business_id, is_active',
      purchase_orders: 'id, business_id, outlet_id, status, created_at',
      stock_opnames: 'id, business_id, outlet_id, status, created_at',
      stock_transfers: 'id, business_id, source_outlet_id, destination_outlet_id, status',
      customers: 'id, business_id, phone, membership_tier, is_active',
      loyalty_transactions: 'id, business_id, customer_id, created_at',
      promotions: 'id, business_id, is_active',
      vouchers: 'id, business_id, code, is_active',
      dining_tables: 'id, business_id, outlet_id, status',
      shifts: 'id, business_id, outlet_id, user_id, status, created_at',
      cash_movements: 'id, shift_id, business_id, outlet_id, type, created_at',
      orders: 'id, business_id, outlet_id, shift_id, order_number, status, payment_status, created_at',
      payments: 'id, order_id, business_id, outlet_id, method, created_at',
      refunds: 'id, order_id, business_id, outlet_id, created_at',
      tax_settings: 'id, business_id',
      receipt_templates: 'id, business_id, outlet_id',
      audit_logs: 'id, business_id, outlet_id, user_id, action, created_at',
      events: 'id, business_id, outlet_id, event_type, status, created_at',
      outbox: 'id, type, created_at',
    });
  }
}

export const db = new PosDatabase();

/**
 * Seed database on initial launch if empty
 */
export async function seedDexieIfEmpty(): Promise<void> {
  try {
    const productCount = await db.products.count();
    if (productCount > 0) {
      return; // Already initialized
    }

    console.log('Seeding initial Dexie POS database...');

    await db.businesses.add(SEED_BUSINESS);
    await db.outlets.bulkAdd(SEED_OUTLETS);
    await db.users.bulkAdd(SEED_USERS);
    await db.categories.bulkAdd(SEED_CATEGORIES);
    await db.products.bulkAdd(SEED_PRODUCTS);
    await db.customers.bulkAdd(SEED_CUSTOMERS);
    await db.dining_tables.bulkAdd(SEED_DINING_TABLES);
    await db.tax_settings.add(SEED_TAX_SETTINGS);
    await db.receipt_templates.add(SEED_RECEIPT_TEMPLATE);

    // Historical 30 days orders, shifts, and stock movements
    const { orders, shifts, inventoryItems, stockMovements } = generateSeedHistoricalData();
    await db.inventory_items.bulkAdd(inventoryItems);
    await db.orders.bulkAdd(orders);
    await db.shifts.bulkAdd(shifts);
    await db.stock_movements.bulkAdd(stockMovements);

    console.log('Dexie POS database seeded successfully!');
  } catch (err) {
    console.error('Failed to seed Dexie database:', err);
  }
}
