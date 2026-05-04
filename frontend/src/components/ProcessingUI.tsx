import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Search, Cpu, Database, Layout } from 'lucide-react';
import ProgressBar from './ProgressBar';

interface Step {
  id: string;
  label: string;
  icon: ReactNode;
  duration: number;
  preview?: string;
}

const STEPS: Step[] = [
  { id: 'fetch', label: 'Fetching product', icon: <Search className="w-5 h-5" />, duration: 5000, preview: 'Checking product metadata and availability' },
  { id: 'extract', label: 'Extracting reviews', icon: <Database className="w-5 h-5" />, duration: 8000, preview: 'Collecting customer signals' },
  { id: 'analyze', label: 'Analyzing sentiment', icon: <Cpu className="w-5 h-5" />, duration: 12000, preview: 'Separating positive, neutral, and negative themes' },
  { id: 'finalize', label: 'Generating insights', icon: <Layout className="w-5 h-5" />, duration: 5000, preview: 'Preparing the dashboard' },
];

export default function ProcessingUI({ progress }: { progress: number }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Logic to advance steps based on progress if available, or simulate
    const index = Math.min(Math.floor(progress / 25), STEPS.length - 1);
    setCurrentStepIndex(index);
  }, [progress]);

  return (
    <div className="max-w-2xl mx-auto space-y-10 py-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-[2rem] mb-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Building your product dashboard
        </h2>
        <p className="text-slate-500 font-medium">
          We are fetching the product, extracting reviews, analyzing sentiment, and generating insights.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/60 space-y-8">
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-bold text-slate-900 px-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar progress={progress} />
        </div>

        <div className="space-y-4">
          {STEPS.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            
            return (
              <div 
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${
                  isActive ? 'bg-slate-50 border border-slate-100' : 'opacity-40'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isCompleted ? 'bg-emerald-50 text-emerald-600' : 
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900">{step.label}</div>
                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-xs font-mono text-blue-600 mt-1"
                      >
                        → {step.preview}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {isActive && (
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">This can take a moment for products with many reviews</p>
    </div>
  );
}
