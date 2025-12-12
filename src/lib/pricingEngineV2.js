// Backwards-compatible entrypoint: keep existing imports working.
export * from './pricingEngineV2.clean';

/*

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
  Euro_FOB_Winery: 'Euro_FOB_Winery', // Euro FOB / Winery
  Euro_Warehouse: 'Euro_Warehouse', // Euro warehouse / 3PL
  US_Importer_WH: 'US_Importer_WH', // US Warehouse – Imported
  US_Distributor_WH: 'US_Distributor_WH', // Distributor US WH
  US_Winery: 'US_Winery', // Domestic winery
  US_Supplier_WH: 'US_Supplier_WH', // Supplier US WH
};

export const RecapActor = {
  Supplier: 'Supplier',
  Importer: 'Importer',
  Distributor: 'Distributor',
  Retailer: 'Retailer',
};

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

  const wholesaleCase = applyMarginOnSelling(
    landedCase,
    input.distributorMarginPercent
  );

  const wholesaleBottle = wholesaleCase / casePack;

  const srpBottle = applyMarginOnSelling(
    wholesaleBottle,
    input.retailerMarginPercent
  );

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
  const wholesaleBottle = wholesaleCase / casePack;

  const srpBottle = applyMarginOnSelling(
    wholesaleBottle,
    input.retailerMarginPercent
  );

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

// ---- IMPORTED MODEL DI SALES (Importer/Euro Winery → Distributor) ----
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

// ---- IMPORTED MODEL SS SALES (Importer/Euro Winery US WH → Distributor) ----
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
    wineryRevenuePerCase: importerFOBCaseUSD,
    recapGrossProfitPerCase: distributorGPPerCase,
    recap: {
      distributorMarginPerCase: distributorGPPerCase,
      retailerMarginPerCase: retailerGPPerCase,
    },
  };
}

// ---- EURO WINERY → RETAIL (DI, no importer/distributor) ----
function calculateEuroWineryToRetailerDI(input) {
  const casePack = input.casePack || 12;

  const baseExCellarCaseEUR = (input.exCellarBottle || 0) * casePack;

  const baseCaseUSD = baseExCellarCaseEUR * (input.exchangeRate || 0);

  const tPct = (input.tariffPercent || 0) / 100;
  const tariffCaseUSD = baseCaseUSD * tPct;

  const diFreightCaseUSD = input.diFreightPerCase || 0;

  const retailerLandedCaseUSD = baseCaseUSD + tariffCaseUSD + diFreightCaseUSD;

  const retailerMargin = (input.retailerMarginPercent || 0) / 100;

  const srpCaseUSD =
    retailerMargin >= 1
      ? retailerLandedCaseUSD
      : retailerLandedCaseUSD / (1 - retailerMargin);

  const srpBottleUSD = casePack > 0 ? srpCaseUSD / casePack : 0;

  const retailerMarginPerCase = srpCaseUSD - retailerLandedCaseUSD;

  return {
    model: 'Euro_DI_ToRetailer',
    casePack,
    landedCase: retailerLandedCaseUSD,
    wholesaleCase: retailerLandedCaseUSD,
    wholesaleBottle: casePack > 0 ? retailerLandedCaseUSD / casePack : 0,
    srpBottle: srpBottleUSD,
    wineryRevenuePerCase: baseCaseUSD,
    recapGrossProfitPerCase: retailerMarginPerCase,
    recap: {
      retailerMarginPerCase,
    },
  };
}

// ---- DOMESTIC SUPPLIER -> DISTRIBUTOR ----
function calculateDomesticSupplierToDistributor(input) {
  const casePack = input.casePack || 12;

  const supplierBaseCase = (input.exCellarBottle || 0) * casePack;

  const distributorLaidInCase = supplierBaseCase + (input.statesideLogisticsPerCase || 0);

  const wholesaleCase = applyMarginOnSelling(
    distributorLaidInCase,
    input.distributorMarginPercent || 0
  );

  const wholesaleBottle = wholesaleCase / casePack;

  const srpBottle = applyMarginOnSelling(
    wholesaleBottle,
    input.retailerMarginPercent || 0
  );
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

// ---- DOMESTIC SUPPLIER -> RETAILER ----
function calculateDomesticSupplierToRetailer(input) {
  const casePack = input.casePack || 12;

  const supplierBaseCase = (input.exCellarBottle || 0) * casePack;

  const retailerLaidInCase = supplierBaseCase + (input.statesideLogisticsPerCase || 0);

  const wholesaleCase = retailerLaidInCase;
  const wholesaleBottle = wholesaleCase / casePack;

  const srpBottle = applyMarginOnSelling(
    wholesaleBottle,
    input.retailerMarginPercent || 0
  );
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

// ---- SCENARIO TABLE ----
// Map (whoAmI, sellingTo, inventory) -> modelId
const SCENARIOS = [
  // Euro Winery exporting DI or SS
  {
    whoAmI: TradeActor.EuroWinery,
    sellingTo: Counterparty.Importer,
    inventory: InventoryContext.Euro_FOB_Winery,
    modelId: 'ImportedModelDI',
  },
  {
    whoAmI: TradeActor.EuroWinery,
    sellingTo: Counterparty.Distributor,
    inventory: InventoryContext.Euro_FOB_Winery,
    modelId: 'ImportedModelDI',
  },
  {
    whoAmI: TradeActor.EuroWinery,
    sellingTo: Counterparty.Retailer,
    inventory: InventoryContext.Euro_FOB_Winery,
    modelId: 'Euro_DI_ToRetailer',
  },
  {
    whoAmI: TradeActor.EuroWinery,
    sellingTo: Counterparty.Distributor,
    inventory: InventoryContext.US_Importer_WH,
    modelId: 'ImportedModelSS',
  },

  // Importer selling DI vs SS
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

  // Domestic Winery
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

  // Distributor → Retailer (imported stock at distributor WH)
  {
    whoAmI: TradeActor.Distributor,
    sellingTo: Counterparty.Retailer,
    inventory: InventoryContext.US_Distributor_WH,
    modelId: 'ImportedModelSS', // treat as SS sale from distributor
  },
];

// ---- RESOLVER ----
export function resolvePricingModelIdFromContext({ whoAmI, sellingTo, inventory }) {
  if (!whoAmI || !sellingTo || !inventory) return null;

  const match = SCENARIOS.find(
    (s) => s.whoAmI === whoAmI && s.sellingTo === sellingTo && s.inventory === inventory
  );

  return match ? match.modelId : null;
}

// ---- MAIN DISPATCH ----
export function calculatePricingV2(state) {
  const {
    whoAmI,
    sellingTo: sellingToRaw,
    buyingFrom, // backward compatibility
    inventory,
    modelId: explicitModelId,
    ...rest
  } = state;

  const sellingTo = sellingToRaw || buyingFrom || null;

  let modelId = explicitModelId || null;

  if (!modelId && whoAmI && sellingTo && inventory) {
    modelId = resolvePricingModelIdFromContext({ whoAmI, sellingTo, inventory });
  }

  if (!modelId) {
    return {
      model: 'UnknownModel',
      casePack: rest.casePack || 12,
      landedCase: null,
      wholesaleCase: null,
      wholesaleBottle: null,
      srpBottle: null,
      wineryRevenuePerCase: null,
      recapGrossProfitPerCase: null,
      recap: {},
    };
  }

  const input = {
    ...rest,
    casePack: rest.casePack || 12,
  };

  switch (modelId) {
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
      return calculateEuroWineryToRetailerDI(input);
    default:
      return {
        model: 'UnknownModel',
        casePack: input.casePack,
        landedCase: null,
        wholesaleCase: null,
        wholesaleBottle: null,
        srpBottle: null,
        wineryRevenuePerCase: null,
        recapGrossProfitPerCase: null,
        recap: {},
      };
  }
}

// ---- EXPORT CALCS IF NEEDED ----
export {
  calculateDomesticWineryToDistributor,
  calculateDomesticWineryToRetail,
  calculateImportedModelDI,
  calculateImportedModelSS,
  calculateEuroWineryToRetailerDI,
  calculateDomesticSupplierToDistributor,
  calculateDomesticSupplierToRetailer,
};
    modelId = resolvePricingModelIdFromContext({
      whoAmI: TradeActor.Distributor,
      buyingFrom,
      inventory,
    });
  }

  if (!modelId) {
    modelId = 'UnknownModel';
  }

  // Normalize input shape for the helper functions
  const input = {
    ...rest,
    casePack: state.casePack || 12,
  };

  switch (modelId) {
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
      return calculateEuroWineryToRetailerDI(input);
    default:
      return {
        model: 'UnknownModel',
        casePack: input.casePack,
        landedCase: null,
        wholesaleCase: null,
        wholesaleBottle: null,
        srpBottle: null,
        wineryRevenuePerCase: null,
        recapGrossProfitPerCase: null,
        recap: {},
      };
  }
}

// ---- DOMESTIC SUPPLIER -> DISTRIBUTOR ----
function calculateDomesticSupplierToDistributor(input) {
  const casePack = input.casePack || 12;

  // Supplier base case cost (FOB winery-level)
  const supplierBaseCase = (input.exCellarBottle || 0) * casePack;

  // Distributor laid-in cost: supplier FOB + stateside logistics
  const distributorLaidInCase =
    supplierBaseCase + (input.statesideLogisticsPerCase || 0);

  // Distributor margin is applied as margin-on-selling-price
  const wholesaleCase = applyMarginOnSelling(
    distributorLaidInCase,
    input.distributorMarginPercent || 0
  );

  const wholesaleBottle = wholesaleCase / casePack;

  // Retailer margin on selling price
  const srpBottle = applyMarginOnSelling(
    wholesaleBottle,
    input.retailerMarginPercent || 0
  );
  const srpCase = srpBottle * casePack;

  const distributorMarginPerCase = wholesaleCase - distributorLaidInCase;
  const retailerMarginPerCase = srpCase - wholesaleCase;

  return {
    model: 'Domestic_Supplier_ToDistributor',
    casePack,
    landedCase: distributorLaidInCase,          // distributor laid-in
    wholesaleCase,
    wholesaleBottle,
    srpBottle,
    supplierRevenuePerCase: supplierBaseCase,   // what supplier effectively realizes per case
    recapGrossProfitPerCase: distributorMarginPerCase,
    recap: {
      distributorMarginPerCase,
      retailerMarginPerCase,
    },
  };
}

// ---- DOMESTIC SUPPLIER -> RETAILER ----
function calculateDomesticSupplierToRetailer(input) {
  const casePack = input.casePack || 12;

  const supplierBaseCase = (input.exCellarBottle || 0) * casePack;

  // Retailer laid-in cost: FOB + stateside logistics
  const retailerLaidInCase =
    supplierBaseCase + (input.statesideLogisticsPerCase || 0);

  // No distributor step: wholesale = retailer laid-in
  const wholesaleCase = retailerLaidInCase;
  const wholesaleBottle = wholesaleCase / casePack;

  // Retailer margin on selling price
  const srpBottle = applyMarginOnSelling(
    wholesaleBottle,
    input.retailerMarginPercent || 0
  );
  const srpCase = srpBottle * casePack;

  const retailerMarginPerCase = srpCase - wholesaleCase;

  return {
    model: 'Domestic_Supplier_ToRetailer',
    casePack,
    landedCase: retailerLaidInCase,            // retailer laid-in
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

// Add the new functions to the export block
export {
  // ...existing exports...
  calculateDomesticSupplierToDistributor,
  calculateDomesticSupplierToRetailer,
};

*/