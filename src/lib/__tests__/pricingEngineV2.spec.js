import {
  TradeActor,
  Counterparty,
  InventoryContext,
  calculatePricingV2,
  resolvePricingModelIdFromContext,
} from '../pricingEngineV2.clean';

describe('pricingEngineV2 core scenarios', () => {
  // Helper to build a complete state with sensible defaults
  function makeState(overrides = {}) {
    return {
      whoAmI: TradeActor.DomesticWinery,
      sellingTo: Counterparty.Distributor,
      inventory: InventoryContext.US_Winery,
      exchangeRate: 1.0,
      casePack: 12,
      exCellarBottle: 10.0,
      diFreightPerCase: 13.0,
      tariffPercent: 0.0,
      statesideLogisticsPerCase: 10.0,
      importerMarginPercent: 30.0,
      distributorMarginPercent: 25.0,
      retailerMarginPercent: 33.0,
      ...overrides,
    };
  }

  test('DomesticWinery → Distributor uses margin on selling price', () => {
    const state = makeState({
      whoAmI: TradeActor.DomesticWinery,
      sellingTo: Counterparty.Distributor,
      inventory: InventoryContext.US_Winery,
      exCellarBottle: 10,
      casePack: 12,
      statesideLogisticsPerCase: 10,
      distributorMarginPercent: 25,
      retailerMarginPercent: 33,
    });

    const modelId = resolvePricingModelIdFromContext({
      whoAmI: state.whoAmI,
      sellingTo: state.sellingTo,
      inventory: state.inventory,
    });
    expect(modelId).toBe('Domestic_Winery_ToDistributor');

    const result = calculatePricingV2(state);

    expect(result.model).toBe('DomesticWineryToDistributor');
    // From spec: wholesale case ≈ 173.33, SRP bottle ≈ 21.56
    expect(result.wholesaleCase).toBeCloseTo(173.33, 2);
    expect(result.wholesaleBottle).toBeCloseTo(14.44, 2);
    expect(result.srpBottle).toBeCloseTo(21.56, 2);
    // Distributor and retailer gross profit per case
    expect(result.recap.retailerMarginPerCase).toBeCloseTo(85.37, 2);
  });

  test('DomesticWinery → Retail (self distribution)', () => {
    const state = makeState({
      whoAmI: TradeActor.DomesticWinery,
      sellingTo: Counterparty.Retailer,
      inventory: InventoryContext.US_Winery,
      exCellarBottle: 10,
      casePack: 12,
      statesideLogisticsPerCase: 10,
      retailerMarginPercent: 33,
      distributorMarginPercent: 0,
    });

    const modelId = resolvePricingModelIdFromContext({
      whoAmI: state.whoAmI,
      sellingTo: state.sellingTo,
      inventory: state.inventory,
    });
    expect(modelId).toBe('Domestic_Winery_ToRetailer');

    const result = calculatePricingV2(state);

    expect(result.model).toBe('DomesticWineryToRetail');
    // From spec: wholesale case = 130, SRP bottle ≈ 16.17
    expect(result.wholesaleCase).toBeCloseTo(130.0, 2);
    expect(result.wholesaleBottle).toBeCloseTo(10.83, 2);
    expect(result.srpBottle).toBeCloseTo(16.17, 2);
    expect(result.recap.retailerMarginPerCase).toBeCloseTo(64.03, 2);
  });

  test('Euro winery → importer → distributor, DI (ImportedModelDI)', () => {
    const state = makeState({
      whoAmI: TradeActor.EuroWinery,
      sellingTo: Counterparty.Distributor,
      inventory: InventoryContext.Euro_FOB_Winery,
      exCellarBottle: 5,
      casePack: 12,
      exchangeRate: 1.16,
      diFreightPerCase: 13,
      tariffPercent: 15,
      importerMarginPercent: 30,
      distributorMarginPercent: 30,
      retailerMarginPercent: 33,
    });

    const modelId = resolvePricingModelIdFromContext({
      whoAmI: state.whoAmI,
      sellingTo: state.sellingTo,
      inventory: state.inventory,
    });
    expect(modelId).toBe('ImportedModelDI');

    const result = calculatePricingV2(state);

    expect(result.model).toBe('ImportedModelDI');
    // From spec: wholesale case ≈ 181.92, SRP bottle ≈ 22.63
    expect(result.wholesaleCase).toBeCloseTo(181.92, 2);
    expect(result.wholesaleBottle).toBeCloseTo(15.16, 2);
    expect(result.srpBottle).toBeCloseTo(22.63, 2);
    // Distributor GP per case
    expect(result.recapGrossProfitPerCase).toBeCloseTo(54.58, 2);
    // Retailer GP per case
    expect(result.recap.retailerMarginPerCase).toBeCloseTo(89.60, 2);
  });

  test('Importer → Distributor, Euro FOB (Winery) resolves to ImportedModelDI', () => {
    const state = makeState({
      whoAmI: TradeActor.Importer,
      sellingTo: Counterparty.Distributor,
      inventory: InventoryContext.Euro_FOB_Winery,
      exCellarBottle: 5,
      casePack: 12,
      exchangeRate: 1.16,
      diFreightPerCase: 13,
      tariffPercent: 15,
      importerMarginPercent: 30,
      distributorMarginPercent: 30,
      retailerMarginPercent: 33,
    });

    const modelId = resolvePricingModelIdFromContext({
      whoAmI: state.whoAmI,
      sellingTo: state.sellingTo,
      inventory: state.inventory,
    });
    expect(modelId).toBe('ImportedModelDI');

    const result = calculatePricingV2(state);
    expect(result.model).toBe('ImportedModelDI');
    expect(result.wholesaleCase).toBeGreaterThan(0);
    expect(result.srpBottle).toBeGreaterThan(0);
  });

  test('Resolver tolerates inventory label strings (Euro FOB (Winery))', () => {
    const modelId = resolvePricingModelIdFromContext({
      whoAmI: TradeActor.Importer,
      sellingTo: Counterparty.Distributor,
      inventory: 'Euro FOB (Winery)',
    });
    expect(modelId).toBe('ImportedModelDI');
  });

  test('Euro winery → importer WH → distributor, stateside (ImportedModelSS)', () => {
    const state = makeState({
      whoAmI: TradeActor.EuroWinery,
      sellingTo: Counterparty.Distributor,
      inventory: InventoryContext.US_Importer_WH,
      exCellarBottle: 5,
      casePack: 12,
      exchangeRate: 1.16,
      diFreightPerCase: 13,
      tariffPercent: 15,
      statesideLogisticsPerCase: 10,
      importerMarginPercent: 30,
      distributorMarginPercent: 30,
      retailerMarginPercent: 33,
    });

    const modelId = resolvePricingModelIdFromContext({
      whoAmI: state.whoAmI,
      sellingTo: state.sellingTo,
      inventory: state.inventory,
    });
    expect(modelId).toBe('ImportedModelSS');

    const result = calculatePricingV2(state);

    expect(result.model).toBe('ImportedModelSS');
    // From spec: wholesale case ≈ 204.16, SRP bottle ≈ 25.39
    expect(result.wholesaleCase).toBeCloseTo(204.16, 2);
    expect(result.wholesaleBottle).toBeCloseTo(17.01, 2);
    expect(result.srpBottle).toBeCloseTo(25.39, 2);
    expect(result.recapGrossProfitPerCase).toBeCloseTo(61.25, 2);
    expect(result.recap.retailerMarginPerCase).toBeCloseTo(100.56, 2);
  });

  test('Euro winery → retailer direct, DI (Euro_DI_ToRetailer)', () => {
    const state = makeState({
      whoAmI: TradeActor.EuroWinery,
      sellingTo: Counterparty.Retailer,
      inventory: InventoryContext.Euro_FOB_Winery,
      exCellarBottle: 5,
      casePack: 12,
      exchangeRate: 1.16,
      diFreightPerCase: 13,
      tariffPercent: 15,
      retailerMarginPercent: 33,
      // importer and distributor margins should be ignored in this path
      importerMarginPercent: 0,
      distributorMarginPercent: 0,
    });

    const modelId = resolvePricingModelIdFromContext({
      whoAmI: state.whoAmI,
      sellingTo: state.sellingTo,
      inventory: state.inventory,
    });
    expect(modelId).toBe('Euro_DI_ToRetailer');

    const result = calculatePricingV2(state);

    expect(result.model).toBe('Euro_DI_ToRetailer');
    // From spec: wholesale case ≈ 93.04, SRP bottle ≈ 11.57
    expect(result.wholesaleCase).toBeCloseTo(93.04, 2);
    expect(result.wholesaleBottle).toBeCloseTo(7.75, 2);
    expect(result.srpBottle).toBeCloseTo(11.57, 2);
    expect(result.recap.retailerMarginPerCase).toBeCloseTo(45.83, 2);
  });

  test('Back-compat: calculatePricingV2 accepts buyingFrom when sellingTo is missing', () => {
    const state = makeState({
      whoAmI: TradeActor.EuroWinery,
      sellingTo: null,
      buyingFrom: Counterparty.Retailer,
      inventory: InventoryContext.Euro_FOB_Winery,
      exCellarBottle: 5,
      casePack: 12,
      exchangeRate: 1.16,
      diFreightPerCase: 13,
      tariffPercent: 15,
      retailerMarginPercent: 33,
      importerMarginPercent: 0,
      distributorMarginPercent: 0,
    });

    const result = calculatePricingV2(state);
    expect(result.model).toBe('Euro_DI_ToRetailer');
  });

  test('Distributor → Retailer resolves and calculates (Distributor_ToRetailer)', () => {
    const state = makeState({
      whoAmI: TradeActor.Distributor,
      sellingTo: Counterparty.Retailer,
      inventory: InventoryContext.US_Distributor_WH,
      exCellarBottle: 10,
      casePack: 12,
      statesideLogisticsPerCase: 10,
      distributorMarginPercent: 30,
      retailerMarginPercent: 33,
    });

    const modelId = resolvePricingModelIdFromContext({
      whoAmI: state.whoAmI,
      sellingTo: state.sellingTo,
      inventory: state.inventory,
    });
    expect(modelId).toBe('Distributor_ToRetailer');

    const result = calculatePricingV2(state);
    expect(result.model).toBe('Distributor_ToRetailer');
    expect(result.wholesaleCase).toBeGreaterThan(0);
    expect(result.srpBottle).toBeGreaterThan(0);
  });

  test('calculatePricingV2 trims modelId (guards against UnknownModel)', () => {
    const state = makeState({
      modelId: 'ImportedModelDI ',
      whoAmI: TradeActor.Importer,
      sellingTo: Counterparty.Distributor,
      inventory: InventoryContext.Euro_FOB_Winery,
      exCellarBottle: 5,
      casePack: 12,
      exchangeRate: 1.16,
      diFreightPerCase: 13,
      tariffPercent: 15,
      importerMarginPercent: 30,
      distributorMarginPercent: 30,
      retailerMarginPercent: 33,
    });

    const result = calculatePricingV2(state);
    expect(result.model).toBe('ImportedModelDI');
    expect(result.wholesaleCase).toBeGreaterThan(0);
  });
});