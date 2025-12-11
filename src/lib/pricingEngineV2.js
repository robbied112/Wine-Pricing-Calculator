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

  const exCellarBottleUSD = input.exCellarBottle * input.exchangeRate;
  const importerCostCase = exCellarBottleUSD * casePack;

  const importerFOBCase = importerCostCase / (1 - input.importerMarginPercent / 100);

  const tariffCost = importerFOBCase * (input.tariffPercent / 100);
  const distributorLandedCase = importerFOBCase + tariffCost + input.diFreightPerCase;

  const distributorWholesaleCase = distributorLandedCase / (1 - input.distributorMarginPercent / 100);

  const wholesaleBottle = distributorWholesaleCase / casePack;
  const srpBottle = wholesaleBottle / (1 - input.retailerMarginPercent / 100);

  return {
    model: 'ImportedModelDI',
    casePack,
    landedCase: distributorLandedCase,
    wholesaleCase: distributorWholesaleCase,
    wholesaleBottle,
    srpBottle,
    wineryRevenuePerCase: importerCostCase,
    recapGrossProfitPerCase: undefined,
    recap: {
      importerMarginPerCase: importerFOBCase - importerCostCase,
      distributorMarginPerCase: distributorWholesaleCase - distributorLandedCase,
      retailerMarginPerCase: srpBottle * casePack - distributorWholesaleCase,
    },
  };
}

// ---- IMPORTED MODEL SS SALES ----
function calculateImportedModelSS(input) {
  const casePack = input.casePack || 12;

  const exCellarBottleUSD = input.exCellarBottle * input.exchangeRate;
  const importerCostCase = exCellarBottleUSD * casePack;

  const tariffCost = importerCostCase * (input.tariffPercent / 100);
  const landedImporterCase = importerCostCase + tariffCost + input.diFreightPerCase;

  const importerFOBCase = landedImporterCase / (1 - input.importerMarginPercent / 100);

  const distributorLandedCase = importerFOBCase + input.statesideLogisticsPerCase;

  const distributorWholesaleCase = distributorLandedCase / (1 - input.distributorMarginPercent / 100);

  const wholesaleBottle = distributorWholesaleCase / casePack;
  const srpBottle = wholesaleBottle / (1 - input.retailerMarginPercent / 100);

  return {
    model: 'ImportedModelSS',
    casePack,
    landedCase: distributorLandedCase,
    wholesaleCase: distributorWholesaleCase,
    wholesaleBottle,
    srpBottle,
    wineryRevenuePerCase: importerFOBCase,
    recapGrossProfitPerCase: undefined,
    recap: {
      importerMarginPerCase: importerFOBCase - landedImporterCase,
      distributorMarginPerCase: distributorWholesaleCase - distributorLandedCase,
      retailerMarginPerCase: srpBottle * casePack - distributorWholesaleCase,
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
 * @typedef {"EuroWinery" | "DomesticWinery" | "Importer" | "Supplier" | "Distributor" | "Retailer"} TradeActor
 */

/**
 * @typedef {"EuroWinery" | "USWinery" | "Importer" | "Supplier" | "Distributor"} PurchaseFrom
 */

/**
 * @typedef {"Euro_FOB_Winery" | "Euro_US_Warehouse" | "Importer_FOB_Europe" | "Importer_US_Warehouse" | "US_Winery" | "Supplier_Warehouse" | "Distributor_Warehouse"} InventoryContext
 */

// ---- PURE SELECTOR FUNCTION ----
/**
 * Maps the three-question UX into a PricingModelId.
 * @param {{ whoAmI: TradeActor; buyingFrom: PurchaseFrom; inventory: InventoryContext }} params
 * @returns {PricingModelId | null}
 */
export function resolvePricingModelIdFromContext({ whoAmI, buyingFrom, inventory }) {
  if (buyingFrom === "Importer") {
    if (inventory === "Importer_FOB_Europe") {
      if (whoAmI === "Distributor") return "Imported_DI_ToDistributor";
      if (whoAmI === "Retailer") return "Imported_DI_ToRetailer";
    } else if (inventory === "Importer_US_Warehouse") {
      if (whoAmI === "Distributor") return "Imported_SS_ToDistributor";
      if (whoAmI === "Retailer") return "Imported_SS_ToRetailer";
    }
  } else if (buyingFrom === "EuroWinery") {
    if (inventory === "Euro_FOB_Winery") {
      if (whoAmI === "Distributor") return "Euro_DI_ToDistributor";
      if (whoAmI === "Retailer") return "Euro_DI_ToRetailer";
    } else if (inventory === "Euro_US_Warehouse") {
      if (whoAmI === "Distributor") return "Euro_SS_ToDistributor";
      if (whoAmI === "Retailer") return "Euro_SS_ToRetailer";
    }
  } else if (buyingFrom === "USWinery") {
    if (inventory === "US_Winery") {
      if (whoAmI === "Distributor") return "Domestic_Winery_ToDistributor";
      if (whoAmI === "Retailer") return "Domestic_Winery_ToRetailer";
      if (whoAmI === "Supplier") return "Domestic_Supplier_ToDistributor";
    }
  } else if (buyingFrom === "Supplier") {
    if (inventory === "Supplier_Warehouse") {
      if (whoAmI === "Distributor") return "Domestic_Supplier_ToDistributor";
      if (whoAmI === "Retailer") return "Domestic_Supplier_ToRetailer";
    }
  } else if (buyingFrom === "Distributor") {
    if (inventory === "Distributor_Warehouse") {
      if (whoAmI === "Retailer") return "Domestic_Distributor_ToRetailer";
    }
  }
  return null;
}

// ---- EXPORTS ----
export function calculatePricingV2(input) {
  // For now, V2 uses the same core math as the existing engine.
  // We will later extend this to handle the new 13-model matrix.
  return calculatePricing(input);
}