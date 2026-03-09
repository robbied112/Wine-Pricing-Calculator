import type { ReactNode } from 'react';
import { Wine, Calculator, FolderOpen } from 'lucide-react';
import { useMarketStore } from '@/features/pricing/state/useMarketStore';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const activeView = useMarketStore((s) => s.activeView);
  const setActiveView = useMarketStore((s) => s.setActiveView);
  const portfolioCount = useMarketStore((s) => s.portfolio.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-800">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm">
              <Wine size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Wine Pricing Studio</h1>
              <p className="text-xs text-slate-500 leading-tight">Pricing & Scenario Modeling</p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setActiveView('calculator')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                activeView === 'calculator'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calculator size={14} />
              Calculator
            </button>
            <button
              onClick={() => setActiveView('portfolio')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                activeView === 'portfolio'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FolderOpen size={14} />
              Portfolio
              {portfolioCount > 0 && (
                <span className={`ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none ${
                  activeView === 'portfolio'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {portfolioCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t border-slate-200/60 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-400">
          Wine Pricing Studio &mdash; Professional pricing and scenario modeling for the wine industry.
        </div>
      </footer>
    </div>
  );
}
