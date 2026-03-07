import { usePricingStore } from '@/features/pricing/state/usePricingStore';
import { Card } from '@/components/ui/Card';
import { RecapActor, type RecapActorType } from '@/engine/core/enums';
import { buildRecap } from '@/engine/recap/buildRecap';
import { formatMoney } from '@/lib/format';

const RECAP_TABS: { value: RecapActorType; label: string }[] = [
  { value: RecapActor.Supplier, label: 'Supplier' },
  { value: RecapActor.Importer, label: 'Importer' },
  { value: RecapActor.Distributor, label: 'Distributor' },
  { value: RecapActor.Retailer, label: 'Retailer' },
];

export function RecapPanel() {
  const { result, recapActor, setRecapActor } = usePricingStore();

  if (!result || result.modelId === 'UnknownModel') return null;

  const recap = buildRecap(result, recapActor);

  // Hide importer tab for domestic models
  const showImporter = result.case.importerFOBCase !== null;
  const filteredTabs = RECAP_TABS.filter(
    (tab) => tab.value !== RecapActor.Importer || showImporter,
  );

  return (
    <Card title="Role Recap" kicker="Stakeholder View">
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
        {filteredTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setRecapActor(tab.value)}
            className={[
              'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              recapActor === tab.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-800',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-0.5">
        {recap.lines.map((line) => (
          <div
            key={line.label}
            className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
          >
            <span className="text-sm text-slate-700">{line.label}</span>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-900 tabular-nums">
                {formatMoney(line.perCase)}
              </span>
              <span className="text-xs text-slate-500 ml-2 tabular-nums">
                ({formatMoney(line.perBottle)} / btl)
              </span>
            </div>
          </div>
        ))}

        {recap.lines.length === 0 && (
          <p className="text-sm text-slate-500 py-2">
            No recap data available for this role in this model.
          </p>
        )}
      </div>
    </Card>
  );
}
