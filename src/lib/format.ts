/**
 * Format a number as USD currency.
 */
export function formatMoney(value: number | null | undefined, currency = 'USD'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '\u2014';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a delta as +$X.XX or -$X.XX.
 */
export function formatDelta(value: number | null | undefined, currency = 'USD'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '\u2014';
  const abs = formatMoney(Math.abs(value), currency);
  if (value > 0.005) return `+${abs}`;
  if (value < -0.005) return `\u2212${abs}`;
  return formatMoney(0, currency);
}

/**
 * Format a percentage.
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '\u2014';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a percentage delta.
 */
export function formatPercentDelta(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '\u2014';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
