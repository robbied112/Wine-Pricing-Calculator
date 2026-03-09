import type { MarketPricingInputs } from '@/engine/markets/types';

// ---- Portfolio Wine ----

export interface PortfolioWine {
  id: string;
  name: string;
  producer: string;
  notes: string;

  marketId: string;
  inputs: MarketPricingInputs;

  // Denormalized cache for fast table rendering
  cachedSrpBottle: number;
  cachedWholesaleCase: number;
  cachedLandedCase: number;
  cachedCurrencySymbol: string;
  cachedMarketName: string;
  cachedMarketFlag: string;

  createdAt: number;
  updatedAt: number;
}

// ---- What-If ----

export interface WhatIfOverrides {
  fxShiftPercent: number;
  tariffOverride: number | null;
  freightDeltaPerCase: number;
}

export interface WhatIfResult {
  wineId: string;
  originalSrpBottle: number;
  overriddenSrpBottle: number;
  deltaSrpBottle: number;
  deltaPercent: number;
  originalWholesaleCase: number;
  overriddenWholesaleCase: number;
  lowMargin: boolean;
  negative: boolean;
}

export const DEFAULT_WHAT_IF_OVERRIDES: WhatIfOverrides = {
  fxShiftPercent: 0,
  tariffOverride: null,
  freightDeltaPerCase: 0,
};
