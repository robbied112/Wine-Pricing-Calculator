import { usePricingStore } from '@/features/pricing/state/usePricingStore';
import { Unlock, Lock } from 'lucide-react';

export function PresetSelector() {
  const {
    presets,
    activePresetId,
    overrideUnlocked,
    applyPreset,
    setOverrideUnlocked,
  } = usePricingStore();

  const activePreset = presets.find((p) => p.id === activePresetId);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center gap-3">
        <label className="flex-1 flex flex-col space-y-1 text-sm text-slate-700">
          <span className="font-medium">Pricing Preset</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            value={activePresetId || ''}
            onChange={(e) => applyPreset(e.target.value)}
          >
            <option value="">None (manual)</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>

        {activePreset && (
          <button
            type="button"
            onClick={() => setOverrideUnlocked(!overrideUnlocked)}
            className={[
              'mt-5 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
              overrideUnlocked
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
            ].join(' ')}
            title={overrideUnlocked ? 'Lock preset fields' : 'Unlock preset fields for override'}
          >
            {overrideUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
            {overrideUnlocked ? 'Unlocked' : 'Unlock'}
          </button>
        )}
      </div>

      {activePreset && (
        <p className="text-xs text-slate-500">{activePreset.description}</p>
      )}
    </div>
  );
}
