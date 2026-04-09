/**
 * Main dashboard layout component with navigation and sidebar
 */

import React, { useState, ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Filter,
  Globe,
  Home,
  Settings,
  TrendingUp,
  Zap,
  Users,
  Map,
  Calendar
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface DashboardLayoutProps {
  children: ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  isConnected: boolean;
  onRefresh: () => void;
}

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'patterns', label: 'Patterns', icon: Activity },
  { id: 'circles', label: 'Circles', icon: Users },
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
  { id: 'economic', label: 'Economic Impact', icon: TrendingUp },
  { id: 'tld', label: 'TLD Domains', icon: Globe },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'heatmap', label: 'Effectiveness Map', icon: Map },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export function DashboardLayout({
  children,
  activeView,
  onViewChange,
  isConnected,
  onRefresh
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={cn(
        'bg-gray-900 text-white transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo and Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-lg font-semibold">Pattern Monitor</h1>
                  <p className="text-xs text-gray-400">Agentic Flow</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded hover:bg-gray-800 transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        'w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Connection Status */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center space-x-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-400' : 'bg-red-400'
              )} />
              {sidebarOpen && (
                <span className="text-xs text-gray-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-semibold text-gray-900 capitalize">
                {navigationItems.find(item => item.id === activeView)?.label || 'Dashboard'}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={onRefresh}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Activity className="w-4 h-4" />
                <span>Refresh</span>
              </button>

              <div className="flex items-center space-x-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                )} />
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Live' : 'Offline'}
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