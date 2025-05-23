import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Frame, BarChart3, Brain, Users, Zap, CheckCircle, ArrowRight } from 'lucide-react';

export default function Landing() {
  const features = [
    {
      icon: BarChart3,
      title: 'Smart Kanban Board',
      description: 'Visual workflow management with drag-and-drop functionality across 9 production stages.'
    },
    {
      icon: Brain,
      title: 'AI Assistant',
      description: 'Intelligent workload analysis, bottleneck detection, and personalized recommendations.'
    },
    {
      icon: Users,
      title: 'Customer Portal',
      description: 'Real-time order tracking for customers with automated status notifications.'
    },
    {
      icon: Zap,
      title: 'Real-time Updates',
      description: 'Live status updates, priority alerts, and instant team collaboration.'
    }
  ];

  const benefits = [
    'Reduce order completion time by 30%',
    'Eliminate bottlenecks with AI insights',
    'Improve customer satisfaction with transparency',
    'Streamline material tracking and ordering',
    'Optimize resource allocation automatically'
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 166, 147, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 166, 147, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-6xl mx-auto text-center">
          {/* Logo and Brand */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-jade-500 to-jade-600 rounded-2xl flex items-center justify-center">
                <Frame className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold font-mono tracking-wider text-jade-400">
                JAY'S FRAMES
              </h1>
            </div>
            <p className="text-xl text-gray-400 mb-2">Smart Production Management</p>
            <p className="text-gray-500">AI-Powered Kanban Board for Custom Framing</p>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Transform Your Frame Shop
              <br />
              <span className="text-jade-400">with Intelligent Workflow</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Streamline your custom framing business with AI-powered production management. 
              Track orders, optimize workflows, and delight customers with real-time visibility.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Button
              size="lg"
              className="bg-jade-500 hover:bg-jade-400 text-black font-semibold px-8 py-4 text-lg"
              onClick={() => window.location.href = '/api/login'}
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-jade-500 text-jade-400 hover:bg-jade-500/10 px-8 py-4 text-lg"
              onClick={() => window.location.href = '/track'}
            >
              Track Your Order
            </Button>
          </motion.div>

          {/* Benefits Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                className="flex items-center gap-2 text-sm text-gray-300"
              >
                <CheckCircle className="w-4 h-4 text-jade-400 flex-shrink-0" />
                <span>{benefit}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to Excel
            </h3>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Comprehensive tools designed specifically for custom framing shops
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="bg-gray-900/50 border-gray-800 hover:border-jade-500/50 transition-all duration-300 h-full">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 bg-jade-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-6 h-6 text-jade-400" />
                    </div>
                    <CardTitle className="text-white text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-center">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="relative z-10 py-20 px-6 bg-gray-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
              See It In Action
            </h3>
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
              <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center mb-6">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-jade-400 mx-auto mb-4" />
                  <p className="text-gray-400">Interactive Kanban Board</p>
                  <p className="text-sm text-gray-500">Drag & drop orders across production stages</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  className="bg-jade-500 hover:bg-jade-400 text-black font-semibold"
                  onClick={() => window.location.href = '/api/login'}
                >
                  Start Free Trial
                </Button>
                <Button
                  variant="ghost"
                  className="text-jade-400 hover:text-jade-300"
                  onClick={() => window.location.href = '/track'}
                >
                  Try Customer Portal
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-jade-500 to-jade-600 rounded-lg flex items-center justify-center">
              <Frame className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-jade-400">Jay's Frames</span>
          </div>
          <p className="text-gray-500 mb-4">
            Professional production management for custom framing shops
          </p>
          <p className="text-sm text-gray-600">
            © 2024 Jay's Frames. Built with modern web technologies.
          </p>
        </div>
      </footer>
    </div>
  );
}
