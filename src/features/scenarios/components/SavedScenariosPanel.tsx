import { useState } from 'react';
import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { Card } from '@/components/ui/Card';
import { Bookmark, Trash2, Upload } from 'lucide-react';

function fmtPrice(val: number, sym: string): string {
  if (!Number.isFinite(val)) return '—';
  return `${sym}${val.toFixed(2)}`;
}

export function SavedScenariosPanel() {
  const { savedScenarios, saveScenario, loadScenario, deleteScenario, result } = useMarketStore();
  const [scenarioName, setScenarioName] = useState('');

  if (!result) return null;

  const handleSave = () => {
    if (!scenarioName.trim()) return;
    saveScenario(scenarioName.trim());
    setScenarioName('');
  };

  return (
    <Card
      title="Saved Scenarios"
      kicker="Bookmarks"
      collapsible
      defaultCollapsed={savedScenarios.length === 0}
    >
      {/* Save current */}
      <div className="flex gap-2">
        <input
          type="text"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Name this scenario..."
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        <button
          onClick={handleSave}
          disabled={!scenarioName.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Bookmark size={14} />
          Save
        </button>
      </div>

      {/* Saved list */}
      {savedScenarios.length > 0 && (
        <div className="space-y-1.5 mt-3">
          {savedScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{scenario.marketFlag}</span>
                  <span className="text-sm font-medium text-slate-800 truncate">{scenario.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>{scenario.marketName}</span>
                  <span className="font-medium text-slate-700">
                    {fmtPrice(scenario.srpBottle, scenario.currencySymbol)} / btl
                  </span>
                  <span>{new Date(scenario.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => loadScenario(scenario.id)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                  title="Load scenario"
                >
                  <Upload size={14} />
                </button>
                <button
                  onClick={() => deleteScenario(scenario.id)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete scenario"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
