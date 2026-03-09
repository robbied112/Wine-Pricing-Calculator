import { useState } from 'react';
import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { Card } from '@/components/ui/Card';
import { FolderOpen, Plus, Save, ArrowRight } from 'lucide-react';

export function AddToPortfolioPanel() {
  const {
    result,
    editingWineId,
    portfolio,
    addToPortfolio,
    saveCalculatorToWine,
    setActiveView,
  } = useMarketStore();

  const [wineName, setWineName] = useState('');
  const [producer, setProducer] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  if (!result) return null;

  const editingWine = editingWineId ? portfolio.find((w) => w.id === editingWineId) : null;

  const handleAdd = () => {
    if (!wineName.trim()) return;
    addToPortfolio(wineName.trim(), producer.trim(), notes.trim());
    setWineName('');
    setProducer('');
    setNotes('');
    setShowNotes(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleUpdate = () => {
    if (!editingWineId) return;
    saveCalculatorToWine(editingWineId);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  // Recent portfolio wines (last 3)
  const recentWines = portfolio.slice(0, 3);

  return (
    <Card
      title="Wine Portfolio"
      kicker="Save & Manage"
      collapsible
      defaultCollapsed={false}
    >
      {/* Editing an existing wine */}
      {editingWine ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
            <span className="text-base">{editingWine.cachedMarketFlag}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{editingWine.name}</p>
              {editingWine.producer && (
                <p className="text-xs text-slate-500 truncate">{editingWine.producer}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600 transition-colors cursor-pointer"
            >
              {justSaved ? (
                'Updated!'
              ) : (
                <>
                  <Save size={14} />
                  Update in Portfolio
                </>
              )}
            </button>
            <button
              onClick={() => setActiveView('portfolio')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Adding a new wine */
        <div className="space-y-2">
          <input
            type="text"
            value={wineName}
            onChange={(e) => setWineName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Wine name (e.g. Clos du Val Cabernet 2020)..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
          <input
            type="text"
            value={producer}
            onChange={(e) => setProducer(e.target.value)}
            placeholder="Producer (optional)..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
          {showNotes ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)..."
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
            />
          ) : (
            <button
              onClick={() => setShowNotes(true)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              + Add notes
            </button>
          )}
          <button
            onClick={handleAdd}
            disabled={!wineName.trim()}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {justSaved ? (
              'Added to Portfolio!'
            ) : (
              <>
                <Plus size={14} />
                Add to Portfolio
              </>
            )}
          </button>
        </div>
      )}

      {/* Portfolio summary + link */}
      {portfolio.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          {/* Recent wines */}
          {recentWines.length > 0 && (
            <div className="space-y-1 mb-2">
              {recentWines.map((wine) => (
                <div key={wine.id} className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{wine.cachedMarketFlag}</span>
                  <span className="truncate flex-1">{wine.name}</span>
                  <span className="font-medium text-slate-600">
                    {wine.cachedCurrencySymbol}{wine.cachedSrpBottle.toFixed(2)}/btl
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setActiveView('portfolio')}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <FolderOpen size={14} />
            View Portfolio ({portfolio.length} {portfolio.length === 1 ? 'wine' : 'wines'})
          </button>
        </div>
      )}
    </Card>
  );
}
