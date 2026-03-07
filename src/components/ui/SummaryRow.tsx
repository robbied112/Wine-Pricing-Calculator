interface SummaryRowProps {
  label: string;
  value: string;
  helper?: string;
  highlight?: boolean;
}

export function SummaryRow({ label, value, helper, highlight = false }: SummaryRowProps) {
  return (
    <div
      className={[
        'flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0',
        highlight ? 'bg-amber-50/50 -mx-2 px-2 rounded-lg' : '',
      ].join(' ')}
    >
      <div className="pr-4">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {helper && <p className="text-xs text-slate-500">{helper}</p>}
      </div>
      <p className="text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">{value}</p>
    </div>
  );
}
