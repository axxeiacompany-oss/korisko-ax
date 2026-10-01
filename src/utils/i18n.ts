import { AppLanguage } from '../types';

export interface I18nDictionary {
  // Brand & Slogan
  appName: string;
  appSlogan: string;
  systemDescription: string;

  // Language selector
  language: string;
  spanish: string;
  portuguese: string;
  selectLanguage: string;

  // Navigation Groups
  navGroupMain: string;
  navGroupProduction: string;
  navGroupFinancial: string;
  navGroupAdmin: string;

  // Tabs
  tabDashboard: string;
  tabPdv: string;
  tabDirectSale: string;
  tabInventory: string;
  tabRecipes: string;
  tabCrm: string;
  tabCashRegister: string;
  tabTopProducts: string;
  tabGoals: string;
  tabCurrency: string;
  tabBackup: string;
  tabAffiliates: string;

  // Tab Subtitles
  subDashboard: string;
  subPdv: string;
  subDirectSale: string;
  subInventory: string;
  subRecipes: string;
  subCrm: string;
  subCashRegister: string;
  subTopProducts: string;
  subGoals: string;
  subCurrency: string;
  subBackup: string;
  subAffiliates: string;

  // TopNav & Common Actions
  searchPlaceholder: string;
  searchTitle: string;
  searchHint: string;
  searchProducts: string;
  searchCustomers: string;
  searchComandas: string;
  noResultsFound: string;
  quickActionFornada: string;
  quickActionDirectSale: string;
  quickActionNewSale: string;
  myProfile: string;
  myPassword: string;
  onlineStatus: string;
  lockSession: string;
  switchOperator: string;
  logout: string;
  ratesTicker: string;
  close: string;
  save: string;
  cancel: string;
  confirm: string;
  delete: string;
  edit: string;
  new: string;
  loading: string;
  filter: string;
  exportJson: string;
  importJson: string;
  print: string;
  refresh: string;
  status: string;
  active: string;
  inactive: string;
  all: string;

  // Login View
  loginTitle: string;
  loginSubtitle: string;
  loginEmailLabel: string;
  loginPasswordLabel: string;
  loginButton: string;
  loginRememberMe: string;
  loginQuickRoles: string;
  loginMasterKeyHint: string;
  loginErrorInvalid: string;
  loginErrorEmpty: string;
  loginLoggingIn: string;
  loginSecurityNotice: string;

  // Database / Cloud Sync
  dbConnected: string;
  dbRailway: string;
  dbLocalFallback: string;
  dbSyncing: string;
  dbLastBackup: string;
  dbTestConnection: string;
  dbTitle: string;

  // Roles
  roleAdmin: string;
  roleManager: string;
  roleCashier: string;
  roleBaker: string;
  roleAffiliate: string;

  // PDV & Sales
  pdvCart: string;
  pdvEmptyCart: string;
  pdvTotal: string;
  pdvSubtotal: string;
  pdvDiscount: string;
  pdvPayment: string;
  pdvFinishSale: string;
  pdvChange: string;
  pdvSelectComanda: string;
  pdvOpenComandas: string;
  pdvAddProduct: string;
  pdvWeightScale: string;
  pdvUnit: string;
  pdvPrice: string;
  pdvQuantity: string;
  pdvMultiCurrencyAccepted: string;

  // Direct Sale
  directSaleTitle: string;
  directSaleSubtitle: string;
  directSaleAmount: string;
  directSaleDescription: string;
  directSalePaymentMethod: string;
  directSaleConfirmBtn: string;
  directSaleSuccess: string;

  // Inventory
  inventoryTotalItems: string;
  inventoryLowStockAlert: string;
  inventoryExpiringSoon: string;
  inventoryAddProduct: string;
  inventoryStockMovement: string;
  inventoryMinStock: string;
  inventoryCostPrice: string;
  inventorySellingPrice: string;
  inventoryCategory: string;

  // Ficha Técnica
  recipesTitle: string;
  recipesYield: string;
  recipesCostPerServing: string;
  recipesSuggestedPrice: string;
  recipesIngredients: string;
  recipesProduceBatch: string;

  // Cash Register
  registerStatusOpen: string;
  registerStatusClosed: string;
  registerOpenAction: string;
  registerCloseAction: string;
  registerSangria: string;
  registerSuprimento: string;
  registerBlindClose: string;
  registerSessionNumber: string;
  registerInitialFloat: string;
  registerCountedMoney: string;
  registerDifference: string;

  // CRM
  crmTotalCustomers: string;
  crmTotalDebt: string;
  crmCustomerName: string;
  crmPhone: string;
  crmCreditLimit: string;
  crmLoyaltyPoints: string;
  crmRecordDebt: string;
  crmReceivePayment: string;

  // Currencies
  currencyReal: string;
  currencyGuarani: string;
  currencyDollar: string;

  // Common notifications
  successSaved: string;
  successUpdated: string;
  successDeleted: string;
  errorGeneric: string;
}

export const translations: Record<AppLanguage, I18nDictionary> = {
  es: {
    // Brand & Slogan
    appName: 'Korizko',
    appSlogan: '',
    systemDescription: 'Sistema Integrado de Gestión & PDV',

    // Language selector
    language: 'Idioma',
    spanish: 'Español',
    portuguese: 'Português',
    selectLanguage: 'Seleccionar Idioma',

    // Navigation Groups
    navGroupMain: 'Principal',
    navGroupProduction: 'Producción & Stock',
    navGroupFinancial: 'Gestión Financiera',
    navGroupAdmin: 'Administración & Equipo',

    // Tabs
    tabDashboard: 'Dashboard',
    tabPdv: 'PDV & Caja',
    tabDirectSale: 'Venta Directa',
    tabInventory: 'Stock & Insumos',
    tabRecipes: 'Fichas Técnicas',
    tabCrm: 'CRM & Créditos',
    tabCashRegister: 'Cierre de Caja',
    tabTopProducts: 'Más Vendidos',
    tabGoals: 'Metas del Mes',
    tabCurrency: 'Multi-Monedas & Cambio',
    tabBackup: 'Nube & Backup',
    tabAffiliates: 'Equipo & Roles',

    // Tab Subtitles
    subDashboard: 'Visión general consolidada en tiempo real del negocio',
    subPdv: 'Frente de caja, pesaje y cobro en Guaraníes (₲ PYG)',
    subDirectSale: 'Cobro rápido ingresando solo el monto y confirmando',
    subInventory: 'Insumos, productos terminados y alertas de vencimiento',
    subRecipes: 'Recetario maestro, márgenes y órdenes de horneada',
    subCrm: 'Libreta de fiado, límites de crédito y fidelidad de clientes',
    subCashRegister: 'Arqueo ciego, control de sangrías, reposiciones y vuelto',
    subTopProducts: 'Curva ABC y ranking de rotación diaria y mensual',
    subGoals: 'Seguimiento del objetivo financiero del mes',
    subCurrency: 'Operaciones exclusivas en Guaraníes (₲ PYG)',
    subBackup: 'Base de datos en la nube (PostgreSQL Railway) y copias locales',
    subAffiliates: 'Gestión de colaboradores, credenciales y control de permisos',

    // TopNav & Common Actions
    searchPlaceholder: 'Buscar por panes, bebidas, clientes, comandas...',
    searchTitle: 'Atajos de búsqueda rápida en Korizko',
    searchHint: 'Escriba el nombre de cualquier producto, cliente o número de comanda.',
    searchProducts: 'Productos',
    searchCustomers: 'Clientes',
    searchComandas: 'Comandas Salón',
    noResultsFound: 'No se encontraron resultados para',
    quickActionFornada: 'Horneada',
    quickActionDirectSale: 'Venta Directa',
    quickActionNewSale: 'Nueva Venta',
    myProfile: 'Mi Perfil',
    myPassword: 'Mi Clave 👤',
    onlineStatus: 'ONLINE',
    lockSession: 'Bloquear Sesión / Salir',
    switchOperator: 'Cambiar',
    logout: 'Salir',
    ratesTicker: 'Moneda Oficial: Guaraní (₲ PYG)',
    close: 'Cerrar',
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    delete: 'Eliminar',
    edit: 'Editar',
    new: 'Nuevo',
    loading: 'Cargando...',
    filter: 'Filtrar',
    exportJson: 'Exportar JSON',
    importJson: 'Importar JSON',
    print: 'Imprimir',
    refresh: 'Actualizar',
    status: 'Estado',
    active: 'Activo',
    inactive: 'Inactivo',
    all: 'Todos',

    // Login View
    loginTitle: 'Acceso al Sistema Korizko',
    loginSubtitle: 'Ingrese sus credenciales de operador o administrador para continuar',
    loginEmailLabel: 'Correo Electrónico / Gmail',
    loginPasswordLabel: 'Contraseña de Acceso',
    loginButton: 'Ingresar al Sistema',
    loginRememberMe: 'Recordar credenciales en este equipo',
    loginQuickRoles: 'Acceso Rápido por Perfil',
    loginMasterKeyHint: 'Clave Maestra Ax disponible para soporte',
    loginErrorInvalid: 'Usuario o contraseña incorrectos.',
    loginErrorEmpty: 'Por favor ingrese sus credenciales completas.',
    loginLoggingIn: 'Verificando credenciales...',
    loginSecurityNotice: 'Korizko Gestión & PDV',

    // Database / Cloud Sync
    dbConnected: 'Base de Datos Conectada y Operacional',
    dbRailway: 'Banco BD',
    dbLocalFallback: 'Almacenamiento Nativo Activo',
    dbSyncing: 'Sincronizando...',
    dbLastBackup: 'Último backup',
    dbTestConnection: 'Verificar Conexión BD',
    dbTitle: 'Base de Datos Korizko',

    // Roles
    roleAdmin: 'Administrador Ax',
    roleManager: 'Gerente General',
    roleCashier: 'Operador de Caja',
    roleBaker: 'Panadero / Maestro',
    roleAffiliate: 'Colaborador / Operador',

    // PDV & Sales
    pdvCart: 'Comanda / Carrito',
    pdvEmptyCart: 'El carrito está vacío. Agregue productos para iniciar la venta.',
    pdvTotal: 'Total a Cobrar',
    pdvSubtotal: 'Subtotal',
    pdvDiscount: 'Descuento',
    pdvPayment: 'Cobrar / Pagos',
    pdvFinishSale: 'Finalizar Venta',
    pdvChange: 'Vuelto / Cambio',
    pdvSelectComanda: 'Seleccionar Comanda',
    pdvOpenComandas: 'Comandas Abiertas',
    pdvAddProduct: 'Agregar al Carrito',
    pdvWeightScale: 'Pesaje / Balanza',
    pdvUnit: 'Unidad',
    pdvPrice: 'Precio',
    pdvQuantity: 'Cantidad',
    pdvMultiCurrencyAccepted: 'Moneda Oficial: Guaraní (₲ PYG)',

    // Direct Sale
    directSaleTitle: 'Venta Directa Exprés',
    directSaleSubtitle: 'Cobro veloz en 1 clic: solo ingrese el importe y confirme',
    directSaleAmount: 'Valor / Importe',
    directSaleDescription: 'Descripción rápida (opcional)',
    directSalePaymentMethod: 'Método de Pago',
    directSaleConfirmBtn: 'Confirmar y Cobrar Ahora',
    directSaleSuccess: '¡Venta exprés registrada con éxito!',

    // Inventory
    inventoryTotalItems: 'Total de Ítems en Stock',
    inventoryLowStockAlert: 'Alertas de Stock Bajo',
    inventoryExpiringSoon: 'Próximos a Vencer (5 días)',
    inventoryAddProduct: 'Nuevo Producto / Insumo',
    inventoryStockMovement: 'Movimiento de Stock',
    inventoryMinStock: 'Stock Mínimo',
    inventoryCostPrice: 'Precio de Costo',
    inventorySellingPrice: 'Precio de Venta',
    inventoryCategory: 'Categoría',

    // Ficha Técnica
    recipesTitle: 'Fichas Técnicas & Costos de Receta',
    recipesYield: 'Rendimiento',
    recipesCostPerServing: 'Costo por Porción',
    recipesSuggestedPrice: 'Precio Sugerido',
    recipesIngredients: 'Ingredientes & Insumos',
    recipesProduceBatch: 'Generar Orden de Producción',

    // Cash Register
    registerStatusOpen: 'Caja Abierta',
    registerStatusClosed: 'Caja Cerrada',
    registerOpenAction: 'Abrir Turno de Caja',
    registerCloseAction: 'Realizar Cierre Ciego',
    registerSangria: 'Salida de Caja',
    registerSuprimento: 'Entrada de Caja',
    registerBlindClose: 'Conferencia a Ciegas',
    registerSessionNumber: 'Turno de Caja Nº',
    registerInitialFloat: 'Fondo Inicial de Caja',
    registerCountedMoney: 'Dinero Contado en Caja',
    registerDifference: 'Diferencia (Sobrante / Faltante)',

    // CRM
    crmTotalCustomers: 'Clientes Registrados',
    crmTotalDebt: 'Total a Cobrar (Créditos / Fiado)',
    crmCustomerName: 'Nombre del Cliente',
    crmPhone: 'Teléfono / WhatsApp',
    crmCreditLimit: 'Límite de Crédito',
    crmLoyaltyPoints: 'Puntos Fidelidad',
    crmRecordDebt: 'Registrar Deuda / Fiado',
    crmReceivePayment: 'Cobrar Deuda',

    // Currencies
    currencyReal: 'Real Brasileño (BRL)',
    currencyGuarani: 'Guaraní Paraguayo (PYG)',
    currencyDollar: 'Dólar Estadounidense (USD)',

    // Common notifications
    successSaved: 'Datos guardados correctamente.',
    successUpdated: 'Actualizado con éxito.',
    successDeleted: 'Registro eliminado con éxito.',
    errorGeneric: 'Ocurrió un error. Por favor intente nuevamente.',
  },

  pt: {
    // Brand & Slogan
    appName: 'Korizko',
    appSlogan: '',
    systemDescription: 'Sistema Integrado de Gestão & PDV',

    // Language selector
    language: 'Idioma',
    spanish: 'Espanhol',
    portuguese: 'Português',
    selectLanguage: 'Selecionar Idioma',

    // Navigation Groups
    navGroupMain: 'Principal',
    navGroupProduction: 'Produção & Estoque',
    navGroupFinancial: 'Gestão Financeira',
    navGroupAdmin: 'Administração & Equipe',

    // Tabs
    tabDashboard: 'Dashboard',
    tabPdv: 'PDV & Caixa',
    tabDirectSale: 'Venda Direta',
    tabInventory: 'Estoque & Insumos',
    tabRecipes: 'Fichas Técnicas',
    tabCrm: 'CRM & Fiado',
    tabCashRegister: 'Fechamento Caixa',
    tabTopProducts: 'Mais Vendidos',
    tabGoals: 'Metas do Mês',
    tabCurrency: 'Multi-Moedas & Câmbio',
    tabBackup: 'Backup & Nuvem',
    tabAffiliates: 'Equipe & Permissões',

    // Tab Subtitles
    subDashboard: 'Visão consolidada em tempo real da padaria',
    subPdv: 'Frente de caixa, pesagem e recebimento multi-moeda',
    subDirectSale: 'Lançamento rápido digitando apenas o valor e confirmando',
    subInventory: 'Insumos, produtos acabados e alertas de validade',
    subRecipes: 'Receituário mestre, margens e ordens de fornada',
    subCrm: 'Caderneta de fiado, limites de crédito e fidelidade',
    subCashRegister: 'Conferência de entradas, saídas e trocos',
    subTopProducts: 'Ranking de giro diário e mensal',
    subGoals: 'Acompanhamento do objetivo financeiro do mês',
    subCurrency: 'Operações exclusivas em Guaranis (₲ PYG)',
    subBackup: 'Pontos de restauração e cópia local',
    subAffiliates: 'Gestão de colaboradores, controle de senhas e liberação de funções',

    // TopNav & Common Actions
    searchPlaceholder: 'Buscar produto, cliente ou comanda...',
    searchTitle: 'Atalhos de busca rápida no Korizko',
    searchHint: 'Digite o nome de qualquer pão, doce, cliente ou número de comanda.',
    searchProducts: 'Produtos',
    searchCustomers: 'Clientes',
    searchComandas: 'Comandas Salão',
    noResultsFound: 'Nenhum resultado encontrado para',
    quickActionFornada: 'Fornada',
    quickActionDirectSale: 'Venda Direta',
    quickActionNewSale: 'Nova Venta',
    myProfile: 'Meu Perfil',
    myPassword: 'Minha Senha 👤',
    onlineStatus: 'ONLINE',
    lockSession: 'Bloquear Sessão / Sair',
    switchOperator: 'Trocar',
    logout: 'Sair',
    ratesTicker: 'Moeda Oficial: Guaraní (₲ PYG)',
    close: 'Fechar',
    save: 'Salvar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    delete: 'Excluir',
    edit: 'Editar',
    new: 'Novo',
    loading: 'Carregando...',
    filter: 'Filtrar',
    exportJson: 'Exportar JSON',
    importJson: 'Importar JSON',
    print: 'Imprimir',
    refresh: 'Atualizar',
    status: 'Status',
    active: 'Ativo',
    inactive: 'Inativo',
    all: 'Todos',

    // Login View
    loginTitle: 'Acesso ao Sistema Korizko',
    loginSubtitle: 'Entre com as credenciais do seu operador ou administrador para continuar',
    loginEmailLabel: 'E-mail / Gmail Cadastrado',
    loginPasswordLabel: 'Senha de Acesso',
    loginButton: 'Entrar no Sistema',
    loginRememberMe: 'Lembrar credenciais neste navegador',
    loginQuickRoles: 'Acesso Rápido por Perfil',
    loginMasterKeyHint: 'Senha Mestra Ax disponível para suporte',
    loginErrorInvalid: 'E-mail, usuário ou senha incorretos.',
    loginErrorEmpty: 'Por favor preencha suas credenciais completas.',
    loginLoggingIn: 'Verificando credenciais...',
    loginSecurityNotice: 'Korizko Gestão & PDV',

    // Database / Cloud Sync
    dbConnected: 'Banco de Dados Conectado e Operacional',
    dbRailway: 'Banco BD',
    dbLocalFallback: 'Armazenamento Nativo Operacional',
    dbSyncing: 'Sincronizando...',
    dbLastBackup: 'Último backup',
    dbTestConnection: 'Testar Conexão BD',
    dbTitle: 'Banco de Dados Korizko',

    // Roles
    roleAdmin: 'Administrador Ax',
    roleManager: 'Gerente Geral',
    roleCashier: 'Operador de Caixa',
    roleBaker: 'Padeiro / Mestre',
    roleAffiliate: 'Colaborador / Operador',

    // PDV & Sales
    pdvCart: 'Comanda / Carrinho',
    pdvEmptyCart: 'O carrinho está vazio. Adicione produtos para iniciar a venda.',
    pdvTotal: 'Total a Receber',
    pdvSubtotal: 'Subtotal',
    pdvDiscount: 'Desconto',
    pdvPayment: 'Receber / Pagamentos',
    pdvFinishSale: 'Finalizar Venda',
    pdvChange: 'Troco a Devolver',
    pdvSelectComanda: 'Selecionar Comanda',
    pdvOpenComandas: 'Comandas Abertas',
    pdvAddProduct: 'Adicionar ao Carrinho',
    pdvWeightScale: 'Balança / Pesagem',
    pdvUnit: 'Unidade',
    pdvPrice: 'Preço',
    pdvQuantity: 'Quantidade',
    pdvMultiCurrencyAccepted: 'Moeda Oficial: Guaraní (₲ PYG)',

    // Direct Sale
    directSaleTitle: 'Venda Direta Expressa',
    directSaleSubtitle: 'Lançamento rápido digitando apenas o valor e confirmando',
    directSaleAmount: 'Valor / Montante',
    directSaleDescription: 'Descrição rápida (opcional)',
    directSalePaymentMethod: 'Forma de Pagamento',
    directSaleConfirmBtn: 'Confirmar e Finalizar Venda',
    directSaleSuccess: 'Venda direta registrada com sucesso!',

    // Inventory
    inventoryTotalItems: 'Total de Itens em Estoque',
    inventoryLowStockAlert: 'Alertas de Estoque Baixo',
    inventoryExpiringSoon: 'Próximos ao Vencimento (5 dias)',
    inventoryAddProduct: 'Novo Produto / Insumo',
    inventoryStockMovement: 'Movimento de Estoque',
    inventoryMinStock: 'Estoque Mínimo',
    inventoryCostPrice: 'Preço de Custo',
    inventorySellingPrice: 'Preço de Venda',
    inventoryCategory: 'Categoria',

    // Ficha Técnica
    recipesTitle: 'Fichas Técnicas & Custos de Produção',
    recipesYield: 'Rendimento',
    recipesCostPerServing: 'Custo por Porção',
    recipesSuggestedPrice: 'Preço Sugerido',
    recipesIngredients: 'Ingredientes & Insumos',
    recipesProduceBatch: 'Gerar Ordem de Fornada',

    // Cash Register
    registerStatusOpen: 'Caixa Aberto',
    registerStatusClosed: 'Caixa Fechado',
    registerOpenAction: 'Abrir Caixa',
    registerCloseAction: 'Realizar Fechamento Cego',
    registerSangria: 'Saída de Caixa',
    registerSuprimento: 'Entrada de Caixa',
    registerBlindClose: 'Conferência Cega',
    registerSessionNumber: 'Turno de Caixa Nº',
    registerInitialFloat: 'Fundo Inicial de Caixa',
    registerCountedMoney: 'Dinheiro Contado no Caixa',
    registerDifference: 'Diferença (Sobra / Falta)',

    // CRM
    crmTotalCustomers: 'Clientes Cadastrados',
    crmTotalDebt: 'Total a Receber (Fiado)',
    crmCustomerName: 'Nome do Cliente',
    crmPhone: 'Telefone / WhatsApp',
    crmCreditLimit: 'Limite de Crédito',
    crmLoyaltyPoints: 'Pontos Fidelidade',
    crmRecordDebt: 'Lançar Débito / Fiado',
    crmReceivePayment: 'Receber Pagamento',

    // Currencies
    currencyReal: 'Real Brasileiro (BRL)',
    currencyGuarani: 'Guaraní Paraguaio (PYG)',
    currencyDollar: 'Dólar Americano (USD)',

    // Common notifications
    successSaved: 'Dados salvos com sucesso.',
    successUpdated: 'Atualizado com sucesso.',
    successDeleted: 'Registro excluído com sucesso.',
    errorGeneric: 'Ocorreu um erro. Por favor tente novamente.',
  }
};

/**
 * Format date in localized format
 */
export function formatLocalizedDate(date: Date | string, lang: AppLanguage, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = lang === 'es' ? 'es-PY' : 'pt-BR';
  return d.toLocaleDateString(locale, options || { day: '2-digit', month: '2-digit', year: 'numeric' });
}
