import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, X, Send, BarChart3, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useWebSocket } from '../hooks/useWebSocket';
import { apiRequest } from '../lib/queryClient';
import type { AIMessage, WorkloadAnalysis } from '@shared/schema';

const MAX_MESSAGES = 100;

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [urgentAlerts, setUrgentAlerts] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { lastMessage } = useWebSocket();

  const { data: analysis } = useQuery<WorkloadAnalysis>({
    queryKey: ['/api/ai/analysis'],
    enabled: isOpen,
    refetchInterval: isOpen ? 30000 : false,
  });

  const { data: alertsData } = useQuery<{ alerts: AIMessage[] }>({
    queryKey: ['/api/ai/alerts'],
    enabled: isOpen,
    refetchInterval: isOpen ? 60000 : false,
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/ai/chat', { message });
      return response.json();
    },
    onSuccess: (data) => {
      addMessage({
        id: uuidv4(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date(),
        severity: 'info',
      });
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const addMessage = useCallback((message: AIMessage | AIMessage[]) => {
    setMessages(prev => {
      const newMessages = Array.isArray(message) ? [...prev, ...message] : [...prev, message];
      return newMessages.slice(-MAX_MESSAGES);
    });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timeout);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'ai-alerts') {
      const alerts = lastMessage.data as AIMessage[];
      const urgentCount = alerts.filter(alert => alert.severity === 'urgent').length;
      setUrgentAlerts(prev => prev + urgentCount);
      if (isOpen) addMessage(alerts);
    }

    if (lastMessage.type === 'ai-analysis') {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/analysis'] });
    }
  }, [lastMessage, isOpen, addMessage, queryClient]);

  useEffect(() => {
    if (!alertsData?.alerts) return;
    const urgentCount = alertsData.alerts.filter(alert => alert.severity === 'urgent').length;
    setUrgentAlerts(urgentCount);

    if (isOpen && messages.length === 0) {
      addMessage(alertsData.alerts);
    }
  }, [alertsData, isOpen, messages.length, addMessage]);

  const sendMessage = useCallback(() => {
    const content = input.trim();
    if (!content || chatMutation.isPending) return;

    const userMessage: AIMessage = {
      id: uuidv4(),
      type: 'user',
      content,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    chatMutation.mutate(content, {
      onError: () => {
        addMessage({
          id: uuidv4(),
          type: 'assistant',
          content: 'Sorry, I encountered an error while processing your message.',
          timestamp: new Date(),
          severity: 'warning',
        });
      }
    });
  }, [input, chatMutation, addMessage]);

  const clearConversation = () => {
    setMessages([]);
    setUrgentAlerts(0);
    queryClient.invalidateQueries({ queryKey: ['/api/ai/alerts'] });
  };

  const getRiskLevelColor = (level?: string) => ({
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-green-500',
  }[level || 'low'] || 'text-green-500');

  const getMessageSeverityClass = (severity?: string) => ({
    urgent: 'border-red-500',
    warning: 'border-yellow-500',
    success: 'border-green-500',
  }[severity || ''] || 'border-jade-500');

  return (
    <>
      {/* Floating AI Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(true);
          setUrgentAlerts(0);
        }}
        className={`
          fixed bottom-6 right-6 w-16 h-16 rounded-full
          bg-gradient-to-br from-jade-500 to-jade-600
          text-white shadow-2xl flex items-center justify-center
          hover:from-jade-400 hover:to-jade-500 transition-all
          ${!isOpen ? 'block' : 'hidden'}
        `}
        style={{ zIndex: 1000 }}
      >
        <Brain className="w-8 h-8" />
        {urgentAlerts > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold"
          >
            {urgentAlerts}
          </motion.div>
        )}
      </motion.button>

      {/* Assistant UI */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed right-0 top-0 h-full w-[480px] bg-gray-900 border-l border-gray-800 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-jade-600 to-jade-500 p-6 text-white">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                  <Brain className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">AI Assistant</h2>
                    <p className="text-sm text-jade-100">Your Production Copilot</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {messages.length > 0 && (
                    <Button variant="ghost" size="icon" onClick={clearConversation}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatBox icon={<BarChart3 />} value={`${analysis?.onTimePercentage || 0}%`} label="On Time" />
                <StatBox icon={<Clock />} value={`${analysis?.totalHours || 0}h`} label="Workload" />
                <StatBox
                  icon={<AlertTriangle />}
                  value={analysis?.riskLevel?.toUpperCase() || 'LOW'}
                  label="Risk"
                  valueClass={getRiskLevelColor(analysis?.riskLevel)}
                />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence initial={false}>
                {messages.length === 0 ? (
                  <WelcomeMessage />
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`mb-4 ${msg.type === 'user' ? 'text-right' : ''}`}
                    >
                      <div
                        className={`inline-block max-w-[80%] p-4 rounded-lg ${
                          msg.type === 'user'
                            ? 'bg-jade-600 text-white'
                            : msg.type === 'alert'
                            ? `bg-gray-800 border-l-4 ${getMessageSeverityClass(msg.severity)}`
                            : 'bg-gray-800 text-gray-200'
                        }`}
                      >
                        {msg.type === 'assistant' && (
                          <div className="flex items-center gap-2 mb-2 text-jade-400">
                            <Brain className="w-4 h-4" />
                            <span className="text-sm font-semibold">AI Assistant</span>
                          </div>
                        )}
                        <p className="whitespace-pre-line">{msg.content}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 border-t border-gray-800">
              <div className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask about workload, updates, materials..."
                  className="flex-1 bg-gray-800 text-white border-gray-700"
                  disabled={chatMutation.isPending}
                />
                <Button
                  type="button"
                  onClick={sendMessage}
                  disabled={chatMutation.isPending || !input.trim()}
                  className="bg-jade-500 text-white hover:bg-jade-400"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const StatBox = ({ icon, value, label, valueClass = '' }) => (
  <div className="bg-jade-700/50 rounded-lg p-3 text-center">
    <div className="mx-auto mb-1">{icon}</div>
    <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
    <p className="text-xs">{label}</p>
  </div>
);

const WelcomeMessage = () => (
  <div className="text-center text-gray-500 mt-8">
    <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
    <p className="text-sm mb-4">Welcome! I'm here to help with your production management.</p>
    <div className="text-xs text-left space-y-2">
      <p>Try asking me about:</p>
      <ul className="list-disc list-inside space-y-1 text-gray-400">
        <li>Current workload status</li>
        <li>Order priorities and deadlines</li>
        <li>Material tracking</li>
        <li>Workflow recommendations</li>
      </ul>
    </div>
  </div>
);
