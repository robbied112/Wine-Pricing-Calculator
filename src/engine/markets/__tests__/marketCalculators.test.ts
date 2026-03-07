import { describe, it, expect } from 'vitest';
import { calculateMarketPricing, makeDefaultMarketInputs } from '../genericCalculator';
import { MARKET_CONFIGS, getMarketConfig } from '../configs';

// ---- Test every market with default inputs ----

describe('Generic Market Calculator', () => {
  for (const config of MARKET_CONFIGS) {
    describe(config.name, () => {
      const inputs = makeDefaultMarketInputs(config);
      const result = calculateMarketPricing(config, inputs);

      it('produces a valid result with correct market ID', () => {
        expect(result.marketId).toBe(config.id);
        expect(result.marketName).toBe(config.name);
      });

      it('generates a non-empty waterfall', () => {
        expect(result.waterfall.length).toBeGreaterThan(0);
      });

      it('has positive SRP bottle and case prices', () => {
        expect(result.summary.srpBottle).toBeGreaterThan(0);
        expect(result.summary.srpCase).toBeGreaterThan(0);
      });

      it('SRP case = SRP bottle × case pack (within rounding)', () => {
        expect(result.summary.srpCase).toBeCloseTo(
          result.summary.srpBottle * inputs.casePack,
          1,
        );
      });

      it('generates layer recaps for each active chain layer', () => {
        const activeLayers = config.chain.filter(
          (l) => !l.skippable || inputs.activeLayers.includes(l.id),
        );
        expect(result.layerRecaps.length).toBe(activeLayers.length);
      });

      it('all layer sell prices exceed buy prices', () => {
        for (const recap of result.layerRecaps) {
          expect(recap.sellPrice).toBeGreaterThan(recap.buyPrice);
          expect(recap.grossProfit).toBeGreaterThan(0);
        }
      });

      it('has no error-severity warnings with default inputs', () => {
        const errors = result.warnings.filter((w) => w.severity === 'error');
        expect(errors).toHaveLength(0);
      });

      it('has correct currency in assumptions', () => {
        expect(result.assumptions.currency).toBe(config.currency.target);
      });
    });
  }
});

// ---- Edge cases ----

describe('Edge Cases', () => {
  const usConfig = getMarketConfig('us-import')!;

  it('handles zero cost gracefully', () => {
    const inputs = makeDefaultMarketInputs(usConfig);
    inputs.costPerBottle = 0;
    const result = calculateMarketPricing(usConfig, inputs);
    // SRP won't be exactly 0 because flat per-case logistics still apply,
    // but the base cost contribution should be zero
    expect(result.summary.baseCostCase).toBe(0);
    expect(result.warnings.some((w) => w.field === 'costPerBottle')).toBe(true);
  });

  it('handles 99% margin — produces high but finite SRP', () => {
    const inputs = makeDefaultMarketInputs(usConfig);
    inputs.margins[usConfig.chain[0].id] = 99;
    const result = calculateMarketPricing(usConfig, inputs);
    expect(Number.isFinite(result.summary.srpBottle)).toBe(true);
    expect(result.summary.srpBottle).toBeGreaterThan(100);
    expect(result.warnings.some((w) => w.severity === 'warn')).toBe(true);
  });

  it('100% margin produces Infinity and error warning', () => {
    const inputs = makeDefaultMarketInputs(usConfig);
    inputs.margins[usConfig.chain[0].id] = 100;
    const result = calculateMarketPricing(usConfig, inputs);
    expect(result.warnings.some((w) => w.severity === 'error')).toBe(true);
  });

  it('skipping a layer lowers the SRP', () => {
    const euConfig = getMarketConfig('eu-internal')!;
    const inputs1 = makeDefaultMarketInputs(euConfig);
    const result1 = calculateMarketPricing(euConfig, inputs1);

    const inputs2 = makeDefaultMarketInputs(euConfig);
    const skippable = euConfig.chain.find((l) => l.skippable);
    if (skippable) {
      inputs2.activeLayers = inputs2.activeLayers.filter((id) => id !== skippable.id);
      const result2 = calculateMarketPricing(euConfig, inputs2);
      expect(result2.summary.srpBottle).toBeLessThan(result1.summary.srpBottle);
    }
  });

  it('changing exchange rate proportionally affects output', () => {
    const inputs1 = makeDefaultMarketInputs(usConfig);
    inputs1.exchangeRate = 1.0;
    inputs1.exchangeBuffer = 0;
    const result1 = calculateMarketPricing(usConfig, inputs1);

    const inputs2 = makeDefaultMarketInputs(usConfig);
    inputs2.exchangeRate = 2.0;
    inputs2.exchangeBuffer = 0;
    const result2 = calculateMarketPricing(usConfig, inputs2);

    // With doubled exchange rate, the SRP should roughly double
    expect(result2.summary.srpBottle).toBeGreaterThan(result1.summary.srpBottle * 1.5);
  });

  it('zero exchange rate produces error warning', () => {
    const inputs = makeDefaultMarketInputs(usConfig);
    inputs.exchangeRate = 0;
    const result = calculateMarketPricing(usConfig, inputs);
    expect(result.warnings.some((w) => w.field === 'exchangeRate')).toBe(true);
  });
});

// ---- Currency conversion ----

describe('Currency Conversion', () => {
  it('USD domestic market has effectiveRate = 1', () => {
    const config = getMarketConfig('us-domestic')!;
    const inputs = makeDefaultMarketInputs(config);
    const result = calculateMarketPricing(config, inputs);
    expect(result.assumptions.effectiveRate).toBe(1);
  });

  it('UK market converts EUR to GBP', () => {
    const config = getMarketConfig('uk-import')!;
    expect(config.currency.needsConversion).toBe(true);
    const inputs = makeDefaultMarketInputs(config);
    const result = calculateMarketPricing(config, inputs);
    expect(result.assumptions.effectiveRate).toBeGreaterThan(0);
    expect(result.assumptions.currency).toBe('GBP');
  });

  it('EU internal has no FX conversion', () => {
    const config = getMarketConfig('eu-internal')!;
    expect(config.currency.needsConversion).toBe(false);
    const inputs = makeDefaultMarketInputs(config);
    const result = calculateMarketPricing(config, inputs);
    expect(result.assumptions.effectiveRate).toBe(1);
  });

  it('exchange buffer increases effective rate', () => {
    const config = getMarketConfig('uk-import')!;
    const inputs1 = makeDefaultMarketInputs(config);
    inputs1.exchangeBuffer = 0;
    const result1 = calculateMarketPricing(config, inputs1);

    const inputs2 = makeDefaultMarketInputs(config);
    inputs2.exchangeBuffer = 5;
    const result2 = calculateMarketPricing(config, inputs2);

    expect(result2.assumptions.effectiveRate).toBeGreaterThan(result1.assumptions.effectiveRate);
  });
});

// ---- Tax types ----

describe('Tax Types', () => {
  it('UK wine duty is per-liter-alcohol — scales with ABV and bottle size', () => {
    const config = getMarketConfig('uk-import')!;
    const dutyTax = config.taxes.find((t) => t.id === 'uk-duty')!;
    expect(dutyTax.type).toBe('per_liter_alcohol');

    const inputs = makeDefaultMarketInputs(config);
    const result = calculateMarketPricing(config, inputs);
    const dutyStep = result.waterfall.find((w) => w.id === 'tax-uk-duty');
    expect(dutyStep).toBeDefined();
    if (dutyStep) {
      const litres = inputs.bottleSizeMl / 1000;
      const abvFraction = inputs.abv / 100;
      const expected = dutyTax.defaultValue * litres * abvFraction * inputs.casePack;
      expect(dutyStep.perCase).toBeCloseTo(expected, 2);
    }
  });

  it('NZ excise is per-liter — respects bottle size', () => {
    const config = getMarketConfig('nz-import')!;
    const exciseTax = config.taxes.find((t) => t.id === 'excise')!;
    expect(exciseTax.type).toBe('per_liter');

    const inputs = makeDefaultMarketInputs(config);
    const result = calculateMarketPricing(config, inputs);
    const exciseStep = result.waterfall.find((w) => w.id === 'tax-excise');
    expect(exciseStep).toBeDefined();
    if (exciseStep) {
      const bottleLiters = inputs.bottleSizeMl / 1000;
      const expectedCase = exciseTax.defaultValue * bottleLiters * inputs.casePack;
      expect(exciseStep.perCase).toBeCloseTo(expectedCase, 2);
    }
  });

  it('Australia GST timing is on_final', () => {
    const config = getMarketConfig('au-import')!;
    const gst = config.taxes.find((t) => t.id === 'gst')!;
    expect(gst.timing).toBe('on_final');
    expect(gst.inclusive).toBe(true);
  });

  it('US tariff applies after importer layer', () => {
    const config = getMarketConfig('us-import')!;
    const tariff = config.taxes.find((t) => t.id === 'tariff')!;
    expect(tariff.timing).toBe('after:importer');
    expect(tariff.type).toBe('percent_of_value');
  });
});

// ---- Market config registry ----

describe('Market Config Registry', () => {
  it('has 8 market configs', () => {
    expect(MARKET_CONFIGS).toHaveLength(8);
  });

  it('all market IDs are unique', () => {
    const ids = MARKET_CONFIGS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getMarketConfig returns correct config', () => {
    for (const config of MARKET_CONFIGS) {
      expect(getMarketConfig(config.id)).toBe(config);
    }
  });

  it('getMarketConfig returns undefined for unknown ID', () => {
    expect(getMarketConfig('nonexistent')).toBeUndefined();
  });

  it('all markets have at least one chain layer', () => {
    for (const config of MARKET_CONFIGS) {
      expect(config.chain.length).toBeGreaterThan(0);
    }
  });

  it('all markets have defaults with positive cost', () => {
    for (const config of MARKET_CONFIGS) {
      expect(config.defaults.costPerBottle).toBeGreaterThan(0);
      expect(config.defaults.casePack).toBeGreaterThan(0);
    }
  });
});

// ---- makeDefaultMarketInputs ----

describe('makeDefaultMarketInputs', () => {
  it('includes all chain layer margins', () => {
    for (const config of MARKET_CONFIGS) {
      const inputs = makeDefaultMarketInputs(config);
      for (const layer of config.chain) {
        expect(inputs.margins[layer.id]).toBe(layer.defaultMargin);
      }
    }
  });

  it('includes all tax defaults', () => {
    for (const config of MARKET_CONFIGS) {
      const inputs = makeDefaultMarketInputs(config);
      for (const tax of config.taxes) {
        expect(inputs.taxes[tax.id]).toBe(tax.defaultValue);
      }
    }
  });

  it('includes all logistics defaults', () => {
    for (const config of MARKET_CONFIGS) {
      const inputs = makeDefaultMarketInputs(config);
      for (const log of config.logistics) {
        expect(inputs.logistics[log.id]).toBe(log.defaultValue);
      }
    }
  });

  it('includes all chain layers in activeLayers', () => {
    for (const config of MARKET_CONFIGS) {
      const inputs = makeDefaultMarketInputs(config);
      for (const layer of config.chain) {
        expect(inputs.activeLayers).toContain(layer.id);
      }
    }
  });
});
