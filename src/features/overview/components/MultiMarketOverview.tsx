import { useMemo } from 'react';
import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { Card } from '@/components/ui/Card';
import { MARKET_CONFIGS } from '@/engine/markets/configs';
import { calculateMarketPricing, makeDefaultMarketInputs } from '@/engine/markets/genericCalculator';
import { Globe } from 'lucide-react';

/**
 * Multi-Market Overview — shows the same wine priced across ALL markets.
 *
 * Uses the current wine's cost and case pack, but applies each market's
 * default margins, taxes, logistics, and FX rates to show what the wine
 * would retail for in each market.
 */
export function MultiMarketOverview() {
  const { inputs, activeMarketId, setMarket } = useMarketStore();

  const overviewResults = useMemo(() => {
    return MARKET_CONFIGS.map((config) => {
      const marketInputs = makeDefaultMarketInputs(config);
      // Override with the user's product details
      marketInputs.costPerBottle = inputs.costPerBottle;
      marketInputs.casePack = inputs.casePack;
      marketInputs.bottleSizeMl = inputs.bottleSizeMl;
      marketInputs.abv = inputs.abv;

      const result = calculateMarketPricing(config, marketInputs);

      return {
        config,
        result,
        srpBottle: result.summary.srpBottle,
        srpCase: result.summary.srpCase,
        landedCase: result.summary.landedCase,
        layers: result.layerRecaps.length,
        hasWarnings: result.warnings.some((w) => w.severity === 'error'),
      };
    }).sort((a, b) => a.srpBottle - b.srpBottle);
  }, [inputs.costPerBottle, inputs.casePack, inputs.bottleSizeMl, inputs.abv]);

  const sym = (config: typeof MARKET_CONFIGS[0]) => config.currency.symbol;
  const fmt = (val: number, s: string) =>
    !Number.isFinite(val) ? '—' : `${s}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Card
      title="Multi-Market Overview"
      kicker="Global Pricing"
      collapsible
      defaultCollapsed
    >
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <Globe size={14} />
        <span>
          Same wine ({fmt(inputs.costPerBottle, MARKET_CONFIGS.find(m => m.id === activeMarketId)?.currency.sourceSymbol || '$')} / btl) priced across all markets using default assumptions
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
          <span>Market</span>
          <span className="text-right w-24">SRP / Bottle</span>
          <span className="text-right w-24">SRP / Case</span>
          <span className="text-right w-20">Landed</span>
        </div>

        {/* Rows */}
        {overviewResults.map(({ config, srpBottle, srpCase, landedCase, hasWarnings }) => {
          const isActive = config.id === activeMarketId;
          return (
            <button
              key={config.id}
              onClick={() => setMarket(config.id)}
              className={[
                'grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2.5 border-b border-slate-100 last:border-0 text-sm w-full text-left transition-colors cursor-pointer',
                isActive ? 'bg-amber-50/70' : 'hover:bg-slate-50/70',
              ].join(' ')}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{config.flag}</span>
                <span className={[
                  'truncate',
                  isActive ? 'font-semibold text-amber-800' : 'text-slate-700',
                ].join(' ')}>
                  {config.name}
                </span>
                {hasWarnings && <span className="text-rose-500 text-xs">⚠</span>}
              </div>
              <span className={[
                'text-right tabular-nums font-semibold w-24',
                isActive ? 'text-amber-700' : 'text-slate-900',
              ].join(' ')}>
                {fmt(srpBottle, sym(config))}
              </span>
              <span className="text-right tabular-nums text-slate-600 w-24">
                {fmt(srpCase, sym(config))}
              </span>
              <span className="text-right tabular-nums text-slate-500 text-xs w-20">
                {fmt(landedCase, sym(config))}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-400 mt-2">
        Click any row to switch to that market. Uses each market's default margins and tax rates.
      </p>
    </Card>
  );
}
