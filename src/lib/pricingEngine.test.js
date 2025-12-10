import { calculatePricing, applyMargin, roundPrice } from './pricingEngine';

describe('pricingEngine utilities', () => {
  test('applyMargin behavior', () => {
    expect(applyMargin(10, 0)).toBe(10);
    expect(applyMargin(10, 50)).toBe(20);
    expect(applyMargin(100, 25)).toBeCloseTo(133.3333, 4);
  });

  test('roundPrice behavior', () => {
    expect(roundPrice(19.39)).toBeCloseTo(18.99, 2);
    expect(roundPrice(19.4)).toBeCloseTo(19.99, 2);
    expect(roundPrice(0.2)).toBeCloseTo(0.99, 2);
  });
});

describe('calculatePricing with defaultState', () => {
  const defaultState = {
    wineName: 'Wine Example 1',
    currency: 'EUR',
    exchangeRate: 1.08,
    exchangeBuffer: 0,
    bottleCost: 5.25,
    caseCost: '',
    casePack: 12,
    bottleSize: '750ml',
    diFreight: 13,
    tariff: 0,
    statesideLogistics: 10,
    supplierMargin: 30,
    distributorMargin: 30,
    retailerMargin: 33,
    roundRetail: true,
    casesSold: 100,
  };

  test('returns expected derived fields', () => {
    const d = calculatePricing(defaultState);

    expect(d.casePack).toBe(12);
    expect(d.caseCost).toBeCloseTo(63, 2);
    expect(d.bufferedRate).toBeCloseTo(1.08, 4);
    expect(d.baseCaseUSD).toBeCloseTo(68.04, 4);
    expect(d.baseBottleUSD).toBeCloseTo(5.67, 4);
    expect(d.supplierCaseUSD).toBeCloseTo(97.2, 4);
    expect(d.importCase).toBeCloseTo(110.2, 4);
    expect(d.landedCase).toBeCloseTo(120.2, 4);
    expect(d.wholesaleCase).toBeCloseTo(171.7143, 4);
    expect(d.wholesaleBottle).toBeCloseTo(14.3095, 4);
    expect(d.srpBottle).toBeCloseTo(20.99, 2);
    expect(d.srpCase).toBeCloseTo(251.88, 2);
    expect(d.revenue).toBeCloseTo(25188, 1);
    expect(d.grossMargin).toBeCloseTo(80.1657, 4);
  });
});
