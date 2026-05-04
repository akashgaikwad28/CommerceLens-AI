import { AlertCircle, TrendingUp, Zap, Target, ArrowRight } from 'lucide-react';

interface ActionabilityProps {
  actions: {
    fix_immediately: string[];
    improve_messaging: string[];
    double_down: string[];
  };
  positives?: string[];
  negatives?: string[];
}

export default function ActionabilityPanel({ actions, positives = [], negatives = [] }: ActionabilityProps) {
  const recommended = buildRuleBasedActions(actions, positives, negatives);

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/60 p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-600" />
            Strategic Advisory Matrix
          </h3>
          <p className="text-sm font-medium text-slate-500">Specific next steps inferred from recurring pros and cons.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-2xl text-blue-700">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">Decision Ready</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ActionGroup 
          title="Fix Immediately" 
          items={recommended.fix} 
          icon={<AlertCircle className="w-5 h-5" />} 
          color="rose"
          label="CRITICAL PRIORITY"
        />
        <ActionGroup 
          title="Refine Messaging" 
          items={recommended.message} 
          icon={<Zap className="w-5 h-5" />} 
          color="blue"
          label="MARKETING PIVOT"
        />
        <ActionGroup 
          title="Double Down" 
          items={recommended.grow} 
          icon={<TrendingUp className="w-5 h-5" />} 
          color="emerald"
          label="GROWTH LEVER"
        />
      </div>
    </div>
  );
}

function ActionGroup({ title, items, icon, color, label }: { title: string, items: string[], icon: any, color: 'rose' | 'blue' | 'emerald', label: string }) {
  const styles = {
    rose: { bg: 'bg-red-50', text: 'text-red-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    emerald: { bg: 'bg-green-50', text: 'text-green-600' },
  }[color];

  return (
    <div className={`p-6 rounded-3xl ${styles.bg} space-y-6 relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-200`}>
      <div className="flex items-center gap-3 relative z-10">
        <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center ${styles.text} shadow-sm`}>
          {icon}
        </div>
        <div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${styles.text} opacity-60`}>{label}</span>
          <h4 className="text-lg font-black text-slate-900 tracking-tight">{title}</h4>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <div key={idx} className="flex gap-3 bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/40 text-sm font-bold text-slate-700 leading-snug group-hover:bg-white transition-colors">
              <ArrowRight className={`w-4 h-4 shrink-0 mt-0.5 ${styles.text}`} />
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm font-bold text-slate-400 px-2">Not enough data.</p>
        )}
      </div>
    </div>
  );
}

function buildRuleBasedActions(actions: ActionabilityProps['actions'], positives: string[], negatives: string[]) {
  const negativeText = negatives.join(' ').toLowerCase();
  const positiveText = positives.join(' ').toLowerCase();
  const fix = [
    negativeText.includes('connect') && 'Users report connectivity issues -> investigate Bluetooth stability and pairing flow.',
    negativeText.includes('reliab') && 'Reliability appears in complaints -> check failure rate, warranty reasons, and right/left unit defects.',
    negativeText.includes('comfort') && 'Comfort is a friction point -> review fit, ear-tip sizing, and long-wear pressure.',
    ...safeList(actions.fix_immediately),
  ].filter(Boolean) as string[];
  const message = [
    positiveText.includes('value') && 'Value for money is a purchase driver -> make price-to-benefit proof prominent in images.',
    positiveText.includes('sound') && 'Sound quality is praised -> lead with audio clarity and balanced profile claims.',
    ...safeList(actions.improve_messaging),
  ].filter(Boolean) as string[];
  const grow = [
    positiveText.includes('battery') && 'Battery life is a strength -> use battery proof in comparison and ad copy.',
    ...safeList(actions.double_down),
  ].filter(Boolean) as string[];

  return {
    fix: dedupe(fix).slice(0, 4),
    message: dedupe(message).slice(0, 4),
    grow: dedupe(grow).slice(0, 4),
  };
}

function safeList(value?: string[]) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function dedupe(items: string[]) {
  return [...new Set(items.map((item) => item.replace(/\s*\(direct from signal\)\s*/gi, '').trim()))];
}
