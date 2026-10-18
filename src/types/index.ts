export type BusinessType = 'retail' | 'fnb';

export type UserRole = 'owner' | 'manager' | 'cashier' | 'warehouse';

export interface Business {
  id: string;
  name: string;
  business_type: BusinessType;
  logo_url?: string;
  address?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Outlet {
  id: string;
  business_id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  business_id: string;
  outlet_id?: string;
  name: string;
  email: string;
  role: UserRole;
  pin_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  sort_order: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  business_id: string;
  product_id: string;
  name: string;
  sku?: string;
  barcode?: string;
  buy_price: number; // Integer Rupiah
  sell_price: number; // Integer Rupiah
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModifierOption {
  id: string;
  modifier_id: string;
  name: string;
  price: number; // Integer Rupiah
  created_at: string;
  updated_at: string;
}

export interface Modifier {
  id: string;
  business_id: string;
  name: string;
  is_required: boolean;
  min_selection: number;
  max_selection: number;
  options: ModifierOption[];
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id?: string | null;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  image_url?: string;
  buy_price: number; // Integer Rupiah
  sell_price: number; // Integer Rupiah
  unit: string;
  is_favorite: boolean;
  track_stock: boolean;
  min_stock_alert: number;
  is_active: boolean;
  business_type: BusinessType;
  variants?: ProductVariant[];
  modifiers?: Modifier[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface InventoryItem {
  id: string;
  business_id: string;
  outlet_id: string;
  product_id: string;
  variant_id?: string | null;
  stock_quantity: number;
  min_stock: number;
  rack_location?: string;
  created_at: string;
  updated_at: string;
}

export type StockMovementType =
  | 'sale'
  | 'refund'
  | 'purchase'
  | 'opname'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment';

export interface StockMovement {
  id: string;
  business_id: string;
  outlet_id: string;
  product_id: string;
  variant_id?: string | null;
  type: StockMovementType;
  quantity: number; // positive or negative
  previous_stock: number;
  current_stock: number;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  business_id: string;
  outlet_id: string;
  supplier_id?: string | null;
  order_number: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  order_date: string;
  received_date?: string | null;
  notes?: string;
  items?: PurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

export type StockOpnameStatus = 'draft' | 'completed' | 'adjusted';

export interface StockOpnameItem {
  id: string;
  stock_opname_id: string;
  product_id: string;
  variant_id?: string | null;
  system_quantity: number;
  physical_quantity: number;
  difference_quantity: number;
  notes?: string;
}

export interface StockOpname {
  id: string;
  business_id: string;
  outlet_id: string;
  opname_number: string;
  status: StockOpnameStatus;
  total_system_qty: number;
  total_physical_qty: number;
  total_difference_qty: number;
  notes?: string;
  conducted_by?: string;
  conducted_at: string;
  items?: StockOpnameItem[];
  created_at: string;
}

export type StockTransferStatus = 'pending' | 'in_transit' | 'completed' | 'rejected';

export interface StockTransferItem {
  id: string;
  stock_transfer_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  business_id: string;
  source_outlet_id: string;
  destination_outlet_id: string;
  transfer_number: string;
  status: StockTransferStatus;
  notes?: string;
  sent_by?: string;
  received_by?: string;
  sent_at?: string;
  received_at?: string;
  items?: StockTransferItem[];
  created_at: string;
}

export type LoyaltyTier = 'bronze' | 'silver' | 'gold';

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  membership_tier: LoyaltyTier;
  points_balance: number;
  total_spent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LoyaltyTransaction {
  id: string;
  business_id: string;
  customer_id: string;
  order_id?: string;
  type: 'earn' | 'redeem' | 'expire' | 'adjust';
  points: number;
  points_after: number;
  notes?: string;
  created_at: string;
}

export type PromotionType =
  | 'percentage'
  | 'fixed_amount'
  | 'buy_x_get_y'
  | 'happy_hour'
  | 'tier_discount';

export interface Promotion {
  id: string;
  business_id: string;
  name: string;
  type: PromotionType;
  value: number;
  min_purchase?: number;
  max_discount?: number;
  start_time?: string;
  end_time?: string;
  days_of_week?: number[];
  applicable_tier?: LoyaltyTier;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: string;
  business_id: string;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_spend?: number;
  max_discount?: number;
  quota: number;
  used_count: number;
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface DiningTable {
  id: string;
  business_id: string;
  outlet_id: string;
  name: string;
  capacity: number;
  section: string;
  status: TableStatus;
  current_order_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  business_id: string;
  outlet_id: string;
  user_id: string;
  start_time: string;
  end_time?: string | null;
  opening_cash: number;
  expected_cash: number;
  actual_cash?: number | null;
  difference_cash?: number | null;
  total_sales_cash: number;
  total_sales_non_cash: number;
  total_refunds: number;
  total_cash_in: number;
  total_cash_out: number;
  status: 'open' | 'closed';
  notes?: string;
  created_at: string;
}

export interface CashMovement {
  id: string;
  shift_id: string;
  business_id: string;
  outlet_id: string;
  user_id: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  reason: string;
  created_at: string;
}

export type OrderType = 'retail' | 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus = 'pending' | 'hold' | 'processing' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type KitchenStatus = 'none' | 'queued' | 'preparing' | 'ready' | 'served';

export interface OrderItemModifier {
  modifier_id: string;
  modifier_name: string;
  option_id: string;
  option_name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  business_id: string;
  product_id: string;
  variant_id?: string | null;
  product_name: string;
  variant_name?: string | null;
  sku?: string;
  buy_price: number;
  unit_price: number;
  quantity: number;
  subtotal: number;
  discount_amount: number;
  final_price: number;
  notes?: string;
  modifiers: OrderItemModifier[];
  created_at: string;
}

export type PaymentMethod =
  | 'cash'
  | 'qris'
  | 'edc_debit'
  | 'edc_credit'
  | 'ewallet'
  | 'va'
  | 'points';

export interface Payment {
  id: string;
  order_id: string;
  business_id: string;
  outlet_id: string;
  shift_id?: string | null;
  method: PaymentMethod;
  amount: number;
  tender_amount?: number;
  change_amount?: number;
  reference_number?: string;
  gateway_provider?: string;
  gateway_status?: string;
  created_at: string;
}

export interface Order {
  id: string;
  business_id: string;
  outlet_id: string;
  shift_id?: string | null;
  user_id: string;
  customer_id?: string | null;
  dining_table_id?: string | null;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  discount_amount: number;
  discount_type?: 'percentage' | 'fixed' | null;
  promo_code?: string | null;
  tax_rate: number;
  tax_amount: number;
  service_charge_rate: number;
  service_charge_amount: number;
  rounding_amount: number;
  grand_total: number;
  paid_amount: number;
  change_amount: number;
  payment_method?: PaymentMethod | 'split' | null;
  notes?: string;
  void_reason?: string;
  voided_by?: string;
  refund_reason?: string;
  refunded_by?: string;
  idempotency_key?: string;
  kitchen_status?: KitchenStatus;
  queue_number?: number;
  items: OrderItem[];
  payments?: Payment[];
  created_at: string;
  updated_at: string;
}

export interface RefundItem {
  id: string;
  refund_id: string;
  order_item_id: string;
  quantity: number;
  refund_amount: number;
}

export interface Refund {
  id: string;
  order_id: string;
  business_id: string;
  outlet_id: string;
  shift_id?: string | null;
  approved_by?: string;
  reason: string;
  total_refund_amount: number;
  method: PaymentMethod;
  items?: RefundItem[];
  created_at: string;
}

export interface TaxSettings {
  id: string;
  business_id: string;
  ppn_percentage: number;
  is_ppn_enabled: boolean;
  is_tax_inclusive: boolean;
  service_charge_percentage: number;
  is_service_charge_enabled: boolean;
  rounding_unit: number; // e.g. 100
  allow_negative_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReceiptTemplate {
  id: string;
  business_id: string;
  outlet_id?: string | null;
  header_title: string;
  address_line1: string;
  address_line2: string;
  phone: string;
  footer_message: string;
  show_logo: boolean;
  show_tax_details: boolean;
  show_cashier_name: boolean;
  paper_width: 58 | 80;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  business_id: string;
  outlet_id?: string | null;
  user_id?: string | null;
  action: string;
  resource: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface SystemEvent {
  id: string;
  business_id: string;
  outlet_id?: string | null;
  event_type: 'order.created' | 'stock.low' | 'shift.closed' | 'order.voided' | 'order.refunded';
  payload: Record<string, unknown>;
  status: 'pending' | 'dispatched';
  created_at: string;
}

// In-Memory & Cart Types
export interface CartItem {
  id: string; // unique item cart key (handles same product with different modifiers)
  product_id: string;
  variant_id?: string | null;
  product_name: string;
  variant_name?: string | null;
  sku?: string;
  buy_price: number;
  unit_price: number;
  quantity: number;
  subtotal: number;
  item_discount: number; // per item nominal discount
  final_price: number;
  notes?: string;
  modifiers: OrderItemModifier[];
  track_stock: boolean;
  stock_quantity: number;
}
