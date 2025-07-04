
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Star,
  AlertTriangle,
  DollarSign,
  Users,
  Search,
  Instagram,
  MapPin,
  Building,
  Zap
} from 'lucide-react';

interface Task {
  id: string;
  text: string;
  time: string;
  completed: boolean;
}

interface Day {
  title: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  tasks: Task[];
}

interface Phase {
  id: string;
  title: string;
  subtitle: string;
  focus: string;
  revenueTarget: string;
  days: Day[];
  milestone: string;
  specialNote?: {
    title: string;
    content: string;
    type: 'seo' | 'local' | 'assets';
  };
}

export default function RelaunchChecklist() {
  const [activePhase, setActivePhase] = useState('immediate');
  const [tasks, setTasks] = useState<Record<string, boolean>>({});

  const phases: Phase[] = [
    {
      id: 'immediate',
      title: 'Immediate Actions',
      subtitle: 'Next 7 Days',
      focus: 'Fix Google Maps & Maximize Current Assets',
      revenueTarget: '$2,000-$3,000 additional revenue from fixed local presence',
      milestone: 'Google Maps listing live + 5+ reviews + Instagram monetized + SEO foundation set',
      specialNote: {
        title: 'Priority Keywords to Target',
        content: 'custom framing [your city] • picture framing near me • art framing [your city] • professional framing service • [your city] frame shop',
        type: 'seo'
      },
      days: [
        {
          title: 'Day 1: Google Maps Emergency Fix',
          priority: 'urgent',
          tasks: [
            { id: 'gm1', text: 'Claim/verify Google Business Profile immediately', time: '1 hr', completed: false },
            { id: 'gm2', text: 'Update business name, address, phone (NAP consistency)', time: '30 min', completed: false },
            { id: 'gm3', text: 'Add business hours, services, and description', time: '45 min', completed: false },
            { id: 'gm4', text: 'Upload 10+ high-quality photos of work and location', time: '1 hr', completed: false },
            { id: 'gm5', text: 'Set up Google Posts feature for promotions', time: '30 min', completed: false },
            { id: 'gm6', text: 'Enable messaging and Q&A features', time: '15 min', completed: false }
          ]
        },
        {
          title: 'Day 2: Directory Cleanup & Citations',
          priority: 'urgent',
          tasks: [
            { id: 'dc1', text: 'Update Yelp business listing with current info', time: '30 min', completed: false },
            { id: 'dc2', text: 'Fix Facebook Business page information', time: '20 min', completed: false },
            { id: 'dc3', text: 'Update Yellow Pages, Better Business Bureau listings', time: '45 min', completed: false },
            { id: 'dc4', text: 'Submit to local chamber of commerce directory', time: '30 min', completed: false },
            { id: 'dc5', text: 'Create/update Nextdoor business profile', time: '20 min', completed: false },
            { id: 'dc6', text: 'Check and fix Apple Maps listing', time: '15 min', completed: false }
          ]
        },
        {
          title: 'Day 3: Website SEO Emergency Optimization',
          priority: 'high',
          tasks: [
            { id: 'seo1', text: 'Add Google Analytics and Search Console', time: '30 min', completed: false },
            { id: 'seo2', text: 'Optimize title tags with local keywords', time: '1 hr', completed: false },
            { id: 'seo3', text: 'Create location-based landing pages', time: '2 hrs', completed: false },
            { id: 'seo4', text: 'Add schema markup for local business', time: '1 hr', completed: false },
            { id: 'seo5', text: 'Submit XML sitemap to search engines', time: '15 min', completed: false },
            { id: 'seo6', text: 'Optimize page loading speed (images, caching)', time: '2 hrs', completed: false }
          ]
        },
        {
          title: 'Days 4-5: Instagram Monetization Blitz',
          priority: 'high',
          tasks: [
            { id: 'ig1', text: 'Create "We\'re Back!" announcement campaign', time: '2 hrs', completed: false },
            { id: 'ig2', text: 'Post before/after framing showcases daily', time: '1 hr/day', completed: false },
            { id: 'ig3', text: 'Launch "Follower Exclusive" 20% discount', time: '1 hr', completed: false },
            { id: 'ig4', text: 'Create Instagram Stories with location tags', time: '30 min/day', completed: false },
            { id: 'ig5', text: 'Set up Instagram Shopping for frame samples', time: '2 hrs', completed: false },
            { id: 'ig6', text: 'Engage with local hashtags and businesses', time: '30 min/day', completed: false }
          ]
        },
        {
          title: 'Days 6-7: Review Generation Blitz',
          priority: 'high',
          tasks: [
            { id: 'rv1', text: 'Contact recent $5K customers for Google reviews', time: '2 hrs', completed: false },
            { id: 'rv2', text: 'Create simple review request cards for in-person', time: '1 hr', completed: false },
            { id: 'rv3', text: 'Set up automated review request emails', time: '1.5 hrs', completed: false },
            { id: 'rv4', text: 'Ask family/friends for initial Google reviews', time: '1 hr', completed: false },
            { id: 'rv5', text: 'Respond to any existing reviews professionally', time: '30 min', completed: false }
          ]
        }
      ]
    },
    {
      id: 'week2-4',
      title: 'Local Market Domination',
      subtitle: 'Weeks 2-4',
      focus: 'Become THE go-to framing business in your area',
      revenueTarget: '$15,000-$25,000 revenue + 50+ new customers',
      milestone: '25+ Google reviews + Top 3 local search ranking + $20K revenue',
      specialNote: {
        title: 'Local SEO Domination Strategy',
        content: 'Create neighborhood-specific landing pages • Partner with local influencers and bloggers • Sponsor local art events and exhibitions • Build citations in local directories • Optimize for "near me" searches',
        type: 'local'
      },
      days: [
        {
          title: 'Week 2: Content Marketing & Local SEO',
          priority: 'high',
          tasks: [
            { id: 'cm1', text: 'Create weekly blog posts about framing tips', time: '3 hrs/week', completed: false },
            { id: 'cm2', text: 'Film "Frame of the Week" video series', time: '2 hrs/week', completed: false },
            { id: 'cm3', text: 'Partner with 5 local artists for cross-promotion', time: '4 hrs', completed: false },
            { id: 'cm4', text: 'Create location-specific service pages', time: '6 hrs', completed: false },
            { id: 'cm5', text: 'Build local backlinks from art/design sites', time: '3 hrs', completed: false }
          ]
        },
        {
          title: 'Week 3: Corporate Outreach & B2B',
          priority: 'high',
          tasks: [
            { id: 'co1', text: 'Create corporate framing packages', time: '3 hrs', completed: false },
            { id: 'co2', text: 'Visit 20 local businesses with portfolios', time: '8 hrs', completed: false },
            { id: 'co3', text: 'Target interior designers and architects', time: '4 hrs', completed: false },
            { id: 'co4', text: 'Create LinkedIn business presence', time: '2 hrs', completed: false },
            { id: 'co5', text: 'Develop volume pricing for bulk orders', time: '2 hrs', completed: false }
          ]
        },
        {
          title: 'Week 4: Advanced AI Integration',
          priority: 'medium',
          tasks: [
            { id: 'ai1', text: 'Deploy AI chat assistant on website', time: '4 hrs', completed: false },
            { id: 'ai2', text: 'Create virtual frame preview tool', time: '8 hrs', completed: false },
            { id: 'ai3', text: 'Implement automated quote generation', time: '6 hrs', completed: false },
            { id: 'ai4', text: 'Set up inventory management automation', time: '5 hrs', completed: false },
            { id: 'ai5', text: 'Create customer notification system', time: '3 hrs', completed: false }
          ]
        }
      ]
    },
    {
      id: 'month2',
      title: 'Scale & Optimize',
      subtitle: 'Month 2',
      focus: 'Maximize efficiency and expand market reach',
      revenueTarget: '$30,000-$45,000 revenue + Regional recognition',
      milestone: 'Regional market presence + Optimized operations + Strategic partnerships',
      days: [
        {
          title: 'Weeks 5-6: Process Optimization',
          priority: 'high',
          tasks: [
            { id: 'po1', text: 'Implement workflow automation tools', time: '8 hrs', completed: false },
            { id: 'po2', text: 'Create standard operating procedures', time: '6 hrs', completed: false },
            { id: 'po3', text: 'Set up advanced analytics tracking', time: '4 hrs', completed: false },
            { id: 'po4', text: 'Optimize supply chain management', time: '5 hrs', completed: false },
            { id: 'po5', text: 'Implement quality control systems', time: '3 hrs', completed: false }
          ]
        },
        {
          title: 'Weeks 7-8: Market Expansion',
          priority: 'medium',
          tasks: [
            { id: 'me1', text: 'Launch referral program', time: '4 hrs', completed: false },
            { id: 'me2', text: 'Create corporate partnership program', time: '6 hrs', completed: false },
            { id: 'me3', text: 'Develop wholesale opportunities', time: '5 hrs', completed: false },
            { id: 'me4', text: 'Expand to neighboring markets', time: '8 hrs', completed: false },
            { id: 'me5', text: 'Launch email marketing campaigns', time: '3 hrs', completed: false }
          ]
        }
      ]
    },
    {
      id: 'month3',
      title: 'Market Leadership',
      subtitle: 'Month 3',
      focus: 'Establish dominant market position',
      revenueTarget: '$50,000+ revenue + Market leadership position',
      milestone: 'Industry recognition + Sustainable growth systems + Market dominance',
      days: [
        {
          title: 'Weeks 9-10: Strategic Partnerships',
          priority: 'high',
          tasks: [
            { id: 'sp1', text: 'Partner with major interior design firms', time: '8 hrs', completed: false },
            { id: 'sp2', text: 'Establish gallery partnerships', time: '6 hrs', completed: false },
            { id: 'sp3', text: 'Create franchise/licensing opportunities', time: '10 hrs', completed: false },
            { id: 'sp4', text: 'Launch brand ambassador program', time: '4 hrs', completed: false },
            { id: 'sp5', text: 'Develop strategic vendor relationships', time: '5 hrs', completed: false }
          ]
        },
        {
          title: 'Weeks 11-12: Market Dominance',
          priority: 'medium',
          tasks: [
            { id: 'md1', text: 'Launch premium service tiers', time: '6 hrs', completed: false },
            { id: 'md2', text: 'Create industry thought leadership content', time: '8 hrs', completed: false },
            { id: 'md3', text: 'Establish award/recognition programs', time: '4 hrs', completed: false },
            { id: 'md4', text: 'Launch community education programs', time: '5 hrs', completed: false },
            { id: 'md5', text: 'Plan expansion strategy for year 2', time: '10 hrs', completed: false }
          ]
        }
      ]
    }
  ];

  const currentPhase = phases.find(p => p.id === activePhase) || phases[0];

  const toggleTask = (taskId: string) => {
    setTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const getCompletionPercentage = () => {
    const allTasks = phases.flatMap(phase => 
      phase.days.flatMap(day => day.tasks)
    );
    const completedTasks = allTasks.filter(task => tasks[task.id]);
    return Math.round((completedTasks.length / allTasks.length) * 100);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return AlertTriangle;
      case 'high': return Zap;
      case 'medium': return Clock;
      case 'low': return CheckCircle;
      default: return Clock;
    }
  };

  const getPhaseIcon = (id: string) => {
    switch (id) {
      case 'immediate': return AlertTriangle;
      case 'week2-4': return MapPin;
      case 'month2': return TrendingUp;
      case 'month3': return Star;
      default: return Target;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">Jay's Frames Strategic Growth Plan</h1>
          <p className="text-blue-100 mb-4">Optimizing Your Re-Launched 15-Year Business for Maximum ROI</p>
          
          <div className="bg-black/20 rounded-lg p-4 mb-4">
            <Progress value={getCompletionPercentage()} className="mb-2" />
            <div className="text-center font-semibold">
              {getCompletionPercentage()}% Complete - Business Successfully Re-Launched!
            </div>
          </div>
        </div>

        {/* Current Status */}
        <Card className="bg-green-600 border-green-500 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              🎉 Current Business Status - LAUNCHED & PROFITABLE!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-white">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-200" />
                <span>$5,000 in sales completed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-200" />
                <span>Full-stack ecosystem deployed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-200" />
                <span>Physical signage installed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-200" />
                <span>10,000 Instagram followers ready</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-200" />
                <span>Google Maps listing needs optimization</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-200" />
                <span>SEO & local rankings need improvement</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
}/Card>
      </div>

      {/* Phase Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {phases.map((phase) => {
          const Icon = getPhaseIcon(phase.id);
          return (
            <Button
              key={phase.id}
              variant={activePhase === phase.id ? "default" : "outline"}
              onClick={() => setActivePhase(phase.id)}
              className={`flex items-center gap-2 ${
                activePhase === phase.id 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-800 hover:bg-gray-700 border-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <div className="text-left">
                <div className="font-semibold">{phase.title}</div>
                <div className="text-xs opacity-75">{phase.subtitle}</div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Phase Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePhase}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Phase Header */}
          <Card className="bg-gradient-to-r from-purple-600 to-blue-600 border-purple-500 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-2xl">{currentPhase.title}</CardTitle>
              <p className="text-purple-100">{currentPhase.focus}</p>
            </CardHeader>
          </Card>

          {/* Revenue Target */}
          <Card className="bg-yellow-600 border-yellow-500 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-100">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold">Revenue Target: {currentPhase.revenueTarget}</span>
              </div>
            </CardContent>
          </Card>

          {/* Days/Weeks */}
          <div className="space-y-6">
            {currentPhase.days.map((day, dayIndex) => {
              const PriorityIcon = getPriorityIcon(day.priority);
              const completedTasks = day.tasks.filter(task => tasks[task.id]).length;
              const progressPercent = Math.round((completedTasks / day.tasks.length) * 100);

              return (
                <Card key={dayIndex} className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center gap-3">
                        <PriorityIcon className="w-5 h-5" />
                        {day.title}
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <Badge className={`${getPriorityColor(day.priority)} text-white`}>
                          {day.priority.toUpperCase()}
                        </Badge>
                        <div className="text-sm text-gray-400">
                          {completedTasks}/{day.tasks.length} completed
                        </div>
                      </div>
                    </div>
                    <Progress value={progressPercent} className="mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {day.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                            tasks[task.id] 
                              ? 'bg-green-900/30 border-green-600' 
                              : 'bg-gray-800 hover:bg-gray-750'
                          } border`}
                        >
                          <Checkbox
                            checked={tasks[task.id] || false}
                            onCheckedChange={() => toggleTask(task.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <span className={`${
                              tasks[task.id] ? 'line-through text-gray-400' : 'text-white'
                            }`}>
                              {task.text}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {task.time}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Milestone */}
          <Card className="bg-green-600 border-green-500 mt-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-white">
                <Target className="w-5 h-5" />
                <span className="font-semibold">Milestone: {currentPhase.milestone}</span>
              </div>
            </CardContent>
          </Card>

          {/* Special Note */}
          {currentPhase.specialNote && (
            <Card className={`mt-6 ${
              currentPhase.specialNote.type === 'seo' ? 'bg-red-600 border-red-500' :
              currentPhase.specialNote.type === 'local' ? 'bg-orange-600 border-orange-500' :
              'bg-blue-600 border-blue-500'
            }`}>
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  {currentPhase.specialNote.type === 'seo' && <Search className="w-4 h-4" />}
                  {currentPhase.specialNote.type === 'local' && <MapPin className="w-4 h-4" />}
                  {currentPhase.specialNote.type === 'assets' && <Building className="w-4 h-4" />}
                  {currentPhase.specialNote.title}
                </h4>
                <p className="text-white/90 whitespace-pre-line">{currentPhase.specialNote.content}</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
