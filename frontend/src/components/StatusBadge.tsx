import React from 'react';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status?.toLowerCase();
  
  const styles: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    failed: 'bg-rose-100 text-rose-800 border-rose-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
    waiting_for_analysis: 'bg-indigo-100 text-indigo-800 border-indigo-200 animate-pulse',
    comparing: 'bg-violet-100 text-violet-800 border-violet-200 animate-pulse',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    queued: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  const currentStyle = styles[s] || 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors", currentStyle)}>
      {status ? status.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN'}
    </span>
  );
};

export default StatusBadge;
