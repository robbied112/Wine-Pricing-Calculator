import { useMarketStore } from '../state/useMarketStore';
import { NumberInput } from '@/components/ui/NumberInput';
import { RefreshCw } from 'lucide-react';
import { getRateForMarket, formatRateAge } from '@/engine/fx/fetchRates';

export function MarketInputForm() {
  const { activeMarket: market, inputs, setInput, setMargin, setTax, setLogistics, toggleLayer, setPathway, liveRates, ratesFetching, fetchRates, costInputMode, setCostInputMode } =
    useMarketStore();

  const curr = market.currency;
  const isCase = costInputMode === 'case';
  const casePack = inputs.casePack || 12;

  const handleNum = (setter: (val: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = raw === '' ? 0 : Number(raw);
    if (!Number.isNaN(num)) setter(num);
  };

  // Display value: if case mode, show costPerBottle × casePack
  const costDisplay = isCase
    ? (inputs.costPerBottle ? +(inputs.costPerBottle * casePack).toFixed(2) : '')
    : (inputs.costPerBottle || '');

  // When user types a cost, convert case→bottle if needed
  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = raw === '' ? 0 : Number(raw);
    if (Number.isNaN(num)) return;
    const perBottle = isCase ? (casePack > 0 ? num / casePack : 0) : num;
    setInput('costPerBottle', perBottle);
  };

  return (
    <div className="space-y-6">
      {/* ---- Product Section ---- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</h4>
          <div className="flex bg-slate-100 rounded-md p-0.5">
            <button
              onClick={() => setCostInputMode('bottle')}
              className={[
                'px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer',
                !isCase ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              / Bottle
            </button>
            <button
              onClick={() => setCostInputMode('case')}
              className={[
                'px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer',
                isCase ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              / Case
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label={isCase ? 'Cost / case' : 'Cost / bottle'}
            value={costDisplay}
            onChange={handleCostChange}
            step={isCase ? '1' : '0.01'}
            prefix={curr.sourceSymbol}
            hint={isCase && inputs.costPerBottle ? `${curr.sourceSymbol}${inputs.costPerBottle.toFixed(2)} / btl` : undefined}
          />
          <NumberInput
            label="Case pack"
            value={inputs.casePack || ''}
            onChange={handleNum((v) => setInput('casePack', v))}
            step="1"
          />
        </div>
        {market.requiresBottleSize && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <NumberInput
              label="Bottle size"
              value={inputs.bottleSizeMl || ''}
              onChange={handleNum((v) => setInput('bottleSizeMl', v))}
              step="1"
              suffix="ml"
            />
            {market.requiresAbv && (
              <NumberInput
                label="ABV"
                value={inputs.abv || ''}
                onChange={handleNum((v) => setInput('abv', v))}
                step="0.1"
                suffix="%"
              />
            )}
          </div>
        )}
      </section>

      {/* ---- Currency & FX Section ---- */}
      {curr.needsConversion && (() => {
        const liveRate = liveRates ? getRateForMarket(market, liveRates.rates) : null;
        const rateIsDifferent = liveRate !== null && Math.abs(liveRate - inputs.exchangeRate) > 0.0001;

        return (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Currency & FX
              </h4>
              {liveRates && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-slate-400">
                    Live · {formatRateAge(liveRates.fetchedAt)}
                  </span>
                  <button
                    onClick={() => fetchRates(true)}
                    disabled={ratesFetching}
                    className="p-0.5 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer disabled:opacity-50"
                    title="Refresh live rates"
                  >
                    <RefreshCw size={11} className={ratesFetching ? 'animate-spin' : ''} />
                  </button>
                </div>
              )}
              {!liveRates && ratesFetching && (
                <div className="flex items-center gap-1.5">
                  <RefreshCw size={11} className="animate-spin text-slate-400" />
                  <span className="text-[10px] text-slate-400">Fetching rates…</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label={`Exchange rate (${curr.source} → ${curr.target})`}
                value={inputs.exchangeRate || ''}
                onChange={handleNum((v) => setInput('exchangeRate', v))}
                step="0.0001"
              />
              <NumberInput
                label="FX buffer"
                value={inputs.exchangeBuffer || ''}
                onChange={handleNum((v) => setInput('exchangeBuffer', v))}
                step="0.1"
                suffix="%"
              />
            </div>
            {/* Live rate nudge — shows if user has manually changed the rate */}
            {rateIsDifferent && liveRate !== null && (
              <button
                onClick={() => setInput('exchangeRate', liveRate)}
                className="mt-2 text-[11px] text-amber-600 hover:text-amber-800 underline underline-offset-2 cursor-pointer transition-colors"
              >
                Apply live rate ({liveRate.toFixed(4)})
              </button>
            )}
            {inputs.exchangeRate > 0 && (
              <div className="mt-2 inline-block bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <span className="text-xs font-semibold text-amber-700">Effective rate</span>
                <span className="ml-2 text-sm font-bold text-amber-800">
                  {(inputs.exchangeRate * (1 + (inputs.exchangeBuffer || 0) / 100)).toFixed(4)}
                </span>
              </div>
            )}
          </section>
        );
      })()}

      {/* ---- Pathway Section (DI / SS toggle) ---- */}
      {market.pathways && market.pathways.length > 1 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Import Pathway
          </h4>
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            {market.pathways.map((pw) => (
              <button
                key={pw.id}
                onClick={() => setPathway(pw.id)}
                className={[
                  'flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer text-center',
                  inputs.pathway === pw.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                {pw.label}
              </button>
            ))}
          </div>
          {inputs.pathway && (() => {
            const activePw = market.pathways!.find((p) => p.id === inputs.pathway);
            return activePw ? (
              <p className="text-[11px] text-slate-500 mt-2">{activePw.description}</p>
            ) : null;
          })()}
        </section>
      )}

      {/* ---- Taxes & Duties Section ---- */}
      {market.taxes.filter((t) => t.editable && (!t.activeWhen || t.activeWhen === inputs.pathway)).length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Taxes & Duties
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {market.taxes
              .filter((t) => t.editable && (!t.activeWhen || t.activeWhen === inputs.pathway))
              .map((tax) => (
                <NumberInput
                  key={tax.id}
                  label={tax.inputLabel}
                  value={inputs.taxes[tax.id] ?? tax.defaultValue}
                  onChange={handleNum((v) => setTax(tax.id, v))}
                  step={tax.formatAs === 'percent' ? '0.1' : '0.01'}
                  suffix={tax.formatAs === 'percent' ? '%' : undefined}
                  prefix={tax.formatAs === 'currency_per_unit' ? curr.symbol : undefined}
                  hint={tax.type === 'per_bottle' ? 'per bottle' : tax.type === 'per_liter' ? 'per liter' : undefined}
                />
              ))}
          </div>
        </section>
      )}

      {/* ---- Logistics Section ---- */}
      {market.logistics.filter((l) => l.editable && (!l.activeWhen || l.activeWhen === inputs.pathway)).length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Logistics
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {market.logistics
              .filter((l) => l.editable && (!l.activeWhen || l.activeWhen === inputs.pathway))
              .map((log) => (
                <NumberInput
                  key={log.id}
                  label={log.label}
                  value={inputs.logistics[log.id] ?? log.defaultValue}
                  onChange={handleNum((v) => setLogistics(log.id, v))}
                  step="0.01"
                  prefix={log.type === 'per_case' ? curr.symbol : undefined}
                  suffix={log.type === 'percent' ? '%' : undefined}
                  hint={log.type === 'per_case' ? 'per case' : undefined}
                />
              ))}
          </div>
        </section>
      )}

      {/* ---- Margin Structure Section ---- */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Margin Structure
        </h4>
        <div className="space-y-3">
          {market.chain.map((layer) => {
            const isActive = inputs.activeLayers.includes(layer.id);
            return (
              <div key={layer.id} className={!isActive ? 'opacity-50' : ''}>
                <div className="flex items-center gap-2 mb-1">
                  {layer.skippable && (
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => toggleLayer(layer.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                    />
                  )}
                  <span className="text-xs font-medium text-slate-600">{layer.label}</span>
                </div>
                <NumberInput
                  label={layer.marginLabel}
                  value={inputs.margins[layer.id] ?? layer.defaultMargin}
                  onChange={handleNum((v) => setMargin(layer.id, v))}
                  step="0.1"
                  suffix="%"
                  disabled={!isActive}
                  hint="Margin on selling price"
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
