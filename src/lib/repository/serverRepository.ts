import type { IPosRepository } from './types.ts';
import type {
  Business,
  Outlet,
  User,
  Category,
  Product,
  InventoryItem,
  StockMovement,
  StockOpname,
  StockTransfer,
  Customer,
  Shift,
  CashMovement,
  Order,
  DiningTable,
  TaxSettings,
  ReceiptTemplate,
  AuditLog,
  SystemEvent,
} from '../../types/index.ts';
import { generateUUID } from '../utils.ts';
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
} from '../db/seedData.ts';

export class ServerInMemoryRepository implements IPosRepository {
  private business: Business = { ...SEED_BUSINESS };
  private outlets: Outlet[] = [...SEED_OUTLETS];
  private users: User[] = [...SEED_USERS];
  private categories: Category[] = [...SEED_CATEGORIES];
  private products: Product[] = [...SEED_PRODUCTS];
  private inventory: InventoryItem[] = [];
  private stockMovements: StockMovement[] = [];
  private stockOpnames: StockOpname[] = [];
  private stockTransfers: StockTransfer[] = [];
  private customers: Customer[] = [...SEED_CUSTOMERS];
  private shifts: Shift[] = [];
  private cashMovements: CashMovement[] = [];
  private orders: Order[] = [];
  private heldOrders: Order[] = [];
  private diningTables: DiningTable[] = [...SEED_DINING_TABLES];
  private taxSettings: TaxSettings = { ...SEED_TAX_SETTINGS };
  private receiptTemplate: ReceiptTemplate = { ...SEED_RECEIPT_TEMPLATE };
  private auditLogs: AuditLog[] = [];
  private events: SystemEvent[] = [];
  private eventListeners: Set<(event: SystemEvent) => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    const historical = generateSeedHistoricalData();
    this.orders = historical.orders;
    this.shifts = historical.shifts;
    this.stockMovements = historical.stockMovements;
    this.inventory = historical.inventoryItems;
  }

  // Business & Outlet
  async getBusiness(): Promise<Business> {
    return { ...this.business };
  }
  async updateBusiness(data: Partial<Business>): Promise<Business> {
    this.business = { ...this.business, ...data, updated_at: new Date().toISOString() };
    return { ...this.business };
  }
  async getOutlets(): Promise<Outlet[]> {
    return [...this.outlets];
  }
  async createOutlet(data: Omit<Outlet, 'id' | 'created_at' | 'updated_at'>): Promise<Outlet> {
    const now = new Date().toISOString();
    const newOutlet: Outlet = { ...data, id: generateUUID(), created_at: now, updated_at: now };
    this.outlets.push(newOutlet);
    return newOutlet;
  }

  // Users & Auth
  async getUsers(): Promise<User[]> {
    return [...this.users];
  }
  async getUserById(id: string): Promise<User | null> {
    const u = this.users.find((x) => x.id === id);
    return u ? { ...u } : null;
  }
  async verifyUserPin(pin: string): Promise<User | null> {
    const u = this.users.find((x) => x.pin_hash === pin && x.is_active);
    return u ? { ...u } : null;
  }
  async verifyManagerPin(pin: string): Promise<User | null> {
    const u = this.users.find((x) => x.pin_hash === pin && x.is_active && (x.role === 'owner' || x.role === 'manager'));
    return u ? { ...u } : null;
  }
  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const now = new Date().toISOString();
    const newUser: User = { ...user, id: generateUUID(), created_at: now, updated_at: now };
    this.users.push(newUser);
    return newUser;
  }
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const idx = this.users.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Pengguna tidak ditemukan');
    this.users[idx] = { ...this.users[idx], ...data, updated_at: new Date().toISOString() };
    return { ...this.users[idx] };
  }
  async deleteUser(id: string): Promise<void> {
    this.users = this.users.filter((x) => x.id !== id);
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return [...this.categories];
  }
  async createCategory(cat: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    const now = new Date().toISOString();
    const newCat: Category = { ...cat, id: generateUUID(), created_at: now, updated_at: now };
    this.categories.push(newCat);
    return newCat;
  }
  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const idx = this.categories.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Kategori tidak ditemukan');
    this.categories[idx] = { ...this.categories[idx], ...data, updated_at: new Date().toISOString() };
    return { ...this.categories[idx] };
  }
  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter((x) => x.id !== id);
  }

  // Products
  async getProducts(filters?: { categoryId?: string; search?: string; favoriteOnly?: boolean }): Promise<Product[]> {
    let list = [...this.products];
    if (filters?.categoryId) list = list.filter((p) => p.category_id === filters.categoryId);
    if (filters?.favoriteOnly) list = list.filter((p) => p.is_favorite);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.barcode && p.barcode.includes(q)));
    }
    return list;
  }
  async getProductById(id: string): Promise<Product | null> {
    const p = this.products.find((x) => x.id === id);
    return p ? { ...p } : null;
  }
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const now = new Date().toISOString();
    const newProd: Product = { ...product, id: generateUUID(), created_at: now, updated_at: now };
    this.products.push(newProd);
    return newProd;
  }
  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const idx = this.products.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Produk tidak ditemukan');
    this.products[idx] = { ...this.products[idx], ...data, updated_at: new Date().toISOString() };
    return { ...this.products[idx] };
  }
  async deleteProduct(id: string): Promise<void> {
    this.products = this.products.filter((x) => x.id !== id);
  }
  async importProductsCsv(products: Omit<Product, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
    let count = 0;
    for (const p of products) {
      await this.createProduct(p);
      count++;
    }
    return count;
  }

  // Inventory & Stock
  async getInventory(outletId: string): Promise<InventoryItem[]> {
    return this.inventory.filter((x) => x.outlet_id === outletId);
  }
  async getStockMovements(outletId: string, limit = 50): Promise<StockMovement[]> {
    return this.stockMovements
      .filter((x) => x.outlet_id === outletId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }
  async adjustStock(params: {
    outletId: string;
    productId: string;
    variantId?: string | null;
    quantityDiff: number;
    reason: string;
    userId?: string;
  }): Promise<StockMovement> {
    let item = this.inventory.find(
      (x) => x.outlet_id === params.outletId && x.product_id === params.productId && x.variant_id === (params.variantId || null)
    );
    if (!item) {
      item = {
        id: generateUUID(),
        business_id: this.business.id,
        outlet_id: params.outletId,
        product_id: params.productId,
        variant_id: params.variantId || null,
        stock_quantity: 0,
        min_stock: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.inventory.push(item);
    }
    const prevStock = item.stock_quantity;
    item.stock_quantity += params.quantityDiff;
    item.updated_at = new Date().toISOString();

    const movement: StockMovement = {
      id: generateUUID(),
      business_id: this.business.id,
      outlet_id: params.outletId,
      product_id: params.productId,
      variant_id: params.variantId || null,
      type: params.quantityDiff > 0 ? 'adjustment' : 'sale',
      quantity: params.quantityDiff,
      previous_stock: prevStock,
      current_stock: item.stock_quantity,
      reference_id: undefined,
      notes: params.reason,
      created_by: params.userId,
      created_at: new Date().toISOString(),
    };
    this.stockMovements.unshift(movement);

    if (item.stock_quantity <= item.min_stock) {
      await this.emitEvent({
        business_id: this.business.id,
        outlet_id: params.outletId,
        event_type: 'stock.low',
        payload: { product_id: params.productId, stock: item.stock_quantity, min: item.min_stock },
        status: 'pending',
      });
    }

    return movement;
  }
  async createStockOpname(opname: Omit<StockOpname, 'id' | 'created_at'>): Promise<StockOpname> {
    const newOpname: StockOpname = { ...opname, id: generateUUID(), created_at: new Date().toISOString() };
    this.stockOpnames.push(newOpname);
    return newOpname;
  }
  async getStockOpnames(outletId: string): Promise<StockOpname[]> {
    return this.stockOpnames.filter((x) => x.outlet_id === outletId);
  }
  async createStockTransfer(transfer: Omit<StockTransfer, 'id' | 'created_at'>): Promise<StockTransfer> {
    const newTransfer: StockTransfer = { ...transfer, id: generateUUID(), created_at: new Date().toISOString() };
    this.stockTransfers.push(newTransfer);
    return newTransfer;
  }
  async getStockTransfers(outletId: string): Promise<StockTransfer[]> {
    return this.stockTransfers.filter((x) => x.source_outlet_id === outletId || x.destination_outlet_id === outletId);
  }
  async updateStockTransferStatus(id: string, status: StockTransfer['status'], receivedBy?: string): Promise<StockTransfer> {
    const idx = this.stockTransfers.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Transfer stok tidak ditemukan');
    this.stockTransfers[idx].status = status;
    if (receivedBy) this.stockTransfers[idx].received_by = receivedBy;
    return this.stockTransfers[idx];
  }

  // Customers & Loyalty
  async getCustomers(search?: string): Promise<Customer[]> {
    if (!search) return [...this.customers];
    const q = search.toLowerCase();
    return this.customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }
  async getCustomerById(id: string): Promise<Customer | null> {
    const c = this.customers.find((x) => x.id === id);
    return c ? { ...c } : null;
  }
  async createCustomer(cust: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'points_balance' | 'total_spent'>): Promise<Customer> {
    const now = new Date().toISOString();
    const newCust: Customer = {
      ...cust,
      id: generateUUID(),
      points_balance: 0,
      total_spent: 0,
      membership_tier: 'bronze',
      created_at: now,
      updated_at: now,
    };
    this.customers.push(newCust);
    return newCust;
  }
  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const idx = this.customers.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Pelanggan tidak ditemukan');
    this.customers[idx] = { ...this.customers[idx], ...data, updated_at: new Date().toISOString() };
    return { ...this.customers[idx] };
  }
  async adjustCustomerPoints(customerId: string, pointsDiff: number): Promise<number> {
    const c = await this.getCustomerById(customerId);
    if (!c) throw new Error('Pelanggan tidak ditemukan');
    c.points_balance = Math.max(0, c.points_balance + pointsDiff);
    await this.updateCustomer(customerId, { points_balance: c.points_balance });
    return c.points_balance;
  }

  // Shifts
  async getActiveShift(outletId: string, userId?: string): Promise<Shift | null> {
    const s = this.shifts.find((x) => x.outlet_id === outletId && x.status === 'open' && (!userId || x.user_id === userId));
    return s ? { ...s } : null;
  }
  async openShift(params: { outletId: string; userId: string; openingCash: number }): Promise<Shift> {
    const now = new Date().toISOString();
    const newShift: Shift = {
      id: generateUUID(),
      business_id: this.business.id,
      outlet_id: params.outletId,
      user_id: params.userId,
      start_time: now,
      end_time: undefined,
      opening_cash: params.openingCash,
      expected_cash: params.openingCash,
      actual_cash: undefined,
      difference_cash: undefined,
      total_sales_cash: 0,
      total_sales_non_cash: 0,
      total_refunds: 0,
      total_cash_in: 0,
      total_cash_out: 0,
      status: 'open',
      notes: undefined,
      created_at: now,
    };
    this.shifts.push(newShift);
    return newShift;
  }
  async recordCashMovement(params: {
    shiftId: string;
    outletId: string;
    userId: string;
    type: 'cash_in' | 'cash_out';
    amount: number;
    reason: string;
  }): Promise<CashMovement> {
    const now = new Date().toISOString();
    const mv: CashMovement = {
      id: generateUUID(),
      business_id: this.business.id,
      shift_id: params.shiftId,
      outlet_id: params.outletId,
      user_id: params.userId,
      type: params.type,
      amount: params.amount,
      reason: params.reason,
      created_at: now,
    };
    this.cashMovements.push(mv);
    const s = this.shifts.find((x) => x.id === params.shiftId);
    if (s) {
      if (params.type === 'cash_in') {
        s.expected_cash += params.amount;
        s.total_cash_in += params.amount;
      } else {
        s.expected_cash -= params.amount;
        s.total_cash_out += params.amount;
      }
    }
    return mv;
  }
  async closeShift(params: { shiftId: string; actualCash: number; notes?: string }): Promise<Shift> {
    const s = this.shifts.find((x) => x.id === params.shiftId);
    if (!s) throw new Error('Shift tidak ditemukan');
    s.status = 'closed';
    s.end_time = new Date().toISOString();
    s.actual_cash = params.actualCash;
    s.difference_cash = params.actualCash - s.expected_cash;
    s.notes = params.notes;

    await this.emitEvent({
      business_id: this.business.id,
      outlet_id: s.outlet_id,
      event_type: 'shift.closed',
      payload: { shift_id: s.id, difference: s.difference_cash },
      status: 'pending',
    });

    return { ...s };
  }
  async getShifts(outletId: string, limit = 30): Promise<Shift[]> {
    return this.shifts
      .filter((x) => x.outlet_id === outletId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  // Orders
  async createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    const now = new Date().toISOString();
    const order: Order = {
      ...orderData,
      id: generateUUID(),
      created_at: now,
      updated_at: now,
    };
    this.orders.unshift(order);

    // Reduce stock
    for (const item of order.items) {
      await this.adjustStock({
        outletId: order.outlet_id,
        productId: item.product_id,
        variantId: item.variant_id,
        quantityDiff: -item.quantity,
        reason: `Penjualan #${order.order_number}`,
        userId: order.user_id,
      });
    }

    // Update active shift if cash
    const activeShift = await this.getActiveShift(order.outlet_id, order.user_id);
    if (activeShift && order.payments) {
      const cashPay = order.payments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
      if (cashPay > 0) {
        activeShift.expected_cash += cashPay;
        activeShift.total_sales_cash += cashPay;
      }
      const nonCashPay = order.payments.filter((p) => p.method !== 'cash').reduce((sum, p) => sum + p.amount, 0);
      activeShift.total_sales_non_cash += nonCashPay;
    }

    // Trigger event
    await this.emitEvent({
      business_id: this.business.id,
      outlet_id: order.outlet_id,
      event_type: 'order.created',
      payload: { order_id: order.id, total: order.grand_total },
      status: 'pending',
    });

    return order;
  }
  async getOrders(filters?: {
    outletId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
  }): Promise<Order[]> {
    let list = [...this.orders];
    if (filters?.outletId) list = list.filter((o) => o.outlet_id === filters.outletId);
    if (filters?.status) list = list.filter((o) => o.status === filters.status);
    if (filters?.startDate) list = list.filter((o) => new Date(o.created_at) >= new Date(filters.startDate!));
    if (filters?.endDate) list = list.filter((o) => new Date(o.created_at) <= new Date(filters.endDate!));
    if (filters?.limit) list = list.slice(0, filters.limit);
    return list;
  }
  async getOrderById(id: string): Promise<Order | null> {
    const o = this.orders.find((x) => x.id === id);
    return o ? { ...o } : null;
  }
  async voidOrder(params: { orderId: string; reason: string; managerId: string }): Promise<Order> {
    const o = await this.getOrderById(params.orderId);
    if (!o) throw new Error('Pesanan tidak ditemukan');
    o.status = 'cancelled';
    o.void_reason = params.reason;
    o.voided_by = params.managerId;
    o.updated_at = new Date().toISOString();

    // Restock
    for (const item of o.items) {
      await this.adjustStock({
        outletId: o.outlet_id,
        productId: item.product_id,
        variantId: item.variant_id,
        quantityDiff: item.quantity,
        reason: `Void pesanan #${o.order_number}`,
        userId: params.managerId,
      });
    }

    return { ...o };
  }
  async refundOrder(params: {
    orderId: string;
    reason: string;
    managerId: string;
    items?: { orderItemId: string; quantity: number }[];
  }): Promise<Order> {
    const o = await this.getOrderById(params.orderId);
    if (!o) throw new Error('Pesanan tidak ditemukan');
    o.status = 'refunded';
    o.refund_reason = params.reason;
    o.refunded_by = params.managerId;
    o.updated_at = new Date().toISOString();
    return { ...o };
  }
  async holdOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    const now = new Date().toISOString();
    const held: Order = { ...orderData, id: generateUUID(), status: 'hold', created_at: now, updated_at: now };
    this.heldOrders.push(held);
    return held;
  }
  async getHeldOrders(outletId: string): Promise<Order[]> {
    return this.heldOrders.filter((x) => x.outlet_id === outletId);
  }
  async deleteHeldOrder(id: string): Promise<void> {
    this.heldOrders = this.heldOrders.filter((x) => x.id !== id);
  }

  // Tables & KDS
  async getDiningTables(outletId: string): Promise<DiningTable[]> {
    return this.diningTables.filter((x) => x.outlet_id === outletId);
  }
  async updateTableStatus(tableId: string, status: DiningTable['status'], currentOrderId?: string | null): Promise<DiningTable> {
    const idx = this.diningTables.findIndex((x) => x.id === tableId);
    if (idx === -1) throw new Error('Meja tidak ditemukan');
    this.diningTables[idx].status = status;
    if (currentOrderId !== undefined) this.diningTables[idx].current_order_id = currentOrderId;
    return { ...this.diningTables[idx] };
  }
  async getKdsOrders(outletId: string): Promise<Order[]> {
    return this.orders.filter(
      (x) => x.outlet_id === outletId && x.order_type === 'dine_in' && x.kitchen_status && x.kitchen_status !== 'served'
    );
  }
  async updateKitchenStatus(orderId: string, status: Order['kitchen_status']): Promise<Order> {
    const o = await this.getOrderById(orderId);
    if (!o) throw new Error('Pesanan tidak ditemukan');
    o.kitchen_status = status;
    o.updated_at = new Date().toISOString();
    return { ...o };
  }

  // Settings
  async getTaxSettings(): Promise<TaxSettings> {
    return { ...this.taxSettings };
  }
  async updateTaxSettings(settings: Partial<TaxSettings>): Promise<TaxSettings> {
    this.taxSettings = { ...this.taxSettings, ...settings, updated_at: new Date().toISOString() };
    return { ...this.taxSettings };
  }
  async getReceiptTemplate(): Promise<ReceiptTemplate> {
    return { ...this.receiptTemplate };
  }
  async updateReceiptTemplate(template: Partial<ReceiptTemplate>): Promise<ReceiptTemplate> {
    this.receiptTemplate = { ...this.receiptTemplate, ...template, updated_at: new Date().toISOString() };
    return { ...this.receiptTemplate };
  }

  // Audit & Events
  async recordAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    this.auditLogs.unshift({ ...log, id: generateUUID(), created_at: new Date().toISOString() });
  }
  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return this.auditLogs.slice(0, limit);
  }
  subscribeToEvents(callback: (event: SystemEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }
  async emitEvent(event: Omit<SystemEvent, 'id' | 'created_at'>): Promise<void> {
    const fullEvent: SystemEvent = { ...event, id: generateUUID(), created_at: new Date().toISOString() };
    this.events.unshift(fullEvent);
    for (const listener of this.eventListeners) {
      try {
        listener(fullEvent);
      } catch {
        // ignore listener errors
      }
    }
  }
}

// Global server singleton
let serverRepoInstance: ServerInMemoryRepository | null = null;

export function getServerRepository(): IPosRepository {
  if (!serverRepoInstance) {
    serverRepoInstance = new ServerInMemoryRepository();
  }
  return serverRepoInstance;
}
