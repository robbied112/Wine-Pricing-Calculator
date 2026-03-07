import { useMarketStore } from '../state/useMarketStore';
import { Card } from '@/components/ui/Card';

function formatMoney(value: number, symbol: string): string {
  if (!Number.isFinite(value)) return '—';
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-3 pb-1">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{label}</span>
      <div className="flex-1 border-t border-slate-200" />
    </div>
  );
}

export function MarketWaterfall() {
  const { result, activeMarket } = useMarketStore();

  if (!result) {
    return (
      <Card title="Pricing Output" kicker="Select a market">
        <p className="text-sm text-slate-500">
          Choose a market to see pricing.
        </p>
      </Card>
    );
  }

  const sym = activeMarket.currency.symbol;

  // Group waterfall steps by category for section dividers
  let lastCategory = '';

  const categoryLabels: Record<string, string> = {
    cost: 'Cost Basis',
    tax: 'Taxes & Duties',
    logistics: 'Logistics',
    margin: 'Margin Layer',
    subtotal: 'Subtotal',
    final: 'Final',
  };

  return (
    <Card
      title="Pricing Snapshot"
      kicker={`${activeMarket.flag} ${activeMarket.name}`}
      accent
      sticky
    >
      <div className="space-y-0.5">
        {result.waterfall.map((step) => {
          const showDivider = step.category !== lastCategory;
          const dividerLabel = categoryLabels[step.category] || step.category;
          lastCategory = step.category;

          return (
            <div key={step.id}>
              {showDivider && <Divider label={dividerLabel} />}
              <div
                className={[
                  'flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0',
                  step.highlight ? 'bg-amber-50/50 -mx-2 px-2 rounded-lg' : '',
                ].join(' ')}
              >
                <div className="pr-4">
                  <p className="text-sm font-medium text-slate-800">{step.label}</p>
                  {step.helper && <p className="text-xs text-slate-500">{step.helper}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatMoney(step.perCase, sym)}
                  </p>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {formatMoney(step.perBottle, sym)} / btl
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Summary line */}
        <div className="pt-3 mt-1 border-t-2 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-slate-900">Consumer Price</p>
              <p className="text-xs text-slate-500">SRP per bottle</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-amber-700 tabular-nums">
                {formatMoney(result.summary.srpBottle, sym)}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {formatMoney(result.summary.srpCase, sym)} / case
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-1.5 mt-4 pt-4 border-t border-amber-200">
          {result.warnings.map((w) => (
            <div
              key={w.field + w.message}
              className={[
                'flex items-start gap-2 text-xs rounded-lg px-3 py-2',
                w.severity === 'error' ? 'bg-rose-50 text-rose-700' :
                w.severity === 'warn' ? 'bg-amber-50 text-amber-700' :
                'bg-blue-50 text-blue-700',
              ].join(' ')}
            >
              <span className="font-medium shrink-0">
                {w.severity === 'error' ? '!!!' : w.severity === 'warn' ? '!!' : 'i'}
              </span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
