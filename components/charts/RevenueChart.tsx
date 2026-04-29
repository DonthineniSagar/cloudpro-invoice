'use client';

type MonthData = { month: string; revenue: number; expenses: number };

interface RevenueChartProps {
  data: MonthData[];
  dark: boolean;
  muted: string;
}

export default function RevenueChart({ data, dark, muted }: RevenueChartProps) {
  const chartMax = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1);

  if (data.length === 0) {
    return <div className={`h-48 flex items-center justify-center ${muted}`}>No data yet</div>;
  }

  return (
    <>
      <div className="flex items-end gap-3 h-48">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div className="flex gap-1 items-end w-full justify-center" style={{ height: '80%' }}>
              <div
                className="w-5 rounded-t bg-indigo-500 transition-all"
                style={{ height: `${Math.max((d.revenue / chartMax) * 100, 2)}%` }}
                title={`Revenue: $${d.revenue.toFixed(2)}`}
              />
              <div
                className="w-5 rounded-t bg-red-400 transition-all"
                style={{ height: `${Math.max((d.expenses / chartMax) * 100, 2)}%` }}
                title={`Expenses: $${d.expenses.toFixed(2)}`}
              />
            </div>
            <span className={`text-xs ${muted}`}>{d.month}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-6 mt-4">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded bg-indigo-500" />
          <span className={muted}>Revenue</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded bg-red-400" />
          <span className={muted}>Expenses</span>
        </div>
      </div>
    </>
  );
}
