import { calculatePricing } from './pricingEngine';

// ---- ENUMS ----
export const BusinessType = {
  DomesticWinery: 'DomesticWinery',
  Imported: 'Imported',
};

export const InventoryLocation = {
  USWinery: 'USWinery',
  EuroWinery: 'EuroWinery',
  USImporterWH: 'USImporterWH',
};

export const SellTo = {
  Distributor: 'Distributor',
  Retailer: 'Retailer',
  Importer: 'Importer',
};

export const RecapActor = {
  Supplier: 'Supplier',
  Importer: 'Importer',
  Distributor: 'Distributor',
  Retailer: 'Retailer',
};

// ---- NEW ENUMS FOR 3-QUESTION FLOW ----
export const TradeActor = {
  EuroWinery: 'EuroWinery',
  DomesticWinery: 'DomesticWinery',
  Importer: 'Importer',
  Supplier: 'Supplier',
  Distributor: 'Distributor',
  Retailer: 'Retailer',
};

export const PurchaseFrom = {
  EuroWinery: 'EuroWinery',
  USWinery: 'USWinery',
  Importer: 'Importer',
  Supplier: 'Supplier',
  Distributor: 'Distributor',
};

export const InventoryContext = {
  Euro_FOB_Winery: 'Euro_FOB_Winery',
  Euro_US_Warehouse: 'Euro_US_Warehouse',
  Importer_FOB_Europe: 'Importer_FOB_Europe',
  Importer_US_Warehouse: 'Importer_US_Warehouse',
  US_Winery: 'US_Winery',
  Supplier_Warehouse: 'Supplier_Warehouse',
  Distributor_Warehouse: 'Distributor_Warehouse',
};

// ---- HELPER ----
function applyMarginOnSelling(cost, marginPercent) {
  const m = (marginPercent || 0) / 100;
  if (m <= 0) return cost;
  return cost / (1 - m);
}

// ---- DOMESTIC WINERY -> DISTRIBUTOR ----
function calculateDomesticWineryToDistributor(input) {
  const casePack = input.casePack || 12;

  const wineryRevenuePerCase = input.exCellarBottle * casePack;

  const landedCase =
    wineryRevenuePerCase + (input.statesideLogisticsPerCase || 0);

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
    recapGrossProfitPerCase: undefined,
    recap: {
      distributorMarginPerCase,
      retailerMarginPerCase,
    },
  };
}

// ---- DOMESTIC WINERY -> RETAIL (SELF-DISTRIBUTION) ----
function calculateDomesticWineryToRetail(input) {
  const casePack = input.casePack || 12;

  // Winery base transfer price per case
  const wineryBaseCase = input.exCellarBottle * casePack;

  // Landed case after winery pays freight to accounts
  const landedCase =
    wineryBaseCase + (input.statesideLogisticsPerCase || 0);

  // In self-distribution, there is no distributor margin step.
  // The winery's wholesale price to the account is the landed case cost.
  const wholesaleCase = landedCase;
  const wholesaleBottle = wholesaleCase / casePack;

  // SRP is calculated by applying retailer margin on selling price
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

    // Winery revenue per case is what the account pays (wholesaleCase)
    wineryRevenuePerCase: wholesaleCase,
    recapGrossProfitPerCase: undefined,

    recap: {
      retailerMarginPerCase,
    },
  };
}

// ---- IMPORTED MODEL DI SALES ----
function calculateImportedModelDI(input) {
  const casePack = input.casePack || 12;

  // base cost: ex-cellar * casePack * FX
  const importerCostCaseUSD =
    (input.exCellarBottle || 0) *
    (input.casePack || 0) *
    (input.exchangeRate || 0);

  const importerMargin = (input.importerMarginPercent || 0) / 100;

  // importer margin is a margin on selling price, not a markup
  const importerFOBCaseUSD =
    importerMargin >= 1
      ? importerCostCaseUSD // guard against 100%+
      : importerCostCaseUSD / (1 - importerMargin);

  // tariff is charged on importer FOB
  const tariffCaseUSD =
    importerFOBCaseUSD * ((input.tariffPercent || 0) / 100);

  const diFreightCaseUSD = input.diFreightPerCase || 0;

  // landed into distributor for DI model
  const distributorLandedCaseUSD =
    importerFOBCaseUSD + tariffCaseUSD + diFreightCaseUSD;

  const distributorMargin = (input.distributorMarginPercent || 0) / 100;

  const wholesaleCaseUSD =
    distributorMargin >= 1
      ? distributorLandedCaseUSD
      : distributorLandedCaseUSD / (1 - distributorMargin);

  const wholesaleBottleUSD =
    input.casePack ? wholesaleCaseUSD / input.casePack : 0;

  const retailerMargin = (input.retailerMarginPercent || 0) / 100;

  const srpCaseUSD =
    retailerMargin >= 1
      ? wholesaleCaseUSD
      : wholesaleCaseUSD / (1 - retailerMargin);

  const srpBottleUSD =
    input.casePack ? srpCaseUSD / input.casePack : 0;

  // recap:
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

// ---- IMPORTED MODEL SS SALES ----
function calculateImportedModelSS(input) {
  const casePack = input.casePack || 12;

  // base winery cost in USD
  const baseCostCaseUSD =
    (input.exCellarBottle || 0) *
    (input.casePack || 0) *
    (input.exchangeRate || 0);

  // importer pays DI freight + tariff to get to US warehouse
  const diFreightCaseUSD = input.diFreightPerCase || 0;

  const tariffOnBaseUSD =
    baseCostCaseUSD * ((input.tariffPercent || 0) / 100);

  const importerLaidInCaseUSD =
    baseCostCaseUSD + diFreightCaseUSD + tariffOnBaseUSD;

  const importerMargin = (input.importerMarginPercent || 0) / 100;

  // margin on selling price for importer FOB from US warehouse
  const importerFOBCaseUSD =
    importerMargin >= 1
      ? importerLaidInCaseUSD
      : importerLaidInCaseUSD / (1 - importerMargin);

  // distributor then pays only stateside logistics from importer WH to their WH
  const statesideCaseUSD = input.statesideLogisticsPerCase || 0;

  const distributorLandedCaseUSD =
    importerFOBCaseUSD + statesideCaseUSD;

  const distributorMargin = (input.distributorMarginPercent || 0) / 100;

  const wholesaleCaseUSD =
    distributorMargin >= 1
      ? distributorLandedCaseUSD
      : distributorLandedCaseUSD / (1 - distributorMargin);

  const wholesaleBottleUSD =
    input.casePack ? wholesaleCaseUSD / input.casePack : 0;

  const retailerMargin = (input.retailerMarginPercent || 0) / 100;

  const srpCaseUSD =
    retailerMargin >= 1
      ? wholesaleCaseUSD
      : wholesaleCaseUSD / (1 - retailerMargin);

  const srpBottleUSD =
    input.casePack ? srpCaseUSD / input.casePack : 0;

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

// ---- IMPORTED MODEL NOT IMPLEMENTED (PLACEHOLDER) ----
function calculateImportedPlaceholder(input) {
  return {
    model: 'ImportedModelNotImplemented',
    casePack: input.casePack || 12,
    landedCase: 0,
    wholesaleCase: 0,
    wholesaleBottle: 0,
    srpBottle: 0,
    wineryRevenuePerCase: undefined,
    recapGrossProfitPerCase: undefined,
    recap: {},
  };
}

// ---- EURO WINERY -> RETAIL (DIRECT IMPORT, NO IMPORTER/DISTRIBUTOR) ----
function calculateEuroWineryToRetailerDI(input) {
  const casePack = input.casePack || 12;

  // base ex-cellar cost in EUR per case
  const baseExCellarCaseEUR = (input.exCellarBottle || 0) * casePack;

  // convert to USD
  const baseCaseUSD = baseExCellarCaseEUR * (input.exchangeRate || 0);

  const tPct = (input.tariffPercent || 0) / 100;
  const tariffCaseUSD = baseCaseUSD * tPct;

  const diFreightCaseUSD = input.diFreightPerCase || 0;

  // retailer’s landed cost: pays ex-cellar + tariff + DI freight
  const retailerLandedCaseUSD =
    baseCaseUSD + tariffCaseUSD + diFreightCaseUSD;

  const retailerMargin = (input.retailerMarginPercent || 0) / 100;

  // SRP is margin ON selling price, not markup
  const srpCaseUSD =
    retailerMargin >= 1
      ? retailerLandedCaseUSD
      : retailerLandedCaseUSD / (1 - retailerMargin);

  const srpBottleUSD =
    casePack > 0 ? srpCaseUSD / casePack : 0;

  const retailerMarginPerCase = srpCaseUSD - retailerLandedCaseUSD;

  return {
    model: 'Euro_DI_ToRetailer',
    casePack,
    landedCase: retailerLandedCaseUSD,
    wholesaleCase: retailerLandedCaseUSD, // retailer's landed cost
    wholesaleBottle:
      casePack > 0 ? retailerLandedCaseUSD / casePack : 0,
    srpBottle: srpBottleUSD,
    wineryRevenuePerCase: baseCaseUSD,
    recapGrossProfitPerCase: retailerMarginPerCase,
    recap: {
      retailerMarginPerCase,
    },
  };
}

// ---- PRICING MODEL IDENTIFIERS ----
/**
 * @typedef {"Imported_DI_ToDistributor" | "Imported_DI_ToRetailer" | "Imported_SS_ToDistributor" | "Imported_SS_ToRetailer" |
 *           "Euro_DI_ToDistributor" | "Euro_DI_ToRetailer" | "Euro_SS_ToDistributor" | "Euro_SS_ToRetailer" |
 *           "Domestic_Winery_ToDistributor" | "Domestic_Winery_ToRetailer" | "Domestic_Distributor_ToRetailer" |
 *           "Domestic_Supplier_ToDistributor" | "Domestic_Supplier_ToRetailer"} PricingModelId
 */

/**
 * @type {Record<PricingModelId, {
 *   hasFX: boolean;
 *   hasTariff: boolean;
 *   hasDIFreight: boolean;
 *   hasStatesideLogistics: boolean;
 *   hasImporter: boolean;
 *   hasSupplier: boolean;
 *   hasDistributor: boolean;
 *   hasRetailer: boolean;
 * }>
 */

// ---- ROLE ENUMS / TYPES ----
/**
 * Who is using the tool.
 * @typedef {"EuroWinery" | "DomesticWinery" | "Supplier" | "Importer" | "Distributor" | "Retailer"} TradeActor
 */

/**
 * Who they are buying from.
 * @typedef {"EuroWinery" | "DomesticWinery" | "Importer" | "Supplier"} PurchaseFrom
 */

/**
 * Where the inventory physically sits right now.
 * "Euro"  = inventory in Europe (FOB or EU warehouse)
 * "US"    = inventory in the United States (importer or domestic warehouse)
 * @typedef {"Euro" | "US"} InventoryContext
 */

/**
 * Maps the three question UX into a PricingModelId.
 *
 * whoAmI       - one of:  "EuroWinery" | "DomesticWinery" | "Supplier" | "Importer" | "Distributor" | "Retailer"
 * buyingFrom   - one of:  "EuroWinery" | "DomesticWinery" | "Importer" | "Supplier"
 * inventory    - one of:  "Euro" | "US"  (are you buying from Europe or from US based stock)
 *
 * Returns a PricingModelId string, or null if the combination is invalid or unsupported.
 *
 * High level rules:
 * - Importer buys from EuroWinery only.
 * - Supplier buys from DomesticWinery only.
 * - Distributor can buy from EuroWinery, DomesticWinery, Importer, or Supplier.
 * - Retailer can buy from EuroWinery, DomesticWinery, Importer, or Supplier.
 * - Inventory "Euro" means a DI style flow.
 * - Inventory "US" means stateside stock (SS) flows.
 *
 * @param {{ whoAmI: TradeActor; buyingFrom: PurchaseFrom; inventory: InventoryContext }} params
 * @returns {PricingModelId | null}
 */
export function resolvePricingModelIdFromContext({ whoAmI, buyingFrom, inventory }) {
  // Importer pricing flows: importer is setting their sell price to distributors.
  if (whoAmI === "Importer") {
    if (inventory === "Euro_FOB_Winery") {
      // DI scenario: Euro → importer → distributor
      return "ImportedModelDI";
    }
    if (inventory === "Importer_US_Warehouse") {
      // Stateside scenario: Euro → importer US WH → distributor
      return "ImportedModelSS";
    }
  }

  // Euro Winery pricing flows: winery selling to distributor (DI or SS)
  if (whoAmI === "EuroWinery") {
    // Euro Winery selling FOB from Europe → Distributor (DI flow)
    if (inventory === "Euro_FOB_Winery") {
      return "ImportedModelDI";
    }

    // Euro Winery selling pre-landed to Distributor (SS flow)
    if (inventory === "Euro_US_Warehouse") {
      return "ImportedModelSS";
    }
  }

  // Guard invalid combinations early
  if (!whoAmI || !buyingFrom || !inventory) return null;

  // 1. Imported flows - buying from an Importer
  if (buyingFrom === "Importer") {
    if (inventory === "Euro") {
      // Importer is still holding stock in Europe. DI flows.
      if (whoAmI === "Distributor") return "Imported_DI_ToDistributor";
      if (whoAmI === "Retailer")    return "Imported_DI_ToRetailer";
    } else if (inventory === "US") {
      // Importer has already brought stock stateside. SS flows.
      if (whoAmI === "Distributor") return "Imported_SS_ToDistributor";
      if (whoAmI === "Retailer")    return "Imported_SS_ToRetailer";
    }
    return null;
  }

  // 2. Euro winery direct flows (no importer in the middle)
  if (buyingFrom === "EuroWinery") {
    if (inventory === "Euro") {
      // DI style. Distributor or retailer is taking on DI freight and tariffs.
      if (whoAmI === "Distributor") return "Euro_DI_ToDistributor";
      if (whoAmI === "Retailer")    return "Euro_DI_ToRetailer";
    } else if (inventory === "US") {
      // Euro stock already in a US warehouse (could be 3PL or forward warehouse).
      if (whoAmI === "Distributor") return "Euro_SS_ToDistributor";
      if (whoAmI === "Retailer")    return "Euro_SS_ToRetailer";
    }
    return null;
  }

  // 3. Domestic winery flows
  if (buyingFrom === "DomesticWinery") {
    // Domestic is always effectively US inventory for our purposes.
    if (whoAmI === "Distributor") return "Domestic_Winery_ToDistributor";
    if (whoAmI === "Retailer")    return "Domestic_Winery_ToRetailer";

    // Supplier is a layer between Domestic Winery and markets.
    // Supplier buys from Domestic Winery and then sells on to Distributor or Retailer.
    if (whoAmI === "Supplier")    return "Domestic_Supplier_ToDistributor";

    return null;
  }

  // 4. Domestic supplier flows - Distributor or Retailer buying from Supplier
  if (buyingFrom === "Supplier") {
    // Supplier stock is US based by definition here.
    if (whoAmI === "Distributor") return "Domestic_Supplier_ToDistributor";
    if (whoAmI === "Retailer")    return "Domestic_Supplier_ToRetailer";
    return null;
  }

  return null;
}

// ---- EXPORTS ----
export function calculatePricingV2(state) {
  const {
    whoAmI,
    buyingFrom,
    inventory,
    modelId: explicitModelId,
    ...rest
  } = state;

  // Primary: use explicit modelId if provided
  let modelId = explicitModelId || null;

  // Secondary: try to resolve from the actual actor context
  if (!modelId && whoAmI && buyingFrom && inventory) {
    modelId = resolvePricingModelIdFromContext({ whoAmI, buyingFrom, inventory });
  }

  // Fallback: if still null, re-resolve as if the actor were a Distributor
  if (!modelId && buyingFrom && inventory) {
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