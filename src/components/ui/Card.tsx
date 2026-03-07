import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CardProps {
  title: string;
  kicker?: string;
  children: ReactNode;
  accent?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  sticky?: boolean;
  className?: string;
}

export function Card({
  title,
  kicker,
  children,
  accent = false,
  collapsible = false,
  defaultCollapsed = false,
  sticky = false,
  className = '',
}: CardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section
      className={[
        'rounded-2xl border p-6 space-y-4',
        accent
          ? 'border-amber-300 bg-white/90 shadow-lg shadow-amber-100/50'
          : 'border-slate-200 bg-white shadow-sm',
        sticky ? 'lg:sticky lg:top-4' : '',
        className,
      ].join(' ')}
    >
      <div className="flex justify-between items-center">
        <div className="space-y-0.5">
          {kicker && (
            <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">
              {kicker}
            </p>
          )}
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {collapsible && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>
        )}
      </div>
      {!collapsed && children}
    </section>
  );
}
