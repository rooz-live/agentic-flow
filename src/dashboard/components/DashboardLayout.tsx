/**
 * Hierarchical Mesh Dashboard Layout
 * ROI-Maximized CI/CD Design Philosophy
 * Glassmorphism + High Contrast Navigation
 */

import { useState, ReactNode } from 'react';

import { cn } from '../../utils/cn';
import {
  Activity, AlertTriangle, Clock, Globe, Home, Settings,
  TrendingUp, Zap, Users, Map, Calendar, ChevronRight, GitBranch,
  Target, Cpu, Radio, ArrowUpRight
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  isConnected: boolean;
  onRefresh: () => void;
}

interface NavGroup {
  title: string;
  icon: React.ElementType;
  items: { id: string; label: string; icon: React.ElementType; badge?: string }[];
}

const navigationGroups: NavGroup[] = [
  {
    title: 'Core Intelligence',
    icon: Target,
    items: [
      { id: 'overview', label: 'Overview', icon: Home, badge: 'Live' },
      { id: 'patterns', label: 'Pattern Analysis', icon: Activity },
      { id: 'circles', label: 'Circle Distribution', icon: Users },
    ]
  },
  {
    title: 'Operations',
    icon: Radio,
    items: [
      { id: 'anomalies', label: 'Anomaly Detection', icon: AlertTriangle, badge: '3' },
      { id: 'timeline', label: 'Execution Timeline', icon: Clock },
      { id: 'heatmap', label: 'Effectiveness Map', icon: Map },
    ]
  },
  {
    title: 'Swarm & Governance',
    icon: Cpu,
    items: [
      { id: 'directmail', label: 'Legal DirectMail (ADR)', icon: Activity },
      { id: 'swarm', label: 'Infra OODA Swarm', icon: Target },
    ]
  },
  {
    title: 'CI/CD Pipeline',
    icon: GitBranch,
    items: [
      { id: 'tld', label: 'Domain Activation', icon: Globe, badge: '310' },
      { id: 'economic', label: 'ROI Metrics', icon: TrendingUp },
    ]
  },
  {
    title: 'System',
    icon: Settings,
    items: [
      { id: 'settings', label: 'Configuration', icon: Settings },
    ]
  }
];

export function DashboardLayout({
  children,
  activeView,
  onViewChange,
  isConnected,
  onRefresh
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Core Intelligence', 'Operations']);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Vercel-esque Sidebar */}
      <div className={cn(
        'bg-[#0A0A0A] border-r border-white/[0.08]',
        'text-zinc-300 transition-all duration-300 ease-in-out flex flex-col',
        sidebarOpen ? 'w-72' : 'w-20'
      )}>
        {/* Logo & Brand Header */}
        <div className="p-5 border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-white/20">
                <Zap className="w-4 h-4 text-black" />
              </div>
              {sidebarOpen && (
                <div className="flex flex-col">
                  <h1 className="text-sm font-bold text-white tracking-tight uppercase">Agentic Flow</h1>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Intelligence Mesh</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <ChevronRight className={cn('w-4 h-4 transition-transform', sidebarOpen && 'rotate-180')} />
            </button>
          </div>

          {/* CI/CD Pipeline Status Bar */}
          {sidebarOpen && (
            <div className="mt-4 flex items-center space-x-2 px-1">
              <div className="flex items-center space-x-1.5 bg-white/[0.03] border border-white/[0.05] rounded-full px-2.5 py-1">
                <div className={cn('w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]', isConnected ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50')} />
                <span className={cn('text-[10px] font-bold tracking-widest uppercase', isConnected ? 'text-emerald-400' : 'text-red-400')}>
                  {isConnected ? 'PROD: HEALTHY' : 'DISCONNECTED'}
                </span>
              </div>
              <div className="flex-1 bg-white/[0.05] rounded-full h-1 overflow-hidden">
                <div className="w-3/4 h-full bg-emerald-500 rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* Hierarchical Mesh Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {navigationGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = expandedGroups.includes(group.title);
            const hasActiveItem = group.items.some(item => item.id === activeView);

            return (
              <div key={group.title} className="mb-3">
                {/* Group Header */}
                <button
                  onClick={() => sidebarOpen && toggleGroup(group.title)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all',
                    'text-slate-400 hover:text-white hover:bg-slate-800/50',
                    hasActiveItem && 'text-cyan-400 bg-slate-800/30'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <GroupIcon className="w-4 h-4" />
                    {sidebarOpen && (
                      <span className="text-xs font-semibold uppercase tracking-wider">{group.title}</span>
                    )}
                  </div>
                  {sidebarOpen && (
                    <ChevronRight className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')} />
                  )}
                </button>

                {/* Group Items */}
                {sidebarOpen && isExpanded && (
                  <ul className="mt-1 ml-7 space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;

                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => onViewChange(item.id)}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all',
                              'text-[13px] font-medium tracking-tight',
                              isActive
                                ? 'bg-white/[0.06] text-white'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-zinc-500')} />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest',
                                isActive
                                  ? 'bg-white/10 text-white'
                                  : 'bg-white/[0.03] text-zinc-500'
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Collapsed View - Show Active Item Only */}
                {!sidebarOpen && group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;

                  return isActive ? (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className="w-full flex justify-center p-2 mt-1 rounded-lg bg-white/[0.06]"
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </button>
                  ) : null;
                })}
              </div>
            );
          })}
        </nav>

        {/* ROI Metrics Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/[0.08] bg-[#000000]">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">ROI Impact</span>
                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-xl font-bold text-white tracking-tight">847%</span>
                <span className="text-[10px] font-bold text-emerald-500">+23%</span>
              </div>
              <div className="mt-1 text-[10px] text-zinc-600 font-medium tracking-wide">
                310 DOMAINS ACTIVE
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#000000]">
        {/* Vercel-esque Top Bar */}
        <header className="bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/[0.08] px-6 py-3.5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {navigationGroups.flatMap(g => g.items).find(item => item.id === activeView)?.label || 'Dashboard'}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* CI/CD Action Bar */}
              <button
                onClick={onRefresh}
                className="flex items-center space-x-2 px-3 py-1.5 bg-white text-black rounded-md hover:bg-zinc-200 transition-colors text-sm font-semibold tracking-tight shadow-sm"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Sync Pipeline</span>
              </button>

              <div className="flex items-center space-x-2 bg-white/[0.03] border border-white/[0.08] rounded-full px-3 py-1.5">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]',
                  isConnected ? 'bg-emerald-500 text-emerald-500' : 'bg-red-500 text-red-500'
                )} />
                <span className="text-xs text-zinc-300 font-bold uppercase tracking-widest">
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}