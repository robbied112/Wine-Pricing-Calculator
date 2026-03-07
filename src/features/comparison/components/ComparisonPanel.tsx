import { usePricingStore } from '@/features/pricing/state/usePricingStore';
import { Card } from '@/components/ui/Card';
import { NumberInput } from '@/components/ui/NumberInput';
import { FIELD_VISIBILITY } from '@/engine/core/constants';
import { formatMoney, formatDelta, formatPercentDelta } from '@/lib/format';
import type { PricingInputs } from '@/engine/core/types';
import { GitCompareArrows } from 'lucide-react';

export function ComparisonPanel() {
  const {
    inputs,
    scenarioBEnabled,
    scenarioBLabel,
    scenarioBInputs,
    comparison,
    toggleScenarioB,
    setScenarioBLabel,
    setScenarioBField,
  } = usePricingStore();

  const visibility = FIELD_VISIBILITY[inputs.whoAmI];

  const handleBChange = (field: keyof PricingInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = raw === '' ? 0 : Number(raw);
    if (!Number.isNaN(num)) {
      setScenarioBField(field, num);
    }
  };

  // Only show fields that are visible for the current role and are numeric pricing fields
  type OverrideField = {
    key: keyof PricingInputs;
    label: string;
    step: string;
    prefix?: string;
    suffix?: string;
    visible: boolean;
  };

  const overrideFields: OverrideField[] = [
    { key: 'exCellarBottle', label: 'Ex-cellar / btl', step: '0.01', prefix: visibility.exchangeRate ? '€' : '$', visible: visibility.exCellarBottle },
    { key: 'tariffPercent', label: 'Tariff', step: '0.1', suffix: '%', visible: visibility.tariffPercent },
    { key: 'diFreightPerCase', label: 'DI freight / case', step: '0.01', prefix: '$', visible: visibility.diFreightPerCase },
    { key: 'statesideLogisticsPerCase', label: 'Stateside / case', step: '0.01', prefix: '$', visible: visibility.statesideLogisticsPerCase },
    { key: 'importerMarginPercent', label: 'Importer margin', step: '0.1', suffix: '%', visible: visibility.importerMarginPercent },
    { key: 'distributorMarginPercent', label: 'Distributor margin', step: '0.1', suffix: '%', visible: visibility.distributorMarginPercent },
    { key: 'retailerMarginPercent', label: 'Retailer margin', step: '0.1', suffix: '%', visible: visibility.retailerMarginPercent },
  ];

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
        <div className="space-y-4">
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {overrideFields
              .filter((f) => f.visible)
              .map((field) => (
                <NumberInput
                  key={field.key}
                  label={field.label}
                  value={(scenarioBInputs[field.key] as number) || ''}
                  onChange={handleBChange(field.key)}
                  step={field.step}
                  prefix={field.prefix}
                  suffix={field.suffix}
                />
              ))}
          </div>

          {/* Delta table */}
          {comparison && (
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
                {comparison.deltas.map((d) => (
                  <div
                    key={d.field}
                    className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-slate-100 last:border-0 text-sm"
                  >
                    <span className="text-slate-600">{d.label}</span>
                    <span className="text-right tabular-nums text-slate-900">
                      {formatMoney(d.baseline)}
                    </span>
                    <span className="text-right tabular-nums text-slate-900">
                      {formatMoney(d.comparison)}
                    </span>
                    <span
                      className={[
                        'text-right tabular-nums font-medium',
                        d.delta > 0.005
                          ? 'text-emerald-700'
                          : d.delta < -0.005
                            ? 'text-rose-600'
                            : 'text-slate-500',
                      ].join(' ')}
                    >
                      {formatDelta(d.delta)}
                      {d.percentChange !== null && (
                        <span className="text-xs ml-1 opacity-70">
                          ({formatPercentDelta(d.percentChange)})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
