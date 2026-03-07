import { Lock } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  prefix?: string;
  suffix?: string;
  locked?: boolean;
  hint?: string;
}

export function NumberInput({
  label,
  prefix,
  suffix,
  locked = false,
  disabled,
  hint,
  ...props
}: NumberInputProps) {
  const isDisabled = disabled || locked;

  return (
    <label className="flex flex-col space-y-1 text-sm text-slate-700">
      <span className="font-medium flex items-center gap-1.5">
        {label}
        {locked && <Lock size={12} className="text-slate-400" />}
      </span>
      <div
        className={[
          'flex items-center rounded-lg border bg-white px-3 py-2 shadow-sm transition-colors',
          isDisabled
            ? 'border-slate-100 bg-slate-50'
            : 'border-slate-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200',
        ].join(' ')}
      >
        {prefix && <span className="mr-2 text-xs text-slate-500">{prefix}</span>}
        <input
          {...props}
          type="number"
          disabled={isDisabled}
          className={[
            'w-full border-none bg-transparent text-base text-slate-900 placeholder-slate-400 focus:outline-none tabular-nums',
            isDisabled ? 'opacity-60 cursor-not-allowed' : '',
          ].join(' ')}
        />
        {suffix && <span className="ml-2 text-xs text-slate-500">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </label>
  );
}
