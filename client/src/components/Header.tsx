
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bell, Settings, User, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useSidebar } from './ui/sidebar';

export default function Header() {
  const { toggleSidebar } = useSidebar();

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mobile-header sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50"
    >
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left Side */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-white hover:bg-gray-800/50 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-3"
          >
            <div className="p-2 rounded-xl bg-gradient-to-r from-jade-500 to-jade-600 shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-jade-400 to-jade-600 bg-clip-text text-transparent">
                Jay's Frames
              </h1>
              <p className="text-xs text-gray-500">Production Studio</p>
            </div>
          </motion.div>
        </div>

        {/* Center - Status Indicator */}
        <div className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-jade-500/10 to-jade-600/10 backdrop-blur-xl rounded-full px-4 py-2 border border-jade-500/30">
          <div className="w-2 h-2 rounded-full bg-jade-400 animate-pulse" />
          <span className="text-jade-400 text-sm font-medium">System Online</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="relative text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl"
            >
              <Bell className="h-5 w-5" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-gradient-to-r from-red-500 to-red-600"
              >
                3
              </Badge>
            </Button>
          </motion.div>

          {/* Settings */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </motion.div>

          {/* Profile */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl px-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-jade-500 to-jade-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:inline text-sm font-medium">Admin</span>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
