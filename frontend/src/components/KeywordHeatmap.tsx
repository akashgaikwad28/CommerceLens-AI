import clsx from 'clsx';

interface HeatmapProps {
  positives: Array<{ word: string; intensity: number; frequency_pct: number }>;
  negatives: Array<{ word: string; intensity: number; frequency_pct: number }>;
  reviews?: Array<{ title?: string; text?: string; rating?: number }>;
  onKeywordClick?: (word: string) => void;
}

export default function KeywordHeatmap({ positives = [], negatives = [], reviews = [], onKeywordClick }: HeatmapProps) {
  const safePositives = Array.isArray(positives) ? positives : [];
  const safeNegatives = Array.isArray(negatives) ? negatives : [];
  
  const allKeywords = [...safePositives, ...safeNegatives].sort((a, b) => (b.frequency_pct || b.intensity || 0) - (a.frequency_pct || a.intensity || 0));

  if (allKeywords.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center shadow-lg shadow-slate-200/60">
        <p className="text-slate-400 font-bold">Not enough keyword data.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/60 p-6 md:p-8">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {allKeywords.map((item, idx) => {
          const isPositive = safePositives.some(p => p.word === item.word);
          const intensity = item.intensity || 0;
          const frequency = item.frequency_pct || 0;
          const snippets = getSnippets(reviews, item.word);
          
          return (
            <button
              key={idx}
              onClick={() => onKeywordClick?.(item.word)}
              className={clsx(
                "group relative overflow-visible rounded-2xl bg-slate-50 p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg",
                isPositive 
                  ? "hover:bg-green-50" 
                  : "hover:bg-red-50"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <span className={clsx("text-sm font-black", isPositive ? "text-green-700" : "text-red-700")}>{item.word}</span>
                <span className="text-xs font-black text-slate-400">{frequency ? `${Math.round(frequency)}%` : `${intensity}/5`}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div className={clsx("h-full rounded-full", isPositive ? "bg-green-500" : "bg-red-500")} style={{ width: `${Math.min(100, Math.max(14, frequency || intensity * 20))}%` }} />
              </div>
              {snippets.length > 0 && (
                <div className="pointer-events-none absolute left-4 top-full z-20 mt-2 hidden w-72 rounded-2xl bg-slate-950 p-4 text-xs font-semibold leading-5 text-white shadow-2xl group-hover:block">
                  {snippets.map((snippet, i) => <p key={i} className="mb-2 last:mb-0">"{snippet}"</p>)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getSnippets(reviews: HeatmapProps['reviews'], word: string) {
  if (!Array.isArray(reviews) || !word) return [];
  const lower = word.toLowerCase();
  return reviews
    .map((review) => review?.text || review?.title || '')
    .filter((text) => text.toLowerCase().includes(lower))
    .slice(0, 2)
    .map((text) => text.length > 110 ? `${text.slice(0, 110)}...` : text);
}
