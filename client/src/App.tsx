import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-green-400">Jay's Frames</h1>
          <p className="text-xl mb-8 text-gray-300">AI-Powered Frame Shop Management System</p>
          
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-center justify-center mb-4">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span className="text-green-400 font-semibold">System Online</span>
            </div>
            <p className="text-gray-300">
              Your frame shop management system is ready to use.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 text-blue-400">Orders</h3>
              <p className="text-gray-300 text-sm">Manage custom frame orders</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 text-purple-400">AI Assistant</h3>
              <p className="text-gray-300 text-sm">Get intelligent workflow insights</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 text-yellow-400">Analytics</h3>
              <p className="text-gray-300 text-sm">Track performance metrics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;