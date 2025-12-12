import React, { useState, useMemo } from 'react';
import {
  TradeActor,
  Counterparty,
  InventoryContext,
  RecapActor,
  calculatePricingV2,
  resolvePricingModelIdFromContext,
} from '../lib/pricingEngineV2.clean';


const warehouseLabels = {
  [InventoryContext.Euro_FOB_Winery]: 'Euro FOB (Winery)',
  [InventoryContext.Euro_Warehouse]: 'Euro Warehouse',
  [InventoryContext.US_Importer_WH]: 'US Warehouse - Imported',
  [InventoryContext.US_Distributor_WH]: 'US Warehouse',
  [InventoryContext.US_Winery]: 'US Winery',
  [InventoryContext.US_Supplier_WH]: 'US Warehouse',
};

const allowedWarehouses = {
  [TradeActor.EuroWinery]: [
    InventoryContext.Euro_FOB_Winery,
    InventoryContext.US_Importer_WH,
  ],
  [TradeActor.Importer]: [
    InventoryContext.Euro_FOB_Winery,
    InventoryContext.US_Importer_WH,
  ],
  [TradeActor.Distributor]: [InventoryContext.US_Distributor_WH],
  [TradeActor.DomesticWinery]: [InventoryContext.US_Winery],
  [TradeActor.Supplier]: [InventoryContext.US_Supplier_WH],
  [TradeActor.Retailer]: [InventoryContext.US_Distributor_WH],
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
    exCellarBottle: true,
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

const numericFields = [
  'exCellarBottle',
  'exchangeRate',
  'tariffPercent',
  'diFreightPerCase',
  'statesideLogisticsPerCase',
  'importerMarginPercent',
  'distributorMarginPercent',
  'retailerMarginPercent',
];

function sanitizeStateForRole(prevState, newRole) {
  const visibility = getFieldVisibility(newRole);
  const nextState = { ...prevState, whoAmI: newRole };

  numericFields.forEach((field) => {
    if (!visibility[field]) {
      nextState[field] = 0;
    }
  });

  return nextState;
}

const ExperimentalPricingV2 = () => {
  const [state, setState] = useState({
    whoAmI: TradeActor.Distributor,
    sellingTo: Counterparty.Retailer,
    inventory: InventoryContext.US_Distributor_WH,

    recapActor: RecapActor.Supplier,

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
      let newState = { ...prev, [field]: value };

      if (field === 'whoAmI') {
        const role = value;

        newState = sanitizeStateForRole(prev, role);

        // Set a sensible default downstream counterparty for the role.
        // Avoids state.sellingTo being empty while the select shows the first option.
        switch (role) {
          case TradeActor.EuroWinery:
          case TradeActor.Importer:
          case TradeActor.DomesticWinery:
          case TradeActor.Supplier:
            newState.sellingTo = Counterparty.Distributor;
            break;
          case TradeActor.Distributor:
            newState.sellingTo = Counterparty.Retailer;
            break;
          case TradeActor.Retailer:
            newState.sellingTo = '';
            break;
          default:
            newState.sellingTo = '';
            break;
        }
        newState.inventory = null;

        switch (role) {
          case TradeActor.EuroWinery:
            newState.inventory = InventoryContext.Euro_FOB_Winery;
            break;
          case TradeActor.Importer:
            newState.inventory = InventoryContext.Euro_FOB_Winery;
            break;
          case TradeActor.Distributor:
            newState.inventory = InventoryContext.US_Distributor_WH;
            break;
          case TradeActor.DomesticWinery:
            newState.inventory = InventoryContext.US_Winery;
            break;
          case TradeActor.Supplier:
            newState.inventory = InventoryContext.US_Supplier_WH;
            break;
          case TradeActor.Retailer:
            newState.inventory = InventoryContext.US_Distributor_WH;
            break;
          default:
            break;
        }
      }

      return newState;
    });
  };

  const filteredSellingToOptions = useMemo(() => {
    switch (state.whoAmI) {
      case TradeActor.EuroWinery:
        return [
          Counterparty.Importer,
          Counterparty.Distributor,
          Counterparty.Retailer,
        ];
      case TradeActor.Importer:
        return [Counterparty.Distributor, Counterparty.Retailer];
      case TradeActor.Distributor:
        return [Counterparty.Retailer];
      case TradeActor.DomesticWinery:
        return [
          Counterparty.Distributor,
          Counterparty.Retailer,
          Counterparty.Supplier,
        ];
      case TradeActor.Supplier:
        return [Counterparty.Distributor, Counterparty.Retailer];
      case TradeActor.Retailer:
        return []; // no downstream in this tool
      default:
        return [];
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
        sellingTo: state.sellingTo,
        inventory: state.inventory,
      }),
    [state.whoAmI, state.sellingTo, state.inventory]
  );

  const output = useMemo(() => calculatePricingV2({ ...state, modelId }), [
    state,
    modelId,
  ]);

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
              value={state.sellingTo || ''}
              onChange={handleSelectChange('sellingTo')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              disabled={filteredSellingToOptions.length === 0}
            >
              {filteredSellingToOptions.length === 0 ? (
                <option value="">No options</option>
              ) : (
                filteredSellingToOptions.map((cp) => (
                  <option key={cp} value={cp}>
                    {cp}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-800">
            Where is the inventory?
            <select
              value={state.inventory || ''}
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

          <label className="text-sm font-medium text-slate-800">
            Case Pack
            <input
              type="number"
              step="1"
              value={state.casePack}
              onChange={handleIntChange('casePack')}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
            />
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
      </section>
    </div>
  );
};

export default ExperimentalPricingV2;