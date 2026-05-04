import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AnalysisHistory {
  jobId: string;
  productName: string;
  timestamp: number;
}

interface AppState {
  history: AnalysisHistory[];
  addToHistory: (jobId: string, productName: string) => void;
  clearHistory: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      history: [],
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
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'commercelens-storage',
    }
  )
);
