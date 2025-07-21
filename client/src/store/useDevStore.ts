
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DevState {
  isPollingEnabled: boolean;
  togglePolling: (enabled: boolean) => void;
  forceRefreshCount: number;
  triggerRefresh: () => void;
}

export const useDevStore = create<DevState>()(
  persist(
    (set, get) => ({
      isPollingEnabled: true,
      togglePolling: (enabled: boolean) => {
        set({ isPollingEnabled: enabled });
        // Broadcast to other components
        localStorage.setItem('dev_polling_enabled', enabled.toString());
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'dev_polling_enabled',
          newValue: enabled.toString()
        }));
      },
      forceRefreshCount: 0,
      triggerRefresh: () => {
        set(state => ({ forceRefreshCount: state.forceRefreshCount + 1 }));
      }
    }),
    {
      name: 'dev-controls'
    }
  )
);
