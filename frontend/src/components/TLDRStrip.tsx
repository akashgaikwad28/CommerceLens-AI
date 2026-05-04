import { Zap, TrendingUp, AlertTriangle } from 'lucide-react';

interface TLDRProps {
  verdict: string;
  opportunity: string;
  risk: string;
}

export default function TLDRStrip({ verdict, opportunity, risk }: TLDRProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Market Verdict</p>
            <p className="text-sm font-bold leading-relaxed">{verdict}</p>
          </div>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] relative overflow-hidden group">
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60">Growth Opportunity</p>
            <p className="text-sm font-bold text-emerald-900 leading-relaxed">{opportunity}</p>
          </div>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] relative overflow-hidden group">
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600/60">Strategic Risk</p>
            <p className="text-sm font-bold text-rose-900 leading-relaxed">{risk}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
