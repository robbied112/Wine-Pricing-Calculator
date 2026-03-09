import type { ChangeEvent } from 'react';
import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { Card } from '@/components/ui/Card';
import { NumberInput } from '@/components/ui/NumberInput';
import { FlaskConical, X } from 'lucide-react';

export function WhatIfPanel() {
  const {
    whatIfOverrides,
    whatIfActive,
    whatIfResults,
    portfolio,
    setWhatIfOverride,
    applyWhatIf,
    clearWhatIf,
  } = useMarketStore();

  const handleNum = (setter: (val: number) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = raw === '' ? 0 : Number(raw);
    if (!Number.isNaN(num)) setter(num);
  };

  const handleTariff = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setWhatIfOverride('tariffOverride', null);
    } else {
      const num = Number(raw);
      if (!Number.isNaN(num)) setWhatIfOverride('tariffOverride', num);
    }
  };

  // Summary when active
  const summary = whatIfResults
    ? {
        worse: whatIfResults.filter((r) => r.deltaSrpBottle > 0.01).length,
        better: whatIfResults.filter((r) => r.deltaSrpBottle < -0.01).length,
        unchanged: whatIfResults.filter((r) => Math.abs(r.deltaSrpBottle) <= 0.01).length,
        atRisk: whatIfResults.filter((r) => r.lowMargin || r.negative).length,
      }
    : null;

  const hasOverrides =
    whatIfOverrides.fxShiftPercent !== 0 ||
    whatIfOverrides.tariffOverride !== null ||
    whatIfOverrides.freightDeltaPerCase !== 0;

  return (
    <Card
      title="What If"
      kicker="Stress Test"
      collapsible
      defaultCollapsed={!whatIfActive}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <NumberInput
          label="FX Shift"
          value={whatIfOverrides.fxShiftPercent || ''}
          onChange={handleNum((v) => setWhatIfOverride('fxShiftPercent', v))}
          suffix="%"
          step="1"
          hint="Positive = currency weakened"
        />
        <NumberInput
          label="Tariff Rate"
          value={whatIfOverrides.tariffOverride ?? ''}
          onChange={handleTariff}
          suffix="%"
          step="1"
          hint="Leave empty to keep current"
        />
        <NumberInput
          label="Freight Delta"
          value={whatIfOverrides.freightDeltaPerCase || ''}
          onChange={handleNum((v) => setWhatIfOverride('freightDeltaPerCase', v))}
          prefix="$"
          suffix="/case"
          step="0.5"
          hint="Added to each wine's freight"
        />
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={applyWhatIf}
          disabled={!hasOverrides || portfolio.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <FlaskConical size={14} />
          Apply What If
        </button>
        {whatIfActive && (
          <button
            onClick={clearWhatIf}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Summary badges */}
      {summary && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          {summary.worse > 0 && (
            <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
              {summary.worse} price increase{summary.worse !== 1 ? 's' : ''}
            </span>
          )}
          {summary.better > 0 && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {summary.better} price decrease{summary.better !== 1 ? 's' : ''}
            </span>
          )}
          {summary.unchanged > 0 && (
            <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {summary.unchanged} unchanged
            </span>
          )}
          {summary.atRisk > 0 && (
            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700">
              {summary.atRisk} at risk
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
