// src/lib/pricingEngine.js

// Convert any input into a safe number
function toNumber(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

// Apply a target margin to a cost.
// Example: cost 10, margin 30% => 14.2857
export function applyMargin(cost, marginPct) {
  const margin = marginPct / 100;
  if (!Number.isFinite(cost)) return 0;
  if (!Number.isFinite(margin)) return cost;
  if (margin >= 1) return 0;
  return cost / (1 - margin);
}

// Round a retail price to the nearest .99 in a shelf friendly way.
// Logic matches the current implementation.
export function roundPrice(value) {
  if (!Number.isFinite(value)) return value;
  const floored = Math.floor(value);
  // Avoid floating point edge-cases (e.g. 19.4 represented as 19.3999999999999)
  const decimal = value - floored;
  const EPS = 1e-9;
  // If the decimal part is less than 0.4, round down to previous whole - 0.01
  // Otherwise bump to the next whole - 0.01
  if (decimal + EPS < 0.4) {
    const candidate = Math.max(0, floored - 1 + 0.99);
    return candidate === 0 ? 0.99 : candidate;
  }
  return floored + 0.99;
}

// Core pricing engine.
// Takes your inputs and returns all derived pricing metrics.
export function calculatePricing(rawInputs) {
  if (!rawInputs) {
    throw new Error('calculatePricing requires an inputs object');
  }

  const currency = rawInputs.currency || 'EUR';

  const casePack = toNumber(rawInputs.casePack, 12);
  const bottleCost = toNumber(rawInputs.bottleCost, 0);

  const caseCost =
    rawInputs.caseCost !== '' &&
    rawInputs.caseCost !== undefined &&
    rawInputs.caseCost !== null
      ? toNumber(rawInputs.caseCost, bottleCost * casePack)
      : bottleCost * casePack;

  const exchangeRate = toNumber(rawInputs.exchangeRate, 0);
  const exchangeBuffer = toNumber(rawInputs.exchangeBuffer, 0);

  const diFreight = toNumber(rawInputs.diFreight, 0);
  const tariff = toNumber(rawInputs.tariff, 0);
  const statesideLogistics = toNumber(rawInputs.statesideLogistics, 0);

  const supplierMargin = toNumber(rawInputs.supplierMargin, 0);
  const distributorMargin = toNumber(rawInputs.distributorMargin, 0);
  const retailerMargin = toNumber(rawInputs.retailerMargin, 0);
  const casesSold = toNumber(rawInputs.casesSold, 0);

  const roundRetail = Boolean(rawInputs.roundRetail);

  // FX handling
  const bufferedRate =
    currency === 'EUR'
      ? exchangeRate * (1 + exchangeBuffer / 100)
      : 1; // Assume inputs already in USD if not EUR

  const baseCaseUSD = currency === 'EUR' ? caseCost * bufferedRate : caseCost;
  const baseBottleUSD = casePack > 0 ? baseCaseUSD / casePack : 0;

  // Supplier FOB with margin
  const supplierCaseUSD = applyMargin(baseCaseUSD, supplierMargin);

  // Import landed case (supplier + tariff + DI freight)
  const importCase = supplierCaseUSD * (1 + tariff / 100) + diFreight;

  // Stateside landed case (includes domestic logistics)
  const landedCase = importCase + statesideLogistics;

  // Wholesale case and bottle (distributor margin)
  const wholesaleCase = applyMargin(landedCase, distributorMargin);
  const wholesaleBottle = casePack > 0 ? wholesaleCase / casePack : 0;

  // Retail SRP bottle
  let srpBottle = applyMargin(wholesaleBottle, retailerMargin);
  if (roundRetail) {
    srpBottle = roundPrice(srpBottle);
  }

  const srpCase = srpBottle * casePack;

  // Simple revenue and per case gross margin (retail)
  const revenue = srpCase * casesSold;
  const grossMargin = srpCase - wholesaleCase;

  return {
    casePack,
    bottleCost,
    caseCost,
    bufferedRate,
    baseCaseUSD,
    baseBottleUSD,
    supplierCaseUSD,
    importCase,
    landedCase,
    wholesaleCase,
    wholesaleBottle,
    srpBottle,
    srpCase,
    revenue,
    grossMargin,
  };
}
