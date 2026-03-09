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
    if (overrides.tariffOverride !== null) {
      const tariffTax = config.taxes.find((t) => t.id === 'tariff');
      if (tariffTax) {
        inputs.taxes = { ...inputs.taxes, [tariffTax.id]: overrides.tariffOverride };
      }
    }

    // Freight delta (additive — "$2 more per case")
    if (overrides.freightDeltaPerCase !== 0) {
      const freightLogs = config.logistics.filter(
        (l) => l.type === 'per_case' && (l.id === 'freight' || l.id.includes('freight')),
      );
      if (freightLogs.length > 0) {
        inputs.logistics = { ...inputs.logistics };
        for (const log of freightLogs) {
          const current = inputs.logistics[log.id] ?? log.defaultValue;
          inputs.logistics[log.id] = current + overrides.freightDeltaPerCase;
        }
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
