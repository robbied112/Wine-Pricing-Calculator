import type { PortfolioWine, WhatIfResult } from '../types';

/**
 * Generate a CSV price list from the portfolio.
 * Optionally includes What-If delta columns.
 */
export function generatePortfolioCsv(
  wines: PortfolioWine[],
  whatIfResults?: WhatIfResult[] | null,
): string {
  const rows: string[][] = [];
  const hasWhatIf = whatIfResults && whatIfResults.length > 0;
  const wiMap = hasWhatIf
    ? new Map(whatIfResults!.map((r) => [r.wineId, r]))
    : new Map();

  // Header metadata
  rows.push(['Wine Pricing Studio \u2014 Portfolio Price List']);
  rows.push([`Generated: ${new Date().toLocaleString()}`]);
  rows.push([`Total Wines: ${wines.length}`]);
  rows.push([]);

  // Column headers
  const headers = [
    'Wine Name',
    'Producer',
    'Market',
    'Currency',
    'Cost/Bottle',
    'Case Pack',
    'Landed/Case',
    'Wholesale/Case',
    'SRP/Bottle',
    'SRP/Case',
  ];
  if (hasWhatIf) {
    headers.push('What-If SRP/Bottle', 'Delta', '% Change');
  }
  headers.push('Notes', 'Last Updated');
  rows.push(headers);

  // Data rows
  for (const wine of wines) {
    const row = [
      wine.name,
      wine.producer,
      wine.cachedMarketName,
      wine.cachedCurrencySymbol,
      wine.inputs.costPerBottle.toFixed(2),
      String(wine.inputs.casePack),
      wine.cachedLandedCase.toFixed(2),
      wine.cachedWholesaleCase.toFixed(2),
      wine.cachedSrpBottle.toFixed(2),
      (wine.cachedSrpBottle * wine.inputs.casePack).toFixed(2),
    ];

    if (hasWhatIf) {
      const wi = wiMap.get(wine.id);
      if (wi) {
        row.push(
          wi.overriddenSrpBottle.toFixed(2),
          wi.deltaSrpBottle.toFixed(2),
          `${wi.deltaPercent.toFixed(1)}%`,
        );
      } else {
        row.push('', '', '');
      }
    }

    row.push(wine.notes, new Date(wine.updatedAt).toLocaleDateString());
    rows.push(row);
  }

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
