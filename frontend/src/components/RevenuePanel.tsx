import { DollarSign, BarChart3, TrendingUp, Info, ShieldCheck } from 'lucide-react';

interface RevenueProps {
  range: {
    min_sales: number;
    max_sales: number;
    min_revenue: number;
    max_revenue: number;
  };
  currency: string;
  confidence: string;
  model: string;
  tooltip: string;
}

export default function RevenuePanel({ range, currency, confidence, model, tooltip }: RevenueProps) {
  const hasSales = Number(range?.min_sales || 0) > 0 || Number(range?.max_sales || 0) > 0;
  const hasRevenue = Number(range?.min_revenue || 0) > 0 || Number(range?.max_revenue || 0) > 0;
  const salesText = hasSales ? formatRange(range.min_sales, range.max_sales) : 'Not enough data';
  const revenueText = hasRevenue ? `${currency}${formatRange(range.min_revenue, range.max_revenue)}` : 'Not enough data';

  const confidenceColor = confidence.toLowerCase() === 'high' ? 'bg-emerald-500' : confidence.toLowerCase() === 'medium' ? 'bg-amber-500' : 'bg-slate-400';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/60 p-6 md:p-8 space-y-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl group-hover:bg-white transition-colors">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Confidence</span>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${confidenceColor}`}></div>
                <span className="text-xs font-bold text-slate-900 capitalize">{confidence}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-600" />
              Revenue Estimation
            </h3>
            <div className="relative group/tooltip">
              <Info className="w-4 h-4 text-slate-300 cursor-help hover:text-blue-500 transition-all" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none z-50 shadow-2xl leading-relaxed">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Projected marketplace performance. Treat as directional, not exact.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                <BarChart3 className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Est. Volume</span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900 tracking-tighter">
                {salesText}
              </div>
              <p className="text-xs font-bold text-slate-500">Units sold / month</p>
            </div>
          </div>

          <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-emerald-100">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-black text-emerald-600/60 uppercase tracking-widest">Est. Revenue</span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-emerald-900 tracking-tighter">
                {revenueText}
              </div>
              <p className="text-xs font-bold text-emerald-600/60">Estimated GMV / Month</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-5 bg-blue-50 rounded-3xl">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-[11px] font-medium text-blue-900/70 leading-relaxed">
          <span className="font-bold">Intelligence Disclosure:</span> This estimate uses the <span className="font-bold">{model}</span> model and available marketplace signals. It is a planning range, not internal marketplace data.
        </p>
      </div>
    </div>
  );
}

function formatRange(min: number, max: number) {
  if (!min && !max) return 'Not enough data';
  if (!max || min === max) return `~${formatShort(min || max)}`;
  return `${formatShort(min)} - ${formatShort(max)}`;
}

function formatShort(val: number) {
  if (val >= 10000000) return `${trim(val / 10000000)}Cr`;
  if (val >= 100000) return `${trim(val / 100000)}L`;
  if (val >= 1000) return `${trim(val / 1000)}K`;
  return Math.round(val).toLocaleString();
}

function trim(value: number) {
  return value.toFixed(1).replace('.0', '');
}
