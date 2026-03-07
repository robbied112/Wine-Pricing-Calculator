import { usePricingStore } from '../state/usePricingStore';
import { NumberInput } from '@/components/ui/NumberInput';
import { FIELD_VISIBILITY, type FieldVisibility } from '@/engine/core/constants';
import type { PricingInputs } from '@/engine/core/types';

export function PricingInputForm() {
  const { inputs, setField, activePresetId, presets, overrideUnlocked } = usePricingStore();

  const visibility: FieldVisibility = FIELD_VISIBILITY[inputs.whoAmI] || {
    exCellarBottle: true, exchangeRate: false, exchangeBuffer: false,
    tariffPercent: false, diFreightPerCase: false, statesideLogisticsPerCase: false,
    importerMarginPercent: false, distributorMarginPercent: false, retailerMarginPercent: true,
  };

  const activePreset = presets.find((p) => p.id === activePresetId);
  const lockedFields = activePreset?.lockedFields || [];
  const isLocked = (field: keyof PricingInputs) => !overrideUnlocked && lockedFields.includes(field);

  const handleChange = (field: keyof PricingInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setField(field, 0);
      return;
    }
    const num = Number(raw);
    if (!Number.isNaN(num)) {
      setField(field, num);
    }
  };

  const effectiveRate = (inputs.exchangeRate || 0) * (1 + (inputs.exchangeBuffer || 0) / 100);

  return (
    <div className="space-y-6">
      {/* Product basics */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Product</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {visibility.exCellarBottle && (
            <NumberInput
              label="Ex-cellar / bottle"
              value={inputs.exCellarBottle || ''}
              onChange={handleChange('exCellarBottle')}
              step="0.01"
              prefix={visibility.exchangeRate ? '€' : '$'}
              locked={isLocked('exCellarBottle')}
            />
          )}
          <div className="space-y-2">
            <NumberInput
              label="Case pack"
              value={inputs.casePack || ''}
              onChange={handleChange('casePack')}
              step="1"
              locked={isLocked('casePack')}
            />
            <div className="flex flex-wrap gap-1.5">
              {[6, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={[
                    'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                    inputs.casePack === n
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  ].join(' ')}
                  onClick={() => setField('casePack', n)}
                >
                  {n}pk
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FX */}
      {visibility.exchangeRate && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
            Currency & FX
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <NumberInput
              label="Exchange rate (EUR → USD)"
              value={inputs.exchangeRate || ''}
              onChange={handleChange('exchangeRate')}
              step="0.0001"
              locked={isLocked('exchangeRate')}
            />
            {visibility.exchangeBuffer && (
              <NumberInput
                label="Exchange buffer"
                value={inputs.exchangeBuffer || ''}
                onChange={handleChange('exchangeBuffer')}
                step="0.1"
                suffix="%"
                locked={isLocked('exchangeBuffer')}
              />
            )}
            {visibility.exchangeBuffer && (
              <div className="flex items-end">
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800 w-full">
                  <p className="font-semibold">Effective rate</p>
                  <p className="tabular-nums text-base font-semibold">{effectiveRate.toFixed(4)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logistics */}
      {(visibility.tariffPercent || visibility.diFreightPerCase || visibility.statesideLogisticsPerCase) && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
            Logistics & Tariffs
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {visibility.tariffPercent && (
              <NumberInput
                label="Tariff"
                value={inputs.tariffPercent || ''}
                onChange={handleChange('tariffPercent')}
                step="0.1"
                suffix="%"
                locked={isLocked('tariffPercent')}
              />
            )}
            {visibility.diFreightPerCase && (
              <NumberInput
                label="DI freight / case"
                value={inputs.diFreightPerCase || ''}
                onChange={handleChange('diFreightPerCase')}
                step="0.01"
                prefix="$"
                locked={isLocked('diFreightPerCase')}
              />
            )}
            {visibility.statesideLogisticsPerCase && (
              <NumberInput
                label="Stateside logistics / case"
                value={inputs.statesideLogisticsPerCase || ''}
                onChange={handleChange('statesideLogisticsPerCase')}
                step="0.01"
                prefix="$"
                locked={isLocked('statesideLogisticsPerCase')}
              />
            )}
          </div>
        </div>
      )}

      {/* Margins */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          Margin Structure
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {visibility.importerMarginPercent && (
            <NumberInput
              label="Importer margin"
              value={inputs.importerMarginPercent || ''}
              onChange={handleChange('importerMarginPercent')}
              step="0.1"
              suffix="%"
              locked={isLocked('importerMarginPercent')}
              hint="Margin on selling price"
            />
          )}
          {visibility.distributorMarginPercent && (
            <NumberInput
              label="Distributor margin"
              value={inputs.distributorMarginPercent || ''}
              onChange={handleChange('distributorMarginPercent')}
              step="0.1"
              suffix="%"
              locked={isLocked('distributorMarginPercent')}
              hint="Margin on selling price"
            />
          )}
          {visibility.retailerMarginPercent && (
            <NumberInput
              label="Retailer margin"
              value={inputs.retailerMarginPercent || ''}
              onChange={handleChange('retailerMarginPercent')}
              step="0.1"
              suffix="%"
              locked={isLocked('retailerMarginPercent')}
              hint="Margin on selling price"
            />
          )}
        </div>
      </div>
    </div>
  );
}
