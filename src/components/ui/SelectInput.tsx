import type { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function SelectInput({ label, children, hint, ...props }: SelectInputProps) {
  return (
    <label className="flex flex-col space-y-1 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <select
        {...props}
        className={[
          'rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm',
          'focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200',
          'disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50',
        ].join(' ')}
      >
        {children}
      </select>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </label>
  );
}
