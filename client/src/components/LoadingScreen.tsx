import React from 'react';

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jade-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}