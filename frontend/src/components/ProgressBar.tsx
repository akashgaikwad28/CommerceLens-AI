import React from 'react';
import clsx from 'clsx';

interface ProgressBarProps {
  progress: number;
  label?: string;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, className }) => {
  const percentage = Math.min(100, Math.max(0, progress));
  
  return (
    <div className={clsx("w-full", className)}>
      <div className="flex justify-between items-center mb-1.5">
        {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
        <span className="text-xs font-bold text-slate-500">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
