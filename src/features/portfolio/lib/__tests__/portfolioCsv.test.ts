import { describe, it, expect } from 'vitest';
import { generatePortfolioCsv } from '../portfolioCsv';
import type { PortfolioWine, WhatIfResult } from '../../types';
import { getMarketConfig } from '@/engine/markets/configs';
import { calculateMarketPricing, makeDefaultMarketInputs } from '@/engine/markets/genericCalculator';

function makeTestWine(marketId: string, name: string): PortfolioWine {
  const config = getMarketConfig(marketId)!;
  const inputs = makeDefaultMarketInputs(config);
  const result = calculateMarketPricing(config, inputs);
  return {
    id: `test-${Date.now()}`,
    name,
    producer: 'Test Producer',
    notes: 'Test notes',
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
  };
}

describe('generatePortfolioCsv', () => {
  it('generates correct header for empty portfolio', () => {
    const csv = generatePortfolioCsv([]);
    expect(csv).toContain('Wine Pricing Studio');
    expect(csv).toContain('Total Wines: 0');
    expect(csv).toContain('Wine Name');
    expect(csv).toContain('SRP/Bottle');
  });

  it('generates rows for each wine', () => {
    const wines = [
      makeTestWine('us-import', 'Chateau Test 2020'),
      makeTestWine('uk-import', 'British Blend'),
    ];
    const csv = generatePortfolioCsv(wines);
    expect(csv).toContain('Chateau Test 2020');
    expect(csv).toContain('British Blend');
    expect(csv).toContain('Test Producer');
    expect(csv).toContain('Total Wines: 2');
  });

  it('escapes quotes in wine names', () => {
    const wines = [makeTestWine('us-import', 'Wine "Reserve" Edition')];
    const csv = generatePortfolioCsv(wines);
    expect(csv).toContain('Wine ""Reserve"" Edition');
  });

  it('includes What-If columns when results provided', () => {
    const wines = [makeTestWine('us-import', 'Test Wine')];
    const whatIfResults: WhatIfResult[] = [
      {
        wineId: wines[0].id,
        originalSrpBottle: 20,
        overriddenSrpBottle: 22.5,
        deltaSrpBottle: 2.5,
        deltaPercent: 12.5,
        originalWholesaleCase: 150,
        overriddenWholesaleCase: 165,
        lowMargin: false,
        negative: false,
      },
    ];
    const csv = generatePortfolioCsv(wines, whatIfResults);
    expect(csv).toContain('What-If SRP/Bottle');
    expect(csv).toContain('22.50');
    expect(csv).toContain('2.50');
    expect(csv).toContain('12.5%');
  });

  it('omits What-If columns when no results', () => {
    const wines = [makeTestWine('us-import', 'Test Wine')];
    const csv = generatePortfolioCsv(wines, null);
    expect(csv).not.toContain('What-If SRP/Bottle');
  });
});
