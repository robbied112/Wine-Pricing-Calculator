import type { MarketConfig } from '../types';

export const US_IMPORT: MarketConfig = {
  id: 'us-import',
  name: 'US Import',
  flag: '🇺🇸',
  region: 'Americas',
  description: 'European or international wine imported into the US three-tier system.',

  currency: {
    source: 'EUR',
    target: 'USD',
    symbol: '$',
    sourceSymbol: '€',
    needsConversion: true,
  },

  chain: [
    {
      id: 'importer',
      role: 'importer',
      label: 'Importer',
      marginLabel: 'Importer margin',
      marginMode: 'on_selling',
      defaultMargin: 30,
    },
    {
      id: 'distributor',
      role: 'distributor',
      label: 'Distributor',
      marginLabel: 'Distributor margin',
      marginMode: 'on_selling',
      defaultMargin: 30,
    },
    {
      id: 'retailer',
      role: 'retailer',
      label: 'Retailer',
      marginLabel: 'Retailer margin',
      marginMode: 'on_selling',
      defaultMargin: 33,
    },
  ],

  taxes: [
    {
      id: 'tariff',
      label: 'Import Tariff',
      inputLabel: 'Tariff rate',
      type: 'percent_of_value',
      defaultValue: 15,
      timing: 'after:importer',
      editable: true,
      formatAs: 'percent',
    },
  ],

  logistics: [
    {
      id: 'di-freight',
      label: 'DI Freight',
      type: 'per_case',
      defaultValue: 13,
      afterLayer: 'importer',
      editable: true,
    },
    {
      id: 'stateside',
      label: 'Stateside Logistics',
      type: 'per_case',
      defaultValue: 10,
      afterLayer: 'importer',
      editable: true,
    },
  ],

  requiresAbv: false,
  requiresBottleSize: false,

  defaults: {
    costPerBottle: 5,
    casePack: 12,
    bottleSizeMl: 750,
    abv: 13,
    exchangeRate: 1.08,
    exchangeBuffer: 2,
  },
};
