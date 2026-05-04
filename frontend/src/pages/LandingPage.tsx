import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { analyzeProduct } from '../api/client';
import { Search, Zap, Target, BarChart3, ShieldCheck, ArrowRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (productUrl: string) => analyzeProduct(productUrl, 3),
    onSuccess: (data) => {
      navigate(`/job/${data.job_id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) mutation.mutate(url);
  };

  return (
    <div className="space-y-32 py-20 animate-in fade-in duration-1000">
      {/* Hero Section */}
      <section className="text-center space-y-12 max-w-4xl mx-auto px-4">
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-xs font-black uppercase tracking-widest shadow-sm"
          >
            <Zap className="w-4 h-4 fill-current" />
            AI-Powered Product Intelligence Engine
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight"
          >
            Turn Customer Signals into <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Market Leverage.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Stop reading thousands of reviews. Our intelligence engine dissects every customer signal to give you the exact winning factors, risk risks, and revenue projections in seconds.
          </motion.p>
        </div>

        {/* Input Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-3xl mx-auto relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
          <form onSubmit={handleSubmit} className="relative bg-white p-2 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row gap-2 border border-slate-100">
            <div className="flex-1 relative flex items-center">
              <Search className="absolute left-6 w-6 h-6 text-slate-400" />
              <input 
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste Amazon Product URL or ASIN..."
                className="w-full pl-16 pr-4 py-6 text-lg font-medium text-slate-900 outline-none placeholder:text-slate-300 rounded-[2rem]"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={mutation.isPending}
              className="bg-slate-900 text-white px-10 py-6 rounded-[2rem] font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300"
            >
              {mutation.isPending ? 'Orchestrating...' : 'Analyze Product'}
              <ArrowRight className="w-6 h-6" />
            </button>
          </form>
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400 font-bold text-xs uppercase tracking-widest">
          <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Real-time Scraping</div>
          <div className="flex items-center gap-2"><Target className="w-4 h-4" /> Market Benchmarking</div>
          <div className="flex items-center gap-2"><Zap className="w-4 h-4" /> Heuristic Revenue</div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        <FeatureCard 
          icon={<Zap className="w-8 h-8 text-blue-600" />}
          title="Verdict Hierarchy"
          desc="Get an instant market verdict, identify growth opportunities, and pinpoint strategic risks in a single view."
        />
        <FeatureCard 
          icon={<BarChart3 className="w-8 h-8 text-indigo-600" />}
          title="Revenue Heuristics"
          desc="Estimated monthly sales and GMV projections based on review velocity and category conversion multipliers."
        />
        <FeatureCard 
          icon={<Target className="w-8 h-8 text-emerald-600" />}
          title="Strategic Advisory"
          desc="Direct actions for product managers: what to fix immediately, how to improve messaging, and where to double down."
        />
      </section>

      {/* Demo Dashboard Preview Placeholder */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-[3rem] p-1 shadow-2xl border border-slate-100 relative overflow-hidden group">
          <div className="bg-slate-50 rounded-[2.8rem] h-[500px] flex items-center justify-center relative">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/80 z-10"></div>
             <div className="text-center space-y-4 relative z-20">
                <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-200">
                   <Star className="w-10 h-10 text-white fill-current" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Experience Market Intelligence</h3>
                <p className="text-slate-500 font-medium">Paste a URL above to unlock a full intelligence report.</p>
             </div>
             
             {/* Abstract UI Elements to simulate a dashboard */}
             <div className="absolute top-10 left-10 w-64 h-32 bg-white rounded-3xl shadow-lg border border-slate-100 opacity-50 -rotate-6"></div>
             <div className="absolute bottom-10 right-10 w-80 h-40 bg-white rounded-3xl shadow-xl border border-slate-100 opacity-50 rotate-3"></div>
             <div className="absolute top-40 right-20 w-48 h-48 bg-white rounded-full shadow-2xl border border-slate-100 opacity-30"></div>
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="text-center py-20 border-t border-slate-100">
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter">CommerceLens AI</h2>
          <p className="text-slate-400 font-medium text-sm">© 2026 Advanced Product Intelligence Engine. Built for Founders.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 space-y-6">
      <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center">
        {icon}
      </div>
      <div className="space-y-2">
        <h4 className="text-xl font-black text-slate-900 tracking-tight">{title}</h4>
        <p className="text-slate-500 font-medium leading-relaxed text-sm">{desc}</p>
      </div>
    </div>
  );
}
