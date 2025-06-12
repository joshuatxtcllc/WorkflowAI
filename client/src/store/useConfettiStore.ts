import { create } from 'zustand';

interface ConfettiState {
  triggerConfetti: boolean;
  originX: number;
  originY: number;
  burst: (x?: number, y?: number) => void;
  reset: () => void;
}

export const useConfettiStore = create<ConfettiState>((set) => ({
  triggerConfetti: false,
  originX: 50,
  originY: 50,
  burst: (x = 50, y = 50) => set({ triggerConfetti: true, originX: x, originY: y }),
  reset: () => set({ triggerConfetti: false }),
}));