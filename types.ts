export type Category = string;

export interface Unit {
  id: string;
  name: string;
  logoUrl: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
  lastOrder?: number;
}

export interface RecipeItem {
  ingredientId: string;
  amount: number;
}

// V12: AddOn Interface
export interface AddOn {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  allowObservations: boolean;
  recipe?: RecipeItem[];
  allowedAddOns?: string[]; // V12: List of AddOn IDs linked to this product
}

export interface CartItem extends Product {
  cartId: string;
  quantity: number;
  notes?: string;
  selectedAddOns?: AddOn[]; // V12: AddOns selected for this specific item
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minThreshold: number;
}

export type RecipeMap = Record<string, RecipeItem[]>;

export type OrderStatus = 'OPEN' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED' | 'ARCHIVED';
export type PaymentMethod = 'CREDIT' | 'DEBIT' | 'CASH' | 'PIX' | 'PENDING';
export type OrderType = 'DINE_IN' | 'DELIVERY';

export interface DeliveryDetails {
  customerName: string;
  phone: string;
  street: string;
  number: string;
  complement?: string; // V13
  neighborhood: string;
}

export interface Order {
  id: string;
  displayId: number;
  items: CartItem[];
  total: number;
  discount: number;

  status: OrderStatus;
  type: OrderType;

  isPaid: boolean;
  kitchenDismissed: boolean;

  deliveryDetails?: DeliveryDetails;
  paymentMethod: PaymentMethod;
  createdAt: number;
  assignedDriverId?: string;
  customerName?: string;
  tableName?: string;
  receivedAmount?: number;
  changeAmount?: number;
}

export interface Driver {
  id: string;
  name: string;
  deliveriesCount: number;
  commissionTotal: number;
  active: boolean;
  history?: number[];
}

export interface NeighborhoodFee {
  id: string;
  name: string;
  price: number;
}

export interface StoreSettings {
  name: string;
  logoUrl: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
}

export interface WasteLog {
  id: string;
  ingredientName: string;
  amount: number;
  unit: string;
  reason: string;
  date: number;
}

// Cash Flow Types
export interface CashTransaction {
  id: string;
  type: 'SUPPLY' | 'BLEED';
  amount: number;
  description: string;
  timestamp: number;
  userId: string;
}

export interface CashRegisterSession {
  id: string;
  openedAt: number;
  closedAt?: number;
  initialAmount: number;
  finalAmount?: number; // Declared by user
  calculatedAmount?: number; // System calculated (Initial + Sales - Bleeds + Supplies)

  transactions: CashTransaction[]; // Only Bleeds and Supplies. Sales are calculated from Orders.

  // Snapshots for history (Frozen on close)
  totalSales?: number;
  totalCardCredit?: number;
  totalCardDebit?: number;
  totalMoney?: number;
  totalPix?: number;

  status: 'OPEN' | 'CLOSED';
  closingNotes?: string;
  openedBy: string;
  closedBy?: string;
  referenceDate?: string; // YYYY-MM-DD for grouping
}

export interface DailyHistory {
  id: string; // date YYYY-MM-DD
  date: string;
  orders: Order[];
  metrics: {
    totalSales: number;
    totalOrders: number;
    averageTicket: number;
    paymentMethods: Record<PaymentMethod, number>;
  };
  cashSessions: CashRegisterSession[];
  drivers: Driver[]; // Snapshot of drivers performance
  closedAt: number;
  closedBy: string;
}