import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AnalysisHistory {
  jobId: string;
  productName: string;
  timestamp: number;
}

interface AppState {
  history: AnalysisHistory[];
  lastSearchUrl: string;
  recentSearches: string[];
  lastComparisonList: string[];
  addToHistory: (jobId: string, productName: string) => void;
  setLastSearchUrl: (url: string) => void;
  setLastComparisonList: (urls: string[]) => void;
  clearHistory: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      history: [],
      lastSearchUrl: '',
      recentSearches: [],
      lastComparisonList: [],
      addToHistory: (jobId, productName) => 
        set((state) => {
          // Remove if exists to move to top
          const filtered = state.history.filter(h => h.jobId !== jobId);
          return {
            history: [
              { jobId, productName, timestamp: Date.now() },
              ...filtered
            ].slice(0, 10) // Keep last 10
          };
        }),
      setLastSearchUrl: (url) =>
        set((state) => {
          const trimmedUrl = url.trim();
          if (!trimmedUrl) return state;

          const recentSearches = [
            trimmedUrl,
            ...state.recentSearches.filter((item) => item !== trimmedUrl),
          ].slice(0, 5);

          localStorage.setItem('lastSearch', trimmedUrl);

          return {
            lastSearchUrl: trimmedUrl,
            recentSearches,
          };
        }),
      setLastComparisonList: (urls) =>
        set(() => {
          const cleanUrls = urls.map((url) => url.trim()).filter(Boolean).slice(0, 5);
          localStorage.setItem('lastComparisonList', JSON.stringify(cleanUrls));
          return { lastComparisonList: cleanUrls };
        }),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'commercelens-storage',
    }
  )
);
