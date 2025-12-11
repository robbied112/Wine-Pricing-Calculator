import React, { useState, useEffect } from 'react';
import {
  calculatePricingV2,
  BusinessType,
  InventoryLocation,
  SellTo,
  RecapActor,
} from '../lib/pricingEngineV2';

function resolveModel(state) {
  const { businessType, inventoryLocation, sellTo } = state;

  if (businessType === BusinessType.DomesticWinery) {
    if (sellTo === SellTo.Distributor) return 'DomesticWineryToDistributor';
    if (sellTo === SellTo.Retailer) return 'DomesticWineryToRetail';
  }

  if (businessType === BusinessType.Imported) {
    if (inventoryLocation === InventoryLocation.EuroWinery && sellTo === SellTo.Distributor) {
      return 'ImportedModelDI';
    }
    if (inventoryLocation === InventoryLocation.USImporterWH && sellTo === SellTo.Distributor) {
      return 'ImportedModelSS';
    }
  }

  return 'UnknownModel';
}

const visibleFields = {
  DomesticWineryToDistributor: [
    'exCellarBottle',
    'casePack',
    'statesideLogisticsPerCase',
    'distributorMarginPercent',
    'retailerMarginPercent',
  ],
  DomesticWineryToRetail: [
    'exCellarBottle',
    'casePack',
    'statesideLogisticsPerCase',
    'retailerMarginPercent',
  ],
  ImportedModelDI: [
    'exCellarBottle',
    'casePack',
    'exchangeRate',
    'tariffPercent',
    'diFreightPerCase',
    'importerMarginPercent',
    'distributorMarginPercent',
    'retailerMarginPercent',
  ],
  ImportedModelSS: [
    'exCellarBottle',
    'casePack',
    'exchangeRate',
    'tariffPercent',
    'diFreightPerCase',
    'statesideLogisticsPerCase',
    'importerMarginPercent',
    'distributorMarginPercent',
    'retailerMarginPercent',
  ],
};

const ExperimentalPricingV2 = () => {
  const [state, setState] = useState({
    businessType: BusinessType.DomesticWinery,
    inventoryLocation: InventoryLocation.USWinery,
    sellTo: SellTo.Distributor,
    recapActor: RecapActor.Supplier,
    currency: 'USD',
    exchangeRate: 1.0,
    casePack: 12,
    bottleSizeMl: 750,
    exCellarBottle: 10.0,
    diFreightPerCase: 13.0,
    tariffPercent: 0.0,
    statesideLogisticsPerCase: 10.0,
    wineryMarginPercent: 20.0,
    importerMarginPercent: 15.0,
    distributorMarginPercent: 25.0,
    retailerMarginPercent: 33.0,
  });

  const allowedSellTo = {
    [BusinessType.DomesticWinery]: [SellTo.Distributor, SellTo.Retailer],
    [BusinessType.Imported]: [SellTo.Distributor], // for now, only Distributor is supported
  };

  useEffect(() => {
    const allowed = allowedSellTo[state.businessType] ?? [];
    if (!allowed.includes(state.sellTo) && allowed.length > 0) {
      setState((prev) => ({
        ...prev,
        sellTo: allowed[0],
      }));
    }
  }, [state.businessType]);

  useEffect(() => {
    if (
      state.businessType === BusinessType.DomesticWinery &&
      state.sellTo === SellTo.Retailer &&
      state.distributorMarginPercent !== 0
    ) {
      setState((prev) => ({ ...prev, distributorMarginPercent: 0 }));
    }
  }, [state.businessType, state.sellTo]);

  const activeModel = resolveModel(state);
  const allFields = [
    'exCellarBottle',
    'casePack',
    'exchangeRate',
    'tariffPercent',
    'diFreightPerCase',
    'statesideLogisticsPerCase',
    'importerMarginPercent',
    'distributorMarginPercent',
    'retailerMarginPercent',
  ];
  const show = (field) => {
    const fieldsForModel = visibleFields[activeModel];
    if (!fieldsForModel) {
      // unknown model, show all fields for safety
      return allFields.includes(field);
    }
    return fieldsForModel.includes(field);
  };
  const output = calculatePricingV2(state);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <header className="flex items-center gap-3">
        <button
          onClick={() => console.log('Switch to Default Calculator')}
          className="px-4 py-2 text-sm font-medium rounded-full bg-slate-200 hover:bg-slate-300"
        >
          Default Calculator
        </button>
        <button
          onClick={() => console.log('Switch to Experimental V2')}
          className="px-4 py-2 text-sm font-medium rounded-full bg-slate-900 text-white hover:bg-slate-700"
        >
          Experimental V2
        </button>
      </header>

      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <label className="text-sm font-medium text-slate-800">
            Business Type
            <select
              value={state.businessType}
              onChange={(e) =>
                setState((prev) => ({ ...prev, businessType: e.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
            >
              {Object.values(BusinessType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-800">
            Inventory Location
            <select
              value={state.inventoryLocation}
              onChange={(e) =>
                setState((prev) => ({ ...prev, inventoryLocation: e.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
            >
              {Object.values(InventoryLocation).map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-800">
            Selling To
            <select
              value={state.sellTo}
              onChange={(e) =>
                setState((prev) => ({ ...prev, sellTo: e.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
            >
              {allowedSellTo[state.businessType]?.map((sellTo) => (
                <option key={sellTo} value={sellTo}>
                  {sellTo}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-800">
            Recap View
            <select
              value={state.recapActor}
              onChange={(e) =>
                setState((prev) => ({ ...prev, recapActor: e.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
            >
              {Object.values(RecapActor).map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {show('exCellarBottle') && (
            <label className="text-sm font-medium text-slate-800">
              Ex-Cellar Bottle
              <input
                type="number"
                value={state.exCellarBottle}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, exCellarBottle: parseFloat(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {show('casePack') && (
            <label className="text-sm font-medium text-slate-800">
              Case Pack
              <div className="flex items-center gap-2 mb-2">
                {[1, 3, 6, 12, 24].map((size) => (
                  <button
                    key={size}
                    onClick={() => setState((prev) => ({ ...prev, casePack: size }))
                    }
                    className={`px-3 py-1 rounded-md text-sm font-medium border ${
                      state.casePack === size
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {size}
                  </button>
                ))}
                <button
                  onClick={() => document.getElementById('casePackInput').focus()}
                  className="px-3 py-1 rounded-md text-sm font-medium border bg-slate-200 text-slate-700"
                >
                  Custom
                </button>
              </div>
              <input
                id="casePackInput"
                type="number"
                value={state.casePack}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, casePack: parseInt(e.target.value, 10) || 1 }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {show('exchangeRate') && (
            <label className="text-sm font-medium text-slate-800">
              Exchange Rate
              <input
                type="number"
                value={state.exchangeRate}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, exchangeRate: parseFloat(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {show('tariffPercent') && (
            <label className="text-sm font-medium text-slate-800">
              Tariff Percent
              <input
                type="number"
                value={state.tariffPercent}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, tariffPercent: parseFloat(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {show('diFreightPerCase') && (
            <label className="text-sm font-medium text-slate-800">
              DI Freight Per Case
              <input
                type="number"
                value={state.diFreightPerCase}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, diFreightPerCase: parseFloat(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          {show('statesideLogisticsPerCase') && (
            <label className="text-sm font-medium text-slate-800">
              Stateside Logistics Per Case
              <input
                type="number"
                value={state.statesideLogisticsPerCase}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, statesideLogisticsPerCase: parseFloat(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}

          <label className="text-sm font-medium text-slate-800">
            Distributor Margin Percent
            <input
              type="number"
              value={state.distributorMarginPercent}
              onChange={(e) =>
                setState((prev) => ({ ...prev, distributorMarginPercent: parseFloat(e.target.value) }))
              }
              disabled={
                state.businessType === BusinessType.DomesticWinery &&
                state.sellTo === SellTo.Retailer
              }
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70 ${
                state.businessType === BusinessType.DomesticWinery &&
                state.sellTo === SellTo.Retailer
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'border-slate-300'
              }`}
            />
          </label>
          <label className="text-sm font-medium text-slate-800">
            Retailer Margin Percent
            <input
              type="number"
              value={state.retailerMarginPercent}
              onChange={(e) =>
                setState((prev) => ({ ...prev, retailerMarginPercent: parseFloat(e.target.value) }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
            />
          </label>
          {show('importerMarginPercent') && (
            <label className="text-sm font-medium text-slate-800">
              Importer Margin Percent
              <input
                type="number"
                value={state.importerMarginPercent}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    importerMarginPercent: parseFloat(e.target.value),
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/70"
              />
            </label>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Results</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Model</span>
            <span className="font-semibold text-slate-900">{output.model || '-'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Wholesale Case</span>
            <span className="font-semibold text-slate-900">
              {output.wholesaleCase?.toFixed(2) || '-'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Wholesale Bottle</span>
            <span className="font-semibold text-slate-900">
              {output.wholesaleBottle?.toFixed(2) || '-'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">SRP Bottle</span>
            <span className="font-semibold text-slate-900">
              {output.srpBottle?.toFixed(2) || '-'}
            </span>
          </div>
          {state.businessType === BusinessType.DomesticWinery && state.recapActor === RecapActor.Supplier ? (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Recap Revenue Per Case</span>
              <span className="font-semibold text-slate-900">
                {output.wineryRevenuePerCase?.toFixed(2) || '-'}
              </span>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Recap Gross Profit Per Case</span>
              <span className="font-semibold text-slate-900">
                {output.recapGrossProfitPerCase?.toFixed(2) || '-'}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Retailer Margin Per Case</span>
            <span className="font-semibold text-slate-900">
              {output.recap?.retailerMarginPerCase?.toFixed(2) || '-'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExperimentalPricingV2;