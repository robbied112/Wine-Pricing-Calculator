import type { MarketConfig } from '../types';

/**
 * UK Import Market
 *
 * UK wine duty is a flat rate per bottle (based on ABV band).
 * VAT at 20% is applied on the final retail price (inclusive).
 * The standard duty rate for still wine 11.5–14.5% ABV is £2.67/75cl bottle.
 */
export const UK_IMPORT: MarketConfig = {
  id: 'uk-import',
  name: 'UK Import',
  flag: '🇬🇧',
  region: 'Europe',
  description: 'Wine imported into the UK market. Includes wine duty (per bottle) and VAT at 20%.',

  currency: {
    source: 'EUR',
    target: 'GBP',
    symbol: '£',
    sourceSymbol: '€',
    needsConversion: true,
  },

  chain: [
    {
      id: 'importer',
      role: 'importer',
      label: 'Importer / Agent',
      marginLabel: 'Importer margin',
      marginMode: 'on_selling',
      defaultMargin: 25,
    },
    {
      id: 'wholesaler',
      role: 'wholesaler',
      label: 'Wholesaler',
      marginLabel: 'Wholesaler margin',
      marginMode: 'on_selling',
      defaultMargin: 20,
      skippable: true,
    },
    {
      id: 'retailer',
      role: 'retailer',
      label: 'Retailer',
      marginLabel: 'Retailer margin',
      marginMode: 'on_selling',
      defaultMargin: 40,
    },
  ],

  taxes: [
    {
      id: 'uk-duty',
      label: 'UK Wine Duty',
      inputLabel: 'Wine duty / bottle',
      type: 'per_bottle',
      defaultValue: 2.67,
      timing: 'on_base_cost',
      editable: true,
      formatAs: 'currency_per_unit',
    },
    {
      id: 'vat',
      label: 'VAT',
      inputLabel: 'VAT rate',
      type: 'percent_of_value',
      defaultValue: 20,
      timing: 'on_final',
      editable: true,
      formatAs: 'percent',
      inclusive: true,
    },
  ],

  logistics: [
    {
      id: 'shipping',
      label: 'Shipping',
      type: 'per_case',
      defaultValue: 12,
      afterLayer: '_base',
      editable: true,
    },
    {
      id: 'clearance',
      label: 'UK Clearance',
      type: 'per_case',
      defaultValue: 3,
      afterLayer: '_base',
      editable: true,
    },
  ],

  requiresAbv: false,
  requiresBottleSize: false,

  defaults: {
    costPerBottle: 4,
    casePack: 12,
    bottleSizeMl: 750,
    abv: 13,
    exchangeRate: 0.86,
    exchangeBuffer: 2,
  },
};
