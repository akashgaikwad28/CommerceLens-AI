import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { analyzeProduct, getJobs } from '../api/client';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import HistorySidebar from '../components/HistorySidebar';
import { BarChart3, Clock, CheckCircle, Search, ArrowRight, Activity, Zap, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';

export default function DashboardPage() {
  const location = useLocation() as { state?: { url?: string } };
  const navigate = useNavigate();
  const landingUrl = location.state?.url;
  const autoTriggeredRef = useRef(false);
  const { lastSearchUrl, setLastSearchUrl } = useStore();
  const [url, setUrl] = useState(landingUrl || lastSearchUrl || '');

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: getJobs,
    refetchInterval: 10000,
  });

  const stats = useMemo(() => {
    if (!jobs.length) return { total: 0, completed: 0, successRate: 0, processing: 0 };
    
    const completed = jobs.filter(j => j.status === 'completed').length;
    const processing = jobs.filter(j => ['pending', 'processing'].includes(j.status.toLowerCase())).length;
    
    return {
      total: jobs.length,
      completed,
      successRate: Math.round((completed / jobs.length) * 100),
      processing
    };
  }, [jobs]);

  const mutation = useMutation({
    mutationFn: (productUrl: string) => analyzeProduct(productUrl, 3),
    onSuccess: (data) => {
      navigate(`/job/${data.job_id}`);
    },
  });

  const startAnalysis = (productUrl: string) => {
    const trimmedUrl = productUrl.trim();
    if (!trimmedUrl || mutation.isPending) return;

    setLastSearchUrl(trimmedUrl);
    mutation.mutate(trimmedUrl);
  };

  useEffect(() => {
    if (!landingUrl || autoTriggeredRef.current) return;
    autoTriggeredRef.current = true;
    setUrl(landingUrl);
    startAnalysis(landingUrl);
  }, [landingUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startAnalysis(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-12 py-8 animate-pulse">
        <div className="h-12 bg-slate-100 rounded-[2rem] w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-50 rounded-[2.5rem]"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex-1 space-y-12">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-widest">
            <Activity className="w-3 h-3" />
            Active Market Intelligence
          </div>
          <h1 className="text-4xl font-semibold text-slate-950 tracking-tight">Recent Analyses</h1>
          <p className="text-slate-500 font-medium">Review your latest product intelligence reports and active jobs.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-600">Analyze product</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Start a new intelligence report</h2>
            </div>
            {mutation.isPending && (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Initializing
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Amazon product URL</span>
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste Amazon Product URL..."
                className="h-14 w-full rounded-2xl bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-950 outline-none ring-1 ring-slate-100 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                required
              />
            </label>
            <button
              type="submit"
              disabled={mutation.isPending || !url.trim()}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 disabled:bg-slate-300"
            >
              {mutation.isPending ? 'Analyzing...' : 'Analyze Now'}
              {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            </button>
          </form>

          {mutation.isError && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Analysis could not be started. Check the URL and make sure the backend is running.
            </p>
          )}
        </div>

        {/* High-Impact Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <PremiumStatCard 
            title="Total Intelligence" 
            value={stats.total} 
            icon={<Zap className="w-5 h-5 text-blue-600" />} 
            trend="+12% from last week"
          />
          <PremiumStatCard 
            title="Analysis Completed" 
            value={stats.completed} 
            icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} 
          />
          <PremiumStatCard 
            title="Active Tasks" 
            value={stats.processing} 
            icon={<Clock className="w-5 h-5 text-amber-600" />} 
            bg="bg-amber-50"
          />
          <PremiumStatCard 
            title="Model Accuracy" 
            value={`${stats.successRate}%`} 
            icon={<Activity className="w-5 h-5 text-indigo-600" />} 
          />
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Recent Intelligence Tasks
            </h2>
            <Link to="/analyze" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
              New Analysis
            </Link>
          </div>
          
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-5">Intelligence Subject</th>
                  <th className="px-6 py-5">Process Status</th>
                  <th className="px-6 py-5">Signal Date</th>
                  <th className="px-6 py-5 text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.slice(0, 8).map((job) => (
                  <tr key={job.job_id} className="group hover:bg-slate-50 transition-all duration-300">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 group-hover:bg-white group-hover:scale-110 transition-all">
                          <Search className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 line-clamp-1">{job.product_name || "Amazon Intelligence Task"}</span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">JOB_ID: {job.job_id.substring(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-slate-500">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        to={`/job/${job.job_id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all"
                      >
                        Reports
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Sidebar for Context */}
      <div className="w-full lg:w-80 space-y-8">
        <HistorySidebar />
        
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
           <div className="space-y-2 relative z-10">
              <h4 className="text-xl font-black tracking-tight">AI Engine Pulse</h4>
              <p className="text-xs font-medium text-slate-400 leading-relaxed">
                Currently processing <span className="text-blue-400">12,482</span> reviews per minute across <span className="text-indigo-400">4 global regions</span>.
              </p>
           </div>
           <div className="pt-4 border-t border-white/10 space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">API Health</span>
                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Nominal</span>
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Worker Latency</span>
                 <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">2.4s</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function PremiumStatCard({ title, value, icon, trend, bg }: { title: string, value: string|number, icon: any, trend?: string, bg?: string }) {
  return (
    <div className={clsx("bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 hover:shadow-xl transition-all duration-500", bg)}>
      <div className="w-12 h-12 rounded-[1.25rem] bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
        <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
        {trend && (
          <p className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
             <Activity className="w-3 h-3" />
             {trend}
          </p>
        )}
      </div>
    </div>
  );
}
