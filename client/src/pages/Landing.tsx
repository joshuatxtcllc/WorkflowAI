import { Button } from '../components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Hero Section */}
        <div className="space-y-6">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Jay's Frames
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            AI-Powered Production Management System for Custom Frame Orders
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">Smart Kanban Board</h3>
            <p className="text-gray-400 text-sm">
              Visual workflow management with drag-and-drop functionality across 9 production stages.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-emerald-400 mb-3">AI Assistant</h3>
            <p className="text-gray-400 text-sm">
              Intelligent workload analysis, bottleneck detection, and personalized recommendations.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-amber-400 mb-3">Customer Portal</h3>
            <p className="text-gray-400 text-sm">
              Real-time order tracking for customers with automated status notifications.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-purple-400 mb-3">Real-time Updates</h3>
            <p className="text-gray-400 text-sm">
              Live status updates, priority alerts, and instant team collaboration.
            </p>
          </div>
        </div>

        {/* Login Button */}
        <div className="mt-12">
          <Button 
            asChild
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold"
          >
            <a href="/login">
              Access Your Dashboard
            </a>
          </Button>
          <p className="text-gray-400 text-sm mt-4">
            Secure login to manage your custom framing business
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-12 text-left max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-200">Why Choose Jay's Frames?</h2>
          <ul className="space-y-3">
            <li className="flex items-center text-gray-300">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></span>
              Reduce order completion time by 30%
            </li>
            <li className="flex items-center text-gray-300">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></span>
              Eliminate bottlenecks with AI insights
            </li>
            <li className="flex items-center text-gray-300">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></span>
              Improve customer satisfaction with transparency
            </li>
            <li className="flex items-center text-gray-300">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></span>
              Streamline material tracking and ordering
            </li>
            <li className="flex items-center text-gray-300">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></span>
              Optimize resource allocation automatically
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}