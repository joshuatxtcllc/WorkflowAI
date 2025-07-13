import { useEffect, useState } from 'react';
import { Button } from './ui/button';

interface LoadingScreenProps {
  onForceRefresh?: () => void;
}

export default function LoadingScreen({ onForceRefresh }: LoadingScreenProps) {
  const [showRefreshButton, setShowRefreshButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRefreshButton(true);
    }, 5000); // Show refresh button after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleForceRefresh = () => {
    // Clear all localStorage data
    localStorage.clear();
    // Hard refresh the page
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <div className="text-jade-400 text-3xl font-bold">Jay's Frames</div>
          <div className="text-white text-lg">Loading application...</div>
          
          {/* Loading animation */}
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jade-400"></div>
          </div>
        </div>

        {showRefreshButton && (
          <div className="space-y-4 pt-6 border-t border-gray-800">
            <div className="text-gray-400 text-sm">
              Taking longer than expected?
            </div>
            <Button 
              onClick={onForceRefresh || handleForceRefresh}
              variant="outline"
              className="bg-jade-500 hover:bg-jade-400 text-black border-jade-500"
            >
              Refresh Application
            </Button>
          </div>
        )}

        <div className="text-xs text-gray-500 max-w-md">
          If this screen persists, try refreshing the page or clearing your browser cache.
        </div>
      </div>
    </div>
  );
}