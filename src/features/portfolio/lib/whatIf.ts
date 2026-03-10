import { getMarketConfig } from '@/engine/markets/configs';
import { calculateMarketPricing } from '@/engine/markets/genericCalculator';
import type { PortfolioWine, WhatIfOverrides, WhatIfResult } from '../types';

/**
 * Pure function: recalculate every portfolio wine with overrides applied,
 * returning delta results for the What-If dashboard.
 */
export function calculateWhatIf(
  wines: PortfolioWine[],
  overrides: WhatIfOverrides,
): WhatIfResult[] {
  return wines.map((wine) => {
    const config = getMarketConfig(wine.marketId);
    if (!config) {
      return makeSkippedResult(wine);
    }

    // Deep-clone inputs so we don't mutate the stored wine
    const inputs = JSON.parse(JSON.stringify(wine.inputs));

    // FX shift (multiplicative — "FX weakened 4%" means rate × 1.04)
    if (overrides.fxShiftPercent !== 0 && config.currency.needsConversion) {
      inputs.exchangeRate = wine.inputs.exchangeRate * (1 + overrides.fxShiftPercent / 100);
    }

    // Tariff override (absolute — "tariffs went to 25%")
    // Matches any percent-based import duty/tariff across markets
    if (overrides.tariffOverride !== null) {
      const TARIFF_IDS = new Set(['tariff', 'import-duty']);
      const tariffTax = config.taxes.find((t) => TARIFF_IDS.has(t.id));
      if (tariffTax) {
        inputs.taxes = { ...inputs.taxes, [tariffTax.id]: overrides.tariffOverride };
      }
    }

    // Freight delta (additive — "$2 more per case")
    // Applies to the first per_case logistics entry (primary freight/shipping)
    if (overrides.freightDeltaPerCase !== 0) {
      const primaryFreight = config.logistics.find((l) => l.type === 'per_case');
      if (primaryFreight) {
        inputs.logistics = { ...inputs.logistics };
        const current = inputs.logistics[primaryFreight.id] ?? primaryFreight.defaultValue;
        inputs.logistics[primaryFreight.id] = current + overrides.freightDeltaPerCase;
      }
    }

    // Recalculate with overrides
    const overriddenResult = calculateMarketPricing(config, inputs);
    const overriddenSrp = overriddenResult.summary.srpBottle;
    const originalSrp = wine.cachedSrpBottle;

    return {
      wineId: wine.id,
      originalSrpBottle: originalSrp,
      overriddenSrpBottle: overriddenSrp,
      deltaSrpBottle: overriddenSrp - originalSrp,
      deltaPercent: originalSrp > 0 ? ((overriddenSrp - originalSrp) / originalSrp) * 100 : 0,
      originalWholesaleCase: wine.cachedWholesaleCase,
      overriddenWholesaleCase: overriddenResult.summary.wholesaleCase,
      lowMargin: overriddenResult.layerRecaps.some((r) => r.marginPercent < 15),
      negative: !Number.isFinite(overriddenSrp) || overriddenSrp <= 0,
    };
  });
}

function makeSkippedResult(wine: PortfolioWine): WhatIfResult {
  return {
    wineId: wine.id,
    originalSrpBottle: wine.cachedSrpBottle,
    overriddenSrpBottle: wine.cachedSrpBottle,
    deltaSrpBottle: 0,
    deltaPercent: 0,
    originalWholesaleCase: wine.cachedWholesaleCase,
    overriddenWholesaleCase: wine.cachedWholesaleCase,
    lowMargin: false,
    negative: false,
  };
}
