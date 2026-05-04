import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { History, Clock, ArrowRight, Trash2 } from 'lucide-react';

export default function HistorySidebar() {
  const { history, clearHistory } = useStore();

  if (history.length === 0) {
    return <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400">No recent analyses yet.</div>;
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          Intelligence History
        </h3>
        <button 
          onClick={clearHistory}
          className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
          title="Clear History"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.slice(0, 10).map((item) => (
          <Link 
            key={item.jobId} 
            to={`/job/${item.jobId}`}
            className="group block p-4 bg-slate-50 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 rounded-2xl border border-transparent hover:border-slate-100 transition-all duration-300"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Product</span>
                <Clock className="w-3 h-3 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                {item.productName}
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-medium text-slate-400 italic">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="p-4 bg-slate-50/50 border-t border-slate-100">
        <p className="text-[10px] font-medium text-slate-400 text-center">
          Showing last {Math.min(history.length, 10)} intelligence sessions
        </p>
      </div>
    </div>
  );
}
