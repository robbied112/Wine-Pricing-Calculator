import { useState, useMemo } from 'react';
import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { Card } from '@/components/ui/Card';
import { Target, TrendingUp, PieChart } from 'lucide-react';
import {
  reverseCalculate,
  calculatePriceTiers,
  calculateFxSensitivity,
  computeValueChain,
} from '@/engine/markets/reverseCalculator';

type Tab = 'target' | 'fx' | 'value';

function fmt(value: number, symbol: string): string {
  if (!Number.isFinite(value)) return '—';
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AnalysisPanel() {
  const { result, activeMarket, inputs } = useMarketStore();
  const [activeTab, setActiveTab] = useState<Tab>('target');
  const [targetSrp, setTargetSrp] = useState<number>(14.99);

  if (!result) return null;

  const sym = activeMarket.currency.symbol;
  const srcSym = activeMarket.currency.sourceSymbol;

  // ---- Target Price computations ----

  const tierResults = useMemo(() => {
    return calculatePriceTiers(activeMarket, inputs, result.summary.srpBottle);
  }, [activeMarket, inputs, result.summary.srpBottle]);

  const customTarget = useMemo(() => {
    if (targetSrp <= 0) return null;
    const maxCost = reverseCalculate(activeMarket, targetSrp, inputs);
    return { maxCost, achievable: maxCost >= 0 };
  }, [activeMarket, inputs, targetSrp]);

  const currentCostGap = customTarget && customTarget.achievable
    ? inputs.costPerBottle - customTarget.maxCost
    : null;

  // ---- FX sensitivity ----

  const fxData = useMemo(() => {
    if (!activeMarket.currency.needsConversion) return null;
    return calculateFxSensitivity(activeMarket, inputs);
  }, [activeMarket, inputs]);

  // ---- Value chain ----

  const valueChain = useMemo(() => {
    return computeValueChain(result);
  }, [result]);

  const tabs: { id: Tab; label: string; icon: typeof Target }[] = [
    { id: 'target', label: 'Target Price', icon: Target },
    { id: 'fx', label: 'FX Risk', icon: TrendingUp },
    { id: 'value', label: 'Value Chain', icon: PieChart },
  ];

  return (
    <Card title="Pricing Intelligence" kicker="Analysis">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={[
              'flex items-center gap-1.5 flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer justify-center',
              activeTab === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-800',
            ].join(' ')}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ======== TARGET PRICE TAB ======== */}
      {activeTab === 'target' && (
        <div className="space-y-4">
          {/* Target input + result */}
          <div className="flex items-stretch gap-3">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">Target shelf price / bottle</span>
              <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200">
                <span className="mr-2 text-xs text-slate-500">{sym}</span>
                <input
                  type="number"
                  value={targetSrp || ''}
                  onChange={(e) => setTargetSrp(Number(e.target.value) || 0)}
                  step="0.01"
                  className="w-full border-none bg-transparent text-base text-slate-900 focus:outline-none tabular-nums"
                />
              </div>
            </label>
            {customTarget && (
              <div className={[
                'rounded-lg border px-4 py-2 min-w-[140px] flex flex-col justify-center',
                customTarget.achievable
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-rose-50 border-rose-200',
              ].join(' ')}>
                <p className={[
                  'text-xs font-medium',
                  customTarget.achievable ? 'text-amber-600' : 'text-rose-600',
                ].join(' ')}>
                  {customTarget.achievable ? 'Max FOB Cost' : 'Not Achievable'}
                </p>
                {customTarget.achievable ? (
                  <>
                    <p className="text-lg font-bold text-amber-800 tabular-nums">
                      {fmt(customTarget.maxCost, srcSym)}
                    </p>
                    <p className="text-[10px] text-amber-600">per bottle, ex-works</p>
                  </>
                ) : (
                  <p className="text-xs text-rose-600 mt-1">
                    Fixed costs exceed this target
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Gap indicator */}
          {currentCostGap !== null && customTarget?.achievable && (
            <div className={[
              'rounded-lg px-4 py-3',
              currentCostGap > 0.01 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200',
            ].join(' ')}>
              <p className="text-xs">
                {currentCostGap > 0.01 ? (
                  <span className="text-rose-700">
                    <span className="font-semibold">You're {fmt(currentCostGap, srcSym)} over.</span>
                    {' '}Current cost is {fmt(inputs.costPerBottle, srcSym)} — reduce to {fmt(customTarget.maxCost, srcSym)} to hit {fmt(targetSrp, sym)} shelf.
                  </span>
                ) : (
                  <span className="text-emerald-700">
                    <span className="font-semibold">Target achievable.</span>
                    {' '}You have {fmt(Math.abs(currentCostGap), srcSym)} of headroom at current cost of {fmt(inputs.costPerBottle, srcSym)}.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Tier table */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Retail Price Tier Targets
            </h4>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                <span>Shelf Price</span>
                <span>Max Cost / Bottle</span>
                <span className="text-right">Status</span>
              </div>
              {tierResults.map(({ tier, maxCost, achievable, currentAbove }) => {
                const isNearCurrent = Math.abs(result.summary.srpBottle - tier) / tier < 0.15;
                return (
                  <div
                    key={tier}
                    className={[
                      'grid grid-cols-[auto_1fr_auto] gap-x-4 px-4 py-2 border-b border-slate-100 last:border-0 text-sm',
                      isNearCurrent ? 'bg-amber-50/50' : '',
                    ].join(' ')}
                  >
                    <span className="font-medium text-slate-800 tabular-nums w-20">
                      {fmt(tier, sym)}
                    </span>
                    <span className="text-slate-600 tabular-nums">
                      {achievable ? `${fmt(maxCost, srcSym)} / btl` : '—'}
                    </span>
                    <span className={[
                      'text-right text-xs font-medium',
                      !achievable ? 'text-slate-400' :
                        currentAbove ? 'text-rose-500' : 'text-emerald-600',
                    ].join(' ')}>
                      {!achievable ? 'Below floor' : currentAbove ? 'Above ↑' : '✓ Achievable'}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Max cost in {activeMarket.currency.source} to hit each shelf price, keeping current margins and taxes.
            </p>
          </div>
        </div>
      )}

      {/* ======== FX RISK TAB ======== */}
      {activeTab === 'fx' && (
        <div className="space-y-3">
          {!fxData ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500">
                No currency conversion for {activeMarket.name} ({activeMarket.currency.source}).
              </p>
              <p className="text-xs text-slate-400 mt-1">FX analysis applies to cross-border markets only.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-4 gap-x-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <span>FX Move</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">SRP / btl</span>
                  <span className="text-right">Impact</span>
                </div>
                {fxData.map((row) => (
                  <div
                    key={row.deltaPercent}
                    className={[
                      'grid grid-cols-4 gap-x-2 px-4 py-2 border-b border-slate-100 last:border-0 text-sm',
                      row.isCurrent ? 'bg-amber-50/60 font-medium' : '',
                    ].join(' ')}
                  >
                    <span className="text-slate-700">
                      {row.isCurrent ? 'Current' : `${row.deltaPercent > 0 ? '+' : ''}${row.deltaPercent}%`}
                    </span>
                    <span className="text-right tabular-nums text-slate-600">
                      {row.exchangeRate.toFixed(4)}
                    </span>
                    <span className={[
                      'text-right tabular-nums',
                      row.isCurrent ? 'text-amber-800' : 'text-slate-900',
                    ].join(' ')}>
                      {fmt(row.srpBottle, sym)}
                    </span>
                    <span className={[
                      'text-right tabular-nums text-xs',
                      row.change > 0.005 ? 'text-rose-600 font-medium' :
                        row.change < -0.005 ? 'text-emerald-600 font-medium' : 'text-slate-400',
                    ].join(' ')}>
                      {row.isCurrent ? '—' :
                        `${row.change > 0 ? '+' : row.change < -0.005 ? '-' : ''}${fmt(Math.abs(row.change), sym)}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Risk summary */}
              <div className="bg-slate-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-700">
                  <span className="font-semibold">Risk band:</span>
                  {' '}A ±10% move in {activeMarket.currency.source}/{activeMarket.currency.target}
                  {' '}shifts shelf price by{' '}
                  <span className="font-bold tabular-nums">
                    ±{fmt(Math.abs(fxData[fxData.length - 1].change), sym)}
                  </span>
                  {' '}per bottle.
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Rising {activeMarket.currency.source} = higher shelf price.
                  Consider FX buffer to absorb volatility.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======== VALUE CHAIN TAB ======== */}
      {activeTab === 'value' && (
        <div className="space-y-4">
          {/* Stacked bar visualization */}
          <div>
            <div className="flex rounded-lg overflow-hidden h-9">
              {valueChain.filter((s) => s.percent > 0.5).map((slice) => (
                <div
                  key={slice.label}
                  className={`${slice.color} relative group transition-all`}
                  style={{ width: `${Math.max(slice.percent, 2)}%` }}
                  title={`${slice.label}: ${slice.percent.toFixed(1)}%`}
                >
                  {slice.percent > 12 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 drop-shadow-sm">
                      {slice.percent.toFixed(0)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {valueChain.map((slice) => (
                <div key={slice.label} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                  <span className={`w-2.5 h-2.5 rounded-sm ${slice.color}`} />
                  {slice.label}
                </div>
              ))}
            </div>
          </div>

          {/* Decomposition table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
              <span>Component</span>
              <span className="text-right w-20">/ bottle</span>
              <span className="text-right w-20">/ case</span>
              <span className="text-right w-14">% SRP</span>
            </div>
            {valueChain.map((slice) => (
              <div
                key={slice.label}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 border-b border-slate-100 last:border-0 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${slice.color}`} />
                  <span className="text-slate-700">{slice.label}</span>
                </div>
                <span className="text-right tabular-nums text-slate-900 w-20">
                  {fmt(slice.perBottle, sym)}
                </span>
                <span className="text-right tabular-nums text-slate-500 w-20">
                  {fmt(slice.perCase, sym)}
                </span>
                <span className="text-right tabular-nums text-slate-500 font-medium w-14">
                  {slice.percent.toFixed(1)}%
                </span>
              </div>
            ))}
            {/* Total */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 bg-slate-50 border-t-2 border-slate-200 text-sm font-bold">
              <span className="text-slate-900">Consumer Price</span>
              <span className="text-right tabular-nums text-amber-700 w-20">
                {fmt(result.summary.srpBottle, sym)}
              </span>
              <span className="text-right tabular-nums text-slate-900 w-20">
                {fmt(result.summary.srpCase, sym)}
              </span>
              <span className="text-right tabular-nums text-slate-900 w-14">100%</span>
            </div>
          </div>

          {/* Insight callout */}
          {valueChain.length > 0 && (() => {
            const marginSlices = valueChain.filter((s) => s.category === 'margin');
            const biggest = marginSlices.sort((a, b) => b.percent - a.percent)[0];
            const producerSlice = valueChain.find((s) => s.category === 'cost');
            if (!biggest || !producerSlice) return null;

            return (
              <div className="bg-slate-50 rounded-lg px-4 py-3 space-y-1">
                <p className="text-xs text-slate-700">
                  <span className="font-semibold">{biggest.label}</span> captures the largest share:
                  {' '}<span className="font-bold">{biggest.percent.toFixed(1)}%</span> of the shelf price
                  ({fmt(biggest.perBottle, sym)} / bottle).
                </p>
                <p className="text-xs text-slate-600">
                  The producer receives <span className="font-semibold">{producerSlice.percent.toFixed(1)}%</span>
                  {' '}({fmt(producerSlice.perBottle, sym)}) of every {fmt(result.summary.srpBottle, sym)} bottle sold.
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </Card>
  );
}
