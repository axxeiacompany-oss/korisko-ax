export type Currency = 'BRL' | 'PYG' | 'USD';

export type AppLanguage = 'pt' | 'es';

export type UserRole = 'admin' | 'gerente' | 'caixa' | 'padeiro' | 'afiliado';

export type AppFeature = 
  | 'dashboard' 
  | 'pdv' 
  | 'venda_direta'
  | 'estoque' 
  | 'fichas_tecnicas'
  | 'crm'
  | 'caixa' 
  | 'mais_vendidos' 
  | 'metas' 
  | 'cambio' 
  | 'backup'
  | 'afiliados'
  | 'loja'
  | 'minha_conta'
  | 'portal_afiliado';

export interface ExchangeRates {
  BRL_TO_PYG: number; // e.g. 1380 PYG per 1 BRL
  USD_TO_BRL: number; // e.g. 5.65 BRL per 1 USD
  USD_TO_PYG: number; // e.g. 7800 PYG per 1 USD
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  avatarColor: string;
  email?: string;
  password?: string;
  allowedFeatures?: AppFeature[];
  createdAt?: string;
}

export type ProductCategory = 
  | 'paes'
  | 'confeitaria'
  | 'salgados'
  | 'bebidas'
  | 'frios'
  | 'ingredientes';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: ProductCategory;
  priceBrl: number;
  costPriceBrl: number;
  stock: number;
  minStock: number;
  unit: 'un' | 'kg' | 'g' | 'pct' | 'l';
  isIngredient?: boolean;
  expirationDate?: string; // YYYY-MM-DD
  barcode?: string;
  active: boolean;
  slug?: string;
  description?: string;
  compareAtPrice?: number;
  featured?: boolean;
  imageUrl?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'entrada' | 'saida_venda' | 'perda' | 'ajuste' | 'producao';
  quantity: number;
  unit: string;
  reason: string;
  employeeName: string;
  timestamp: string;
  previousStock: number;
  newStock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPriceBrl: number;
  subtotalBrl: number;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'fiado';

export interface PaymentEntry {
  id: string;
  currency: Currency;
  amountReceived: number; // In the specified currency (e.g. 100 USD or 50.000 PYG or 50 BRL)
  exchangeRateUsed: number; // exchange rate to BRL
  equivalentBrl: number;
  method: PaymentMethod;
}

export interface Comanda {
  id: string;
  number: string;
  customerName?: string;
  items: CartItem[];
  openedAt: string;
  openedBy: string;
  notes?: string;
}

export interface FornadaLog {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: 'un' | 'kg' | 'g' | 'pct' | 'l' | string;
  timestamp: string;
  bakerName: string;
  batchNumber?: string;
}

// -------------------------------------------------------------
// Ficha Técnica (Receitas & Custos de Produção)
// -------------------------------------------------------------
export interface RecipeIngredient {
  ingredientProductId: string; // Product id in inventory
  name: string;
  quantity: number;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'un' | 'pct';
  unitCostBrl: number;
  totalCostBrl: number;
}

export interface FichaTecnica {
  id: string;
  code: string; // FT-001
  name: string; // "Pão Francês Tradicional"
  category: ProductCategory;
  targetProductId?: string; // Product linked in inventory to update stock upon batch
  yieldQuantity: number; // Rendimento padrão por receita (ex: 50)
  yieldUnit: 'un' | 'kg';
  prepTimeMinutes: number; // Tempo de preparo/fermentação
  bakingTempCelsius?: number; // Temperatura forno (ex: 210°C)
  bakingTimeMinutes?: number; // Tempo de forno
  ingredients: RecipeIngredient[];
  additionalCostPercent: number; // Mão de obra, energia, gás (ex: 15%)
  totalIngredientsCostBrl: number;
  additionalCostBrl: number;
  totalRecipeCostBrl: number;
  costPerUnitBrl: number; // Custo unitário por unidade ou kg
  suggestedMarginPercent: number; // Margem desejada (ex: 180%)
  suggestedPriceBrl: number; // Preço sugerido
  instructions?: string; // Modo de preparo
  lastUpdated: string;
  active: boolean;
}

// -------------------------------------------------------------
// CRM & Gestão de Clientes
// -------------------------------------------------------------
export type CustomerCategory = 'varejo' | 'mensalista' | 'empresa' | 'confeitaria';

export interface Customer {
  id: string;
  name: string;
  phone: string; // WhatsApp
  email?: string;
  documentCpf?: string;
  address?: string;
  category: CustomerCategory;
  creditLimitBrl: number; // Limite para fiado / faturamento mensal
  outstandingBalanceBrl: number; // Saldo devedor em aberto
  loyaltyPoints: number; // Pontos de fidelidade
  birthday?: string; // DD/MM ou YYYY-MM-DD
  notes?: string;
  totalSpentBrl: number;
  purchaseCount: number;
  lastPurchaseDate?: string;
  createdAt: string;
}

export interface CustomerAccountEntry {
  id: string;
  customerId: string;
  date: string;
  type: 'debito_compra' | 'pagamento_amortizacao';
  amountBrl: number;
  description: string;
  paymentMethod?: string;
  resultingBalanceBrl?: number;
  runningBalanceBrl?: number;
  saleId?: string;
  recordedBy: string;
}

export interface LiveRateStatus {
  isFetching: boolean;
  lastFetchedAt: string | null;
  provider: string;
  autoRefresh: boolean;
  status: 'idle' | 'success' | 'error' | 'loading';
  errorMsg?: string;
}

export interface Sale {
  id: string;
  saleNumber: number;
  timestamp: string;
  employeeId: string;
  employeeName: string;
  items: CartItem[];
  subtotalBrl?: number;
  discountBrl?: number;
  totalBrl: number;
  payments: PaymentEntry[];
  changeGiven?: {
    currency: Currency;
    amount: number;
    equivalentBrl: number;
  };
  customerId?: string;
  customerName?: string;
  comandaNumber?: string;
  status: 'completed' | 'cancelled';
  registerSessionId: string;
}

export interface CashTransaction {
  id: string;
  type: 'sangria' | 'suprimento' | 'saida' | 'entrada';
  amount: number;
  currency: Currency;
  reason: string;
  category?: string;
  documentNumber?: string;
  timestamp: string;
  employeeName: string;
}

export interface CashRegisterSession {
  id: string;
  sessionNumber: number;
  status: 'aberto' | 'fechado';
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  initialFloat: {
    brl: number;
    pyg: number;
    usd: number;
  };
  transactions: CashTransaction[];
  countedOnClose?: {
    brl: number;
    pyg: number;
    usd: number;
  };
  closingNotes?: string;
}

export interface MonthlyGoal {
  month: string; // YYYY-MM
  targetRevenueBrl: number;
  targetDailyAverageBrl: number;
  targetTransactions: number;
  targetTicketMedioBrl: number;
}

export interface BackupPoint {
  id: string;
  timestamp: string;
  type: 'automatico' | 'manual';
  cloudSynced: boolean;
  sizeKb: number;
  summary: {
    productsCount: number;
    salesCount: number;
    registerStatus: string;
    totalRevenueBrl: number;
  };
}

export interface SystemBackupData {
  version: string;
  timestamp: string;
  products: Product[];
  stockMovements: StockMovement[];
  sales: Sale[];
  currentSession: CashRegisterSession;
  sessionHistory: CashRegisterSession[];
  exchangeRates: ExchangeRates;
  goals: MonthlyGoal[];
  employees: Employee[];
  openComandas?: Comanda[];
  fornadas?: FornadaLog[];
  fichasTecnicas?: FichaTecnica[];
  customers?: Customer[];
  customerEntries?: CustomerAccountEntry[];
}

// =============================================================
// PLATAFORMA INTEGRADA: AUTH, PERFIS, LOJA ONLINE E AFILIADOS
// =============================================================

export type ProfileRole = 'customer' | 'affiliate' | 'employee' | 'manager' | 'admin';

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: ProfileRole;
  status: 'active' | 'suspended' | 'pending';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  active: boolean;
  displayOrder: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string;
  name: string;
  price: number;
  attributes: Record<string, string>;
  active: boolean;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText?: string;
  displayOrder: number;
}

export interface CustomerAddress {
  id: string;
  customerId?: string;
  userId?: string;
  label?: string;
  recipientName: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  createdAt?: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  productVariantId?: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  userId?: string;
  affiliateId?: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponId?: string;
  shippingAddress: CustomerAddress;
  notes?: string;
  items?: OrderItem[];
  payments?: OrderPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  method: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  amount: number;
  transactionId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Affiliate {
  id: string;
  userId: string;
  affiliateCode: string;
  status: 'active' | 'pending' | 'inactive';
  commissionRate: number; // Ex: 10 (%)
  clicksCount: number;
  pixKey?: string;
  bankInfo?: {
    bankName?: string;
    accountType?: string;
    accountNumber?: string;
    holderName?: string;
  };
  totalEarnings?: number;
  pendingEarnings?: number;
  approvedEarnings?: number;
  paidEarnings?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Commission {
  id: string;
  affiliateId: string;
  orderId: string;
  amount: number;
  rate: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  orderNumber?: string;
  orderTotal?: number;
  createdAt: string;
  paidAt?: string;
}

export interface Deal {
  id: string;
  customerId: string;
  assignedTo?: string;
  title: string;
  value: number;
  stage: 'lead' | 'contato' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';
  source?: string;
  expectedCloseDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  authorId?: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  customerId?: string;
  dealId?: string;
  userId?: string;
  type: 'ligacao' | 'whatsapp' | 'reuniao' | 'email' | 'nota';
  description: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

export interface StoreCartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
