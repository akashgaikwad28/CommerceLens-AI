import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertCircle, ArrowLeft, Box, CheckCircle2, ExternalLink, Filter,
  Globe, Search, ShieldCheck, Star
} from 'lucide-react';
import { getJobResult, JobResultResponse } from '../api/client';
import { useStore } from '../store/useStore';
import StatusBadge from '../components/StatusBadge';
import ProcessingUI from '../components/ProcessingUI';
import ActionabilityPanel from '../components/ActionabilityPanel';
import KeywordHeatmap from '../components/KeywordHeatmap';
import RevenuePanel from '../components/RevenuePanel';
import HistorySidebar from '../components/HistorySidebar';
import ChartComponent from '../components/ChartComponent';

const cardMotion = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { addToHistory } = useStore();
  const [selectedKeyword, setSelectedKeyword] = useState('');

  const { data: job, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJobResult(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data as JobResultResponse | undefined;
      if (data?.status === 'completed' || data?.status === 'failed') return false;
      return 3000;
    },
  });

  useEffect(() => {
    if (job?.status === 'completed' && job.data && jobId) {
      addToHistory(jobId, job.data.product_name || 'Unknown Product');
    }
  }, [job, jobId, addToHistory]);

  if (isLoading) return <Centered><ProcessingUI progress={10} /></Centered>;

  const isTerminal = job?.status === 'completed' || job?.status === 'failed';
  if (!isTerminal && job) return <Centered><ProcessingUI progress={job.progress || 10} /></Centered>;

  if (job?.status === 'failed' || error || !job) {
    return (
      <Centered>
        <div className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-950">Analysis could not finish</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
            {job?.error || 'The product URL may be unavailable, blocked, or incomplete.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => refetch()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700">
              {isFetching ? 'Retrying...' : 'Retry'}
            </button>
            <Link to="/dashboard" className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200">
              New analysis
            </Link>
          </div>
        </div>
      </Centered>
    );
  }

  const report = job.data;
  if (!report) return <Centered><ProcessingUI progress={90} /></Centered>;

  const legacyConfidence = (report as any).confidence || {};
  const confidence = report.confidence_layers || {
    sentiment: legacyConfidence.sentiment || 'medium',
    revenue: legacyConfidence.revenue_estimate || 'medium',
    pros_cons: legacyConfidence.pros_cons || 'medium',
    insights: report.used_llm ? 'medium' : 'low',
  };

  const rawRevenue = report.revenue_estimate as any;
  const monthlySales = Number(rawRevenue?.monthly_sales || 0);
  const monthlyRevenue = Number(rawRevenue?.revenue || 0);
  const revenue = {
    range: rawRevenue?.range || {
      min_sales: monthlySales,
      max_sales: monthlySales,
      min_revenue: monthlyRevenue,
      max_revenue: monthlyRevenue,
    },
    currency: rawRevenue?.currency || '₹',
    confidence: rawRevenue?.confidence || 'low',
    revenue_model: rawRevenue?.revenue_model || 'available signals',
    tooltip: rawRevenue?.tooltip || 'Estimated from available marketplace and review signals.',
  };

  const tldr = report.tldr || { verdict: 'Not enough data for a verdict yet.', opportunity: 'Not enough data', risk: 'Not enough data' };
  const actions = report.actionability || { fix_immediately: [], improve_messaging: [], double_down: [] };
  const keywordInsights = report.keyword_insights || { positives: [], negatives: [] };
  const reviews = Array.isArray(report.reviews) ? report.reviews : [];
  const specs = Array.isArray(report.specs) ? report.specs : [];
  const productName = report.product_name || 'Unknown Product';
  const reviewsAnalyzed = Number(report.reviews_analyzed || 0);
  const totalReviews = Number(report.total_reviews || report.data_quality?.review_count || reviewsAnalyzed || reviews.length);
  const dataState = getDataState(report, reviews.length, totalReviews);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.06 }}
      className="mx-auto max-w-7xl space-y-6 px-4 pb-16 lg:px-8"
    >
      <motion.div variants={cardMotion} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {dataState === 'medium' && <Badge tone="amber">Some insights based on partial data</Badge>}
          {dataState === 'low' && <Badge tone="red">Low Data Availability</Badge>}
          <Badge tone="blue"><Globe className="h-3.5 w-3.5" /> {report.source || 'amazon'}</Badge>
          <StatusBadge status={job.status} />
        </div>
      </motion.div>

      <motion.section variants={cardMotion} whileHover={{ scale: 1.005 }} className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/60 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
            {report.product_image ? <img src={report.product_image} alt={productName} className="h-full w-full object-contain p-3" /> : <Box className="h-10 w-10 text-slate-300" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400">
              <span>Product analysis</span>
              <span className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-current" /> Customer reviews</span>
              <span>Source: {report.source || 'Amazon'}</span>
            </div>
            <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-950 md:text-4xl">{productName}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-green-600" />{totalReviews ? `${formatCompact(totalReviews)} reviews` : 'Low Data Availability'}</span>
              {report.product_url && <a href={report.product_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-white hover:bg-slate-800">Visit marketplace <ExternalLink className="h-4 w-4" /></a>}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={cardMotion} className="space-y-3">
        <SectionTitle title="Quick Insight" eyebrow="Understand this product in 30 seconds" />
        {dataState === 'low' ? <LowDataMessage /> : <QuickInsight positives={report.purchase_drivers || []} negatives={report.pain_points || []} verdict={tldr.verdict} />}
      </motion.section>

      <motion.section variants={cardMotion} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SignalList title="What Users Love" tone="green" items={report.purchase_drivers || []} empty="Not enough positive review data" />
        <SignalList title="What Users Complain About" tone="red" items={report.pain_points || []} empty="Not enough negative review data" />
      </motion.section>

      <motion.section variants={cardMotion} className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60 md:p-8">
        <SectionTitle title="Customer Sentiment Overview" eyebrow="Customer emotion mix" confidence={confidence.sentiment} />
        {dataState === 'low' || !reviewsAnalyzed ? (
          <EmptyState text="Not enough sentiment data yet" />
        ) : (
          <div className="mt-6 grid grid-cols-1 items-center gap-6 lg:grid-cols-[360px_1fr]">
            <ChartComponent positive={report.positive_ratio || 0} neutral={Math.max(0, 1 - (report.positive_ratio || 0) - (report.negative_ratio || 0))} negative={report.negative_ratio || 0} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Metric label="Positive" value={formatPercent(report.positive_ratio, reviewsAnalyzed)} tone="green" />
              <Metric label="Neutral" value={formatPercent(Math.max(0, 1 - (report.positive_ratio || 0) - (report.negative_ratio || 0)), reviewsAnalyzed)} tone="gray" />
              <Metric label="Negative" value={formatPercent(report.negative_ratio, reviewsAnalyzed)} tone="red" />
            </div>
          </div>
        )}
      </motion.section>

      <motion.section variants={cardMotion} className="space-y-3">
        <SectionTitle title="Customer Signals" eyebrow="Click a keyword to filter reviews" confidence={confidence.pros_cons} />
        <KeywordHeatmap positives={keywordInsights.positives} negatives={keywordInsights.negatives} reviews={reviews} onKeywordClick={setSelectedKeyword} />
      </motion.section>

      <motion.section variants={cardMotion}>
        <SectionTitle title="What Should You Do" eyebrow="Actions from backend review signals" confidence={confidence.insights} />
        <div className="mt-3">
          <ActionabilityPanel actions={actions} positives={report.purchase_drivers || []} negatives={report.pain_points || []} />
        </div>
      </motion.section>

      <motion.section variants={cardMotion}>
        <ReviewExplorer reviews={reviews} selectedKeyword={selectedKeyword} onKeywordChange={setSelectedKeyword} />
      </motion.section>

      <motion.section variants={cardMotion}>
        <RevenuePanel range={revenue.range} currency={revenue.currency} confidence={revenue.confidence} model={revenue.revenue_model} tooltip={revenue.tooltip} />
      </motion.section>

      <motion.section variants={cardMotion} className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60 md:p-8">
        <SectionTitle title="Specs" eyebrow="Product details" />
        <SpecsGrid specs={specs} />
      </motion.section>

      <motion.section variants={cardMotion} className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60 md:p-8">
        <SectionTitle title="History" eyebrow="Recent analyses" />
        <div className="mt-5">
          <HistorySidebar />
        </div>
      </motion.section>
    </motion.div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[80vh] items-center justify-center px-4">{children}</div>;
}

function SectionTitle({ title, eyebrow, confidence }: { title: string; eyebrow?: string; confidence?: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-black uppercase tracking-widest text-blue-600">{eyebrow}</p>}
        <h2 className="text-xl font-black tracking-tight text-slate-950 md:text-2xl">{title}</h2>
      </div>
      {confidence && <Badge tone={confidence === 'high' ? 'green' : confidence === 'medium' ? 'amber' : 'gray'}>{confidence} confidence</Badge>}
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: 'green' | 'red' | 'blue' | 'gray' | 'amber' }) {
  const styles = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    gray: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-700',
  }[tone];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest ${styles}`}>{children}</span>;
}

function LowDataMessage() {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm font-semibold leading-6 text-rose-900">
      We couldn't extract enough structured signals for deep analysis. Try another product with more reviews.
    </div>
  );
}

function QuickInsight({ positives, negatives, verdict }: { positives: string[]; negatives: string[]; verdict: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm transition hover:shadow-md md:p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <InsightColumn title="What users love" items={positives} tone="green" />
        <InsightColumn title="What users complain about" items={negatives} tone="red" />
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Verdict</p>
          <p className="mt-3 text-sm font-semibold leading-6">{verdict || 'Not enough data for a verdict yet.'}</p>
        </div>
      </div>
    </div>
  );
}

function InsightColumn({ title, items, tone }: { title: string; items: string[]; tone: 'green' | 'red' }) {
  const color = tone === 'green' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${color}`}>{title}</p>
      <div className="mt-4 space-y-2">
        {items.length ? items.slice(0, 3).map((item, idx) => (
          <p key={idx} className="text-sm font-semibold leading-6 text-slate-700">{cleanSignal(item)}</p>
        )) : <p className="text-sm font-semibold text-slate-400">Not Available</p>}
      </div>
    </div>
  );
}

function SignalList({ title, items, tone, empty }: { title: string; items: string[]; tone: 'green' | 'red'; empty: string }) {
  const color = tone === 'green' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
  return (
    <motion.div whileHover={{ scale: 1.01 }} className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <div className="mt-5 space-y-3">
        {items.length ? items.slice(0, 5).map((item, idx) => (
          <div key={idx} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${color}`} />
            {cleanSignal(item)}
          </div>
        )) : <EmptyState text={empty} />}
      </div>
    </motion.div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' | 'gray' }) {
  const color = tone === 'green' ? 'text-green-700 bg-green-50' : tone === 'red' ? 'text-red-700 bg-red-50' : 'text-slate-700 bg-slate-100';
  return (
    <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl bg-slate-50 p-5">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-3 inline-flex rounded-xl px-3 py-2 text-2xl font-black ${color}`}>{value}</p>
    </motion.div>
  );
}

function ReviewExplorer({ reviews, selectedKeyword, onKeywordChange }: { reviews: Array<{ title: string; text: string; rating: number }>; selectedKeyword: string; onKeywordChange: (value: string) => void }) {
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('all');
  const [sentiment, setSentiment] = useState('all');
  const [sort, setSort] = useState('recent');

  const filtered = useMemo(() => {
    const q = [search, selectedKeyword].filter(Boolean).join(' ').toLowerCase();
    return reviews
      .filter((review) => {
        const text = `${review.title || ''} ${review.text || ''}`.toLowerCase();
        const score = Number(review.rating || 0);
        const matchesSearch = !q || text.includes(q);
        const matchesRating = rating === 'all' || Math.floor(score) === Number(rating);
        const bucket = score >= 4 ? 'positive' : score <= 2 ? 'negative' : 'neutral';
        return matchesSearch && matchesRating && (sentiment === 'all' || sentiment === bucket);
      })
      .sort((a, b) => sort === 'negative' ? (a.rating || 0) - (b.rating || 0) : 0);
  }, [reviews, search, selectedKeyword, rating, sentiment, sort]);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60 md:p-8">
      <SectionTitle title="Review Explorer" eyebrow="Search, filter, and validate the signals" />
      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_140px_150px_150px]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews" className="w-full rounded-2xl bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none ring-1 ring-slate-100 focus:ring-blue-200" />
        </div>
        <Select value={rating} onChange={setRating} options={['all', '5', '4', '3', '2', '1']} label="Rating" />
        <Select value={sentiment} onChange={setSentiment} options={['all', 'positive', 'neutral', 'negative']} label="Sentiment" />
        <Select value={sort} onChange={setSort} options={['recent', 'negative']} label="Sort" />
      </div>
      {selectedKeyword && (
        <button onClick={() => onKeywordChange('')} className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
          <Filter className="h-3.5 w-3.5" /> Filtering by {selectedKeyword} · clear
        </button>
      )}
      <div className="mt-6 space-y-4">
        {filtered.length ? filtered.slice(0, 8).map((review, idx) => (
          <motion.article key={idx} whileHover={{ scale: 1.01 }} className="rounded-2xl bg-slate-50 p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-black text-slate-900">{review.title || 'Untitled review'}</h3>
              <Badge tone={(review.rating || 0) >= 4 ? 'green' : (review.rating || 0) <= 2 ? 'red' : 'gray'}>{review.rating || 'N/A'} star</Badge>
            </div>
            <p className="text-sm font-medium leading-6 text-slate-600">{highlight(review.text || 'No review text available.', selectedKeyword)}</p>
          </motion.article>
        )) : <EmptyState text={reviews.length ? 'No reviews match these filters' : "We couldn't extract readable review samples from this product."} />}
      </div>
    </div>
  );
}

function Select({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: string[]; label: string }) {
  return (
    <label className="sr-only">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="not-sr-only w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold capitalize text-slate-700 outline-none ring-1 ring-slate-100 focus:ring-blue-200">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function SpecsGrid({ specs }: { specs: string[] }) {
  if (!specs.length) return <EmptyState text="Not enough specification data" />;
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      {specs.map((spec, idx) => {
        const [rawKey, ...rest] = spec.includes(':') ? spec.split(':') : ['Feature', spec];
        return (
          <div key={idx} className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{formatLabel(rawKey)}</p>
            <p className="mt-2 text-sm font-bold text-slate-900">{rest.join(':').trim() || 'Not enough data'}</p>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">{text}</div>;
}

function formatCompact(value: number) {
  if (!value) return 'Not enough data';
  if (value >= 10000000) return `${trimDecimal(value / 10000000)}Cr`;
  if (value >= 100000) return `${trimDecimal(value / 100000)}L`;
  if (value >= 1000) return `${trimDecimal(value / 1000)}K`;
  return value.toLocaleString();
}

function trimDecimal(value: number) {
  return value.toFixed(1).replace('.0', '');
}

function formatPercent(value?: number, sampleSize = 0) {
  if (!sampleSize) return 'Not Available';
  if (typeof value !== 'number' || value < 0) return 'Not Available';
  return `${Math.round(value * 100)}%`;
}

function getDataState(report: any, reviewSnippets: number, totalReviews: number): 'high' | 'medium' | 'low' {
  const backendState = report.data_quality?.confidence;
  if (backendState === 'high' || backendState === 'medium' || backendState === 'low') return backendState;
  if (totalReviews >= 1000 && reviewSnippets >= 50) return 'high';
  if (totalReviews >= 200 || reviewSnippets >= 20) return 'medium';
  return 'low';
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()).trim();
}

function cleanSignal(value: string) {
  return value.replace(/\s*\(direct from signal\)\s*/gi, '').trim();
}

function highlight(text: string, keyword: string) {
  if (!keyword) return text;
  const lower = text.toLowerCase();
  const start = lower.indexOf(keyword.toLowerCase());
  if (start === -1) return text;
  const end = start + keyword.length;
  return <>
    {text.slice(0, start)}
    <mark className="rounded bg-blue-100 px-1 font-bold text-blue-900">{text.slice(start, end)}</mark>
    {text.slice(end)}
  </>;
}
