import { useState, useMemo } from 'react';
import { X, Search, ArrowUpDown, Star, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Review {
  title: string;
  text: string;
  rating: number;
}

interface DrilldownProps {
  isOpen: boolean;
  onClose: () => void;
  keyword: string;
  reviews: Review[];
}

export default function ReviewDrilldownPanel({ isOpen, onClose, keyword, reviews = [] }: DrilldownProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const safeReviews = Array.isArray(reviews) ? reviews : [];

  const filteredReviews = useMemo(() => {
    return safeReviews
      .filter(r => {
        if (!r) return false;
        const text = (r.text || '').toLowerCase();
        const title = (r.title || '').toLowerCase();
        const kw = (keyword || '').toLowerCase();
        const search = (searchTerm || '').toLowerCase();

        const matchesKeyword = !kw || text.includes(kw) || title.includes(kw);
        const matchesSearch = !search || text.includes(search) || title.includes(search);
        const matchesRating = !ratingFilter || Math.floor(r.rating || 0) === ratingFilter;
        
        return matchesKeyword && matchesSearch && matchesRating;
      })
      .sort((a, b) => {
        const ra = a?.rating || 0;
        const rb = b?.rating || 0;
        return sortOrder === 'desc' ? rb - ra : ra - rb;
      });
  }, [safeReviews, keyword, searchTerm, ratingFilter, sortOrder]);

  // Escape special regex characters in keyword for highlighting
  const escapedKeyword = (keyword || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  Review Intelligence
                </h3>
                <p className="text-sm font-medium text-slate-500">
                  Analyzing signals for: <span className="text-blue-600 font-bold">"{keyword || 'All Reviews'}"</span>
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filters Bar */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 space-y-4">
               <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search within these reviews..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-medium transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="px-4 py-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    {sortOrder === 'desc' ? 'Highest' : 'Lowest'}
                  </button>
               </div>
               
               <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter Rating:</span>
                  <div className="flex gap-2">
                     {[5, 4, 3, 2, 1].map(star => (
                       <button
                         key={star}
                         onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                         className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                           ratingFilter === star 
                             ? 'bg-blue-600 border-blue-600 text-white' 
                             : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'
                         }`}
                       >
                         {star} ★
                       </button>
                     ))}
                  </div>
               </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/20">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Search className="w-8 h-8" />
                   </div>
                   <p className="text-slate-500 font-medium">No reviews match your current filters.</p>
                </div>
              ) : (
                filteredReviews.map((review, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 group hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <div className="flex text-amber-400">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < Math.floor(review.rating || 0) ? 'fill-current' : 'text-slate-200'}`} />
                              ))}
                           </div>
                           <span className="text-[10px] font-black text-slate-400">{(review.rating || 0).toFixed(1)}</span>
                        </div>
                        <h4 className="font-black text-slate-900 tracking-tight leading-tight">{review.title || 'Untitled Review'}</h4>
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                        (review.rating || 0) >= 4 ? 'bg-emerald-50 text-emerald-600' : (review.rating || 0) <= 2 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'
                      }`}>
                         {(review.rating || 0) >= 4 ? 'Positive' : (review.rating || 0) <= 2 ? 'Negative' : 'Neutral'}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                       {/* Highlight keyword if present */}
                       {escapedKeyword ? (
                          (review.text || '').split(new RegExp(`(${escapedKeyword})`, 'gi')).map((part, i) => (
                            part.toLowerCase() === keyword.toLowerCase() 
                              ? <span key={i} className="bg-yellow-100 text-yellow-900 px-0.5 rounded font-bold">{part}</span>
                              : part
                          ))
                       ) : (review.text || '')}
                    </p>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-6 border-t border-slate-100 bg-white text-center">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                 Showing {filteredReviews.length} of {safeReviews.length} available signals
               </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
