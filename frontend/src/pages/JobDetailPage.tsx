import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJobResult, JobResultResponse } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import InsightList from '../components/InsightList';
import ChartComponent from '../components/ChartComponent';
import ProgressBar from '../components/ProgressBar';
import { ArrowLeft, Loader2, AlertCircle, Clock, Star, Target, Zap, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJobResult(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data as JobResultResponse | undefined;
      if (data?.status === 'completed' || data?.status === 'failed') return false;
      return 3000;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Retrieving product intelligence...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl text-rose-800 max-w-2xl mx-auto mt-12">
        <AlertCircle className="w-8 h-8 mb-4" />
        <h3 className="text-xl font-bold mb-2">Job Not Found</h3>
        <p className="opacity-90 mb-6">The analysis task you are looking for does not exist or has been removed.</p>
        <Link to="/" className="inline-flex items-center text-rose-900 font-bold hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const isCompleted = job.status === 'completed' && job.result;
  const isFailed = job.status === 'failed';
  const isProcessing = job.status === 'pending' || job.status === 'processing';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} />
          <div className="text-xs font-mono text-slate-400 bg-white border border-slate-100 px-3 py-1 rounded-full shadow-sm">
            ID: {jobId?.substring(0, 8)}...
          </div>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 leading-tight mb-4">
            Analysis Results
          </h1>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center text-slate-500 text-sm font-medium">
              <Clock className="w-4 h-4 mr-2 text-slate-400" />
              {new Date(job.meta.created_at).toLocaleString()}
            </div>
            {job.result?.reviews_analyzed && (
              <div className="flex items-center text-slate-500 text-sm font-medium">
                <Target className="w-4 h-4 mr-2 text-indigo-400" />
                {job.result.reviews_analyzed} Customer Reviews
              </div>
            )}
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100 shadow-sm space-y-6">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">{job.stage || "Analysis in Progress"}</h2>
            <ProgressBar progress={job.progress || 10} />
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Our AI nodes are currently scraping Amazon review blocks and synthesizing sentiment clusters. This usually takes around 30-45 seconds.
            </p>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="bg-rose-50 rounded-[2rem] border border-rose-100 p-12 text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-rose-900">Analysis Halted</h2>
          <p className="text-rose-700 font-medium max-w-lg mx-auto leading-relaxed">
            {job.error || "An unexpected error occurred during processing. The product URL might be blocked or formatted incorrectly."}
          </p>
          <div className="pt-6">
            <Link to="/analyze" className="px-8 py-3 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">
              Try Another Product
            </Link>
          </div>
        </div>
      )}

      {isCompleted && job.result && (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              icon={<Star className="w-6 h-6 text-amber-500" />}
              title="Sentiment Index"
              value={`${job.result.sentiment_score.toFixed(1)}/5.0`}
              bg="bg-amber-50"
            />
            <StatCard 
              icon={<Target className="w-6 h-6 text-blue-500" />}
              title="AI Confidence"
              value={`${Math.round(job.result.confidence_score * 100)}%`}
              bg="bg-blue-50"
            />
            <StatCard 
              icon={<Zap className="w-6 h-6 text-indigo-500" />}
              title="Data Sample"
              value={`${job.result.reviews_analyzed} Reviews`}
              bg="bg-indigo-50"
            />
            <StatCard 
              icon={<Clock className="w-6 h-6 text-emerald-500" />}
              title="Compute Time"
              value={`${(job.meta.processing_time_ms / 1000).toFixed(1)}s`}
              bg="bg-emerald-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <InsightList 
                reasons={job.result.top_buying_reasons}
                complaints={job.result.top_complaints}
                improvements={job.result.improvement_suggestions}
              />
            </div>
            <div className="space-y-8">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <h4 className="text-lg font-bold text-slate-800 mb-6">Sentiment Composition</h4>
                <ChartComponent 
                  positive={job.result.positive_ratio}
                  neutral={1 - job.result.positive_ratio}
                  negative={0}
                />
              </div>
              <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
                <h4 className="text-lg font-bold mb-4">Product URL</h4>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 break-all text-xs font-mono text-slate-400 mb-6">
                  {job.result.product_url}
                </div>
                <a 
                  href={job.result.product_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  View on Amazon
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, bg }: { icon: any, title: string, value: string|number, bg: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center mb-4", bg)}>
        {icon}
      </div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
