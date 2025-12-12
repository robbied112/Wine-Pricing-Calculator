// Canonical V2 pricing engine contract:
// { whoAmI: TradeActor, sellingTo: Counterparty, inventory: InventoryContext }
// Back-compat: calculatePricingV2 falls back to buyingFrom when sellingTo is missing.

// ---- ENUMS ----

// Who is using the tool.
export const TradeActor = {
  EuroWinery: 'EuroWinery',
  DomesticWinery: 'DomesticWinery',
  Importer: 'Importer',
  Supplier: 'Supplier',
  Distributor: 'Distributor',
  Retailer: 'Retailer',
};

// Who you are selling to (counterparty).
export const Counterparty = {
  EuroWinery: 'EuroWinery',
  DomesticWinery: 'DomesticWinery',
  Importer: 'Importer',
  Supplier: 'Supplier',
  Distributor: 'Distributor',
  Retailer: 'Retailer',
};

// Where the inventory physically is.
export const InventoryContext = {
  Euro_FOB_Winery: 'Euro_FOB_Winery',
  Euro_Warehouse: 'Euro_Warehouse',
  US_Importer_WH: 'US_Importer_WH',
  US_Distributor_WH: 'US_Distributor_WH',
  US_Winery: 'US_Winery',
  US_Supplier_WH: 'US_Supplier_WH',
};

export const RecapActor = {
  Supplier: 'Supplier',
  Importer: 'Importer',
  Distributor: 'Distributor',
  Retailer: 'Retailer',
};

// ---- SCENARIOS ----

export const SCENARIOS = [
  // Domestic winery
  {
    whoAmI: TradeActor.DomesticWinery,
    sellingTo: Counterparty.Distributor,
    inventory: InventoryContext.US_Winery,
    modelId: 'Domestic_Winery_ToDistributor',
  },
  {
    whoAmI: TradeActor.DomesticWinery,
    sellingTo: Counterparty.Retailer,
    inventory: InventoryContext.US_Winery,
    modelId: 'Domestic_Winery_ToRetailer',
  },

  // Euro winery (imported)
  {
    whoAmI: TradeActor.EuroWinery,
    sellingTo: Counterparty.Distributor,
    inventory: InventoryContext.Euro_FOB_Winery,
    modelId: 'ImportedModelDI',
  },
  {
    whoAmI: TradeActor.EuroWinery,
    sellingTo: Counterparty.Distributor,
    inventory: InventoryContext.US_Importer_WH,
    modelId: 'ImportedModelSS',
  },
  {
    whoAmI: TradeActor.EuroWinery,
    sellingTo: Counterparty.Retailer,
    inventory: InventoryContext.Euro_FOB_Winery,
    modelId: 'Euro_DI_ToRetailer',
  },

  // Importer (uses same math as Euro winery for DI/SS)
  {
    whoAmI: TradeActor.Importer,
    sellingTo: Counterparty.Distributor,
    inventory: InventoryContext.Euro_FOB_Winery,
    modelId: 'ImportedModelDI',
  },
  {
    whoAmI: TradeActor.Importer,
    sellingTo: Counterparty.Distributor,
    inventory: InventoryContext.US_Importer_WH,
    modelId: 'ImportedModelSS',
  },
  {
    whoAmI: TradeActor.Importer,
    sellingTo: Counterparty.Retailer,
    inventory: InventoryContext.Euro_FOB_Winery,
    modelId: 'Euro_DI_ToRetailer',
  },

  // Supplier
  {
    whoAmI: TradeActor.Supplier,
    sellingTo: Counterparty.Distributor,
    inventory: InventoryContext.US_Supplier_WH,
    modelId: 'Domestic_Supplier_ToDistributor',
  },
  {
    whoAmI: TradeActor.Supplier,
    sellingTo: Counterparty.Retailer,
    inventory: InventoryContext.US_Supplier_WH,
    modelId: 'Domestic_Supplier_ToRetailer',
  },

  // Distributor
  {
    whoAmI: TradeActor.Distributor,
    sellingTo: Counterparty.Retailer,
    inventory: InventoryContext.US_Distributor_WH,
    modelId: 'Distributor_ToRetailer',
  },
];

export function resolvePricingModelIdFromContext({ whoAmI, sellingTo, inventory }) {
  const norm = (v) => (typeof v === 'string' ? v.trim() : v);
  const normInventory = (v) => {
    const trimmed = norm(v);
    if (trimmed === 'Euro FOB (Winery)') return InventoryContext.Euro_FOB_Winery;
    if (trimmed === 'Euro Warehouse') return InventoryContext.Euro_Warehouse;
    if (trimmed === 'US Warehouse - Imported') return InventoryContext.US_Importer_WH;
    if (trimmed === 'US Warehouse') return InventoryContext.US_Distributor_WH;
    if (trimmed === 'US Winery') return InventoryContext.US_Winery;
    return trimmed;
  };

  const who = norm(whoAmI);
  const counterparty = norm(sellingTo);
  const inv = normInventory(inventory);

  const match = SCENARIOS.find(
    (s) => s.whoAmI === who && s.sellingTo === counterparty && s.inventory === inv
  );
  return match ? match.modelId : null;
}

// ---- HELPER ----

function applyMarginOnSelling(cost, marginPercent) {
  const m = (marginPercent || 0) / 100;
  if (m <= 0 || !isFinite(m) || m >= 1) return cost;
  return cost / (1 - m);
}

// ---- DOMESTIC WINERY -> DISTRIBUTOR ----

function calculateDomesticWineryToDistributor(input) {
  const casePack = input.casePack || 12;

  const wineryRevenuePerCase = (input.exCellarBottle || 0) * casePack;
  const landedCase = wineryRevenuePerCase + (input.statesideLogisticsPerCase || 0);

  const wholesaleCase = applyMarginOnSelling(landedCase, input.distributorMarginPercent);
  const wholesaleBottle = casePack ? wholesaleCase / casePack : 0;

  const srpBottle = applyMarginOnSelling(wholesaleBottle, input.retailerMarginPercent);

  const distributorMarginPerCase = wholesaleCase - landedCase;
  const retailerMarginPerCase = srpBottle * casePack - wholesaleCase;

  return {
    model: 'DomesticWineryToDistributor',
    casePack,
    landedCase,
    wholesaleCase,
    wholesaleBottle,
    srpBottle,
    wineryRevenuePerCase,
    recapGrossProfitPerCase: distributorMarginPerCase,
    recap: {
      distributorMarginPerCase,
      retailerMarginPerCase,
    },
  };
}

// ---- DOMESTIC WINERY -> RETAIL (SELF-DISTRIBUTION) ----

function calculateDomesticWineryToRetail(input) {
  const casePack = input.casePack || 12;

  const wineryBaseCase = (input.exCellarBottle || 0) * casePack;
  const landedCase = wineryBaseCase + (input.statesideLogisticsPerCase || 0);

  const wholesaleCase = landedCase;
  const wholesaleBottle = casePack ? wholesaleCase / casePack : 0;

  const srpBottle = applyMarginOnSelling(wholesaleBottle, input.retailerMarginPercent);

  const retailerMarginPerCase = srpBottle * casePack - wholesaleCase;

  return {
    model: 'DomesticWineryToRetail',
    casePack,
    landedCase,
    wholesaleCase,
    wholesaleBottle,
    srpBottle,
    wineryRevenuePerCase: wholesaleCase,
    recapGrossProfitPerCase: retailerMarginPerCase,
    recap: {
      retailerMarginPerCase,
    },
  };
}

// ---- IMPORTED MODEL DI SALES (Euro Winery/Importer → Distributor) ----

function calculateImportedModelDI(input) {
  const casePack = input.casePack || 12;

  const importerCostCaseUSD =
    (input.exCellarBottle || 0) * casePack * (input.exchangeRate || 0);

  const importerMargin = (input.importerMarginPercent || 0) / 100;
  const importerFOBCaseUSD =
    importerMargin >= 1
      ? importerCostCaseUSD
      : importerCostCaseUSD / (1 - importerMargin);

  const tariffCaseUSD = importerFOBCaseUSD * ((input.tariffPercent || 0) / 100);
  const diFreightCaseUSD = input.diFreightPerCase || 0;

  const distributorLandedCaseUSD = importerFOBCaseUSD + tariffCaseUSD + diFreightCaseUSD;

  const distributorMargin = (input.distributorMarginPercent || 0) / 100;
  const wholesaleCaseUSD =
    distributorMargin >= 1
      ? distributorLandedCaseUSD
      : distributorLandedCaseUSD / (1 - distributorMargin);

  const wholesaleBottleUSD = casePack ? wholesaleCaseUSD / casePack : 0;

  const retailerMargin = (input.retailerMarginPercent || 0) / 100;
  const srpCaseUSD =
    retailerMargin >= 1 ? wholesaleCaseUSD : wholesaleCaseUSD / (1 - retailerMargin);

  const srpBottleUSD = casePack ? srpCaseUSD / casePack : 0;

  const distributorGPPerCase = wholesaleCaseUSD - distributorLandedCaseUSD;
  const retailerGPPerCase = srpCaseUSD - wholesaleCaseUSD;

  return {
    model: 'ImportedModelDI',
    casePack,
    landedCase: distributorLandedCaseUSD,
    wholesaleCase: wholesaleCaseUSD,
    wholesaleBottle: wholesaleBottleUSD,
    srpBottle: srpBottleUSD,
    wineryRevenuePerCase: importerCostCaseUSD,
    recapGrossProfitPerCase: distributorGPPerCase,
    recap: {
      distributorMarginPerCase: distributorGPPerCase,
      retailerMarginPerCase: retailerGPPerCase,
    },
  };
}

// ---- IMPORTED MODEL SS SALES (Euro Winery/Importer US WH → Distributor) ----

function calculateImportedModelSS(input) {
  const casePack = input.casePack || 12;

  const baseCostCaseUSD =
    (input.exCellarBottle || 0) * casePack * (input.exchangeRate || 0);

  const diFreightCaseUSD = input.diFreightPerCase || 0;
  const tariffOnBaseUSD = baseCostCaseUSD * ((input.tariffPercent || 0) / 100);

  const importerLaidInCaseUSD = baseCostCaseUSD + diFreightCaseUSD + tariffOnBaseUSD;

  const importerMargin = (input.importerMarginPercent || 0) / 100;
  const importerFOBCaseUSD =
    importerMargin >= 1 ? importerLaidInCaseUSD : importerLaidInCaseUSD / (1 - importerMargin);

  const statesideCaseUSD = input.statesideLogisticsPerCase || 0;
  const distributorLandedCaseUSD = importerFOBCaseUSD + statesideCaseUSD;

  const distributorMargin = (input.distributorMarginPercent || 0) / 100;
  const wholesaleCaseUSD =
    distributorMargin >= 1
      ? distributorLandedCaseUSD
      : distributorLandedCaseUSD / (1 - distributorMargin);

  const wholesaleBottleUSD = casePack ? wholesaleCaseUSD / casePack : 0;

  const retailerMargin = (input.retailerMarginPercent || 0) / 100;
  const srpCaseUSD =
    retailerMargin >= 1 ? wholesaleCaseUSD : wholesaleCaseUSD / (1 - retailerMargin);

  const srpBottleUSD = casePack ? srpCaseUSD / casePack : 0;

  const distributorGPPerCase = wholesaleCaseUSD - distributorLandedCaseUSD;
  const retailerGPPerCase = srpCaseUSD - wholesaleCaseUSD;

  return {
    model: 'ImportedModelSS',
    casePack,
    landedCase: distributorLandedCaseUSD,
    wholesaleCase: wholesaleCaseUSD,
    wholesaleBottle: wholesaleBottleUSD,
    srpBottle: srpBottleUSD,
    wineryRevenuePerCase: baseCostCaseUSD,
    recapGrossProfitPerCase: distributorGPPerCase,
    recap: {
      distributorMarginPerCase: distributorGPPerCase,
      retailerMarginPerCase: retailerGPPerCase,
    },
  };
}

// ---- EURO WINERY -> RETAILER DIRECT, DI ----

function calculateEuroDIToRetailer(input) {
  const casePack = input.casePack || 12;

  const baseCostCaseUSD =
    (input.exCellarBottle || 0) * casePack * (input.exchangeRate || 0);

  const diFreightCaseUSD = input.diFreightPerCase || 0;
  const tariffOnBaseUSD = baseCostCaseUSD * ((input.tariffPercent || 0) / 100);

  const wholesaleCaseUSD = baseCostCaseUSD + diFreightCaseUSD + tariffOnBaseUSD;
  const wholesaleBottleUSD = casePack ? wholesaleCaseUSD / casePack : 0;

  const srpBottleUSD = applyMarginOnSelling(wholesaleBottleUSD, input.retailerMarginPercent);

  const retailerMarginPerCase = srpBottleUSD * casePack - wholesaleCaseUSD;

  return {
    model: 'Euro_DI_ToRetailer',
    casePack,
    landedCase: wholesaleCaseUSD,
    wholesaleCase: wholesaleCaseUSD,
    wholesaleBottle: wholesaleBottleUSD,
    srpBottle: srpBottleUSD,
    wineryRevenuePerCase: baseCostCaseUSD,
    recapGrossProfitPerCase: retailerMarginPerCase,
    recap: {
      retailerMarginPerCase,
    },
  };
}

// ---- DOMESTIC SUPPLIER FLOWS ----

function calculateDomesticSupplierToDistributor(input) {
  const casePack = input.casePack || 12;

  const supplierBaseCase = (input.exCellarBottle || 0) * casePack;
  const distributorLaidInCase = supplierBaseCase + (input.statesideLogisticsPerCase || 0);

  const wholesaleCase = applyMarginOnSelling(distributorLaidInCase, input.distributorMarginPercent);
  const wholesaleBottle = casePack ? wholesaleCase / casePack : 0;

  const srpBottle = applyMarginOnSelling(wholesaleBottle, input.retailerMarginPercent);
  const srpCase = srpBottle * casePack;

  const distributorMarginPerCase = wholesaleCase - distributorLaidInCase;
  const retailerMarginPerCase = srpCase - wholesaleCase;

  return {
    model: 'Domestic_Supplier_ToDistributor',
    casePack,
    landedCase: distributorLaidInCase,
    wholesaleCase,
    wholesaleBottle,
    srpBottle,
    supplierRevenuePerCase: supplierBaseCase,
    recapGrossProfitPerCase: distributorMarginPerCase,
    recap: {
      distributorMarginPerCase,
      retailerMarginPerCase,
    },
  };
}

function calculateDomesticSupplierToRetailer(input) {
  const casePack = input.casePack || 12;

  const supplierBaseCase = (input.exCellarBottle || 0) * casePack;

  const retailerLaidInCase = supplierBaseCase + (input.statesideLogisticsPerCase || 0);

  const wholesaleCase = retailerLaidInCase;
  const wholesaleBottle = casePack ? wholesaleCase / casePack : 0;

  const srpBottle = applyMarginOnSelling(wholesaleBottle, input.retailerMarginPercent || 0);
  const srpCase = srpBottle * casePack;

  const retailerMarginPerCase = srpCase - wholesaleCase;

  return {
    model: 'Domestic_Supplier_ToRetailer',
    casePack,
    landedCase: retailerLaidInCase,
    wholesaleCase,
    wholesaleBottle,
    srpBottle,
    supplierRevenuePerCase: supplierBaseCase,
    recapGrossProfitPerCase: retailerMarginPerCase,
    recap: {
      retailerMarginPerCase,
    },
  };
}

// ---- DISTRIBUTOR -> RETAILER ----

function calculateDistributorToRetailer(input) {
  const casePack = input.casePack || 12;

  // Treat exCellarBottle as the distributor's cost per bottle (base buy),
  // plus optional stateside logistics per case.
  const distributorBaseCase = (input.exCellarBottle || 0) * casePack;
  const landedCase = distributorBaseCase + (input.statesideLogisticsPerCase || 0);

  const wholesaleCase = applyMarginOnSelling(landedCase, input.distributorMarginPercent);
  const wholesaleBottle = casePack ? wholesaleCase / casePack : 0;

  const srpBottle = applyMarginOnSelling(wholesaleBottle, input.retailerMarginPercent);

  const distributorMarginPerCase = wholesaleCase - landedCase;
  const retailerMarginPerCase = srpBottle * casePack - wholesaleCase;

  return {
    model: 'Distributor_ToRetailer',
    casePack,
    landedCase,
    wholesaleCase,
    wholesaleBottle,
    srpBottle,
    wineryRevenuePerCase: distributorBaseCase,
    recapGrossProfitPerCase: distributorMarginPerCase,
    recap: {
      distributorMarginPerCase,
      retailerMarginPerCase,
    },
  };
}

// ---- DISPATCH ----

export function calculatePricingV2(input) {
  const norm = (v) => (typeof v === 'string' ? v.trim() : v);
  const normInventory = (v) => {
    const trimmed = norm(v);
    if (trimmed === 'Euro FOB (Winery)') return InventoryContext.Euro_FOB_Winery;
    if (trimmed === 'Euro Warehouse') return InventoryContext.Euro_Warehouse;
    if (trimmed === 'US Warehouse - Imported') return InventoryContext.US_Importer_WH;
    if (trimmed === 'US Warehouse') return InventoryContext.US_Distributor_WH;
    if (trimmed === 'US Winery') return InventoryContext.US_Winery;
    return trimmed;
  };
  const sellingTo = norm(input.sellingTo ?? input.buyingFrom);

  const modelId =
    norm(input.modelId) ||
    resolvePricingModelIdFromContext({
      whoAmI: norm(input.whoAmI),
      sellingTo,
      inventory: normInventory(input.inventory),
    });

  const normalizedModelId = norm(modelId);

  switch (normalizedModelId) {
    case 'ImportedModelDI':
      return calculateImportedModelDI(input);
    case 'ImportedModelSS':
      return calculateImportedModelSS(input);
    case 'Domestic_Winery_ToDistributor':
      return calculateDomesticWineryToDistributor(input);
    case 'Domestic_Winery_ToRetailer':
      return calculateDomesticWineryToRetail(input);
    case 'Domestic_Supplier_ToDistributor':
      return calculateDomesticSupplierToDistributor(input);
    case 'Domestic_Supplier_ToRetailer':
      return calculateDomesticSupplierToRetailer(input);
    case 'Euro_DI_ToRetailer':
      return calculateEuroDIToRetailer(input);
    case 'Distributor_ToRetailer':
      return calculateDistributorToRetailer(input);
    default:
      return {
        model: 'UnknownModel',
        casePack: input.casePack || 12,
        landedCase: 0,
        wholesaleCase: 0,
        wholesaleBottle: 0,
        srpBottle: 0,
        wineryRevenuePerCase: 0,
        recapGrossProfitPerCase: 0,
        recap: {},
      };
  }
}
