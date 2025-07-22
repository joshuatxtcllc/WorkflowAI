import React from 'react';
import { Badge } from './ui/badge';
import { Bell } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-white">Jay's Frames</h1>
          <Badge variant="secondary" className="bg-jade-500 text-black">
            Production Dashboard
          </Badge>
        </div>

        <div className="flex items-center space-x-4">
          <Bell className="h-5 w-5 text-gray-400" />
          <div className="text-white text-sm">
            Welcome to Jay's Frames
          </div>
        </div>
      </div>
    </header>
  );
}