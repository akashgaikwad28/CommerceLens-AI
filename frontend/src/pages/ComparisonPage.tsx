import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { compareProducts, getCompareResult, CompareResultResponse } from '../api/client';
import { Scale, Plus, Trash2, Loader2, AlertCircle, Trophy, BarChart3, Brain, ArrowRight, Check, X, Info } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import ComparisonChart from '../components/ComparisonChart';
import clsx from 'clsx';

export default function ComparisonPage() {
  const [searchParams] = useSearchParams();
  const jobParam = searchParams.get('job');
  
  const [urls, setUrls] = useState<string[]>(['', '']);
  const [activeJobId, setActiveJobId] = useState<string | null>(jobParam);

  useEffect(() => {
    if (jobParam) setActiveJobId(jobParam);
  }, [jobParam]);

  const mutation = useMutation({
    mutationFn: (productUrls: string[]) => compareProducts(productUrls.filter(u => u.trim())),
    onSuccess: (data) => {
      setActiveJobId(data.job_id);
      window.history.pushState({}, '', `/compare?job=${data.job_id}`);
    },
  });

  const { data: jobStatus } = useQuery({
    queryKey: ['compare', activeJobId],
    queryFn: () => getCompareResult(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const data = query.state.data as CompareResultResponse | undefined;
      if (data?.status === 'COMPLETED' || data?.status === 'FAILED') return false;
      return 5000;
    },
  });

  const addUrl = () => {
    if (urls.length < 5) setUrls([...urls, '']);
  };

  const removeUrl = (index: number) => {
    if (urls.length > 2) {
      const newUrls = [...urls];
      newUrls.splice(index, 1);
      setUrls(newUrls);
    }
  };

  const updateUrl = (index: number, val: string) => {
    const newUrls = [...urls];
    newUrls[index] = val;
    setUrls(newUrls);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urls.filter(u => u.trim()).length < 2) return;
    mutation.mutate(urls);
  };

  const isProcessing = ['PROCESSING', 'WAITING_FOR_ANALYSIS', 'COMPARING', 'PENDING'].includes(jobStatus?.status || '');
  const isCompleted = jobStatus?.status === 'COMPLETED';
  const isFailed = jobStatus?.status === 'FAILED';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
            <Scale className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Market Comparison Engine</h1>
        </div>
        <p className="text-slate-500 mb-8 max-w-2xl">
          Compare 2-5 products simultaneously. Our AI will analyze cross-product sentiment, identify trade-offs, and crown a clear winner.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {urls.map((url, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                  {idx + 1}
                </div>
                <input
                  type="url"
                  placeholder="Paste Amazon Product URL..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-violet-100 focus:border-violet-500 outline-none transition-all text-sm"
                  value={url}
                  onChange={(e) => updateUrl(idx, e.target.value)}
                  disabled={mutation.isPending || isProcessing}
                  required={idx < 2}
                />
              </div>
              {urls.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeUrl(idx)}
                  className="p-3.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}

          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <button
              type="button"
              onClick={addUrl}
              disabled={urls.length >= 5 || mutation.isPending || isProcessing}
              className="flex-1 py-4 border-2 border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-slate-500 hover:text-violet-600 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Product ({urls.length}/5)
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || isProcessing || urls.filter(u => u.trim()).length < 2}
              className="md:w-64 py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2"
            >
              {mutation.isPending || isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Set...
                </>
              ) : (
                <>
                  Compare Products
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {activeJobId && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-in slide-in-from-bottom duration-500">
          <div className="flex flex-col md:items-center md:flex-row justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Comparison Intelligence</h2>
                <p className="text-sm text-slate-500 font-medium">
                  {jobStatus?.stage || "Processing request..."}
                </p>
              </div>
            </div>
            <StatusBadge status={jobStatus?.status || 'PENDING'} />
          </div>

          {isProcessing && (
            <div className="space-y-6">
              <ProgressBar progress={jobStatus?.progress || 10} label="Comparison Progress" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ProcessingStep active={jobStatus?.stage === 'Fetching product data'} label="Scraping Data" />
                <ProcessingStep active={jobStatus?.stage === 'Waiting for analysis tasks'} label="Review Analysis" />
                <ProcessingStep active={jobStatus?.stage === 'COMPARING'} label="AI Synthesis" />
              </div>
            </div>
          )}

          {isFailed && (
            <div className="flex items-start gap-4 bg-rose-50 border border-rose-100 p-6 rounded-2xl text-rose-800">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold">Comparison Engine Failed</h4>
                <p className="text-sm opacity-90">{jobStatus?.error || "An error occurred during comparison."}</p>
                <button 
                  onClick={() => { setActiveJobId(null); window.history.pushState({}, '', '/compare'); }}
                  className="mt-4 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg text-xs font-bold transition-colors"
                >
                  Clear and Start New
                </button>
              </div>
            </div>
          )}

          {isCompleted && jobStatus?.result && (
            <div className="space-y-12 mt-8 animate-in zoom-in-95 duration-700">
              {/* Winner Section */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-violet-500 to-indigo-600 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-white rounded-3xl p-8 border border-slate-100 flex flex-col md:flex-row items-center gap-8">
                  <div className="w-24 h-24 shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-100 animate-bounce-slow">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-amber-600 font-black text-xs uppercase tracking-widest mb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      AI Selection: Best Overall
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 leading-tight mb-3">
                      {jobStatus.result.winner}
                    </h3>
                    <p className="text-slate-600 text-lg font-medium italic">
                      "{jobStatus.result.reason}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Overview Table */}
              <div className="overflow-hidden bg-white border border-slate-100 rounded-3xl shadow-sm">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Metrics Matrix
                  </h4>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    O(n) Cross-Analysis Completed
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 font-bold border-b border-slate-50">
                        <th className="px-8 py-4 text-left">Product Node</th>
                        <th className="px-8 py-4 text-center">Avg Rating</th>
                        <th className="px-8 py-4 text-center">Sentiment</th>
                        <th className="px-8 py-4 text-center">Reviews</th>
                        <th className="px-8 py-4 text-center">AI Conf</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {jobStatus.result.products.map((p: any, i: number) => (
                        <tr key={i} className={clsx("hover:bg-slate-50/30 transition-colors", p.name === jobStatus.result.winner && "bg-amber-50/30")}>
                          <td className="px-8 py-5 font-bold text-slate-700 max-w-md">
                            <div className="flex items-center gap-3">
                              {p.name === jobStatus.result.winner && <Trophy className="w-4 h-4 text-amber-500" />}
                              <span className="truncate">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="px-3 py-1 bg-slate-100 rounded-lg font-black text-slate-600">
                              {p.rating.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="flex flex-col items-center">
                              <span className={clsx("font-black", p.sentiment_score > 0.7 ? "text-emerald-500" : "text-indigo-500")}>
                                {Math.round(p.sentiment_score * 100)}%
                              </span>
                              <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-current" style={{ width: `${p.sentiment_score * 100}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center font-medium text-slate-400">
                            {p.review_count}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="text-xs font-bold text-slate-400">
                              {Math.round(p.confidence_score * 100)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-800 mb-8">Rating Benchmarks</h4>
                  <ComparisonChart 
                    data={jobStatus.result.products.map((p: any) => ({ name: p.name.substring(0, 15) + '...', value: p.rating }))} 
                    color="#4f46e5"
                    suffix="/5"
                  />
                </div>
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-800 mb-8">Sentiment Intensity</h4>
                  <ComparisonChart 
                    data={jobStatus.result.products.map((p: any) => ({ name: p.name.substring(0, 15) + '...', value: Math.round(p.sentiment_score * 100) }))} 
                    color="#8b5cf6"
                    suffix="%"
                  />
                </div>
              </div>

              {/* AI Decision Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DecisionCard 
                  category="Best for Budget" 
                  product={jobStatus.result.best_for.budget} 
                  icon={ArrowRight}
                  color="text-emerald-500"
                  bg="bg-emerald-50"
                />
                <DecisionCard 
                  category="Best for Performance" 
                  product={jobStatus.result.best_for.performance} 
                  icon={BarChart3}
                  color="text-blue-500"
                  bg="bg-blue-50"
                />
                <DecisionCard 
                  category="Highest Confidence" 
                  product={jobStatus.result.best_for.overall} 
                  icon={Brain}
                  color="text-indigo-500"
                  bg="bg-indigo-50"
                />
              </div>

              {/* Trade-offs Section */}
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-indigo-300" />
                    </div>
                    <h4 className="text-2xl font-bold">Deep Logic Trade-offs</h4>
                  </div>
                  
                  <div className="space-y-4">
                    {jobStatus.result.tradeoffs.map((t: string, i: number) => (
                      <div key={i} className="flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                        <div className="mt-1 w-5 h-5 shrink-0 rounded-full bg-indigo-500/30 flex items-center justify-center text-[10px] font-black">
                          {i + 1}
                        </div>
                        <p className="text-indigo-50 leading-relaxed font-medium">{t}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4">
                    <Info className="w-6 h-6 text-indigo-400 shrink-0" />
                    <div>
                      <h5 className="font-bold text-indigo-300 mb-1">Final Intelligence Note</h5>
                      <p className="text-sm text-indigo-100/60 leading-relaxed">
                        {jobStatus.result.decision_recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Failed Products */}
              {jobStatus.result.failed_products?.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8">
                  <h5 className="text-rose-800 font-bold mb-4 flex items-center gap-2">
                    <X className="w-5 h-5" />
                    Dropped Product Nodes ({jobStatus.result.failed_products.length})
                  </h5>
                  <div className="space-y-3">
                    {jobStatus.result.failed_products.map((fp: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl border border-rose-100 shadow-sm">
                        <span className="text-xs font-mono text-slate-500 truncate max-w-md">{fp.url}</span>
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">{fp.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProcessingStep({ active, label }: { active: boolean, label: string }) {
  return (
    <div className={clsx(
      "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
      active ? "bg-violet-50 border-violet-100 text-violet-700 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
    )}>
      {active ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}

function DecisionCard({ category, product, icon: Icon, color, bg }: { category: string, product: string, icon: any, color: string, bg: string }) {
  if (!product || product === 'None') return null;
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-4", bg)}>
        <Icon className={clsx("w-5 h-5", color)} />
      </div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{category}</p>
      <p className="text-lg font-bold text-slate-800 leading-tight">{product}</p>
    </div>
  );
}
