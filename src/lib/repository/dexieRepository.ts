import { IPosRepository } from './types';
import { db, seedDexieIfEmpty } from '../db/dexie';
import {
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
} from '@/types';
import { generateUUID } from '../utils';
import {
  SEED_BUSINESS,
  SEED_TAX_SETTINGS,
  SEED_RECEIPT_TEMPLATE,
} from '../db/seedData';

type EventListener = (event: SystemEvent) => void;

export class DexieLocalRepository implements IPosRepository {
  private listeners: Set<EventListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private isReadyPromise: Promise<void>;

  constructor() {
    this.isReadyPromise = this.init();
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('pos_events_channel');
      this.broadcastChannel.onmessage = (msgEvent) => {
        if (msgEvent.data) {
          this.notifyListeners(msgEvent.data);
        }
      };
    }
  }

  private async init(): Promise<void> {
    if (typeof window !== 'undefined') {
      await seedDexieIfEmpty();
    }
  }

  private async ensureReady(): Promise<void> {
    await this.isReadyPromise;
  }

  private notifyListeners(event: SystemEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in event listener:', err);
      }
    }
  }

  // --- Business & Outlets ---
  async getBusiness(): Promise<Business> {
    await this.ensureReady();
    const biz = await db.businesses.toCollection().first();
    return biz || SEED_BUSINESS;
  }

  async updateBusiness(data: Partial<Business>): Promise<Business> {
    await this.ensureReady();
    const current = await this.getBusiness();
    const updated = {
      ...current,
      ...data,
      updated_at: new Date().toISOString(),
    };
    await db.businesses.put(updated);
    return updated;
  }

  async getOutlets(): Promise<Outlet[]> {
    await this.ensureReady();
    return db.outlets.toArray();
  }

  async createOutlet(data: Omit<Outlet, 'id' | 'created_at' | 'updated_at'>): Promise<Outlet> {
    await this.ensureReady();
    const outlet: Outlet = {
      ...data,
      id: `outlet_${generateUUID().substring(0, 8)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.outlets.add(outlet);
    return outlet;
  }

  // --- Users & Auth ---
  async getUsers(): Promise<User[]> {
    await this.ensureReady();
    const users = await db.users.toArray();
    return users.filter((u) => !u.deleted_at);
  }

  async getUserById(id: string): Promise<User | null> {
    await this.ensureReady();
    const user = await db.users.get(id);
    return user && !user.deleted_at ? user : null;
  }

  async verifyUserPin(pin: string): Promise<User | null> {
    await this.ensureReady();
    const cleanPin = pin.trim();
    const user = await db.users
      .filter((u) => u.pin_hash === cleanPin && u.is_active && !u.deleted_at)
      .first();
    return user || null;
  }

  async verifyManagerPin(pin: string): Promise<User | null> {
    await this.ensureReady();
    const cleanPin = pin.trim();
    const manager = await db.users
      .filter(
        (u) =>
          u.pin_hash === cleanPin &&
          (u.role === 'manager' || u.role === 'owner') &&
          u.is_active &&
          !u.deleted_at
      )
      .first();
    return manager || null;
  }

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    await this.ensureReady();
    const user: User = {
      ...userData,
      id: `user_${generateUUID().substring(0, 8)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.users.add(user);
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    await this.ensureReady();
    const existing = await db.users.get(id);
    if (!existing) throw new Error('User tidak ditemukan');
    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    await db.users.put(updated);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await this.ensureReady();
    const existing = await db.users.get(id);
    if (existing) {
      // Soft delete
      await db.users.put({
        ...existing,
        deleted_at: new Date().toISOString(),
        is_active: false,
      });
    }
  }

  // --- Categories ---
  async getCategories(): Promise<Category[]> {
    await this.ensureReady();
    return db.categories.orderBy('sort_order').toArray();
  }

  async createCategory(cat: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    await this.ensureReady();
    const category: Category = {
      ...cat,
      id: `cat_${generateUUID().substring(0, 8)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.categories.add(category);
    return category;
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    await this.ensureReady();
    const existing = await db.categories.get(id);
    if (!existing) throw new Error('Kategori tidak ditemukan');
    const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
    await db.categories.put(updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    await this.ensureReady();
    await db.categories.delete(id);
  }

  // --- Products ---
  async getProducts(filters?: {
    categoryId?: string;
    search?: string;
    favoriteOnly?: boolean;
  }): Promise<Product[]> {
    await this.ensureReady();
    let query = db.products.toCollection();

    const all = await query.toArray();
    let result = all.filter((p) => !p.deleted_at);

    if (filters?.categoryId && filters.categoryId !== 'all') {
      result = result.filter((p) => p.category_id === filters.categoryId);
    }
    if (filters?.favoriteOnly) {
      result = result.filter((p) => p.is_favorite);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.includes(q))
      );
    }

    return result;
  }

  async getProductById(id: string): Promise<Product | null> {
    await this.ensureReady();
    const prod = await db.products.get(id);
    return prod && !prod.deleted_at ? prod : null;
  }

  async createProduct(
    productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Product> {
    await this.ensureReady();
    const product: Product = {
      ...productData,
      id: `prod_${generateUUID().substring(0, 8)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.products.add(product);

    // Initialize inventory for all outlets
    const outlets = await db.outlets.toArray();
    for (const outlet of outlets) {
      await db.inventory_items.add({
        id: `inv_${outlet.id}_${product.id}`,
        business_id: product.business_id,
        outlet_id: outlet.id,
        product_id: product.id,
        variant_id: null,
        stock_quantity: 50,
        min_stock: product.min_stock_alert,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return product;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    await this.ensureReady();
    const existing = await db.products.get(id);
    if (!existing) throw new Error('Produk tidak ditemukan');
    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    await db.products.put(updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.ensureReady();
    const existing = await db.products.get(id);
    if (existing) {
      // Soft delete
      await db.products.put({
        ...existing,
        deleted_at: new Date().toISOString(),
        is_active: false,
      });
    }
  }

  async importProductsCsv(
    products: Omit<Product, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<number> {
    await this.ensureReady();
    let count = 0;
    for (const p of products) {
      await this.createProduct(p);
      count++;
    }
    return count;
  }

  // --- Inventory & Stock ---
  async getInventory(outletId: string): Promise<InventoryItem[]> {
    await this.ensureReady();
    return db.inventory_items.where('outlet_id').equals(outletId).toArray();
  }

  async getStockMovements(outletId: string, limit: number = 100): Promise<StockMovement[]> {
    await this.ensureReady();
    const all = await db.stock_movements
      .where('outlet_id')
      .equals(outletId)
      .reverse()
      .sortBy('created_at');
    return all.slice(0, limit);
  }

  async adjustStock(params: {
    outletId: string;
    productId: string;
    variantId?: string | null;
    quantityDiff: number;
    reason: string;
    userId?: string;
  }): Promise<StockMovement> {
    await this.ensureReady();
    const inv = await db.inventory_items
      .filter((i) => i.outlet_id === params.outletId && i.product_id === params.productId)
      .first();

    const prevStock = inv ? inv.stock_quantity : 0;
    const newStock = prevStock + params.quantityDiff;

    if (inv) {
      await db.inventory_items.update(inv.id, {
        stock_quantity: newStock,
        updated_at: new Date().toISOString(),
      });
    } else {
      const biz = await this.getBusiness();
      await db.inventory_items.add({
        id: `inv_${params.outletId}_${params.productId}`,
        business_id: biz.id,
        outlet_id: params.outletId,
        product_id: params.productId,
        variant_id: params.variantId || null,
        stock_quantity: newStock,
        min_stock: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const movement: StockMovement = {
      id: `sm_${generateUUID().substring(0, 8)}`,
      business_id: (await this.getBusiness()).id,
      outlet_id: params.outletId,
      product_id: params.productId,
      variant_id: params.variantId || null,
      type: 'adjustment',
      quantity: params.quantityDiff,
      previous_stock: prevStock,
      current_stock: newStock,
      notes: params.reason,
      created_by: params.userId,
      created_at: new Date().toISOString(),
    };
    await db.stock_movements.add(movement);

    if (newStock <= 5) {
      this.emitEvent({
        business_id: movement.business_id,
        outlet_id: params.outletId,
        event_type: 'stock.low',
        payload: { productId: params.productId, currentStock: newStock },
        status: 'pending',
      });
    }

    return movement;
  }

  async createStockOpname(opnameData: Omit<StockOpname, 'id' | 'created_at'>): Promise<StockOpname> {
    await this.ensureReady();
    const opname: StockOpname = {
      ...opnameData,
      id: `opn_${generateUUID().substring(0, 8)}`,
      created_at: new Date().toISOString(),
    };
    await db.stock_opnames.add(opname);

    // Apply adjustments to inventory and record stock movements
    if (opname.items) {
      for (const item of opname.items) {
        if (item.difference_quantity !== 0) {
          await this.adjustStock({
            outletId: opname.outlet_id,
            productId: item.product_id,
            variantId: item.variant_id,
            quantityDiff: item.difference_quantity,
            reason: `Stok Opname ${opname.opname_number}: ${item.notes || 'Penyesuaian fisik'}`,
            userId: opname.conducted_by,
          });
        }
      }
    }

    return opname;
  }

  async getStockOpnames(outletId: string): Promise<StockOpname[]> {
    await this.ensureReady();
    return db.stock_opnames.where('outlet_id').equals(outletId).reverse().sortBy('created_at');
  }

  async createStockTransfer(transferData: Omit<StockTransfer, 'id' | 'created_at'>): Promise<StockTransfer> {
    await this.ensureReady();
    const transfer: StockTransfer = {
      ...transferData,
      id: `trf_${generateUUID().substring(0, 8)}`,
      created_at: new Date().toISOString(),
    };
    await db.stock_transfers.add(transfer);

    // Deduct stock from source outlet immediately
    if (transfer.items) {
      for (const item of transfer.items) {
        await this.adjustStock({
          outletId: transfer.source_outlet_id,
          productId: item.product_id,
          variantId: item.variant_id,
          quantityDiff: -item.quantity,
          reason: `Transfer keluar #${transfer.transfer_number}`,
          userId: transfer.sent_by,
        });
      }
    }

    return transfer;
  }

  async getStockTransfers(outletId: string): Promise<StockTransfer[]> {
    await this.ensureReady();
    return db.stock_transfers
      .filter((t) => t.source_outlet_id === outletId || t.destination_outlet_id === outletId)
      .reverse()
      .sortBy('created_at');
  }

  async updateStockTransferStatus(
    id: string,
    status: StockTransfer['status'],
    receivedBy?: string
  ): Promise<StockTransfer> {
    await this.ensureReady();
    const transfer = await db.stock_transfers.get(id);
    if (!transfer) throw new Error('Data transfer stok tidak ditemukan');

    const updated: StockTransfer = {
      ...transfer,
      status,
      received_by: receivedBy || transfer.received_by,
      received_at: status === 'completed' ? new Date().toISOString() : transfer.received_at,
    };
    await db.stock_transfers.put(updated);

    // If completed, add stock to destination outlet
    if (status === 'completed' && transfer.items) {
      for (const item of transfer.items) {
        await this.adjustStock({
          outletId: transfer.destination_outlet_id,
          productId: item.product_id,
          variantId: item.variant_id,
          quantityDiff: item.quantity,
          reason: `Penerimaan transfer #${transfer.transfer_number}`,
          userId: receivedBy,
        });
      }
    }

    return updated;
  }

  // --- Customers & Loyalty ---
  async getCustomers(search?: string): Promise<Customer[]> {
    await this.ensureReady();
    let all = await db.customers.toArray();
    all = all.filter((c) => !c.deleted_at);
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      all = all.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    return all;
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    await this.ensureReady();
    const c = await db.customers.get(id);
    return c && !c.deleted_at ? c : null;
  }

  async createCustomer(
    custData: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'points_balance' | 'total_spent'>
  ): Promise<Customer> {
    await this.ensureReady();
    const customer: Customer = {
      ...custData,
      id: `c_${generateUUID().substring(0, 8)}`,
      points_balance: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.customers.add(customer);
    return customer;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    await this.ensureReady();
    const existing = await db.customers.get(id);
    if (!existing) throw new Error('Pelanggan tidak ditemukan');
    const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
    await db.customers.put(updated);
    return updated;
  }

  async adjustCustomerPoints(customerId: string, pointsDiff: number, reason: string): Promise<number> {
    await this.ensureReady();
    const cust = await db.customers.get(customerId);
    if (!cust) throw new Error('Pelanggan tidak ditemukan');
    const newPoints = Math.max(0, cust.points_balance + pointsDiff);
    await db.customers.update(customerId, {
      points_balance: newPoints,
      updated_at: new Date().toISOString(),
    });

    await db.loyalty_transactions.add({
      id: `lt_${generateUUID().substring(0, 8)}`,
      business_id: cust.business_id,
      customer_id: customerId,
      type: pointsDiff >= 0 ? 'earn' : 'redeem',
      points: pointsDiff,
      points_after: newPoints,
      notes: reason,
      created_at: new Date().toISOString(),
    });

    return newPoints;
  }

  // --- Shifts & Cash ---
  async getActiveShift(outletId: string, userId?: string): Promise<Shift | null> {
    await this.ensureReady();
    let query = db.shifts.filter((s) => s.outlet_id === outletId && s.status === 'open');
    if (userId) {
      query = query.filter((s) => s.user_id === userId);
    }
    const shift = await query.first();
    return shift || null;
  }

  async openShift(params: { outletId: string; userId: string; openingCash: number }): Promise<Shift> {
    await this.ensureReady();
    const existing = await this.getActiveShift(params.outletId, params.userId);
    if (existing) return existing;

    const biz = await this.getBusiness();
    const shift: Shift = {
      id: `shift_${generateUUID().substring(0, 8)}`,
      business_id: biz.id,
      outlet_id: params.outletId,
      user_id: params.userId,
      start_time: new Date().toISOString(),
      opening_cash: params.openingCash,
      expected_cash: params.openingCash,
      total_sales_cash: 0,
      total_sales_non_cash: 0,
      total_refunds: 0,
      total_cash_in: 0,
      total_cash_out: 0,
      status: 'open',
      created_at: new Date().toISOString(),
    };
    await db.shifts.add(shift);
    return shift;
  }

  async recordCashMovement(params: {
    shiftId: string;
    outletId: string;
    userId: string;
    type: 'cash_in' | 'cash_out';
    amount: number;
    reason: string;
  }): Promise<CashMovement> {
    await this.ensureReady();
    const shift = await db.shifts.get(params.shiftId);
    if (!shift) throw new Error('Shift tidak ditemukan');

    const movement: CashMovement = {
      id: `cm_${generateUUID().substring(0, 8)}`,
      shift_id: params.shiftId,
      business_id: shift.business_id,
      outlet_id: params.outletId,
      user_id: params.userId,
      type: params.type,
      amount: params.amount,
      reason: params.reason,
      created_at: new Date().toISOString(),
    };
    await db.cash_movements.add(movement);

    if (params.type === 'cash_in') {
      shift.total_cash_in += params.amount;
      shift.expected_cash += params.amount;
    } else {
      shift.total_cash_out += params.amount;
      shift.expected_cash -= params.amount;
    }
    await db.shifts.put(shift);

    return movement;
  }

  async closeShift(params: { shiftId: string; actualCash: number; notes?: string }): Promise<Shift> {
    await this.ensureReady();
    const shift = await db.shifts.get(params.shiftId);
    if (!shift) throw new Error('Shift tidak ditemukan');

    const difference = params.actualCash - shift.expected_cash;
    const closed: Shift = {
      ...shift,
      status: 'closed',
      end_time: new Date().toISOString(),
      actual_cash: params.actualCash,
      difference_cash: difference,
      notes: params.notes,
    };
    await db.shifts.put(closed);

    this.emitEvent({
      business_id: shift.business_id,
      outlet_id: shift.outlet_id,
      event_type: 'shift.closed',
      payload: { shiftId: shift.id, difference, actualCash: params.actualCash },
      status: 'pending',
    });

    return closed;
  }

  async getShifts(outletId: string, limit: number = 30): Promise<Shift[]> {
    await this.ensureReady();
    return db.shifts.where('outlet_id').equals(outletId).reverse().sortBy('created_at').then((s) => s.slice(0, limit));
  }

  // --- Orders & Checkout ---
  async createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    await this.ensureReady();
    const orderId = `ord_${generateUUID().substring(0, 8)}`;
    const nowIso = new Date().toISOString();

    const order: Order = {
      ...orderData,
      id: orderId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await db.orders.add(order);

    // Update active shift totals if present
    if (order.shift_id) {
      const shift = await db.shifts.get(order.shift_id);
      if (shift && shift.status === 'open') {
        if (order.payment_method === 'cash') {
          shift.total_sales_cash += order.grand_total;
          shift.expected_cash += order.grand_total;
        } else {
          shift.total_sales_non_cash += order.grand_total;
        }
        await db.shifts.put(shift);
      }
    }

    // Deduct stock per item and create stock movements
    for (const item of order.items) {
      const inv = await db.inventory_items
        .filter((i) => i.outlet_id === order.outlet_id && i.product_id === item.product_id)
        .first();

      const prev = inv ? inv.stock_quantity : 0;
      const current = Math.max(0, prev - item.quantity);

      if (inv) {
        await db.inventory_items.update(inv.id, {
          stock_quantity: current,
          updated_at: nowIso,
        });
      }

      await db.stock_movements.add({
        id: `sm_${generateUUID().substring(0, 8)}`,
        business_id: order.business_id,
        outlet_id: order.outlet_id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        type: 'sale',
        quantity: -item.quantity,
        previous_stock: prev,
        current_stock: current,
        reference_id: order.order_number,
        notes: `Penjualan ${order.order_number}`,
        created_by: order.user_id,
        created_at: nowIso,
      });

      if (current <= 5) {
        this.emitEvent({
          business_id: order.business_id,
          outlet_id: order.outlet_id,
          event_type: 'stock.low',
          payload: { productId: item.product_id, currentStock: current },
          status: 'pending',
        });
      }
    }

    // Award loyalty points to customer if attached
    if (order.customer_id) {
      const pointsEarned = Math.floor(order.grand_total / 10000);
      if (pointsEarned > 0) {
        await this.adjustCustomerPoints(
          order.customer_id,
          pointsEarned,
          `Poin transaksi ${order.order_number}`
        );
      }
      const cust = await db.customers.get(order.customer_id);
      if (cust) {
        await db.customers.update(cust.id, {
          total_spent: cust.total_spent + order.grand_total,
        });
      }
    }

    // Free table if dine-in completed
    if (order.dining_table_id && order.status === 'completed') {
      await this.updateTableStatus(order.dining_table_id, 'available', null);
    }

    // Emit order.created event
    this.emitEvent({
      business_id: order.business_id,
      outlet_id: order.outlet_id,
      event_type: 'order.created',
      payload: {
        orderId: order.id,
        orderNumber: order.order_number,
        grandTotal: order.grand_total,
        itemsCount: order.items.length,
      },
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
    await this.ensureReady();
    let all = await db.orders.orderBy('created_at').reverse().toArray();

    if (filters?.outletId) {
      all = all.filter((o) => o.outlet_id === filters.outletId);
    }
    if (filters?.status) {
      all = all.filter((o) => o.status === filters.status);
    }
    if (filters?.startDate) {
      all = all.filter((o) => new Date(o.created_at) >= new Date(filters.startDate!));
    }
    if (filters?.endDate) {
      all = all.filter((o) => new Date(o.created_at) <= new Date(filters.endDate!));
    }
    if (filters?.limit) {
      all = all.slice(0, filters.limit);
    }

    return all;
  }

  async getOrderById(id: string): Promise<Order | null> {
    await this.ensureReady();
    const order = await db.orders.get(id);
    return order || null;
  }

  async voidOrder(params: { orderId: string; reason: string; managerId: string }): Promise<Order> {
    await this.ensureReady();
    const order = await db.orders.get(params.orderId);
    if (!order) throw new Error('Order tidak ditemukan');

    const updated: Order = {
      ...order,
      status: 'cancelled',
      void_reason: params.reason,
      voided_by: params.managerId,
      updated_at: new Date().toISOString(),
    };
    await db.orders.put(updated);

    // Return inventory
    for (const item of order.items) {
      await this.adjustStock({
        outletId: order.outlet_id,
        productId: item.product_id,
        variantId: item.variant_id,
        quantityDiff: item.quantity,
        reason: `Void pesanan #${order.order_number}: ${params.reason}`,
        userId: params.managerId,
      });
    }

    this.emitEvent({
      business_id: order.business_id,
      outlet_id: order.outlet_id,
      event_type: 'order.voided',
      payload: { orderId: order.id, orderNumber: order.order_number, reason: params.reason },
      status: 'pending',
    });

    return updated;
  }

  async refundOrder(params: {
    orderId: string;
    reason: string;
    managerId: string;
    items?: { orderItemId: string; quantity: number }[];
  }): Promise<Order> {
    await this.ensureReady();
    const order = await db.orders.get(params.orderId);
    if (!order) throw new Error('Order tidak ditemukan');

    const updated: Order = {
      ...order,
      status: 'refunded',
      payment_status: 'refunded',
      refund_reason: params.reason,
      refunded_by: params.managerId,
      updated_at: new Date().toISOString(),
    };
    await db.orders.put(updated);

    // Restock returned items
    for (const item of order.items) {
      const match = params.items?.find((i) => i.orderItemId === item.id);
      const qtyToReturn = match ? match.quantity : item.quantity;
      if (qtyToReturn > 0) {
        await this.adjustStock({
          outletId: order.outlet_id,
          productId: item.product_id,
          variantId: item.variant_id,
          quantityDiff: qtyToReturn,
          reason: `Refund pesanan #${order.order_number}: ${params.reason}`,
          userId: params.managerId,
        });
      }
    }

    this.emitEvent({
      business_id: order.business_id,
      outlet_id: order.outlet_id,
      event_type: 'order.refunded',
      payload: { orderId: order.id, orderNumber: order.order_number, reason: params.reason },
      status: 'pending',
    });

    return updated;
  }

  async holdOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    await this.ensureReady();
    const order: Order = {
      ...orderData,
      id: `hold_${generateUUID().substring(0, 8)}`,
      status: 'hold',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.orders.add(order);
    return order;
  }

  async getHeldOrders(outletId: string): Promise<Order[]> {
    await this.ensureReady();
    return db.orders
      .filter((o) => o.outlet_id === outletId && o.status === 'hold')
      .reverse()
      .sortBy('created_at');
  }

  async deleteHeldOrder(id: string): Promise<void> {
    await this.ensureReady();
    await db.orders.delete(id);
  }

  // --- Tables & F&B ---
  async getDiningTables(outletId: string): Promise<DiningTable[]> {
    await this.ensureReady();
    return db.dining_tables.where('outlet_id').equals(outletId).toArray();
  }

  async updateTableStatus(
    tableId: string,
    status: DiningTable['status'],
    currentOrderId?: string | null
  ): Promise<DiningTable> {
    await this.ensureReady();
    const table = await db.dining_tables.get(tableId);
    if (!table) throw new Error('Meja tidak ditemukan');
    const updated = {
      ...table,
      status,
      current_order_id: currentOrderId !== undefined ? currentOrderId : table.current_order_id,
      updated_at: new Date().toISOString(),
    };
    await db.dining_tables.put(updated);
    return updated;
  }

  async getKdsOrders(outletId: string): Promise<Order[]> {
    await this.ensureReady();
    return db.orders
      .filter(
        (o) =>
          o.outlet_id === outletId &&
          (o.kitchen_status === 'queued' ||
            o.kitchen_status === 'preparing' ||
            o.kitchen_status === 'ready')
      )
      .reverse()
      .sortBy('created_at');
  }

  async updateKitchenStatus(orderId: string, status: Order['kitchen_status']): Promise<Order> {
    await this.ensureReady();
    const order = await db.orders.get(orderId);
    if (!order) throw new Error('Pesanan tidak ditemukan');
    const updated = {
      ...order,
      kitchen_status: status,
      updated_at: new Date().toISOString(),
    };
    await db.orders.put(updated);
    return updated;
  }

  // --- Settings & Templates ---
  async getTaxSettings(): Promise<TaxSettings> {
    await this.ensureReady();
    const settings = await db.tax_settings.toCollection().first();
    return settings || SEED_TAX_SETTINGS;
  }

  async updateTaxSettings(settings: Partial<TaxSettings>): Promise<TaxSettings> {
    await this.ensureReady();
    const current = await this.getTaxSettings();
    const updated = {
      ...current,
      ...settings,
      updated_at: new Date().toISOString(),
    };
    await db.tax_settings.put(updated);
    return updated;
  }

  async getReceiptTemplate(outletId?: string): Promise<ReceiptTemplate> {
    await this.ensureReady();
    if (outletId) {
      const specific = await db.receipt_templates.where('outlet_id').equals(outletId).first();
      if (specific) return specific;
    }
    const fallback = await db.receipt_templates.toCollection().first();
    return fallback || SEED_RECEIPT_TEMPLATE;
  }

  async updateReceiptTemplate(template: Partial<ReceiptTemplate>): Promise<ReceiptTemplate> {
    await this.ensureReady();
    const current = await this.getReceiptTemplate(template.outlet_id || undefined);
    const updated = {
      ...current,
      ...template,
      updated_at: new Date().toISOString(),
    };
    await db.receipt_templates.put(updated);
    return updated;
  }

  // --- Audit & Events ---
  async recordAuditLog(logData: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    await this.ensureReady();
    await db.audit_logs.add({
      ...logData,
      id: `log_${generateUUID().substring(0, 8)}`,
      created_at: new Date().toISOString(),
    });
  }

  async getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    await this.ensureReady();
    return db.audit_logs.orderBy('created_at').reverse().limit(limit).toArray();
  }

  subscribeToEvents(callback: (event: SystemEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  async emitEvent(eventData: Omit<SystemEvent, 'id' | 'created_at'>): Promise<void> {
    const event: SystemEvent = {
      ...eventData,
      id: `evt_${generateUUID().substring(0, 8)}`,
      created_at: new Date().toISOString(),
    };
    await db.events.add(event);
    this.notifyListeners(event);
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(event);
    }
  }
}
