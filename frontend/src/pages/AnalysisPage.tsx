import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { analyzeProduct } from '../api/client';
import { Search, ChevronRight, Zap, Target, BarChart3, Info, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AnalysisPage() {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(3);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: ({ url, pages }: { url: string; pages: number }) => analyzeProduct(url, pages),
    onSuccess: (data) => {
      navigate(`/job/${data.job_id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    mutation.mutate({ url, pages: maxPages });
  };

  return (
    <div className="max-w-4xl space-y-12 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Intelligence Node</h1>
        <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
          Deploy an analysis task to extract structured market signals. Our AI engine will scrape, synthesize, and benchmark the product against category norms.
        </p>
      </div>

      <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm space-y-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
          <div className="space-y-4">
            <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Target Product URL</label>
            <div className="relative group">
               <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-0 group-focus-within:opacity-10 transition-opacity"></div>
               <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://www.amazon.com/dp/B08N5KWBKK..."
                    className="w-full pl-16 pr-6 py-6 rounded-[2rem] border border-slate-200 focus:border-blue-500 outline-none transition-all text-lg font-medium shadow-inner bg-slate-50/50"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Signal Depth</label>
              <div className="relative">
                <select
                  className="w-full px-6 py-5 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none transition-all appearance-none bg-slate-50/50 font-bold text-slate-700 cursor-pointer"
                  value={maxPages}
                  onChange={(e) => setMaxPages(Number(e.target.value))}
                >
                  <option value={1}>Quick Pulse (1 Page)</option>
                  <option value={3}>Balanced Scan (3 Pages)</option>
                  <option value={5}>Deep Intelligence (5 Pages)</option>
                  <option value={10}>Full Market Synthesis (10 Pages)</option>
                </select>
                <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rotate-90" />
              </div>
            </div>

            <div className="flex flex-col justify-end">
               <button
                  type="submit"
                  disabled={mutation.isPending || !url}
                  className="w-full py-5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-black rounded-2xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95"
               >
                  {mutation.isPending ? (
                     <>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                        Initializing...
                     </>
                  ) : (
                     <>
                        Deploy Intelligence Task
                        <ArrowRight className="w-5 h-5" />
                     </>
                  )}
               </button>
            </div>
          </div>
        </form>

        <div className="flex items-start gap-4 p-6 bg-blue-50 border border-blue-100 rounded-[2rem] relative z-10">
           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Zap className="w-5 h-5 text-blue-600 fill-current" />
           </div>
           <div className="space-y-1">
              <h4 className="text-sm font-bold text-blue-900">Expert Recommendation</h4>
              <p className="text-xs font-medium text-blue-700/70 leading-relaxed">
                 Use "Deep Intelligence" for high-volume products (1000+ reviews) to ensure our AI captures niche pain points and edge-case feature requests.
              </p>
           </div>
        </div>
      </div>

      {/* Value Props */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
         <SmallProp 
            icon={<Target className="w-5 h-5 text-indigo-500" />} 
            title="Signal Extraction" 
            desc="Identifying purchase triggers." 
         />
         <SmallProp 
            icon={<BarChart3 className="w-5 h-5 text-emerald-500" />} 
            title="Revenue Modeling" 
            desc="Benchmarking GMV projections." 
         />
         <SmallProp 
            icon={<Info className="w-5 h-5 text-amber-500" />} 
            title="Competitor Mapping" 
            desc="Positioning vs. market norms." 
         />
      </div>
    </div>
  );
}

function SmallProp({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex items-center gap-4 p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
       <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
          {icon}
       </div>
       <div className="space-y-0.5">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{title}</h4>
          <p className="text-[10px] font-bold text-slate-400">{desc}</p>
       </div>
    </div>
  );
}
