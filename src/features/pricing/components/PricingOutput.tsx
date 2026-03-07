import { usePricingStore } from '../state/usePricingStore';
import { Card } from '@/components/ui/Card';
import { SummaryRow } from '@/components/ui/SummaryRow';
import { formatMoney, formatPercent } from '@/lib/format';

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-3 pb-1">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{label}</span>
      <div className="flex-1 border-t border-slate-200" />
    </div>
  );
}

export function PricingOutput() {
  const { result } = usePricingStore();

  if (!result || result.modelId === 'UnknownModel') {
    return (
      <Card title="Pricing Output" kicker="Select a model">
        <p className="text-sm text-slate-500">
          Choose your role, counterparty, and inventory location to see pricing.
        </p>
      </Card>
    );
  }

  const hasImporter = result.case.importerFOBCase !== null;
  const hasDistributor = result.margins.distributorGrossProfitPerCase !== null;
  const hasDIFreight = result.case.diFreightCase !== null && result.case.diFreightCase > 0;
  const hasTariff = result.case.tariffCase !== null && result.case.tariffCase > 0;

  return (
    <Card title="Pricing Snapshot" kicker={result.modelLabel} accent sticky>
      <div className="space-y-0.5">
        {/* --- Cost basis --- */}
        <Divider label="Cost basis" />
        <SummaryRow
          label="Base case cost"
          value={formatMoney(result.case.baseCaseUSD)}
          helper={
            result.assumptions.currency === 'EUR'
              ? `${formatMoney(result.case.baseCaseSource, 'EUR')} × ${result.assumptions.effectiveExchangeRate.toFixed(4)}`
              : `${result.inputs.casePack} btl × ${formatMoney(result.inputs.exCellarBottle)}`
          }
        />

        {/* --- Import layer --- */}
        {hasImporter && (
          <>
            <Divider label="Import layer" />
            <SummaryRow
              label="Importer FOB case"
              value={formatMoney(result.case.importerFOBCase!)}
              helper={`${formatPercent(result.margins.importerMarginPercent!)} importer margin`}
            />
            {hasTariff && (
              <SummaryRow
                label="Tariff per case"
                value={formatMoney(result.case.tariffCase!)}
                helper={`${formatPercent(result.inputs.tariffPercent)} tariff rate`}
              />
            )}
            {hasDIFreight && (
              <SummaryRow
                label="DI freight per case"
                value={formatMoney(result.case.diFreightCase!)}
              />
            )}
          </>
        )}

        {/* --- Landed cost --- */}
        <Divider label="Landed" />
        <SummaryRow
          label="Landed case"
          value={formatMoney(result.case.landedCase)}
          helper="Total cost to buyer"
          highlight
        />

        {/* --- Distribution layer --- */}
        <Divider label="Distribution" />
        <SummaryRow
          label="Wholesale case"
          value={formatMoney(result.case.wholesaleCase)}
          helper={hasDistributor ? `${formatPercent(result.margins.distributorMarginPercent!)} distributor margin` : undefined}
        />
        <SummaryRow
          label="Wholesale bottle"
          value={formatMoney(result.bottle.wholesaleBottle)}
        />

        {/* --- Retail layer --- */}
        <Divider label="Retail" />
        <SummaryRow
          label="SRP per bottle"
          value={formatMoney(result.bottle.srpBottle)}
          helper={`${formatPercent(result.margins.retailerMarginPercent)} retailer margin`}
          highlight
        />
        <SummaryRow
          label="SRP per case"
          value={formatMoney(result.case.srpCase)}
        />
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
