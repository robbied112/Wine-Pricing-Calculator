import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { Card } from '@/components/ui/Card';

function formatMoney(value: number, symbol: string): string {
  if (!Number.isFinite(value)) return '—';
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function MarketRecapPanel() {
  const { result, activeRecapLayer, setActiveRecapLayer } = useMarketStore();

  if (!result || result.layerRecaps.length === 0) return null;

  const casePack = result.inputs.casePack || 12;
  const sym = result.assumptions.currency === 'GBP' ? '£' :
    result.assumptions.currency === 'AUD' ? 'A$' :
    result.assumptions.currency === 'NZD' ? 'NZ$' :
    result.assumptions.currency === 'EUR' ? '€' : '$';

  const activeRecap = result.layerRecaps.find((r) => r.layerId === activeRecapLayer) || result.layerRecaps[0];

  return (
    <Card title="Stakeholder P&L" kicker="Per Layer">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
        {result.layerRecaps.map((recap) => (
          <button
            key={recap.layerId}
            onClick={() => setActiveRecapLayer(recap.layerId)}
            className={[
              'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              activeRecap.layerId === recap.layerId
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-800',
            ].join(' ')}
          >
            {recap.label}
          </button>
        ))}
      </div>

      {/* Recap details */}
      {activeRecap && (
        <div className="space-y-0.5 mt-1">
          {[
            { label: 'Buy Price', value: activeRecap.buyPrice },
            { label: 'Sell Price', value: activeRecap.sellPrice },
            { label: 'Gross Profit', value: activeRecap.grossProfit },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
            >
              <span className="text-sm text-slate-700">{row.label}</span>
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                  {formatMoney(row.value, sym)}
                </span>
                <span className="text-xs text-slate-500 ml-2 tabular-nums">
                  ({formatMoney(casePack > 0 ? row.value / casePack : 0, sym)} / btl)
                </span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between py-2 bg-slate-50 rounded-lg px-2 mt-2">
            <span className="text-xs font-medium text-slate-500">Effective Margin</span>
            <span className="text-sm font-bold text-amber-700 tabular-nums">
              {activeRecap.marginPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
