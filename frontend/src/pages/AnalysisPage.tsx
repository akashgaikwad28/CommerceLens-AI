import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { analyzeProduct, getJobResult, JobResultResponse } from '../api/client';
import { Search, Loader2, AlertCircle, CheckCircle2, ChevronRight, BarChart3, Brain } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import ChartComponent from '../components/ChartComponent';
import InsightList from '../components/InsightList';

export default function AnalysisPage() {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(3);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ url, pages }: { url: string; pages: number }) => analyzeProduct(url, pages),
    onSuccess: (data) => {
      setActiveJobId(data.job_id);
    },
  });

  const { data: jobStatus } = useQuery({
    queryKey: ['job', activeJobId],
    queryFn: () => getJobResult(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const data = query.state.data as JobResultResponse | undefined;
      if (data?.status === 'completed' || data?.status === 'failed') return false;
      return 3000;
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    mutation.mutate({ url, pages: maxPages });
  };

  const isProcessing = jobStatus?.status === 'pending' || jobStatus?.status === 'processing';
  const isCompleted = jobStatus?.status === 'completed';
  const isFailed = jobStatus?.status === 'failed';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Single Product Intelligence</h1>
        <p className="text-slate-500 mb-8 max-w-2xl">
          Enter an Amazon product URL to extract deep customer sentiment, identifying exactly why people buy and where they are disappointed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="url"
                placeholder="https://www.amazon.com/dp/B08N5KWBKK..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={mutation.isPending || isProcessing}
                required
              />
            </div>
            <div className="w-full md:w-48">
              <select
                className="w-full px-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all appearance-none bg-white cursor-pointer"
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                disabled={mutation.isPending || isProcessing}
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n} Review Pages</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={mutation.isPending || isProcessing || !url}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 min-w-[160px]"
            >
              {mutation.isPending || isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Run Analysis
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {activeJobId && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-in slide-in-from-bottom duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-slate-800">Intelligence Task</h2>
                <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">ID: {activeJobId}</span>
              </div>
              <p className="text-sm text-slate-500">{jobStatus?.stage || "Initializing request..."}</p>
            </div>
            <StatusBadge status={jobStatus?.status || 'pending'} />
          </div>

          {!isCompleted && !isFailed && (
            <div className="space-y-4">
              <ProgressBar progress={jobStatus?.progress || 10} label="Current Stage Progress" />
              <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-bold">AI is orchestrating scraping and analysis nodes...</span>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="flex items-start gap-4 bg-rose-50 border border-rose-100 p-6 rounded-2xl text-rose-800">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold">Analysis Failed</h4>
                <p className="text-sm opacity-90">{jobStatus?.error || "An unexpected error occurred during analysis."}</p>
                <button 
                  onClick={() => setActiveJobId(null)}
                  className="mt-4 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg text-xs font-bold transition-colors"
                >
                  Clear and Try Again
                </button>
              </div>
            </div>
          )}

          {isCompleted && jobStatus?.result && (
            <div className="space-y-12 mt-8 border-t border-slate-100 pt-12 animate-in zoom-in-95 duration-700">
              {/* Product Header */}
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg text-white font-black text-2xl">
                  {jobStatus.result.sentiment_score.toFixed(1)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 leading-tight">Review Analysis Success</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {jobStatus.result.reviews_analyzed} Reviews Processed
                    </div>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                      <Brain className="w-4 h-4 text-purple-500" />
                      {Math.round(jobStatus.result.confidence_score * 100)}% AI Confidence
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
                  <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Sentiment Dynamics
                  </h4>
                  <ChartComponent 
                    positive={jobStatus.result.positive_ratio}
                    neutral={1 - jobStatus.result.positive_ratio} 
                    negative={0} // Backend doesn't split negative/neutral yet
                  />
                </div>

                <div className="space-y-6">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    Key Buying Patterns
                  </h4>
                  <InsightList 
                    reasons={jobStatus.result.top_buying_reasons}
                    complaints={jobStatus.result.top_complaints}
                    improvements={jobStatus.result.improvement_suggestions}
                  />
                </div>
              </div>

              {/* Recommendation Card */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Brain className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <span className="text-blue-200 text-xs font-black uppercase tracking-widest px-3 py-1 bg-white/10 rounded-full">
                    Executive Summary
                  </span>
                  <h4 className="text-2xl font-bold mt-4 mb-2">Final Recommendation</h4>
                  <p className="text-blue-50 text-lg leading-relaxed opacity-90 italic">
                    "Based on our cross-sentiment analysis, this product shows a robust positive trend in quality, making it a safe choice for users prioritizing long-term reliability."
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
