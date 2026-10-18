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

export interface IPosRepository {
  // Business & Outlet
  getBusiness(): Promise<Business>;
  updateBusiness(data: Partial<Business>): Promise<Business>;
  getOutlets(): Promise<Outlet[]>;
  createOutlet(data: Omit<Outlet, 'id' | 'created_at' | 'updated_at'>): Promise<Outlet>;

  // Users & Auth
  getUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | null>;
  verifyUserPin(pin: string): Promise<User | null>;
  verifyManagerPin(pin: string): Promise<User | null>;
  createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(cat: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category>;
  updateCategory(id: string, data: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Products
  getProducts(filters?: { categoryId?: string; search?: string; favoriteOnly?: boolean }): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product>;
  updateProduct(id: string, data: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  importProductsCsv(products: Omit<Product, 'id' | 'created_at' | 'updated_at'>[]): Promise<number>;

  // Inventory & Stock
  getInventory(outletId: string): Promise<InventoryItem[]>;
  getStockMovements(outletId: string, limit?: number): Promise<StockMovement[]>;
  adjustStock(params: {
    outletId: string;
    productId: string;
    variantId?: string | null;
    quantityDiff: number;
    reason: string;
    userId?: string;
  }): Promise<StockMovement>;
  createStockOpname(opname: Omit<StockOpname, 'id' | 'created_at'>): Promise<StockOpname>;
  getStockOpnames(outletId: string): Promise<StockOpname[]>;
  createStockTransfer(transfer: Omit<StockTransfer, 'id' | 'created_at'>): Promise<StockTransfer>;
  getStockTransfers(outletId: string): Promise<StockTransfer[]>;
  updateStockTransferStatus(id: string, status: StockTransfer['status'], receivedBy?: string): Promise<StockTransfer>;

  // Customers & Loyalty
  getCustomers(search?: string): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | null>;
  createCustomer(cust: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'points_balance' | 'total_spent'>): Promise<Customer>;
  updateCustomer(id: string, data: Partial<Customer>): Promise<Customer>;
  adjustCustomerPoints(customerId: string, pointsDiff: number, reason: string): Promise<number>;

  // Shifts & Cash Movements
  getActiveShift(outletId: string, userId?: string): Promise<Shift | null>;
  openShift(params: { outletId: string; userId: string; openingCash: number }): Promise<Shift>;
  recordCashMovement(params: {
    shiftId: string;
    outletId: string;
    userId: string;
    type: 'cash_in' | 'cash_out';
    amount: number;
    reason: string;
  }): Promise<CashMovement>;
  closeShift(params: { shiftId: string; actualCash: number; notes?: string }): Promise<Shift>;
  getShifts(outletId: string, limit?: number): Promise<Shift[]>;

  // Orders & Checkout
  createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order>;
  getOrders(filters?: {
    outletId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
  }): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | null>;
  voidOrder(params: { orderId: string; reason: string; managerId: string }): Promise<Order>;
  refundOrder(params: {
    orderId: string;
    reason: string;
    managerId: string;
    items?: { orderItemId: string; quantity: number }[];
  }): Promise<Order>;
  holdOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order>;
  getHeldOrders(outletId: string): Promise<Order[]>;
  deleteHeldOrder(id: string): Promise<void>;

  // Tables & F&B
  getDiningTables(outletId: string): Promise<DiningTable[]>;
  updateTableStatus(tableId: string, status: DiningTable['status'], currentOrderId?: string | null): Promise<DiningTable>;
  getKdsOrders(outletId: string): Promise<Order[]>;
  updateKitchenStatus(orderId: string, status: Order['kitchen_status']): Promise<Order>;

  // Settings & Templates
  getTaxSettings(): Promise<TaxSettings>;
  updateTaxSettings(settings: Partial<TaxSettings>): Promise<TaxSettings>;
  getReceiptTemplate(outletId?: string): Promise<ReceiptTemplate>;
  updateReceiptTemplate(template: Partial<ReceiptTemplate>): Promise<ReceiptTemplate>;

  // Audit & Realtime Events
  recordAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  subscribeToEvents(callback: (event: SystemEvent) => void): () => void;
  emitEvent(event: Omit<SystemEvent, 'id' | 'created_at'>): Promise<void>;
}
