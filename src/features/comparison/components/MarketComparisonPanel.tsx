import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { Card } from '@/components/ui/Card';
import { NumberInput } from '@/components/ui/NumberInput';
import { GitCompareArrows } from 'lucide-react';

function fmt(value: number, symbol: string): string {
  if (!Number.isFinite(value)) return '—';
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function MarketComparisonPanel() {
  const {
    activeMarket: market,
    result,
    scenarioBEnabled,
    scenarioBLabel,
    scenarioBInputs,
    scenarioBResult,
    toggleScenarioB,
    setScenarioBLabel,
    setScenarioBMargin,
    setScenarioBTax,
    setScenarioBLogistics,
    setScenarioBInput,
  } = useMarketStore();

  const sym = market.currency.symbol;

  const handleNum = (fn: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = raw === '' ? 0 : Number(raw);
    if (!Number.isNaN(num)) fn(num);
  };

  // Build delta rows from the two results
  const deltas = result && scenarioBResult ? [
    { label: 'Landed Case', a: result.summary.landedCase, b: scenarioBResult.summary.landedCase },
    { label: 'Wholesale Case', a: result.summary.wholesaleCase, b: scenarioBResult.summary.wholesaleCase },
    { label: 'SRP / Bottle', a: result.summary.srpBottle, b: scenarioBResult.summary.srpBottle },
    { label: 'SRP / Case', a: result.summary.srpCase, b: scenarioBResult.summary.srpCase },
  ] : [];

  return (
    <Card title="Scenario Comparison" kicker="Side by Side" collapsible defaultCollapsed={!scenarioBEnabled}>
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={scenarioBEnabled}
          onChange={toggleScenarioB}
          className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
        />
        <span className="font-medium">Enable comparison scenario</span>
      </label>

      {scenarioBEnabled && (
        <div className="space-y-4 mt-3">
          <label className="flex flex-col space-y-1 text-sm text-slate-700">
            <span className="font-medium">Scenario label</span>
            <input
              type="text"
              value={scenarioBLabel}
              onChange={(e) => setScenarioBLabel(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              placeholder="e.g. High Tariff Scenario"
            />
          </label>

          {/* Override fields: cost, taxes, logistics, margins */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Override Values</h4>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Cost / bottle"
                value={scenarioBInputs.costPerBottle || ''}
                onChange={handleNum((v) => setScenarioBInput('costPerBottle', v))}
                step="0.01"
                prefix={market.currency.sourceSymbol}
              />
              {market.taxes.filter((t) => t.editable).map((tax) => (
                <NumberInput
                  key={tax.id}
                  label={tax.inputLabel}
                  value={scenarioBInputs.taxes[tax.id] ?? tax.defaultValue}
                  onChange={handleNum((v) => setScenarioBTax(tax.id, v))}
                  step={tax.formatAs === 'percent' ? '0.1' : '0.01'}
                  suffix={tax.formatAs === 'percent' ? '%' : undefined}
                  prefix={tax.formatAs === 'currency_per_unit' ? sym : undefined}
                />
              ))}
              {market.logistics.filter((l) => l.editable).map((log) => (
                <NumberInput
                  key={log.id}
                  label={log.label}
                  value={scenarioBInputs.logistics[log.id] ?? log.defaultValue}
                  onChange={handleNum((v) => setScenarioBLogistics(log.id, v))}
                  step="0.01"
                  prefix={log.type === 'per_case' ? sym : undefined}
                />
              ))}
              {market.chain.filter((l) => scenarioBInputs.activeLayers.includes(l.id)).map((layer) => (
                <NumberInput
                  key={layer.id}
                  label={layer.marginLabel}
                  value={scenarioBInputs.margins[layer.id] ?? layer.defaultMargin}
                  onChange={handleNum((v) => setScenarioBMargin(layer.id, v))}
                  step="0.1"
                  suffix="%"
                />
              ))}
            </div>
          </div>

          {/* Delta table */}
          {deltas.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <GitCompareArrows size={16} />
                <span>Baseline vs {scenarioBLabel}</span>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <span>Metric</span>
                  <span className="text-right">Baseline</span>
                  <span className="text-right">{scenarioBLabel}</span>
                  <span className="text-right">Delta</span>
                </div>
                {deltas.map((d) => {
                  const delta = d.b - d.a;
                  const pct = d.a !== 0 ? (delta / d.a) * 100 : 0;
                  return (
                    <div
                      key={d.label}
                      className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-slate-100 last:border-0 text-sm"
                    >
                      <span className="text-slate-600">{d.label}</span>
                      <span className="text-right tabular-nums text-slate-900">{fmt(d.a, sym)}</span>
                      <span className="text-right tabular-nums text-slate-900">{fmt(d.b, sym)}</span>
                      <span
                        className={[
                          'text-right tabular-nums font-medium',
                          delta > 0.005 ? 'text-emerald-700' :
                          delta < -0.005 ? 'text-rose-600' : 'text-slate-500',
                        ].join(' ')}
                      >
                        {delta > 0.005 ? '+' : ''}{fmt(Math.abs(delta), sym)}
                        <span className="text-xs ml-1 opacity-70">
                          ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
