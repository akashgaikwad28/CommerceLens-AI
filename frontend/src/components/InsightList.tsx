import { ThumbsUp, ThumbsDown, Lightbulb } from 'lucide-react';
import clsx from 'clsx';

interface InsightListProps {
  reasons: string[];
  complaints: string[];
  improvements: string[];
}

export default function InsightList({ reasons, complaints, improvements }: InsightListProps) {
  return (
    <div className="space-y-6">
      <Section title="Strengths" items={reasons} icon={ThumbsUp} color="text-emerald-500" bg="bg-emerald-50" />
      <Section title="Complaints" items={complaints} icon={ThumbsDown} color="text-rose-500" bg="bg-rose-50" />
      <Section title="AI Suggestions" items={improvements} icon={Lightbulb} color="text-amber-500" bg="bg-amber-50" />
    </div>
  );
}

function Section({ title, items, icon: Icon, color, bg }: { title: string, items: string[], icon: any, color: string, bg: string }) {
  if (!items || items.length === 0) return null;
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <div className={clsx("p-1.5 rounded-lg", bg)}>
          <Icon className={clsx("w-4 h-4", color)} />
        </div>
        <h5 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{title}</h5>
      </div>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="flex gap-3 text-sm text-slate-600 leading-relaxed font-medium">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
