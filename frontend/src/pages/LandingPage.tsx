import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Brain, LineChart, Search, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function LandingPage() {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();
  const { recentSearches, setLastSearchUrl } = useStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setLastSearchUrl(trimmedUrl);
    navigate('/analyze', { state: { url: trimmedUrl } });
  };

  const analyzeRecent = (recentUrl: string) => {
    setLastSearchUrl(recentUrl);
    navigate('/analyze', { state: { url: recentUrl } });
  };

  return (
    <div className="space-y-24 pb-12 animate-in fade-in duration-700">
      <section className="grid min-h-[calc(100vh-8rem)] items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-700 shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            AI-powered review intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-4xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-7xl"
          >
            Turn Amazon Reviews into Market Intelligence
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl text-xl font-medium leading-8 text-slate-600"
          >
            Analyze thousands of customer signals in seconds.
          </motion.p>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/70"
          >
            <div className="flex flex-col gap-2 md:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Amazon URL</span>
                <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste Amazon Product URL..."
                  className="h-14 w-full rounded-2xl bg-slate-50 pl-12 pr-4 text-base font-semibold text-slate-950 outline-none ring-1 ring-slate-100 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  required
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-base font-black text-white shadow-lg shadow-slate-200 transition-all hover:bg-blue-700 active:scale-95"
              >
                Analyze Now
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setUrl('https://www.amazon.in/dp/B0DGD6GZ5K')}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 px-6 text-base font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-95"
              >
                Try Demo
              </button>
            </div>
          </motion.form>

          {recentSearches.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Recent searches</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((recentUrl) => (
                  <button
                    key={recentUrl}
                    type="button"
                    onClick={() => analyzeRecent(recentUrl)}
                    className="max-w-full truncate rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:text-blue-700"
                    title={recentUrl}
                  >
                    {recentUrl}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-6 text-xs font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Review signals</div>
            <div className="flex items-center gap-2"><Target className="h-4 w-4" /> Market decisions</div>
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Fast reports</div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60"
        >
          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-xs font-black uppercase tracking-widest text-blue-300">Live dashboard preview</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <PreviewMetric label="Signals" value="12.4k" />
              <PreviewMetric label="Sentiment" value="84%" />
              <PreviewMetric label="Risks" value="7" />
              <PreviewMetric label="Drivers" value="19" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-3 w-3/4 rounded-full bg-slate-100" />
            <div className="h-3 w-full rounded-full bg-slate-100" />
            <div className="h-3 w-2/3 rounded-full bg-slate-100" />
          </div>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <FeatureCard
          icon={<BarChart3 className="h-7 w-7 text-blue-600" />}
          title="AI Market Intelligence"
          desc="See how customers feel, what they repeat, and where the product experience bends."
        />
        <FeatureCard
          icon={<Brain className="h-7 w-7 text-indigo-600" />}
          title="Competitor Comparison"
          desc="Turn review noise into purchase drivers, pain points, and product team actions."
        />
        <FeatureCard
          icon={<LineChart className="h-7 w-7 text-emerald-600" />}
          title="Customer Signal Mining"
          desc="Compare 2-5 products and understand who wins, why, and where trade-offs matter."
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Trusted by builders & product teams</p>
        <div className="mt-5 grid grid-cols-1 gap-4 text-sm font-bold text-slate-500 sm:grid-cols-3">
          <span>Founder research</span>
          <span>Product strategy</span>
          <span>Marketplace teams</span>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
        {icon}
      </div>
      <div className="space-y-2">
        <h4 className="text-lg font-black tracking-tight text-slate-950">{title}</h4>
        <p className="text-sm font-medium leading-6 text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
