import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from './components/ui/toaster';
import KanbanBoard from './components/KanbanBoard';
import './index.css';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-950" style={{ backgroundColor: '#0A0A0B' }}>
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">Jay's Frames</h1>
              <span className="bg-jade-500 text-black px-3 py-1 rounded-full text-sm font-medium">
                Production Dashboard
              </span>
            </div>
            <div className="text-green-400 text-sm flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              System Online
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          <KanbanBoard />
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;