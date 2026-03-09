import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { Wine, Globe, AlertTriangle, TrendingUp } from 'lucide-react';

export function PortfolioDashboard() {
  const portfolio = useMarketStore((s) => s.portfolio);

  const totalWines = portfolio.length;
  const uniqueMarkets = new Set(portfolio.map((w) => w.marketId)).size;

  // Compute average first-layer margin across portfolio
  const margins = portfolio.map((w) => {
    const firstMarginKey = Object.keys(w.inputs.margins)[0];
    return firstMarginKey ? w.inputs.margins[firstMarginKey] : 0;
  });
  const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

  // At-risk: wines with very low first-layer margin (<20%) or extreme SRP
  const atRisk = portfolio.filter((w) => {
    const firstMarginKey = Object.keys(w.inputs.margins)[0];
    const margin = firstMarginKey ? w.inputs.margins[firstMarginKey] : 0;
    return margin < 20 || !Number.isFinite(w.cachedSrpBottle) || w.cachedSrpBottle <= 0;
  }).length;

  const stats = [
    { label: 'Total Wines', value: totalWines, icon: Wine, color: 'text-amber-600 bg-amber-50' },
    { label: 'Markets', value: uniqueMarkets, icon: Globe, color: 'text-blue-600 bg-blue-50' },
    { label: 'At Risk', value: atRisk, icon: AlertTriangle, color: atRisk > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-50' },
    { label: 'Avg Margin', value: `${avgMargin.toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon size={16} />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {stat.label}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
