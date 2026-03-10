import { describe, it, expect } from 'vitest';
import { calculateWhatIf } from '../whatIf';
import type { PortfolioWine, WhatIfOverrides } from '../../types';
import { DEFAULT_WHAT_IF_OVERRIDES } from '../../types';
import { getMarketConfig } from '@/engine/markets/configs';
import { calculateMarketPricing, makeDefaultMarketInputs } from '@/engine/markets/genericCalculator';

/** Helper: create a test portfolio wine from a market's default inputs */
function makeTestWine(marketId: string, overrides: Partial<PortfolioWine> = {}): PortfolioWine {
  const config = getMarketConfig(marketId)!;
  const inputs = makeDefaultMarketInputs(config);
  const result = calculateMarketPricing(config, inputs);
  return {
    id: `test-${marketId}-${Math.random().toString(36).substring(2, 5)}`,
    name: `Test ${config.name}`,
    producer: 'Test Producer',
    notes: '',
    marketId,
    inputs,
    cachedSrpBottle: result.summary.srpBottle,
    cachedWholesaleCase: result.summary.wholesaleCase,
    cachedLandedCase: result.summary.landedCase,
    cachedCurrencySymbol: config.currency.symbol,
    cachedMarketName: config.name,
    cachedMarketFlag: config.flag,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('calculateWhatIf', () => {
  it('returns empty results for empty portfolio', () => {
    const results = calculateWhatIf([], DEFAULT_WHAT_IF_OVERRIDES);
    expect(results).toHaveLength(0);
  });

  it('returns no deltas when all overrides are zero', () => {
    const wine = makeTestWine('us-import');
    const results = calculateWhatIf([wine], DEFAULT_WHAT_IF_OVERRIDES);
    expect(results).toHaveLength(1);
    expect(results[0].deltaSrpBottle).toBeCloseTo(0, 2);
    expect(results[0].deltaPercent).toBeCloseTo(0, 2);
  });

  // ---- FX shift ----

  it('FX shift increases SRP for cross-border markets', () => {
    const wine = makeTestWine('us-import');
    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, fxShiftPercent: 10 };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].overriddenSrpBottle).toBeGreaterThan(results[0].originalSrpBottle);
    expect(results[0].deltaSrpBottle).toBeGreaterThan(0);
    expect(results[0].deltaPercent).toBeGreaterThan(0);
  });

  it('negative FX shift decreases SRP', () => {
    const wine = makeTestWine('us-import');
    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, fxShiftPercent: -10 };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].overriddenSrpBottle).toBeLessThan(results[0].originalSrpBottle);
  });

  it('FX shift is a no-op for domestic markets (no conversion)', () => {
    const wine = makeTestWine('eu-internal'); // EUR→EUR, no conversion
    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, fxShiftPercent: 20 };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].deltaSrpBottle).toBeCloseTo(0, 2);
  });

  // ---- Tariff override ----

  it('tariff override increases SRP when tariff goes up', () => {
    const wine = makeTestWine('us-import');
    const originalTariff = wine.inputs.taxes['tariff'] || 15;
    const overrides: WhatIfOverrides = {
      ...DEFAULT_WHAT_IF_OVERRIDES,
      tariffOverride: originalTariff + 10,
    };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].overriddenSrpBottle).toBeGreaterThan(results[0].originalSrpBottle);
  });

  it('tariff override works on AU Import (import-duty)', () => {
    const wine = makeTestWine('au-import');
    const originalDuty = wine.inputs.taxes['import-duty'] || 5;
    const overrides: WhatIfOverrides = {
      ...DEFAULT_WHAT_IF_OVERRIDES,
      tariffOverride: originalDuty + 15,
    };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].overriddenSrpBottle).toBeGreaterThan(results[0].originalSrpBottle);
  });

  it('tariff override is no-op for markets without tariff', () => {
    const wine = makeTestWine('us-domestic'); // No tariff
    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, tariffOverride: 50 };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].deltaSrpBottle).toBeCloseTo(0, 2);
  });

  // ---- Freight delta ----

  it('freight delta increases SRP', () => {
    const wine = makeTestWine('us-import');
    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, freightDeltaPerCase: 5 };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].overriddenSrpBottle).toBeGreaterThan(results[0].originalSrpBottle);
  });

  it('negative freight delta decreases SRP', () => {
    const wine = makeTestWine('us-import');
    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, freightDeltaPerCase: -3 };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].overriddenSrpBottle).toBeLessThan(results[0].originalSrpBottle);
  });

  it('freight delta works on US Domestic (stateside logistics)', () => {
    const wine = makeTestWine('us-domestic');
    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, freightDeltaPerCase: 15 };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].overriddenSrpBottle).toBeGreaterThan(results[0].originalSrpBottle);
    expect(results[0].deltaSrpBottle).toBeGreaterThan(0);
  });

  it('freight delta works on UK Import (shipping logistics)', () => {
    const wine = makeTestWine('uk-import');
    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, freightDeltaPerCase: 10 };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].overriddenSrpBottle).toBeGreaterThan(results[0].originalSrpBottle);
  });

  it('freight delta works on AU Import (shipping logistics)', () => {
    const wine = makeTestWine('au-import');
    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, freightDeltaPerCase: 10 };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].overriddenSrpBottle).toBeGreaterThan(results[0].originalSrpBottle);
  });

  // ---- Combined overrides ----

  it('combined FX + tariff + freight overrides work together', () => {
    const wine = makeTestWine('us-import');
    const overrides: WhatIfOverrides = {
      fxShiftPercent: 5,
      tariffOverride: 25,
      freightDeltaPerCase: 3,
    };
    const results = calculateWhatIf([wine], overrides);
    // All three increase costs → SRP should go up significantly
    expect(results[0].overriddenSrpBottle).toBeGreaterThan(results[0].originalSrpBottle);
    expect(results[0].deltaSrpBottle).toBeGreaterThan(1); // At least $1/btl increase
  });

  // ---- Multi-wine portfolio ----

  it('handles multiple wines across different markets', () => {
    const wines = [
      makeTestWine('us-import'),
      makeTestWine('uk-import'),
      makeTestWine('eu-internal'),
      makeTestWine('au-import'),
    ];
    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, fxShiftPercent: 5 };
    const results = calculateWhatIf(wines, overrides);
    expect(results).toHaveLength(4);

    // EU Internal has no conversion → should be unchanged
    const euResult = results.find((r) => r.wineId === wines[2].id)!;
    expect(euResult.deltaSrpBottle).toBeCloseTo(0, 2);

    // Others should change
    const usResult = results.find((r) => r.wineId === wines[0].id)!;
    expect(usResult.deltaSrpBottle).not.toBeCloseTo(0, 1);
  });

  // ---- Risk detection ----

  it('detects low margin wines', () => {
    // Create a wine with very low importer margin
    const config = getMarketConfig('us-import')!;
    const inputs = makeDefaultMarketInputs(config);
    inputs.margins = { ...inputs.margins, importer: 10 }; // Very low margin
    const result = calculateMarketPricing(config, inputs);
    const wine: PortfolioWine = {
      id: 'test-low-margin',
      name: 'Low Margin Wine',
      producer: '',
      notes: '',
      marketId: 'us-import',
      inputs,
      cachedSrpBottle: result.summary.srpBottle,
      cachedWholesaleCase: result.summary.wholesaleCase,
      cachedLandedCase: result.summary.landedCase,
      cachedCurrencySymbol: '$',
      cachedMarketName: 'US Import',
      cachedMarketFlag: '🇺🇸',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, fxShiftPercent: 1 };
    const results = calculateWhatIf([wine], overrides);
    expect(results[0].lowMargin).toBe(true);
  });

  // ---- Invalid market graceful skip ----

  it('gracefully skips wines with invalid market', () => {
    const wine = makeTestWine('us-import');
    wine.marketId = 'nonexistent-market';
    const overrides: WhatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES, fxShiftPercent: 10 };
    const results = calculateWhatIf([wine], overrides);
    expect(results).toHaveLength(1);
    expect(results[0].deltaSrpBottle).toBe(0);
  });
});
