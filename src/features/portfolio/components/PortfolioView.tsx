import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { PortfolioDashboard } from './PortfolioDashboard';
import { WhatIfPanel } from './WhatIfPanel';
import { PortfolioTable } from './PortfolioTable';
import { PortfolioExport } from './PortfolioExport';
import { FolderOpen, Plus } from 'lucide-react';

export function PortfolioView() {
  const portfolio = useMarketStore((s) => s.portfolio);
  const setActiveView = useMarketStore((s) => s.setActiveView);

  if (portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <FolderOpen size={28} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Your portfolio is empty</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Add wines from the calculator to build your portfolio. Then use the What-If panel to stress-test
          your entire book against FX moves, tariff changes, and freight increases.
        </p>
        <button
          onClick={() => setActiveView('calculator')}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-600 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Go to Calculator
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortfolioDashboard />
      <WhatIfPanel />
      <PortfolioTable />
      <PortfolioExport />
    </div>
  );
}
