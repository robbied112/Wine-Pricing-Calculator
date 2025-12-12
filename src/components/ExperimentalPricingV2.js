import React, { useState, useMemo } from 'react';
import {
  TradeActor,
  PurchaseFrom,
  InventoryContext,
  RecapActor,
  calculatePricingV2,
  resolvePricingModelIdFromContext,
} from '../lib/pricingEngineV2';

const warehouseLabels = {
  Euro_FOB_Winery: 'Euro FOB (Winery)',
  Euro_US_Warehouse: 'US Warehouse (Euro Stock)',

  Importer_FOB_Europe: 'Euro FOB (Importer)',
  Importer_US_Warehouse: 'US Warehouse',

  Supplier_Warehouse: 'US Warehouse',
  Distributor_Warehouse: 'US Warehouse',
  US_Winery: 'US Winery',
};

const allowedWarehouses = {
  EuroWinery: [
    InventoryContext.Euro_FOB_Winery,
    InventoryContext.Euro_US_Warehouse,
  ],
  Importer: [
    InventoryContext.Importer_FOB_Europe,
    InventoryContext.Importer_US_Warehouse,
  ],
  Distributor: [InventoryContext.Distributor_Warehouse],
  DomesticWinery: [InventoryContext.US_Winery],
  Supplier: [InventoryContext.Supplier_Warehouse],
  Retailer: [InventoryContext.Distributor_Warehouse],
};

const roleVisibility = {
  EuroWinery: {
    exCellarBottle: true,
    exchangeRate: true,
    tariffPercent: true,
    diFreightPerCase: true,
    statesideLogisticsPerCase: false,
    importerMarginPercent: true,
    distributorMarginPercent: true,
    retailerMarginPercent: true,
  },
  Importer: {
    exCellarBottle: true,
    exchangeRate: true,
    tariffPercent: true,
    diFreightPerCase: true,
    statesideLogisticsPerCase: true,
    importerMarginPercent: true,
    distributorMarginPercent: true,
    retailerMarginPercent: true,
  },
  Distributor: {
    exCellarBottle: false,
    exchangeRate: false,
    tariffPercent: false,
    diFreightPerCase: false,
    statesideLogisticsPerCase: true,
    importerMarginPercent: false,
    distributorMarginPercent: true,
    retailerMarginPercent: true,
  },
  DomesticWinery: {
    exCellarBottle: true,
    exchangeRate: false,
    tariffPercent: false,
    diFreightPerCase: false,
    statesideLogisticsPerCase: true,
    importerMarginPercent: false,
    distributorMarginPercent: true,
    retailerMarginPercent: true,
  },
  Supplier: {
    exCellarBottle: true,
    exchangeRate: false,
    tariffPercent: false,
    diFreightPerCase: false,
    statesideLogisticsPerCase: true,
    importerMarginPercent: false,
    distributorMarginPercent: true,
    retailerMarginPercent: true,
  },
  Retailer: {
    exCellarBottle: false,
    exchangeRate: false,
    tariffPercent: false,
    diFreightPerCase: false,
    statesideLogisticsPerCase: true,
    importerMarginPercent: false,
    distributorMarginPercent: false,
    retailerMarginPercent: true,
  },
};

function getFieldVisibility(role) {
  return roleVisibility[role] || {};
}

const ExperimentalPricingV2 = () => {
  const [state, setState] = useState({
    // 3-question context
    whoAmI: TradeActor.Distributor,
    buyingFrom: PurchaseFrom.EuroWinery,
    inventory: InventoryContext.Euro_FOB_Winery,

    // recap view
    recapActor: RecapActor.Supplier,

    // numeric inputs
    exCellarBottle: 5,
    casePack: 12,
    exchangeRate: 1.16,
    tariffPercent: 15,
    diFreightPerCase: 13,
    statesideLogisticsPerCase: 10,
    importerMarginPercent: 30,
    distributorMarginPercent: 30,
    retailerMarginPercent: 33,
  });

  const handleNumberChange = (field) => (e) => {
    const value = parseFloat(e.target.value);
    setState((prev) => ({
      ...prev,
      [field]: Number.isNaN(value) ? 0 : value,
    }));
  };

  const handleIntChange = (field) => (e) => {
    const value = parseInt(e.target.value, 10);
    setState((prev) => ({
      ...prev,
      [field]: Number.isNaN(value) ? 0 : value,
    }));
  };

  const handleSelectChange = (field) => (e) => {
    const value = e.target.value;
    setState((prev) => {
      const newState = { ...prev, [field]: value };

      if (field === 'whoAmI') {
        // Reset sellTo and inventory based on whoAmI
        newState.buyingFrom = null;
        newState.inventory = null;
      }

      if (field === 'buyingFrom') {
        // Reset inventory if sellTo changes
        newState.inventory = null;
      }

      // Auto-fill or constrain inventoryLocation based on role and sellTo
      if (field === 'whoAmI' || field === 'buyingFrom') {
        switch (newState.whoAmI) {
          case TradeActor.EuroWinery:
            newState.inventory =
              newState.buyingFrom === PurchaseFrom.Distributor
                ? InventoryContext.Distributor_Warehouse
                : InventoryContext.Euro_FOB_Winery;
            break;
          case TradeActor.Importer:
            newState.inventory =
              newState.buyingFrom === PurchaseFrom.Distributor
                ? InventoryContext.Importer_US_Warehouse
                : InventoryContext.Euro_FOB_Winery;
            break;
          case TradeActor.Distributor:
            newState.inventory = InventoryContext.Distributor_Warehouse;
            break;
          case TradeActor.DomesticWinery:
            newState.inventory = InventoryContext.US_Winery;
            break;
          case TradeActor.Supplier:
            newState.inventory = InventoryContext.Supplier_Warehouse;
            break;
          default:
            break;
        }
      }

      return newState;
    });
  };

  const filteredSellToOptions = useMemo(() => {
    switch (state.whoAmI) {
      case TradeActor.EuroWinery:
        return [PurchaseFrom.Importer, PurchaseFrom.Distributor];
      case TradeActor.Importer:
        return [PurchaseFrom.Distributor];
      case TradeActor.Distributor:
        return [PurchaseFrom.Retailer];
      case TradeActor.DomesticWinery:
        return [PurchaseFrom.Distributor, PurchaseFrom.Retailer];
      case TradeActor.Supplier:
        return [PurchaseFrom.Distributor, PurchaseFrom.Retailer];
      default:
        return Object.values(PurchaseFrom);
    }
  }, [state.whoAmI]);

  const filteredWarehouseOptions = useMemo(() => {
    return allowedWarehouses[state.whoAmI] || [];
  }, [state.whoAmI]);

  const recapViewOptions = [
    { value: RecapActor.Supplier, label: 'Winery Revenue' },
    { value: RecapActor.Importer, label: 'Importer Margin' },
    { value: RecapActor.Distributor, label: 'Distributor Margin' },
    { value: RecapActor.Retailer, label: 'Retailer Margin' },
  ];

  const modelId = useMemo(
    () =>
      resolvePricingModelIdFromContext({
        whoAmI: state.whoAmI,
        buyingFrom: state.buyingFrom,
        inventory: state.inventory,
      }),
    [state.whoAmI, state.buyingFrom, state.inventory]
  );

  const output = useMemo(
    () => calculatePricingV2({ ...state, modelId }),
    [state, modelId]
  );

  const formatMoney = (value) => {
    if (value == null || Number.isNaN(value)) return '-';
    return value.toFixed(2);
  };

  const visibility = getFieldVisibility(state.whoAmI);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* 3-question config */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Inputs</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <label className="text-sm font-medium text-slate-800">
            Who are you?
            <select
              value={state.whoAmI}
              onChange={handleSelectChange('whoAmI')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
            >
              {Object.values(TradeActor).map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-800">
            Who are you selling to?
            <select
              value={state.buyingFrom}
              onChange={handleSelectChange('buyingFrom')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
            >
              {filteredSellToOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-800">
            Where is the inventory?
            <select
              value={state.inventory}
              onChange={handleSelectChange('inventory')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
            >
              {filteredWarehouseOptions.map((ctx) => (
                <option key={ctx} value={ctx}>
                  {warehouseLabels[ctx] || ctx}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Numeric inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibility.exCellarBottle && (
            <label className="text-sm font-medium text-slate-800">
              Ex-Cellar Bottle
              <input
                type="number"
                step="0.01"
                value={state.exCellarBottle}
                onChange={handleNumberChange('exCellarBottle')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {visibility.exchangeRate && (
            <label className="text-sm font-medium text-slate-800">
              Exchange Rate
              <input
                type="number"
                step="0.0001"
                value={state.exchangeRate}
                onChange={handleNumberChange('exchangeRate')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {visibility.tariffPercent && (
            <label className="text-sm font-medium text-slate-800">
              Tariff Percent
              <input
                type="number"
                step="0.1"
                value={state.tariffPercent}
                onChange={handleNumberChange('tariffPercent')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {visibility.diFreightPerCase && (
            <label className="text-sm font-medium text-slate-800">
              DI Freight Per Case
              <input
                type="number"
                step="0.01"
                value={state.diFreightPerCase}
                onChange={handleNumberChange('diFreightPerCase')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {visibility.statesideLogisticsPerCase && (
            <label className="text-sm font-medium text-slate-800">
              Stateside Logistics Per Case
              <input
                type="number"
                step="0.01"
                value={state.statesideLogisticsPerCase}
                onChange={handleNumberChange('statesideLogisticsPerCase')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {visibility.importerMarginPercent && (
            <label className="text-sm font-medium text-slate-800">
              Importer Margin Percent
              <input
                type="number"
                step="0.1"
                value={state.importerMarginPercent}
                onChange={handleNumberChange('importerMarginPercent')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {visibility.distributorMarginPercent && (
            <label className="text-sm font-medium text-slate-800">
              Distributor Margin Percent
              <input
                type="number"
                step="0.1"
                value={state.distributorMarginPercent}
                onChange={handleNumberChange('distributorMarginPercent')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {visibility.retailerMarginPercent && (
            <label className="text-sm font-medium text-slate-800">
              Retailer Margin Percent
              <input
                type="number"
                step="0.1"
                value={state.retailerMarginPercent}
                onChange={handleNumberChange('retailerMarginPercent')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          <label className="text-sm font-medium text-slate-800">
            Recap View
            <select
              value={state.recapActor}
              onChange={handleSelectChange('recapActor')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
            >
              {recapViewOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Results */}
      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Results</h2>
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Resolved model</span>
            <span className="font-semibold text-slate-900">
              {output.model || modelId || 'UnknownModel'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Wholesale Case</span>
            <span className="font-semibold text-slate-900">
              {formatMoney(output.wholesaleCase)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Wholesale Bottle</span>
            <span className="font-semibold text-slate-900">
              {formatMoney(output.wholesaleBottle)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">SRP Bottle</span>
            <span className="font-semibold text-slate-900">
              {formatMoney(output.srpBottle)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">
              {state.recapActor === RecapActor.Supplier
                ? 'Winery Revenue Per Case'
                : 'Recap Gross Profit Per Case'}
            </span>
            <span className="font-semibold text-slate-900">
              {state.recapActor === RecapActor.Supplier
                ? formatMoney(output.wineryRevenuePerCase)
                : formatMoney(output.recapGrossProfitPerCase)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Retailer Margin Per Case</span>
            <span className="font-semibold text-slate-900">
              {formatMoney(output.recap?.retailerMarginPerCase)}
            </span>
          </div>
        </div>

        {/* Optional debug JSON - comment out if you don't want it */}
        {/* <pre className="mt-4 text-xs bg-slate-50 rounded-md p-3 overflow-x-auto">
          {JSON.stringify(output, null, 2)}
        </pre> */}
      </section>
    </div>
  );
};

export default ExperimentalPricingV2;