import { useState } from 'react';
import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { Card } from '@/components/ui/Card';
import { Download, Copy, Check, RotateCcw } from 'lucide-react';
import { generateCsv, downloadCsv } from '../lib/exportCsv';
import { generateSummaryText, copyToClipboard } from '../lib/exportClipboard';

export function ExportPanel() {
  const { result, activeMarket, resetToDefaults } = useMarketStore();
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const handleCsvExport = () => {
    const csv = generateCsv(result, activeMarket.currency.symbol);
    const filename = `pricing-${activeMarket.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(csv, filename);
  };

  const handleClipboardCopy = async () => {
    const text = generateSummaryText(result, activeMarket);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card title="Export & Actions" kicker="Share">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleClipboardCopy}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy Summary'}
        </button>
        <button
          onClick={handleCsvExport}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Download size={16} />
          Export CSV
        </button>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
        >
          <RotateCcw size={16} />
          Reset Defaults
        </button>
      </div>
    </Card>
  );
}
