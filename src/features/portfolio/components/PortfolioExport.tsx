import { useState } from 'react';
import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { downloadCsv } from '@/features/export/lib/exportCsv';
import { generatePortfolioCsv } from '../lib/portfolioCsv';
import { Download } from 'lucide-react';

export function PortfolioExport() {
  const portfolio = useMarketStore((s) => s.portfolio);
  const whatIfActive = useMarketStore((s) => s.whatIfActive);
  const whatIfResults = useMarketStore((s) => s.whatIfResults);
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    const csv = generatePortfolioCsv(
      portfolio,
      whatIfActive ? whatIfResults : null,
    );
    const date = new Date().toISOString().split('T')[0];
    downloadCsv(csv, `portfolio-price-list-${date}.csv`);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
    <div className="flex items-center justify-end gap-3">
      <button
        onClick={handleExport}
        disabled={portfolio.length === 0}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <Download size={14} />
        {exported ? 'Downloaded!' : whatIfActive ? 'Export Price List (with What-If)' : 'Export Price List (CSV)'}
      </button>
    </div>
  );
}
