'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

type Variant = 'default' | 'green' | 'amber' | 'red';

interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  delta?: number;
  variant?: Variant;
  dark?: boolean;
  className?: string;
}

const valueColors: Record<Variant, { light: string; dark: string }> = {
  default: { light: 'text-gray-900', dark: 'text-white' },
  green:   { light: 'text-green-600', dark: 'text-green-400' },
  amber:   { light: 'text-amber-600', dark: 'text-amber-400' },
  red:     { light: 'text-red-600',   dark: 'text-red-400' },
};

export default function MetricCard({
  label,
  value,
  subLabel,
  delta,
  variant = 'default',
  dark = false,
  className = '',
}: MetricCardProps) {
  const card = dark
    ? 'bg-black p-6 rounded-xl border-2 border-purple-500/40 hover:border-purple-500 transition-all'
    : 'bg-white p-6 rounded-xl border-2 border-indigo-600';
  const labelCls = dark ? 'text-sm text-slate-400 mb-1' : 'text-sm text-gray-600 mb-1';
  const subCls   = dark ? 'text-xs text-slate-500 mt-1' : 'text-xs text-gray-500 mt-1';
  const { light, dark: darkColor } = valueColors[variant];

  return (
    <div className={`${card} ${className}`}>
      <div className={labelCls}>{label}</div>
      <div className={`text-3xl font-bold font-mono tabular-nums ${dark ? darkColor : light}`}>{value}</div>
      {subLabel && <div className={subCls}>{subLabel}</div>}
      {delta !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {delta >= 0
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />}
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
