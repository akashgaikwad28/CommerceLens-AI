import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { compareProducts, getCompareResult, CompareResultResponse } from '../api/client';
import { Scale, Plus, Trash2, Loader2, AlertCircle, Trophy, Brain, ArrowRight, Check, X, Info, ChevronDown, Star, Smile, MessageCircle, ShieldCheck, BadgeIndianRupee } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import ComparisonChart from '../components/ComparisonChart';
import clsx from 'clsx';
import { useStore } from '../store/useStore';

type Product = {
  url?: string;
  name: string;
  rating?: number;
  sentiment_score?: number;
  review_count?: number;
  confidence_score?: number;
  price?: number | string;
  top_pros?: string[];
  top_cons?: string[];
};

type NormalizedProduct = Product & {
  displayName: string;
  ratingValue: number;
  sentimentPct: number;
  reviewCount: number;
  confidencePct: number;
  score: number;
  valueScore: number;
  qualityScore: number;
  metricSource: 'direct' | 'derived';
  strengths: string[];
  risks: string[];
};

export default function ComparisonPage() {
  const [searchParams] = useSearchParams();
  const jobParam = searchParams.get('job');
  const { lastComparisonList, setLastComparisonList } = useStore();
  const [urls, setUrls] = useState<string[]>(() => {
    const savedUrls = lastComparisonList.filter(Boolean).slice(0, 5);
    return savedUrls.length >= 2 ? savedUrls : ['', ''];
  });
  const [activeJobId, setActiveJobId] = useState<string | null>(jobParam);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

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
      const status = normalizeStatus(data?.status);
      return status === 'COMPLETED' || status === 'FAILED' ? false : 5000;
    },
  });

  const addUrl = () => urls.length < 5 && setUrls([...urls, '']);
  const removeUrl = (index: number) => urls.length > 2 && setUrls(urls.filter((_, i) => i !== index));
  const updateUrl = (index: number, val: string) => setUrls(urls.map((url, i) => i === index ? val : url));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanUrls = urls.filter(u => u.trim());
    if (cleanUrls.length < 2) return;
    setLastComparisonList(cleanUrls);
    mutation.mutate(urls);
  };

  const normalizedStatus = normalizeStatus(jobStatus?.status);
  const isProcessing = ['PROCESSING', 'WAITING_FOR_ANALYSIS', 'COMPARING', 'PENDING'].includes(normalizedStatus);
  const isCompleted = normalizedStatus === 'COMPLETED';
  const isFailed = normalizedStatus === 'FAILED';
  const intelligence = useMemo(() => buildComparisonIntelligence(jobStatus?.result), [jobStatus?.result]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg shadow-slate-200/60">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Scale className="w-6 h-6" /></div>
          <h1 className="text-3xl font-black text-slate-950">Market Comparison Engine</h1>
        </div>
        <p className="text-slate-500 mb-8 max-w-2xl font-medium">
          Compare 2-5 products and get a clear answer on which one to choose, why it wins, and what trade-offs matter.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {urls.map((url, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">{idx + 1}</div>
                <input
                  type="url"
                  placeholder="Paste Amazon Product URL..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 ring-1 ring-slate-100 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                  value={url}
                  onChange={(e) => updateUrl(idx, e.target.value)}
                  disabled={mutation.isPending || isProcessing}
                  required={idx < 2}
                />
              </div>
              {urls.length > 2 && (
                <button type="button" onClick={() => removeUrl(idx)} className="p-3.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}

          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <button type="button" onClick={addUrl} disabled={urls.length >= 5 || mutation.isPending || isProcessing} className="flex-1 py-4 border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-500 hover:text-blue-600 font-bold rounded-2xl transition-all flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Add Product ({urls.length}/5)
            </button>
            <button type="submit" disabled={mutation.isPending || isProcessing || urls.filter(u => u.trim()).length < 2} className="md:w-64 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2">
              {mutation.isPending || isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" />Analyzing Set...</> : <>Compare Products<ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>
        </form>
      </div>

      {activeJobId && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg shadow-slate-200/60 animate-in slide-in-from-bottom duration-500">
          <div className="flex flex-col md:items-center md:flex-row justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400"><Scale className="w-6 h-6" /></div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Comparison Intelligence</h2>
                <p className="text-sm text-slate-500 font-medium">{jobStatus?.stage || 'Processing request...'}</p>
              </div>
            </div>
            <StatusBadge status={normalizedStatus || 'PENDING'} />
          </div>

          {isProcessing && <ProcessingState jobStatus={jobStatus} />}
          {isFailed && <FailedState jobStatus={jobStatus} onClear={() => { setActiveJobId(null); window.history.pushState({}, '', '/compare'); }} />}

          {isCompleted && (
            intelligence.products.length < 2 ? (
              <EmptyCompareState />
            ) : (
              <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.06 }} className="space-y-8">
                <DecisionStrip intelligence={intelligence} />
                <ProductCards products={intelligence.products} winner={intelligence.bestOverall?.name} expandedProduct={expandedProduct} onToggle={setExpandedProduct} />
                <MetricsMatrix intelligence={intelligence} expandedProduct={expandedProduct} onToggle={setExpandedProduct} />
                <VisualComparison products={intelligence.products} />
                <TradeoffSection intelligence={intelligence} />
                {jobStatus?.result?.failed_products?.length > 0 && <FailedProducts products={jobStatus?.result?.failed_products || []} />}
              </motion.div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ProcessingState({ jobStatus }: { jobStatus?: CompareResultResponse }) {
  return (
    <div className="space-y-6">
      <ProgressBar progress={jobStatus?.progress || 10} label="Comparison Progress" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProcessingStep active={jobStatus?.stage === 'Fetching product data'} label="Scraping Data" />
        <ProcessingStep active={jobStatus?.stage === 'Waiting for analysis tasks'} label="Review Analysis" />
        <ProcessingStep active={jobStatus?.stage === 'COMPARING'} label="AI Synthesis" />
      </div>
    </div>
  );
}

function FailedState({ jobStatus, onClear }: { jobStatus?: CompareResultResponse; onClear: () => void }) {
  return (
    <div className="flex items-start gap-4 bg-red-50 p-6 rounded-2xl text-red-800">
      <AlertCircle className="w-6 h-6 shrink-0" />
      <div className="min-w-0">
        <h4 className="font-black">Comparison Engine Failed</h4>
        <p className="text-sm opacity-90">{jobStatus?.error || 'An error occurred during comparison.'}</p>
        {jobStatus?.result?.failed_products?.length > 0 && (
          <div className="mt-4 space-y-2">
            {(jobStatus?.result?.failed_products || []).map((fp: any, i: number) => (
              <div key={i} className="rounded-xl bg-white/70 p-3 text-xs text-red-900">
                <div className="font-bold">{fp.reason || 'Analysis failed'}</div>
                <div className="mt-1 truncate font-mono opacity-70">{fp.url}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClear} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-xs font-bold transition-colors">Clear and Start New</button>
      </div>
    </div>
  );
}

function DecisionStrip({ intelligence }: { intelligence: ReturnType<typeof buildComparisonIntelligence> }) {
  const cards = [
    { label: 'Best Overall', product: intelligence.bestOverall, icon: Trophy, color: 'text-amber-600 bg-amber-50', reason: intelligence.bestOverall ? overallReason(intelligence.bestOverall) : 'More product data needed' },
    { label: 'Best Value', product: intelligence.bestValue, icon: BadgeIndianRupee, color: 'text-green-700 bg-green-50', reason: intelligence.bestValue ? valueReason(intelligence.bestValue) : 'More value signals needed' },
    { label: 'Best Quality', product: intelligence.bestQuality, icon: Star, color: 'text-blue-700 bg-blue-50', reason: intelligence.bestQuality ? qualityReason(intelligence.bestQuality) : 'More quality signals needed' },
  ];

  return (
    <motion.section variants={fadeCard} className="rounded-3xl bg-slate-950 p-6 md:p-8 text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-300">Comparison Verdict</p>
          <h3 className="mt-2 text-2xl font-black">Which product should you choose?</h3>
        </div>
        <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-200">
          Analysis Confidence: {intelligence.analysisConfidence}
        </span>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ label, product, icon: Icon, color, reason }) => (
          <motion.div key={label} whileHover={{ scale: 1.02 }} className="rounded-2xl bg-white/10 p-5">
            <div className={clsx('mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl', color)}><Icon className="w-5 h-5" /></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-2 text-lg font-black leading-tight" title={product?.name}>{product?.displayName || 'More data needed'}</p>
            <div className="mt-3 space-y-2 text-sm font-semibold leading-5 text-slate-300">
              <p>Why?</p>
              {reason.split('|').map((line) => <p key={line}>- {line}</p>)}
            </div>
            <span className={clsx('mt-4 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest', confidenceClass(product?.confidencePct || 0))}>
              {confidenceLabel(product?.confidencePct || 0)} confidence
            </span>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function ProductCards({ products, winner, expandedProduct, onToggle }: { products: NormalizedProduct[]; winner?: string; expandedProduct: string | null; onToggle: (name: string | null) => void }) {
  return (
    <motion.section variants={fadeCard} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {products.map((p) => {
        const expanded = expandedProduct === p.name;
        return (
          <motion.button key={p.name} whileHover={{ scale: 1.01 }} onClick={() => onToggle(expanded ? null : p.name)} className={clsx('text-left rounded-3xl p-6 shadow-lg shadow-slate-200/60 transition-all', p.name === winner ? 'bg-amber-50 ring-1 ring-amber-100' : 'bg-white')}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Product</p>
                <h3 className="mt-2 text-xl font-black text-slate-950 line-clamp-2" title={p.name}>{p.displayName}</h3>
              </div>
              <ChevronDown className={clsx('w-5 h-5 text-slate-400 transition-transform', expanded && 'rotate-180')} />
            </div>
            {p.name === winner && <div className="mt-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">Best overall</div>}
            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SignalBlock title="Strengths" items={p.strengths} tone="green" />
                    <SignalBlock title="Risks" items={p.risks} tone="red" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </motion.section>
  );
}

function MetricsMatrix({ intelligence, expandedProduct, onToggle }: { intelligence: ReturnType<typeof buildComparisonIntelligence>; expandedProduct: string | null; onToggle: (name: string | null) => void }) {
  return (
    <motion.section variants={fadeCard} className="rounded-3xl bg-white p-6 md:p-8 shadow-lg shadow-slate-200/60">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">Metrics Matrix</p>
          <h3 className="text-2xl font-black text-slate-950">Side-by-side evidence</h3>
        </div>
        {intelligence.limited && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Low Data Availability</span>}
      </div>
      <div className="space-y-3">
        {intelligence.products.map((p) => (
          <motion.div key={p.name} whileHover={{ scale: 1.01 }} onClick={() => onToggle(expandedProduct === p.name ? null : p.name)} className="grid cursor-pointer grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1.4fr_0.6fr_0.9fr_0.7fr_0.7fr] md:items-center">
            <div className="font-black text-slate-900 truncate" title={p.name}>{p.displayName}</div>
            <MetricCell icon={Star} label="Rating" value={p.ratingValue ? p.ratingValue.toFixed(1) : 'Not Available'} best={p.name === intelligence.bestRating?.name} derived={p.metricSource === 'derived'} />
            <MetricCell icon={Smile} label="Customer Sentiment" value={p.sentimentPct ? `${p.sentimentPct}%` : 'Not Available'} bar={p.sentimentPct} best={p.name === intelligence.bestSentiment?.name} worst={p.name === intelligence.worstSentiment?.name} tooltip="Uses backend sentiment fields only. Not Available is shown when direct sentiment is missing." derived={p.metricSource === 'derived'} />
            <MetricCell icon={MessageCircle} label="Reviews" value={formatCompact(p.reviewCount)} best={p.name === intelligence.bestVolume?.name} />
            <MetricCell icon={ShieldCheck} label="Confidence" value={`${p.confidencePct}%`} best={p.name === intelligence.bestConfidence?.name} tooltip="Confidence reflects available review volume and extraction quality." />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function VisualComparison({ products }: { products: NormalizedProduct[] }) {
  const sentimentData = products.filter((p) => p.sentimentPct > 0).map((p) => ({ name: shortName(p.displayName, 18), value: p.sentimentPct }));
  const reviewData = products.map((p) => ({ name: shortName(p.displayName, 18), value: logReviewValue(p.reviewCount) }));
  return (
    <motion.section variants={fadeCard} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {sentimentData.length ? <ChartCard title="Customer Sentiment Comparison" data={sentimentData} color="#16a34a" suffix="%" empty="Not enough sentiment data to visualize comparison" /> : <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60 text-sm font-bold text-slate-500">Not enough sentiment data to visualize comparison</div>}
      <ChartCard title="Review Volume Graph" data={reviewData} color="#2563eb" suffix=" log" empty="Review volume signals are still being normalized" />
    </motion.section>
  );
}

function ChartCard({ title, data, color, suffix, empty }: { title: string; data: { name: string; value: number }[]; color: string; suffix: string; empty: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
      <h4 className="text-lg font-black text-slate-900 mb-6">{title}</h4>
      {data.length ? <ComparisonChart data={data} color={color} suffix={suffix} /> : <div className="flex h-[260px] items-center justify-center rounded-2xl bg-slate-50 text-sm font-bold text-slate-400">{empty}</div>}
    </div>
  );
}

function TradeoffSection({ intelligence }: { intelligence: ReturnType<typeof buildComparisonIntelligence> }) {
  return (
    <motion.section variants={fadeCard} className="rounded-3xl bg-white p-6 md:p-8 shadow-lg shadow-slate-200/60">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Brain className="w-5 h-5 text-blue-600" /></div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">Trade-Off Analysis</p>
          <h4 className="text-2xl font-black text-slate-950">Why this wins</h4>
        </div>
      </div>
      <div className="space-y-3">
        {intelligence.tradeoffs.map((item, i) => (
          <div key={i} className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold leading-6 text-slate-700">{item}</div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-blue-50 p-5 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm font-semibold leading-6 text-blue-950">{intelligence.finalNote}</p>
      </div>
    </motion.section>
  );
}

function MetricCell({ icon: Icon, label, value, bar, best, worst, tooltip, derived }: { icon: any; label: string; value: string; bar?: number; best?: boolean; worst?: boolean; tooltip?: string; derived?: boolean }) {
  return (
    <div className={clsx('rounded-xl bg-white p-3', best && 'ring-1 ring-green-200 bg-green-50', worst && 'ring-1 ring-red-100 bg-red-50')} title={tooltip}>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <div className={clsx('mt-2 text-sm font-black', best ? 'text-green-700' : worst ? 'text-red-700' : 'text-slate-800')}>{value}</div>
      {derived && <div className="mt-1 text-[10px] font-bold text-amber-600">Estimated from available data</div>}
      {bar !== undefined && bar > 0 && <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${bar}%` }} className="h-full rounded-full bg-green-500" /></div>}
    </div>
  );
}

function SignalBlock({ title, items, tone }: { title: string; items: string[]; tone: 'green' | 'red' }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <p className={clsx('text-xs font-black uppercase tracking-widest', tone === 'green' ? 'text-green-700' : 'text-red-700')}>{title}</p>
      <div className="mt-3 space-y-2">
        {items.length ? items.slice(0, 2).map((item, i) => <p key={i} className="text-sm font-semibold text-slate-700">{cleanSignal(item)}</p>) : <p className="text-sm font-bold text-slate-400">Not Available</p>}
      </div>
    </div>
  );
}

function FailedProducts({ products }: { products: any[] }) {
  return (
    <div className="bg-red-50 rounded-3xl p-6">
      <h5 className="text-red-800 font-black mb-4 flex items-center gap-2"><X className="w-5 h-5" /> Dropped Products ({products.length})</h5>
      <div className="space-y-3">
        {products.map((fp, i) => <div key={i} className="bg-white p-4 rounded-xl"><div className="text-xs font-bold text-red-700">{fp.reason}</div><div className="mt-1 text-xs font-mono text-slate-500 truncate">{fp.url}</div></div>)}
      </div>
    </div>
  );
}

function EmptyCompareState() {
  return <div className="rounded-3xl bg-slate-50 p-10 text-center text-slate-500 font-bold">Add at least 2 products to compare.</div>;
}

function ProcessingStep({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={clsx('flex flex-col items-center gap-2 p-4 rounded-2xl transition-all', active ? 'bg-blue-50 text-blue-700 shadow-sm' : 'bg-slate-50 text-slate-400 opacity-60')}>
      {active ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}

function buildComparisonIntelligence(result: any) {
  const products: NormalizedProduct[] = Array.isArray(result?.products) ? result.products.map(normalizeProduct) : [];
  const ranked = [...products].sort((a, b) => b.score - a.score);
  const bestOverall = ranked[0];
  let bestValue = pickBestValue(products, bestOverall);
  let bestQuality = pickBest(products.filter((p) => p.sentimentPct > 0), (p) => p.sentimentPct, (p) => p.ratingValue) || pickBest(products, (p) => p.qualityScore);

  if (products.length > 1 && bestOverall && bestValue?.name === bestOverall.name && bestQuality?.name === bestOverall.name) {
    bestValue = ranked.find((p) => p.name !== bestOverall.name) || bestValue;
  }
  if (products.length > 2 && bestOverall && bestValue && bestQuality?.name === bestOverall.name) {
    bestQuality = ranked.find((p) => p.name !== bestOverall.name && p.name !== bestValue?.name) || bestQuality;
  }

  const bestSentiment = pickBest(products, (p) => p.sentimentPct);
  const worstSentiment = pickWorst(products, (p) => p.sentimentPct);
  const bestVolume = pickBest(products, (p) => p.reviewCount);
  const bestConfidence = pickBest(products, (p) => p.confidencePct);
  const bestRating = pickBest(products, (p) => p.ratingValue);
  const tradeoffs = buildTradeoffs(products, bestOverall);
  return {
    products,
    bestOverall,
    bestValue,
    bestQuality,
    bestSentiment,
    worstSentiment,
    bestVolume,
    bestConfidence,
    bestRating,
    analysisConfidence: confidenceLabel(Math.round(products.reduce((sum, p) => sum + p.confidencePct, 0) / Math.max(products.length, 1))),
    limited: products.some((p) => p.metricSource === 'derived'),
    tradeoffs,
    finalNote: buildFinalNote(bestOverall, ranked.find((p) => p.name !== bestOverall?.name)),
  };
}

function normalizeProduct(raw: Product): NormalizedProduct {
  const reviewCount = Number(raw.review_count || (raw as any).reviews_analyzed || (raw as any).total_reviews || 0);
  const confidencePct = normalizePercent(raw.confidence_score || (raw as any).confidence || (reviewCount ? Math.min(1, reviewCount / 1000) : 0));
  const directRating = Number(raw.rating || (raw as any).reviews_information?.rating || 0);
  const directSentiment = normalizePercent(raw.sentiment_score || (raw as any).positive_ratio || (raw as any).positive_percentage || 0);
  const strengths = normalizeSignals(raw.top_pros);
  const risks = normalizeSignals(raw.top_cons);
  const price = parsePrice(raw.price);
  const score = (directRating * 0.35) + ((directSentiment / 20) * 0.30) + (Math.log10(Math.max(reviewCount, 1)) * 0.20) + ((confidencePct / 20) * 0.15);

  return {
    ...raw,
    displayName: shortName(raw.name),
    ratingValue: round1(directRating),
    sentimentPct: Math.round(directSentiment),
    reviewCount,
    confidencePct,
    score,
    valueScore: price ? (directSentiment + directRating * 10) / price : directSentiment + directRating,
    qualityScore: directRating + (directSentiment / 25) + (reviewCount >= 500 ? 0.4 : 0),
    metricSource: directRating && directSentiment ? 'direct' : 'derived',
    strengths,
    risks,
  };
}

function buildTradeoffs(products: NormalizedProduct[], winner?: NormalizedProduct) {
  if (!products.length) return ['Not enough product data to generate trade-offs.'];
  const challenger = products.find((p) => p.name !== winner?.name);
  if (!winner || !challenger) return ['Add at least 2 products to compare trade-offs.'];
  const lines = [`Why ${winner.displayName} Wins`];
  if (winner.sentimentPct > challenger.sentimentPct) lines.push(`Higher sentiment (+${winner.sentimentPct - challenger.sentimentPct}%)`);
  if (winner.reviewCount > challenger.reviewCount * 2) lines.push(`${formatCompact(winner.reviewCount)} reviews -> stronger market validation`);
  if (!hasRisk(winner, 'connect') && hasRisk(challenger, 'connect')) lines.push('Fewer visible connectivity complaints');
  if (winner.strengths[0]) lines.push(`Stronger core signal: ${winner.strengths[0]}`);
  lines.push(`Where ${challenger.displayName} Competes`);
  if (challenger.reviewCount > winner.reviewCount * 2) lines.push(`${formatCompact(challenger.reviewCount)} reviews -> stronger trust base`);
  if (challenger.valueScore > winner.valueScore) lines.push('Better value perception from customer signals');
  if (challenger.strengths[0]) lines.push(`${challenger.strengths[0]} remains a meaningful advantage`);
  if (lines.length <= 2) lines.push('Risk Factors: Low review confidence or missing sentiment');
  return lines;
}

function buildFinalNote(winner: NormalizedProduct | undefined, runnerUp?: NormalizedProduct) {
  if (!winner) return 'Not enough data to determine a clear winner. Add products with extractable review data for a stronger recommendation.';
  if (!winner.sentimentPct || !winner.reviewCount) return 'Low Data Availability. Compare products with direct sentiment and review-count fields for a stronger recommendation.';
  const runnerText = runnerUp && runnerUp.strengths[0] && runnerUp.risks[0] ? `${runnerUp.displayName} remains viable if you prioritize ${runnerUp.strengths[0].toLowerCase()}, but shows risk around ${runnerUp.risks[0].toLowerCase()}.` : '';
  return `${winner.displayName} is the better choice for most users due to stronger sentiment (${winner.sentimentPct}%) and a review base of ${formatCompact(winner.reviewCount)} signals. ${runnerText}`;
}

function pickBest<T extends Product>(products: T[], primary: (p: T) => number, tie: (p: T) => number = () => 0) {
  return [...products].sort((a, b) => primary(b) - primary(a) || tie(b) - tie(a))[0];
}

function pickWorst<T extends Product>(products: T[], primary: (p: T) => number) {
  return [...products].sort((a, b) => primary(a) - primary(b))[0];
}

function pickBestValue(products: NormalizedProduct[], bestOverall?: NormalizedProduct) {
  const candidates = products.filter((p) => p.name !== bestOverall?.name && p.sentimentPct >= 50);
  return pickBest(candidates.length ? candidates : products.filter((p) => p.name !== bestOverall?.name), (p) => p.valueScore) || bestOverall;
}

function normalizeStatus(status?: string) {
  return (status || '').toUpperCase();
}

function normalizePercent(value: any) {
  const numeric = Number(value || 0);
  if (!numeric) return 0;
  return numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
}

function normalizeSignals(items: string[] | undefined) {
  const clean = (items || []).map(cleanSignal).filter(Boolean);
  if (clean.length) return clean;
  return [];
}

function hasRisk(product: NormalizedProduct, token: string) {
  return product.risks.join(' ').toLowerCase().includes(token);
}

function overallReason(product: NormalizedProduct) {
  if (!product.sentimentPct || !product.reviewCount) return 'Low Data Availability';
  return `${formatCompact(product.reviewCount)} reviews|${product.sentimentPct}% customer sentiment|Balanced confidence score`;
}

function valueReason(product: NormalizedProduct) {
  if (!product.sentimentPct) return 'Low Data Availability';
  return `${product.sentimentPct}% customer sentiment|Competitive value from available price/review data|Different choice than best overall`;
}

function qualityReason(product: NormalizedProduct) {
  if (!product.sentimentPct && !product.ratingValue) return 'Low Data Availability';
  return `${product.sentimentPct || 'Not Available'}% customer sentiment|${product.ratingValue ? `${product.ratingValue.toFixed(1)} rating` : 'Rating not available'}|Strongest available quality signal`;
}

function confidenceLabel(value: number) {
  if (value >= 80) return 'High';
  if (value >= 60) return 'Medium';
  return 'Low';
}

function confidenceClass(value: number) {
  if (value >= 80) return 'bg-green-50 text-green-700';
  if (value >= 60) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function logReviewValue(value: number) {
  return Math.round(Math.log10(Math.max(value, 1)) * 20);
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function formatCompact(value: number) {
  if (!value) return 'Not Available';
  if (value >= 10000000) return `${trim(value / 10000000)}Cr`;
  if (value >= 100000) return `${trim(value / 100000)}L`;
  if (value >= 1000) return `${trim(value / 1000)}K`;
  return value.toLocaleString();
}

function trim(value: number) {
  return value.toFixed(1).replace('.0', '');
}

function shortName(name = 'Product', max = 52) {
  return name.length > max ? `${name.slice(0, max - 1)}...` : name;
}

function cleanSignal(value = '') {
  return value.replace(/\s*\(direct from signal\)\s*/gi, '').trim() || 'Not Available';
}

function parsePrice(value: Product['price']) {
  if (typeof value === 'number') return value > 0 ? value : 0;
  if (!value) return 0;
  const parsed = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

const fadeCard = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};
