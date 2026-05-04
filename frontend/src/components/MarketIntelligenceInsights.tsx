import { Brain, Sparkles, TrendingUp, Compass } from 'lucide-react';

interface InsightProps {
  insights: string[];
}

export default function MarketIntelligenceInsights({ insights }: InsightProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
      
      <div className="relative z-10 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-blue-300 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Strategic Intelligence Layer
            </div>
            <h2 className="text-3xl font-black tracking-tight leading-tight">
              Market Context & <span className="text-blue-400">Strategic Nuance</span>
            </h2>
            <p className="text-slate-400 font-medium max-w-xl">
              Synthesized behavioral patterns and consultant-level observations from cross-referencing customer signals.
            </p>
          </div>
          <div className="shrink-0 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
            <Brain className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {insights.map((insight, idx) => (
            <div key={idx} className="group p-8 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 space-y-6">
               <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  {idx === 0 ? <TrendingUp className="w-6 h-6" /> : idx === 1 ? <Compass className="w-6 h-6" /> : <Brain className="w-6 h-6" />}
               </div>
               <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/80">Observation 0{idx + 1}</span>
                  <p className="text-lg font-bold text-white leading-relaxed group-hover:text-blue-50 transition-colors">
                     "{insight}"
                  </p>
               </div>
            </div>
          ))}
        </div>
        
        <div className="pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> AI Synthesis</div>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Market Benchmarks</div>
           </div>
           <p className="text-[10px] font-bold text-slate-500 italic">
             Derived from deep-tissue analysis of sentiment velocity and recurring phrase structures.
           </p>
        </div>
      </div>
    </div>
  );
}
