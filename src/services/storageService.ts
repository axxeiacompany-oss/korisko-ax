import { 
  Product, 
  Sale, 
  CashRegisterSession, 
  ExchangeRates, 
  MonthlyGoal, 
  Employee, 
  StockMovement, 
  BackupPoint, 
  SystemBackupData,
  Comanda,
  FornadaLog,
  FichaTecnica,
  Customer,
  CustomerAccountEntry
} from '../types';
import { DEFAULT_EXCHANGE_RATES } from '../utils/currency';

const DB_KEY = 'KORISKO_STATE_V1';
const LEGACY_DB_KEY = 'PANETTIERE_STATE_V1';
const BACKUPS_KEY = 'KORISKO_BACKUP_POINTS_V1';
const LEGACY_BACKUPS_KEY = 'PANETTIERE_BACKUP_POINTS_V1';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-admin-ax',
    name: 'Ax',
    role: 'admin',
    pin: '9APG_47z-EgF4yz',
    avatarColor: 'bg-indigo-600',
    email: 'axxeiacompany@gmail.com',
    password: '9APG_47z-EgF4yz',
    allowedFeatures: [
      'dashboard', 
      'pdv', 
      'venda_direta',
      'estoque', 
      'fichas_tecnicas', 
      'crm', 
      'caixa', 
      'mais_vendidos', 
      'metas', 
      'cambio', 
      'backup', 
      'afiliados'
    ],
  },
  {
    id: 'emp-1',
    name: 'Roberto Silveira',
    role: 'admin',
    pin: '1234',
    avatarColor: 'bg-amber-600',
    email: 'roberto@korisko.com.br',
    password: '1234',
  },
  {
    id: 'emp-2',
    name: 'Luciana Mendes',
    role: 'gerente',
    pin: '5678',
    avatarColor: 'bg-emerald-600',
    email: 'luciana@korisko.com.br',
    password: '5678',
  },
  {
    id: 'emp-3',
    name: 'Carlos Eduardo',
    role: 'caixa',
    pin: '1111',
    avatarColor: 'bg-blue-600',
    email: 'carlos.caixa@korisko.com.br',
    password: '1111',
    allowedFeatures: ['dashboard', 'pdv', 'venda_direta', 'crm'],
  },
  {
    id: 'emp-4',
    name: 'Seu Zé Padeiro',
    role: 'padeiro',
    pin: '2222',
    avatarColor: 'bg-orange-600',
    email: 'ze.padeiro@korisko.com.br',
    password: '2222',
    allowedFeatures: ['dashboard', 'fichas_tecnicas', 'estoque'],
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    code: 'PAO-001',
    name: 'Pão Francês Tradicional',
    category: 'paes',
    priceBrl: 18.90, // por kg
    costPriceBrl: 6.50,
    stock: 42.5,
    minStock: 15.0,
    unit: 'kg',
    expirationDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    active: true,
  },
  {
    id: 'prod-2',
    code: 'PAO-002',
    name: 'Pão de Queijo Mineiro',
    category: 'salgados',
    priceBrl: 54.00, // por kg
    costPriceBrl: 22.00,
    stock: 18.0,
    minStock: 8.0,
    unit: 'kg',
    active: true,
  },
  {
    id: 'prod-3',
    code: 'PAO-003',
    name: 'Baguete Artesanal de Fermentação Natural',
    category: 'paes',
    priceBrl: 14.50,
    costPriceBrl: 4.80,
    stock: 24,
    minStock: 10,
    unit: 'un',
    active: true,
  },
  {
    id: 'prod-4',
    code: 'CONF-001',
    name: 'Sonho Recheado de Doce de Leite',
    category: 'confeitaria',
    priceBrl: 8.50,
    costPriceBrl: 3.20,
    stock: 19,
    minStock: 12,
    unit: 'un',
    expirationDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    active: true,
  },
  {
    id: 'prod-5',
    code: 'CONF-002',
    name: 'Bolo Caseiro de Cenoura com Chocolate',
    category: 'confeitaria',
    priceBrl: 36.00,
    costPriceBrl: 12.50,
    stock: 7,
    minStock: 4,
    unit: 'un',
    active: true,
  },
  {
    id: 'prod-6',
    code: 'SALG-001',
    name: 'Chipa Tradicional Paraguaia',
    category: 'salgados',
    priceBrl: 6.00,
    costPriceBrl: 2.10,
    stock: 35,
    minStock: 15,
    unit: 'un',
    active: true,
  },
  {
    id: 'prod-7',
    code: 'SALG-002',
    name: 'Croissant de Manteiga Folhado',
    category: 'paes',
    priceBrl: 12.00,
    costPriceBrl: 4.50,
    stock: 16,
    minStock: 10,
    unit: 'un',
    active: true,
  },
  {
    id: 'prod-8',
    code: 'SALG-003',
    name: 'Coxinha Gourmet de Frango com Catupiry',
    category: 'salgados',
    priceBrl: 9.50,
    costPriceBrl: 3.80,
    stock: 28,
    minStock: 12,
    unit: 'un',
    active: true,
  },
  {
    id: 'prod-9',
    code: 'BEB-001',
    name: 'Café Expresso Especial Italiano',
    category: 'bebidas',
    priceBrl: 7.00,
    costPriceBrl: 1.80,
    stock: 150,
    minStock: 30,
    unit: 'un',
    active: true,
  },
  {
    id: 'prod-10',
    code: 'BEB-002',
    name: 'Cappuccino Cremoso com Canela',
    category: 'bebidas',
    priceBrl: 11.50,
    costPriceBrl: 3.50,
    stock: 90,
    minStock: 25,
    unit: 'un',
    active: true,
  },
  {
    id: 'prod-11',
    code: 'BEB-003',
    name: 'Suco Natural de Laranja 500ml',
    category: 'bebidas',
    priceBrl: 10.00,
    costPriceBrl: 3.20,
    stock: 22,
    minStock: 10,
    unit: 'un',
    active: true,
  },
  {
    id: 'prod-12',
    code: 'FRIO-001',
    name: 'Queijo Mussarela Fatiado',
    category: 'frios',
    priceBrl: 58.00,
    costPriceBrl: 34.00,
    stock: 8.5,
    minStock: 5.0,
    unit: 'kg',
    expirationDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    active: true,
  },
  {
    id: 'prod-13',
    code: 'FRIO-002',
    name: 'Presunto Cozido Especial Fatiado',
    category: 'frios',
    priceBrl: 46.00,
    costPriceBrl: 26.00,
    stock: 6.2,
    minStock: 4.0,
    unit: 'kg',
    expirationDate: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
    active: true,
  },
  {
    id: 'prod-14',
    code: 'INGR-001',
    name: 'Farinha de Trigo Especial Tipo 1 (Saco 25kg)',
    category: 'ingredientes',
    priceBrl: 115.00,
    costPriceBrl: 95.00,
    stock: 14,
    minStock: 6,
    unit: 'pct',
    isIngredient: true,
    active: true,
  },
  {
    id: 'prod-15',
    code: 'INGR-002',
    name: 'Fermento Biológico Fresco (Bloco 500g)',
    category: 'ingredientes',
    priceBrl: 12.00,
    costPriceBrl: 8.50,
    stock: 18,
    minStock: 8,
    unit: 'un',
    isIngredient: true,
    expirationDate: new Date(Date.now() + 86400000 * 8).toISOString().split('T')[0],
    active: true,
  },
  {
    id: 'prod-16',
    code: 'INGR-003',
    name: 'Manteiga Extra sem Sal Artesanal (kg)',
    category: 'ingredientes',
    priceBrl: 42.00,
    costPriceBrl: 31.50,
    stock: 16.0,
    minStock: 5.0,
    unit: 'kg',
    isIngredient: true,
    active: true,
  },
  {
    id: 'prod-17',
    code: 'INGR-004',
    name: 'Polvilho Azedo Especial (kg)',
    category: 'ingredientes',
    priceBrl: 14.00,
    costPriceBrl: 8.90,
    stock: 45.0,
    minStock: 15.0,
    unit: 'kg',
    isIngredient: true,
    active: true,
  },
  {
    id: 'prod-18',
    code: 'INGR-005',
    name: 'Queijo Meia Cura Ralado Artesanal (kg)',
    category: 'ingredientes',
    priceBrl: 48.00,
    costPriceBrl: 34.00,
    stock: 22.0,
    minStock: 8.0,
    unit: 'kg',
    isIngredient: true,
    active: true,
  },
  {
    id: 'prod-19',
    code: 'INGR-006',
    name: 'Açúcar Cristal Especial (kg)',
    category: 'ingredientes',
    priceBrl: 6.50,
    costPriceBrl: 4.20,
    stock: 60.0,
    minStock: 20.0,
    unit: 'kg',
    isIngredient: true,
    active: true,
  },
  {
    id: 'prod-20',
    code: 'INGR-007',
    name: 'Ovos Brancos Selecionados (unidade)',
    category: 'ingredientes',
    priceBrl: 1.20,
    costPriceBrl: 0.70,
    stock: 240,
    minStock: 60,
    unit: 'un',
    isIngredient: true,
    active: true,
  },
  {
    id: 'prod-21',
    code: 'INGR-008',
    name: 'Leite Integral Pasteurizado (L)',
    category: 'ingredientes',
    priceBrl: 6.80,
    costPriceBrl: 4.60,
    stock: 48.0,
    minStock: 15.0,
    unit: 'l',
    isIngredient: true,
    active: true,
  },
  {
    id: 'prod-22',
    code: 'INGR-009',
    name: 'Sal Refinado Iodado (kg)',
    category: 'ingredientes',
    priceBrl: 3.50,
    costPriceBrl: 2.10,
    stock: 30.0,
    minStock: 10.0,
    unit: 'kg',
    isIngredient: true,
    active: true,
  },
  {
    id: 'prod-23',
    code: 'INGR-010',
    name: 'Cenoura In Natura Selecionada (kg)',
    category: 'ingredientes',
    priceBrl: 7.90,
    costPriceBrl: 4.50,
    stock: 15.0,
    minStock: 5.0,
    unit: 'kg',
    isIngredient: true,
    active: true,
  },
  {
    id: 'prod-24',
    code: 'INGR-011',
    name: 'Chocolate Nobre Meio Amargo (kg)',
    category: 'ingredientes',
    priceBrl: 46.00,
    costPriceBrl: 32.00,
    stock: 12.0,
    minStock: 4.0,
    unit: 'kg',
    isIngredient: true,
    active: true,
  },
  {
    id: 'prod-25',
    code: 'INGR-012',
    name: 'Óleo de Girassol / Soja (L)',
    category: 'ingredientes',
    priceBrl: 9.50,
    costPriceBrl: 6.80,
    stock: 25.0,
    minStock: 8.0,
    unit: 'l',
    isIngredient: true,
    active: true,
  },
];

// Seed realistic multi-currency sales history
function generateInitialSales(): Sale[] {
  const sales: Sale[] = [];
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Create sales across the last 15 days
  const baseRates = DEFAULT_EXCHANGE_RATES;
  
  const sampleTransactions = [
    {
      dayOffset: 0,
      hour: 7,
      minute: 24,
      items: [
        { prodIndex: 0, qty: 0.8 }, // Pao frances
        { prodIndex: 8, qty: 2 },   // Cafe expresso
      ],
      paymentCur: 'BRL',
      method: 'dinheiro' as const,
    },
    {
      dayOffset: 0,
      hour: 8,
      minute: 15,
      items: [
        { prodIndex: 1, qty: 0.4 }, // Pao de queijo
        { prodIndex: 9, qty: 1 },   // Cappuccino
        { prodIndex: 5, qty: 3 },   // Chipa
      ],
      paymentCur: 'PYG', // Paid in Guaranis!
      method: 'dinheiro' as const,
    },
    {
      dayOffset: 0,
      hour: 9,
      minute: 40,
      items: [
        { prodIndex: 6, qty: 2 }, // Croissant
        { prodIndex: 10, qty: 1 }, // Suco laranja
      ],
      paymentCur: 'USD', // Paid in US Dollars!
      method: 'dinheiro' as const,
    },
    {
      dayOffset: 0,
      hour: 11,
      minute: 10,
      items: [
        { prodIndex: 4, qty: 1 }, // Bolo cenoura
        { prodIndex: 7, qty: 2 }, // Coxinha
      ],
      paymentCur: 'BRL',
      method: 'pix' as const,
    },
    {
      dayOffset: 1,
      hour: 7,
      minute: 50,
      items: [
        { prodIndex: 0, qty: 1.2 },
        { prodIndex: 11, qty: 0.3 },
        { prodIndex: 12, qty: 0.3 },
      ],
      paymentCur: 'BRL',
      method: 'cartao_debito' as const,
    },
    {
      dayOffset: 1,
      hour: 15,
      minute: 20,
      items: [
        { prodIndex: 3, qty: 4 }, // Sonhos
        { prodIndex: 8, qty: 2 }, // Cafe
      ],
      paymentCur: 'PYG',
      method: 'dinheiro' as const,
    },
    {
      dayOffset: 2,
      hour: 8,
      minute: 30,
      items: [
        { prodIndex: 2, qty: 2 }, // Baguete
        { prodIndex: 5, qty: 4 }, // Chipa
      ],
      paymentCur: 'USD',
      method: 'dinheiro' as const,
    },
    {
      dayOffset: 3,
      hour: 16,
      minute: 45,
      items: [
        { prodIndex: 0, qty: 1.5 },
        { prodIndex: 4, qty: 1 },
      ],
      paymentCur: 'BRL',
      method: 'pix' as const,
    },
    {
      dayOffset: 4,
      hour: 10,
      minute: 12,
      items: [
        { prodIndex: 7, qty: 4 },
        { prodIndex: 10, qty: 2 },
      ],
      paymentCur: 'PYG',
      method: 'dinheiro' as const,
    },
    {
      dayOffset: 5,
      hour: 8,
      minute: 5,
      items: [
        { prodIndex: 0, qty: 2.0 },
        { prodIndex: 1, qty: 0.5 },
      ],
      paymentCur: 'BRL',
      method: 'dinheiro' as const,
    },
    {
      dayOffset: 6,
      hour: 17,
      minute: 30,
      items: [
        { prodIndex: 6, qty: 3 },
        { prodIndex: 9, qty: 2 },
      ],
      paymentCur: 'USD',
      method: 'cartao_credito' as const,
    },
  ];

  sampleTransactions.forEach((tx, idx) => {
    const d = new Date(now);
    d.setDate(d.getDate() - tx.dayOffset);
    d.setHours(tx.hour, tx.minute, 0, 0);

    const items = tx.items.map(it => {
      const prod = INITIAL_PRODUCTS[it.prodIndex];
      const subtotal = Math.round(prod.priceBrl * it.qty * 100) / 100;
      return {
        product: prod,
        quantity: it.qty,
        unitPriceBrl: prod.priceBrl,
        subtotalBrl: subtotal,
      };
    });

    const totalBrl = items.reduce((sum, item) => sum + item.subtotalBrl, 0);
    
    // Calculate currency payment
    let amountReceived = totalBrl;
    let exchangeRateUsed = 1;
    if (tx.paymentCur === 'PYG') {
      exchangeRateUsed = 1 / baseRates.BRL_TO_PYG;
      amountReceived = Math.round(totalBrl * baseRates.BRL_TO_PYG);
    } else if (tx.paymentCur === 'USD') {
      exchangeRateUsed = baseRates.USD_TO_BRL;
      amountReceived = Math.round((totalBrl / baseRates.USD_TO_BRL) * 100) / 100;
    }

    sales.push({
      id: `sale-hist-${idx + 1}`,
      saleNumber: 1000 + idx + 1,
      timestamp: d.toISOString(),
      employeeId: idx % 2 === 0 ? 'emp-3' : 'emp-2',
      employeeName: idx % 2 === 0 ? 'Carlos Eduardo' : 'Luciana Mendes',
      items,
      totalBrl: Math.round(totalBrl * 100) / 100,
      payments: [
        {
          id: `pay-${idx + 1}`,
          currency: tx.paymentCur as any,
          amountReceived,
          exchangeRateUsed,
          equivalentBrl: totalBrl,
          method: tx.method,
        },
      ],
      status: 'completed',
      registerSessionId: 'session-curr-1',
    });
  });

  return sales;
}

export const INITIAL_CASH_SESSION: CashRegisterSession = {
  id: 'session-curr-1',
  sessionNumber: 142,
  status: 'aberto',
  openedAt: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(),
  openedBy: 'Carlos Eduardo',
  initialFloat: {
    brl: 350.00,   // R$ 350 em troco
    pyg: 500000,   // ₲ 500.000 em troco
    usd: 50.00,    // $ 50 em notas de troco
  },
  transactions: [
    {
      id: 'tx-1',
      type: 'suprimento',
      amount: 100.00,
      currency: 'BRL',
      reason: 'Reforço de moedas e notas de R$ 5 para troco',
      timestamp: new Date(new Date().setHours(8, 30, 0, 0)).toISOString(),
      employeeName: 'Luciana Mendes',
    },
    {
      id: 'tx-2',
      type: 'sangria',
      amount: 200.00,
      currency: 'BRL',
      reason: 'Sangria de segurança para cofre',
      timestamp: new Date(new Date().setHours(13, 0, 0, 0)).toISOString(),
      employeeName: 'Luciana Mendes',
    }
  ],
};

export const INITIAL_GOALS: MonthlyGoal[] = [
  {
    month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    targetRevenueBrl: 85000.00,
    targetDailyAverageBrl: 2833.00,
    targetTransactions: 3200,
    targetTicketMedioBrl: 26.50,
  },
  {
    month: `${new Date().getFullYear()}-${String(new Date().getMonth()).padStart(2, '0')}`,
    targetRevenueBrl: 80000.00,
    targetDailyAverageBrl: 2666.00,
    targetTransactions: 3000,
    targetTicketMedioBrl: 25.00,
  }
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    productId: 'prod-1',
    productName: 'Pão Francês Tradicional',
    type: 'producao',
    quantity: 50,
    unit: 'kg',
    reason: 'Fornada matinal das 06:00',
    employeeName: 'Seu Zé Padeiro',
    timestamp: new Date(new Date().setHours(6, 15, 0, 0)).toISOString(),
    previousStock: 2.5,
    newStock: 52.5,
  },
  {
    id: 'mov-2',
    productId: 'prod-14',
    productName: 'Farinha de Trigo Especial Tipo 1',
    type: 'saida_venda',
    quantity: 2,
    unit: 'pct',
    reason: 'Consumo na masseira da produção matinal',
    employeeName: 'Seu Zé Padeiro',
    timestamp: new Date(new Date().setHours(5, 45, 0, 0)).toISOString(),
    previousStock: 16,
    newStock: 14,
  },
  {
    id: 'mov-3',
    productId: 'prod-4',
    productName: 'Sonho Recheado de Doce de Leite',
    type: 'entrada',
    quantity: 25,
    unit: 'un',
    reason: 'Produção fresca confeitaria',
    employeeName: 'Luciana Mendes',
    timestamp: new Date(new Date().setHours(7, 30, 0, 0)).toISOString(),
    previousStock: 0,
    newStock: 25,
  }
];

export const INITIAL_COMANDAS: Comanda[] = [
  {
    id: 'cmd-01',
    number: '05',
    customerName: 'Dra. Vanessa',
    openedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    openedBy: 'Carlos Eduardo',
    notes: 'Mesa 3 / Janela',
    items: [
      {
        product: INITIAL_PRODUCTS[5],
        quantity: 2,
        unitPriceBrl: 6.50,
        subtotalBrl: 13.00,
      },
      {
        product: INITIAL_PRODUCTS[2],
        quantity: 4,
        unitPriceBrl: 4.50,
        subtotalBrl: 18.00,
      },
    ],
  },
  {
    id: 'cmd-02',
    number: '12',
    customerName: 'Seu Marcos (Balcão)',
    openedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    openedBy: 'Luciana Mendes',
    notes: 'Aguardando pão doce',
    items: [
      {
        product: INITIAL_PRODUCTS[3],
        quantity: 1,
        unitPriceBrl: 8.90,
        subtotalBrl: 8.90,
      },
      {
        product: INITIAL_PRODUCTS[7],
        quantity: 1,
        unitPriceBrl: 9.00,
        subtotalBrl: 9.00,
      },
    ],
  },
];

export const INITIAL_FORNADAS: FornadaLog[] = [
  {
    id: 'forn-1',
    productId: 'prod-1',
    productName: 'Pão Francês Tradicional',
    quantity: 120,
    unit: 'un',
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
    bakerName: 'Seu Zé Padeiro',
    batchNumber: 'F-0801',
  },
  {
    id: 'forn-2',
    productId: 'prod-3',
    productName: 'Pão de Queijo Mineiro',
    quantity: 60,
    unit: 'un',
    timestamp: new Date(Date.now() - 75 * 60000).toISOString(),
    bakerName: 'Seu Zé Padeiro',
    batchNumber: 'F-0802',
  },
];

export const INITIAL_FICHAS_TECNICAS: FichaTecnica[] = [
  {
    id: 'ft-1',
    code: 'FT-001',
    name: 'Pão Francês Tradicional Crocante',
    category: 'paes',
    targetProductId: 'prod-1',
    yieldQuantity: 60,
    yieldUnit: 'un',
    prepTimeMinutes: 140,
    bakingTempCelsius: 220,
    bakingTimeMinutes: 18,
    ingredients: [
      {
        ingredientProductId: 'prod-14',
        name: 'Farinha de Trigo Especial Tipo 1',
        quantity: 2.0,
        unit: 'kg',
        unitCostBrl: 3.80,
        totalCostBrl: 7.60,
      },
      {
        ingredientProductId: 'prod-15',
        name: 'Fermento Biológico Fresco',
        quantity: 0.08,
        unit: 'kg',
        unitCostBrl: 17.00,
        totalCostBrl: 1.36,
      },
      {
        ingredientProductId: 'prod-22',
        name: 'Sal Refinado Iodado',
        quantity: 0.04,
        unit: 'kg',
        unitCostBrl: 2.10,
        totalCostBrl: 0.08,
      },
      {
        ingredientProductId: 'prod-19',
        name: 'Açúcar Cristal (Reforço)',
        quantity: 0.02,
        unit: 'kg',
        unitCostBrl: 4.20,
        totalCostBrl: 0.08,
      },
    ],
    additionalCostPercent: 15,
    totalIngredientsCostBrl: 9.12,
    additionalCostBrl: 1.37,
    totalRecipeCostBrl: 10.49,
    costPerUnitBrl: 0.17,
    suggestedMarginPercent: 160,
    suggestedPriceBrl: 0.45,
    instructions: '1. Bater farinha com 60% de água gelada por 5 min na masseira lenta.\n2. Adicionar o sal e o açúcar. Bater em velocidade rápida até ponto de véu.\n3. Incorporar o fermento fresco nos últimos 2 minutos.\n4. Dividir em porções de 65g, bolear e descansar 15 min.\n5. Modelar, fermentar na câmara por 1h40 a 28°C.\n6. Cortar pestana e assar a 220°C com 10s de vapor inicial por 18 min.',
    lastUpdated: new Date().toISOString(),
    active: true,
  },
  {
    id: 'ft-2',
    code: 'FT-002',
    name: 'Pão de Queijo Mineiro Artesanal',
    category: 'salgados',
    targetProductId: 'prod-2',
    yieldQuantity: 40,
    yieldUnit: 'un',
    prepTimeMinutes: 45,
    bakingTempCelsius: 190,
    bakingTimeMinutes: 25,
    ingredients: [
      {
        ingredientProductId: 'prod-17',
        name: 'Polvilho Azedo Especial',
        quantity: 0.8,
        unit: 'kg',
        unitCostBrl: 8.90,
        totalCostBrl: 7.12,
      },
      {
        ingredientProductId: 'prod-18',
        name: 'Queijo Meia Cura Ralado Artesanal',
        quantity: 0.6,
        unit: 'kg',
        unitCostBrl: 34.00,
        totalCostBrl: 20.40,
      },
      {
        ingredientProductId: 'prod-21',
        name: 'Leite Integral Pasteurizado',
        quantity: 0.3,
        unit: 'l',
        unitCostBrl: 4.60,
        totalCostBrl: 1.38,
      },
      {
        ingredientProductId: 'prod-25',
        name: 'Óleo de Girassol / Soja',
        quantity: 0.15,
        unit: 'l',
        unitCostBrl: 6.80,
        totalCostBrl: 1.02,
      },
      {
        ingredientProductId: 'prod-20',
        name: 'Ovos Brancos Selecionados',
        quantity: 4,
        unit: 'un',
        unitCostBrl: 0.70,
        totalCostBrl: 2.80,
      },
      {
        ingredientProductId: 'prod-22',
        name: 'Sal Refinado Iodado',
        quantity: 0.015,
        unit: 'kg',
        unitCostBrl: 2.10,
        totalCostBrl: 0.03,
      },
    ],
    additionalCostPercent: 12,
    totalIngredientsCostBrl: 32.75,
    additionalCostBrl: 3.93,
    totalRecipeCostBrl: 36.68,
    costPerUnitBrl: 0.92,
    suggestedMarginPercent: 150,
    suggestedPriceBrl: 2.30,
    instructions: '1. Escaldar o polvilho com a mistura fervente de leite, óleo e sal.\n2. Misturar com a pá até amornar.\n3. Adicionar os ovos um a um até absorção.\n4. Incorporar o queijo meia cura artesanal ralado sem bater excessivamente.\n5. Modelar bolinhas de 40g e congelar ou assar direto a 190°C por 25 min até dourar.',
    lastUpdated: new Date().toISOString(),
    active: true,
  },
  {
    id: 'ft-3',
    code: 'FT-003',
    name: 'Croissant Folhado Francês de Manteiga',
    category: 'paes',
    targetProductId: 'prod-7',
    yieldQuantity: 24,
    yieldUnit: 'un',
    prepTimeMinutes: 240,
    bakingTempCelsius: 195,
    bakingTimeMinutes: 20,
    ingredients: [
      {
        ingredientProductId: 'prod-14',
        name: 'Farinha de Trigo Especial',
        quantity: 1.2,
        unit: 'kg',
        unitCostBrl: 3.80,
        totalCostBrl: 4.56,
      },
      {
        ingredientProductId: 'prod-16',
        name: 'Manteiga Extra sem Sal (Folhagem)',
        quantity: 0.6,
        unit: 'kg',
        unitCostBrl: 31.50,
        totalCostBrl: 18.90,
      },
      {
        ingredientProductId: 'prod-19',
        name: 'Açúcar Cristal',
        quantity: 0.12,
        unit: 'kg',
        unitCostBrl: 4.20,
        totalCostBrl: 0.50,
      },
      {
        ingredientProductId: 'prod-21',
        name: 'Leite Integral',
        quantity: 0.4,
        unit: 'l',
        unitCostBrl: 4.60,
        totalCostBrl: 1.84,
      },
      {
        ingredientProductId: 'prod-15',
        name: 'Fermento Biológico',
        quantity: 0.05,
        unit: 'kg',
        unitCostBrl: 17.00,
        totalCostBrl: 0.85,
      },
      {
        ingredientProductId: 'prod-20',
        name: 'Ovos (Egg wash / Pincelar)',
        quantity: 1,
        unit: 'un',
        unitCostBrl: 0.70,
        totalCostBrl: 0.70,
      },
    ],
    additionalCostPercent: 18,
    totalIngredientsCostBrl: 27.35,
    additionalCostBrl: 4.92,
    totalRecipeCostBrl: 32.27,
    costPerUnitBrl: 1.34,
    suggestedMarginPercent: 200,
    suggestedPriceBrl: 4.20,
    instructions: '1. Fazer o détrempe com farinha, leite, fermento e açúcar. Descansar refrigerado 4h.\n2. Abrir a manteiga em bloco quadrado frio.\n3. Envelopar e dar 3 dobras simples com descanso de 40 min em geladeira entre cada volta.\n4. Cortar triângulos de 10x25cm, enrolar e fermentar 2h a 24°C.\n5. Pincelar com gema e assar a 195°C por 20 min.',
    lastUpdated: new Date().toISOString(),
    active: true,
  },
  {
    id: 'ft-4',
    code: 'FT-004',
    name: 'Bolo Caseiro de Cenoura com Calda de Chocolate',
    category: 'confeitaria',
    targetProductId: 'prod-5',
    yieldQuantity: 3,
    yieldUnit: 'un',
    prepTimeMinutes: 60,
    bakingTempCelsius: 180,
    bakingTimeMinutes: 40,
    ingredients: [
      {
        ingredientProductId: 'prod-23',
        name: 'Cenoura In Natura Selecionada',
        quantity: 0.75,
        unit: 'kg',
        unitCostBrl: 4.50,
        totalCostBrl: 3.38,
      },
      {
        ingredientProductId: 'prod-20',
        name: 'Ovos Brancos',
        quantity: 9,
        unit: 'un',
        unitCostBrl: 0.70,
        totalCostBrl: 6.30,
      },
      {
        ingredientProductId: 'prod-25',
        name: 'Óleo de Girassol',
        quantity: 0.6,
        unit: 'l',
        unitCostBrl: 6.80,
        totalCostBrl: 4.08,
      },
      {
        ingredientProductId: 'prod-19',
        name: 'Açúcar Cristal',
        quantity: 0.9,
        unit: 'kg',
        unitCostBrl: 4.20,
        totalCostBrl: 3.78,
      },
      {
        ingredientProductId: 'prod-14',
        name: 'Farinha de Trigo Especial',
        quantity: 0.8,
        unit: 'kg',
        unitCostBrl: 3.80,
        totalCostBrl: 3.04,
      },
      {
        ingredientProductId: 'prod-24',
        name: 'Chocolate Nobre Meio Amargo (Calda)',
        quantity: 0.45,
        unit: 'kg',
        unitCostBrl: 32.00,
        totalCostBrl: 14.40,
      },
    ],
    additionalCostPercent: 15,
    totalIngredientsCostBrl: 34.98,
    additionalCostBrl: 5.25,
    totalRecipeCostBrl: 40.23,
    costPerUnitBrl: 13.41,
    suggestedMarginPercent: 170,
    suggestedPriceBrl: 36.00,
    instructions: '1. Bater as cenouras raladas, óleo, ovos e açúcar no liquidificador por 4 min.\n2. Verter na bacia e incorporar a farinha peneirada delicadamente.\n3. Colocar nas formas untadas e assar a 180°C por 40 min.\n4. Fazer a calda de chocolate e cobrir ainda quente.',
    lastUpdated: new Date().toISOString(),
    active: true,
  },
  {
    id: 'ft-5',
    code: 'FT-005',
    name: 'Chipa Tradicional Paraguaia',
    category: 'salgados',
    targetProductId: 'prod-6',
    yieldQuantity: 30,
    yieldUnit: 'un',
    prepTimeMinutes: 40,
    bakingTempCelsius: 200,
    bakingTimeMinutes: 18,
    ingredients: [
      {
        ingredientProductId: 'prod-17',
        name: 'Polvilho Azedo',
        quantity: 0.7,
        unit: 'kg',
        unitCostBrl: 8.90,
        totalCostBrl: 6.23,
      },
      {
        ingredientProductId: 'prod-18',
        name: 'Queijo Meia Cura Artesanal',
        quantity: 0.45,
        unit: 'kg',
        unitCostBrl: 34.00,
        totalCostBrl: 15.30,
      },
      {
        ingredientProductId: 'prod-16',
        name: 'Manteiga Extra sem Sal',
        quantity: 0.15,
        unit: 'kg',
        unitCostBrl: 31.50,
        totalCostBrl: 4.73,
      },
      {
        ingredientProductId: 'prod-20',
        name: 'Ovos Brancos',
        quantity: 3,
        unit: 'un',
        unitCostBrl: 0.70,
        totalCostBrl: 2.10,
      },
      {
        ingredientProductId: 'prod-21',
        name: 'Leite Integral',
        quantity: 0.1,
        unit: 'l',
        unitCostBrl: 4.60,
        totalCostBrl: 0.46,
      },
    ],
    additionalCostPercent: 12,
    totalIngredientsCostBrl: 28.82,
    additionalCostBrl: 3.46,
    totalRecipeCostBrl: 32.28,
    costPerUnitBrl: 1.08,
    suggestedMarginPercent: 160,
    suggestedPriceBrl: 2.80,
    instructions: '1. Bater manteiga com ovos até creme.\n2. Adicionar queijo ralado e incorporar polvilho azedo com leite até massa homogênea.\n3. Formatar ferraduras de 45g.\n4. Assar a 200°C por 18 min até dourar.',
    lastUpdated: new Date().toISOString(),
    active: true,
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Carlos Drummond da Silva',
    phone: '+55 45 99123-4567',
    email: 'carlos.drummond@gmail.com',
    documentCpf: '012.345.678-90',
    address: 'Av. Brasil, 420 - Centro',
    category: 'mensalista',
    creditLimitBrl: 600.00,
    outstandingBalanceBrl: 145.50,
    loyaltyPoints: 480,
    birthday: '15/04',
    notes: 'Paga todo dia 10. Sempre leva 6 pães franceses pela manhã.',
    totalSpentBrl: 1840.00,
    purchaseCount: 38,
    lastPurchaseDate: new Date(Date.now() - 24 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'cust-2',
    name: 'Mariana Duarte Souza',
    phone: '+55 45 99876-5432',
    email: 'mariana.duarte@hotmail.com',
    documentCpf: '321.654.987-11',
    address: 'Rua das Flores, 88 - Vila Nova',
    category: 'confeitaria',
    creditLimitBrl: 300.00,
    outstandingBalanceBrl: 0,
    loyaltyPoints: 1250,
    birthday: '28/09',
    notes: 'Encomenda bolos e tortas com frequência. Aniversariante do mês!',
    totalSpentBrl: 2450.00,
    purchaseCount: 22,
    lastPurchaseDate: new Date(Date.now() - 48 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
  {
    id: 'cust-3',
    name: 'Escritório Fronteira Contabilidade',
    phone: '+55 45 3522-8899',
    email: 'financeiro@fronteiracontabil.com.br',
    documentCpf: '14.882.910/0001-44',
    address: 'Rua Jorge Sanwais, 1200 - Sl 402',
    category: 'empresa',
    creditLimitBrl: 1500.00,
    outstandingBalanceBrl: 420.00,
    loyaltyPoints: 2100,
    birthday: '10/11',
    notes: 'Coffee break diário às 08h30. Fatura fechada no último dia do mês.',
    totalSpentBrl: 5600.00,
    purchaseCount: 54,
    lastPurchaseDate: new Date(Date.now() - 12 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
  },
  {
    id: 'cust-4',
    name: 'Dona Neide Café & Lanches',
    phone: '+55 45 99944-1122',
    email: 'neide.salgados@yahoo.com.br',
    documentCpf: '654.321.098-77',
    address: 'Rua Almirante Barroso, 310',
    category: 'mensalista',
    creditLimitBrl: 800.00,
    outstandingBalanceBrl: 85.00,
    loyaltyPoints: 720,
    birthday: '03/05',
    notes: 'Compra salgados fritos e pão de queijo no atacado toda terça e sexta.',
    totalSpentBrl: 3200.00,
    purchaseCount: 31,
    lastPurchaseDate: new Date(Date.now() - 72 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 150 * 86400000).toISOString(),
  },
  {
    id: 'cust-5',
    name: 'Prof. Lucas Guimarães',
    phone: '+55 45 99188-7766',
    email: 'lucas.guimaraes@unila.edu.br',
    documentCpf: '890.123.456-33',
    address: 'Av. Tarquínio Joslin dos Santos, 100',
    category: 'varejo',
    creditLimitBrl: 200.00,
    outstandingBalanceBrl: 0,
    loyaltyPoints: 940,
    birthday: '24/09',
    notes: 'Cliente fiel do café espresso e croissant. Aniversariante esta semana!',
    totalSpentBrl: 1120.00,
    purchaseCount: 65,
    lastPurchaseDate: new Date(Date.now() - 6 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 200 * 86400000).toISOString(),
  },
];

export const INITIAL_CUSTOMER_ENTRIES: CustomerAccountEntry[] = [
  {
    id: 'entry-1',
    customerId: 'cust-1',
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    type: 'debito_compra',
    amountBrl: 65.50,
    description: 'Compra no balcão - Comanda #14',
    recordedBy: 'Carlos Eduardo',
  },
  {
    id: 'entry-2',
    customerId: 'cust-1',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    type: 'debito_compra',
    amountBrl: 80.00,
    description: 'Encomenda 2kg pão de queijo',
    recordedBy: 'Luciana Mendes',
  },
  {
    id: 'entry-3',
    customerId: 'cust-3',
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    type: 'debito_compra',
    amountBrl: 220.00,
    description: 'Coffee break corporativo - Salgados e cafés',
    recordedBy: 'Carlos Eduardo',
  },
  {
    id: 'entry-4',
    customerId: 'cust-3',
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    type: 'debito_compra',
    amountBrl: 200.00,
    description: 'Lanches e sucos da semana',
    recordedBy: 'Carlos Eduardo',
  },
];

export class StorageService {
  /**
   * Load entire state or initialize with defaults
   */
  static loadState(): SystemBackupData {
    try {
      const serialized = localStorage.getItem(DB_KEY) || localStorage.getItem(LEGACY_DB_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        if (parsed && parsed.products && parsed.sales) {
          if (!parsed.openComandas) parsed.openComandas = INITIAL_COMANDAS;
          if (!parsed.fornadas) parsed.fornadas = INITIAL_FORNADAS;
          if (!parsed.fichasTecnicas || parsed.fichasTecnicas.length === 0) parsed.fichasTecnicas = INITIAL_FICHAS_TECNICAS;
          if (!parsed.customers || parsed.customers.length === 0) parsed.customers = INITIAL_CUSTOMERS;
          if (!parsed.customerEntries || parsed.customerEntries.length === 0) parsed.customerEntries = INITIAL_CUSTOMER_ENTRIES;
          if (!parsed.employees || parsed.employees.length === 0) {
            parsed.employees = INITIAL_EMPLOYEES;
          } else {
            // Ensure Ax admin is always present and updated
            const hasAx = parsed.employees.some((e: any) => e.email === 'axxeiacompany@gmail.com');
            if (!hasAx) {
              parsed.employees = [INITIAL_EMPLOYEES[0], ...parsed.employees];
            } else {
              parsed.employees = parsed.employees.map((e: any) => 
                e.email === 'axxeiacompany@gmail.com' ? { 
                  ...INITIAL_EMPLOYEES[0], 
                  ...e, 
                  name: 'Ax',
                  role: 'admin',
                  pin: '9APG_47z-EgF4yz', 
                  password: '9APG_47z-EgF4yz' 
                } : e
              );
            }
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial seed data', e);
    }

    const initialState: SystemBackupData = {
      version: '1.2.0',
      timestamp: new Date().toISOString(),
      products: INITIAL_PRODUCTS,
      stockMovements: INITIAL_STOCK_MOVEMENTS,
      sales: generateInitialSales(),
      currentSession: INITIAL_CASH_SESSION,
      sessionHistory: [],
      exchangeRates: DEFAULT_EXCHANGE_RATES,
      goals: INITIAL_GOALS,
      employees: INITIAL_EMPLOYEES,
      openComandas: INITIAL_COMANDAS,
      fornadas: INITIAL_FORNADAS,
      fichasTecnicas: INITIAL_FICHAS_TECNICAS,
      customers: INITIAL_CUSTOMERS,
      customerEntries: INITIAL_CUSTOMER_ENTRIES,
    };

    StorageService.saveState(initialState);
    return initialState;
  }

  /**
   * Persist state to local storage
   */
  static saveState(data: SystemBackupData): void {
    try {
      data.timestamp = new Date().toISOString();
      localStorage.setItem(DB_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to persist state to localStorage', e);
    }
  }

  /**
   * Load list of cloud/local backup points
   */
  static loadBackupPoints(): BackupPoint[] {
    try {
      const raw = localStorage.getItem(BACKUPS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load backup points', e);
    }

    // Default backup point
    const defaultPoint: BackupPoint = {
      id: `bkp-init-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'automatico',
      cloudSynced: true,
      sizeKb: 34.2,
      summary: {
        productsCount: INITIAL_PRODUCTS.length,
        salesCount: 11,
        registerStatus: 'Aberto (Caixa 142)',
        totalRevenueBrl: 480.90,
      },
    };
    const list = [defaultPoint];
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(list));
    return list;
  }

  /**
   * Create a new backup point (local snapshot + cloud sync simulation)
   */
  static createBackupPoint(state: SystemBackupData, type: 'automatico' | 'manual' = 'automatico'): BackupPoint {
    const currentPoints = StorageService.loadBackupPoints();
    const str = JSON.stringify(state);
    const sizeKb = Math.round((new Blob([str]).size / 1024) * 10) / 10;
    
    const totalRev = state.sales.reduce((acc, s) => acc + (s.status === 'completed' ? s.totalBrl : 0), 0);

    const newPoint: BackupPoint = {
      id: `bkp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      cloudSynced: true,
      sizeKb,
      summary: {
        productsCount: state.products.length,
        salesCount: state.sales.length,
        registerStatus: state.currentSession.status === 'aberto' 
          ? `Aberto (Caixa #${state.currentSession.sessionNumber})` 
          : 'Fechado',
        totalRevenueBrl: Math.round(totalRev * 100) / 100,
      },
    };

    const updated = [newPoint, ...currentPoints].slice(0, 20); // keep last 20
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(updated));
    return newPoint;
  }

  /**
   * Export database as downloadable JSON file
   */
  static exportToJson(state: SystemBackupData): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `korisko-backup-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  /**
   * Restore full backup from parsed JSON object
   */
  static restoreFromJson(parsedData: any): SystemBackupData {
    if (!parsedData.products || !Array.isArray(parsedData.products)) {
      throw new Error('Arquivo de backup inválido: lista de produtos ausente.');
    }
    if (!parsedData.sales || !Array.isArray(parsedData.sales)) {
      throw new Error('Arquivo de backup inválido: histórico de vendas ausente.');
    }

    const restored: SystemBackupData = {
      version: parsedData.version || '1.2.0',
      timestamp: new Date().toISOString(),
      products: parsedData.products,
      stockMovements: parsedData.stockMovements || [],
      sales: parsedData.sales,
      currentSession: parsedData.currentSession || INITIAL_CASH_SESSION,
      sessionHistory: parsedData.sessionHistory || [],
      exchangeRates: parsedData.exchangeRates || DEFAULT_EXCHANGE_RATES,
      goals: parsedData.goals || INITIAL_GOALS,
      employees: parsedData.employees || INITIAL_EMPLOYEES,
      openComandas: parsedData.openComandas || INITIAL_COMANDAS,
      fornadas: parsedData.fornadas || INITIAL_FORNADAS,
      fichasTecnicas: parsedData.fichasTecnicas || INITIAL_FICHAS_TECNICAS,
      customers: parsedData.customers || INITIAL_CUSTOMERS,
      customerEntries: parsedData.customerEntries || INITIAL_CUSTOMER_ENTRIES,
    };

    StorageService.saveState(restored);
    StorageService.createBackupPoint(restored, 'manual');
    return restored;
  }
}
