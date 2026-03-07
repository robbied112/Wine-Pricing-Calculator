import type { MarketPricingResult } from '@/engine/markets/types';

/**
 * Generate a CSV string from a pricing result.
 */
export function generateCsv(result: MarketPricingResult, currencySymbol: string): string {
  const rows: string[][] = [];

  // Metadata
  rows.push(['Wine Pricing Studio Export']);
  rows.push([`Market: ${result.marketName}`]);
  rows.push([`Currency: ${result.assumptions.currency} (${currencySymbol})`]);
  rows.push([`Generated: ${new Date().toLocaleString()}`]);
  rows.push([]);

  // Waterfall
  rows.push(['Step', 'Category', `Per Case (${currencySymbol})`, `Per Bottle (${currencySymbol})`, 'Notes']);
  for (const step of result.waterfall) {
    rows.push([
      step.label,
      step.category,
      step.perCase.toFixed(2),
      step.perBottle.toFixed(2),
      step.helper || '',
    ]);
  }

  rows.push([]);

  // Summary
  rows.push(['Summary']);
  rows.push(['Base Cost (case, source)', '', result.summary.baseCostCase.toFixed(2)]);
  rows.push(['Base Cost (case, target)', '', result.summary.baseCostCaseTarget.toFixed(2)]);
  rows.push(['Landed Cost (case)', '', result.summary.landedCase.toFixed(2)]);
  rows.push(['Wholesale (case)', '', result.summary.wholesaleCase.toFixed(2)]);
  rows.push(['SRP (case)', '', result.summary.srpCase.toFixed(2)]);
  rows.push(['SRP (bottle)', '', result.summary.srpBottle.toFixed(2)]);

  // Layer recaps
  if (result.layerRecaps.length > 0) {
    rows.push([]);
    rows.push(['Stakeholder P&L']);
    rows.push(['Layer', `Buy Price (${currencySymbol})`, `Sell Price (${currencySymbol})`, `Gross Profit (${currencySymbol})`, 'Margin %']);
    for (const recap of result.layerRecaps) {
      rows.push([
        recap.label,
        recap.buyPrice.toFixed(2),
        recap.sellPrice.toFixed(2),
        recap.grossProfit.toFixed(2),
        recap.marginPercent.toFixed(1) + '%',
      ]);
    }
  }

  // Input assumptions
  rows.push([]);
  rows.push(['Input Assumptions']);
  rows.push(['Cost / bottle', result.inputs.costPerBottle.toFixed(2)]);
  rows.push(['Case pack', String(result.inputs.casePack)]);
  if (result.assumptions.effectiveRate !== 1) {
    rows.push(['Effective FX rate', result.assumptions.effectiveRate.toFixed(4)]);
  }

  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

/**
 * Download a CSV string as a file.
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
