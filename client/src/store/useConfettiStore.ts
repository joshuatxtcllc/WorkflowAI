
import { create } from 'zustand';

interface ConfettiState {
  triggerConfetti: boolean;
  originX: number;
  originY: number;
  burst: (x?: number, y?: number) => void;
  reset: () => void;
}

// Confetti system disabled for performance optimization
export const useConfettiStore = create<ConfettiState>((set) => ({
  triggerConfetti: false,
  originX: 50,
  originY: 50,
  burst: (x = 50, y = 50) => {
    // Disabled - no confetti for performance
    console.log('Confetti disabled for performance');
  },
  reset: () => set({ triggerConfetti: false }),
}));
