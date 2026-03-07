import { useMarketStore } from '../state/useMarketStore';
import type { MarketConfig } from '@/engine/markets/types';

function MarketCard({ market, active, onSelect }: {
  market: MarketConfig;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all cursor-pointer',
        'hover:shadow-md hover:-translate-y-0.5',
        active
          ? 'border-amber-500 bg-amber-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300',
      ].join(' ')}
    >
      <span className="text-2xl leading-none">{market.flag}</span>
      <span className={[
        'text-xs font-semibold leading-tight',
        active ? 'text-amber-800' : 'text-slate-700',
      ].join(' ')}>
        {market.name}
      </span>
    </button>
  );
}

export function MarketSelector() {
  const { markets, activeMarketId, activeMarket, setMarket } = useMarketStore();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {markets.map((m) => (
          <MarketCard
            key={m.id}
            market={m}
            active={m.id === activeMarketId}
            onSelect={() => setMarket(m.id)}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">{activeMarket.description}</p>
    </div>
  );
}
