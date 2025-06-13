import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StatsState {
  dailyCompletions: number;
  weeklyCompletions: number;
  monthlyCompletions: number;
  totalCompletions: number;
  lastCompletionDate: string;
  streak: number;
  bestStreak: number;
  incrementCompletion: () => void;
  resetDaily: () => void;
  getStats: () => {
    daily: number;
    weekly: number;
    monthly: number;
    total: number;
    streak: number;
    bestStreak: number;
  };
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      dailyCompletions: 0,
      weeklyCompletions: 0,
      monthlyCompletions: 0,
      totalCompletions: 0,
      lastCompletionDate: '',
      streak: 0,
      bestStreak: 0,

      incrementCompletion: () => {
        const today = new Date().toDateString();
        const state = get();
        const lastDate = state.lastCompletionDate;
        
        // Check if it's a new day
        const isNewDay = lastDate !== today;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const wasYesterday = lastDate === yesterday.toDateString();
        
        set((state) => {
          let newStreak = state.streak;
          
          if (isNewDay) {
            // Reset daily count for new day
            if (wasYesterday || state.streak === 0) {
              // Continue or start streak
              newStreak = state.streak + 1;
            } else {
              // Streak broken
              newStreak = 1;
            }
          } else {
            // Same day, keep streak
            newStreak = Math.max(state.streak, 1);
          }
          
          const newBestStreak = Math.max(state.bestStreak, newStreak);
          
          return {
            dailyCompletions: isNewDay ? 1 : state.dailyCompletions + 1,
            weeklyCompletions: state.weeklyCompletions + 1,
            monthlyCompletions: state.monthlyCompletions + 1,
            totalCompletions: state.totalCompletions + 1,
            lastCompletionDate: today,
            streak: newStreak,
            bestStreak: newBestStreak,
          };
        });
      },

      resetDaily: () => {
        set((state) => ({
          ...state,
          dailyCompletions: 0,
        }));
      },

      getStats: () => {
        const state = get();
        return {
          daily: state.dailyCompletions,
          weekly: state.weeklyCompletions,
          monthly: state.monthlyCompletions,
          total: state.totalCompletions,
          streak: state.streak,
          bestStreak: state.bestStreak,
        };
      },
    }),
    {
      name: 'completion-stats',
    }
  )
);