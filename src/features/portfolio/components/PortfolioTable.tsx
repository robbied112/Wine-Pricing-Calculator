import { useState, useMemo } from 'react';
import { useMarketStore } from '@/features/pricing/state/useMarketStore';
import { Card } from '@/components/ui/Card';
import { Trash2, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { PortfolioWine } from '../types';

type SortField = 'name' | 'producer' | 'market' | 'srpBottle' | 'wholesaleCase' | 'landedCase' | 'updatedAt';
type SortDir = 'asc' | 'desc';

function fmtPrice(val: number, sym: string): string {
  if (!Number.isFinite(val)) return '\u2014';
  return `${sym}${val.toFixed(2)}`;
}

function fmtDelta(val: number): string {
  if (!Number.isFinite(val)) return '\u2014';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}`;
}

function fmtPct(val: number): string {
  if (!Number.isFinite(val)) return '\u2014';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}

export function PortfolioTable() {
  const {
    portfolio,
    whatIfActive,
    whatIfResults,
    loadWineIntoCalculator,
    removeFromPortfolio,
  } = useMarketStore();

  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [marketFilter, setMarketFilter] = useState<string>('all');

  // Unique markets for filter
  const markets = useMemo(() => {
    const unique = new Map<string, { id: string; flag: string; name: string }>();
    for (const w of portfolio) {
      if (!unique.has(w.marketId)) {
        unique.set(w.marketId, { id: w.marketId, flag: w.cachedMarketFlag, name: w.cachedMarketName });
      }
    }
    return Array.from(unique.values());
  }, [portfolio]);

  // What-if results lookup
  const whatIfMap = useMemo(() => {
    if (!whatIfResults) return new Map();
    return new Map(whatIfResults.map((r) => [r.wineId, r]));
  }, [whatIfResults]);

  // Filter + sort
  const sortedWines = useMemo(() => {
    let filtered = marketFilter === 'all' ? portfolio : portfolio.filter((w) => w.marketId === marketFilter);

    const compare = (a: PortfolioWine, b: PortfolioWine): number => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'producer': cmp = a.producer.localeCompare(b.producer); break;
        case 'market': cmp = a.cachedMarketName.localeCompare(b.cachedMarketName); break;
        case 'srpBottle': cmp = a.cachedSrpBottle - b.cachedSrpBottle; break;
        case 'wholesaleCase': cmp = a.cachedWholesaleCase - b.cachedWholesaleCase; break;
        case 'landedCase': cmp = a.cachedLandedCase - b.cachedLandedCase; break;
        case 'updatedAt': cmp = a.updatedAt - b.updatedAt; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    };

    return [...filtered].sort(compare);
  }, [portfolio, sortField, sortDir, marketFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'updatedAt' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-slate-300" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-amber-500" />
      : <ArrowDown size={12} className="text-amber-500" />;
  };

  return (
    <Card title="Your Wines" kicker="Portfolio">
      {/* Filter row */}
      {markets.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-slate-500">Filter:</span>
          <select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="all">All markets ({portfolio.length})</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.flag} {m.name} ({portfolio.filter((w) => w.marketId === m.id).length})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {[
                { field: 'name' as SortField, label: 'Wine' },
                { field: 'market' as SortField, label: 'Market' },
                { field: 'srpBottle' as SortField, label: 'SRP/Btl' },
                { field: 'wholesaleCase' as SortField, label: 'Wholesale/Case' },
                { field: 'landedCase' as SortField, label: 'Landed/Case' },
              ].map(({ field, label }) => (
                <th
                  key={field}
                  onClick={() => toggleSort(field)}
                  className="text-left py-2 pr-3 font-medium text-slate-500 cursor-pointer hover:text-slate-700 transition-colors whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <SortIcon field={field} />
                  </span>
                </th>
              ))}
              {whatIfActive && (
                <>
                  <th className="text-left py-2 pr-3 font-medium text-amber-600 whitespace-nowrap">
                    What-If SRP
                  </th>
                  <th className="text-left py-2 pr-3 font-medium text-amber-600 whitespace-nowrap">
                    Delta
                  </th>
                </>
              )}
              <th className="py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {sortedWines.map((wine) => {
              const wi = whatIfMap.get(wine.id);
              return (
                <tr
                  key={wine.id}
                  onClick={() => loadWineIntoCalculator(wine.id)}
                  className="border-b border-slate-100 hover:bg-amber-50/30 cursor-pointer group transition-colors"
                >
                  <td className="py-3 pr-3">
                    <div className="font-medium text-slate-800">{wine.name}</div>
                    {wine.producer && (
                      <div className="text-xs text-slate-500">{wine.producer}</div>
                    )}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <span className="mr-1">{wine.cachedMarketFlag}</span>
                    <span className="text-slate-600">{wine.cachedMarketName}</span>
                  </td>
                  <td className="py-3 pr-3 font-medium text-slate-800 whitespace-nowrap">
                    {fmtPrice(wine.cachedSrpBottle, wine.cachedCurrencySymbol)}
                  </td>
                  <td className="py-3 pr-3 text-slate-600 whitespace-nowrap">
                    {fmtPrice(wine.cachedWholesaleCase, wine.cachedCurrencySymbol)}
                  </td>
                  <td className="py-3 pr-3 text-slate-600 whitespace-nowrap">
                    {fmtPrice(wine.cachedLandedCase, wine.cachedCurrencySymbol)}
                  </td>
                  {whatIfActive && wi && (
                    <>
                      <td className="py-3 pr-3 font-medium whitespace-nowrap">
                        <span className={wi.negative ? 'text-rose-600' : 'text-slate-800'}>
                          {fmtPrice(wi.overriddenSrpBottle, wine.cachedCurrencySymbol)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            wi.deltaSrpBottle > 0.01
                              ? 'bg-rose-50 text-rose-700'
                              : wi.deltaSrpBottle < -0.01
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-50 text-slate-500'
                          }`}
                        >
                          {fmtDelta(wi.deltaSrpBottle)} ({fmtPct(wi.deltaPercent)})
                        </span>
                        {wi.lowMargin && (
                          <span className="ml-1 inline-block w-2 h-2 rounded-full bg-yellow-400" title="Low margin (<15%)" />
                        )}
                        {wi.negative && (
                          <span className="ml-1 inline-block w-2 h-2 rounded-full bg-rose-500" title="Negative/impossible SRP" />
                        )}
                      </td>
                    </>
                  )}
                  <td className="py-3 text-right">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadWineIntoCalculator(wine.id);
                        }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                        title="Edit wine"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromPortfolio(wine.id);
                        }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove wine"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
