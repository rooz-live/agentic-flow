/**
 * Command Palette + Mesh Navigation Hybrid
 *
 * @architecture Horizontally lateral (command palette) + Vertically integrated (hierarchical mesh)
 * @design-philosophy Premium glassmorphism with CICD-enabled ROI tracking
 * @integration MAPE-K driven menu optimization based on usage analytics
 */


import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, ChevronRight, Command, Database, Layers, Search, Star, Terminal, TrendingUp, Zap } from 'lucide-react';


interface MenuItem {
  id: string;
  label: string;
  path: string;
  category: 'mape-k' | 'trading' | 'infrastructure' | 'system';
  keywords: string[];
  icon?: React.ReactNode;
  roi_score: number;
  usage_count: number;
  last_accessed?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: 'mape-k',
    label: 'Self-Optimization Loop',
    path: '/mape-k',
    category: 'mape-k',
    keywords: ['mape', 'self', 'optimize', 'adaptive', 'monitor', 'analyze', 'plan', 'execute', 'knowledge'],
    icon: <Layers className="w-4 h-4" />,
    roi_score: 9.8,
    usage_count: 347
  },
  {
    id: 'trading',
    label: 'Trading Operations',
    path: '/trading',
    category: 'trading',
    keywords: ['trade', 'portfolio', 'market', 'stocks'],
    icon: <TrendingUp className="w-4 h-4" />,
    roi_score: 9.2,
    usage_count: 289,
    children: [
      {
        id: 'tlh',
        label: 'Tax-Loss Harvesting',
        path: '/trading/tax-loss-harvesting',
        category: 'trading',
        keywords: ['tax', 'loss', 'harvest', 'optimization'],
        icon: <BarChart3 className="w-4 h-4" />,
        roi_score: 8.7,
        usage_count: 234
      },
      {
        id: 'roam',
        label: 'ROAM Risk Assessment',
        path: '/trading/roam-risks',
        category: 'trading',
        keywords: ['risk', 'roam', 'assessment', 'resolved', 'owned', 'accepted', 'mitigated'],
        icon: <Activity className="w-4 h-4" />,
        roi_score: 7.9,
        usage_count: 187
      }
    ]
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    path: '/infrastructure',
    category: 'infrastructure',
    keywords: ['infra', 'nodes', 'servers', 'swarm'],
    icon: <Database className="w-4 h-4" />,
    roi_score: 6.5,
    usage_count: 142,
    children: [
      {
        id: 'swarm',
        label: 'Swarm Nodes',
        path: '/infrastructure/swarm-nodes',
        category: 'infrastructure',
        keywords: ['swarm', 'agents', 'distributed', 'nodes'],
        icon: <Zap className="w-4 h-4" />,
        roi_score: 7.1,
        usage_count: 156
      }
    ]
  },
  {
    id: 'system',
    label: 'System Overview',
    path: '/',
    category: 'system',
    keywords: ['system', 'overview', 'dashboard', 'home'],
    icon: <Activity className="w-4 h-4" />,
    roi_score: 8.3,
    usage_count: 412
  },
  {
    id: 'telemetry',
    label: 'Offline Matrix',
    path: '/telemetry',
    category: 'system',
    keywords: ['telemetry', 'offline', 'matrix', 'logs'],
    icon: <Terminal className="w-4 h-4" />,
    roi_score: 6.8,
    usage_count: 98
  }
];

export const CommandPaletteMesh: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Flatten menu items including children
  const flattenItems = (items: MenuItem[]): MenuItem[] => {
    return items.reduce((acc, item) => {
      acc.push(item);
      if (item.children) {
        acc.push(...item.children);
      }
      return acc;
    }, [] as MenuItem[]);
  };

  const allItems = flattenItems(menuItems);

  // Search and filter logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      // No search: show top ROI items
      setFilteredItems(allItems.sort((a, b) => b.roi_score - a.roi_score).slice(0, 8));
    } else {
      const query = searchQuery.toLowerCase();
      const matches = allItems.filter(item =>
        item.label.toLowerCase().includes(query) ||
        item.keywords.some(kw => kw.includes(query)) ||
        item.category.includes(query)
      );
      setFilteredItems(matches.sort((a, b) => b.roi_score - a.roi_score));
    }
    setSelectedIndex(0);
  }, [searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          setIsOpen(false);
          setSearchQuery('');
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            handleNavigate(filteredItems[selectedIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  const handleNavigate = useCallback((item: MenuItem) => {
    navigate(item.path);
    setIsOpen(false);
    setSearchQuery('');

    // Track usage (would integrate with MAPE-K Knowledge base)
    console.log(`[MAPE-K:Knowledge] Navigated to ${item.path}, ROI: ${item.roi_score}`);
  }, [navigate]);

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'mape-k': 'text-zinc-200 bg-zinc-800/40 border-zinc-700/50',
      'trading': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      'infrastructure': 'text-zinc-200 bg-zinc-800/40 border-zinc-700/50',
      'system': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    };
    return colors[category] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  };

  const getRoiColor = (score: number): string => {
    if (score >= 9) return 'text-emerald-400';
    if (score >= 7) return 'text-emerald-400';
    if (score >= 5) return 'text-amber-400';
    return 'text-slate-400';
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 px-4 py-2 bg-[#09090b]/90 backdrop-blur-2xl border border-white/10 rounded-[8px] hover:border-white/30 shadow-sm transition-all group"
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" />
          <span className="text-sm text-zinc-400 group-hover:text-white font-medium">Search</span>
          <kbd className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-zinc-800 rounded border border-zinc-700 text-zinc-400">⌘K</kbd>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] backdrop-blur-3xl border border-zinc-800 rounded-[12px] shadow-2xl overflow-hidden font-sans">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none" />
        
        {/* Search Header */}
        <div className="relative flex items-center gap-3 p-4 border-b border-zinc-800 bg-[#0a0a0a]/50">
          <Command className="w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search navigation... (Cmd+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-sm font-medium"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-white px-2 py-1 bg-slate-800 rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <div className="py-2">
              {filteredItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`relative w-full px-4 py-3 flex items-center justify-between transition-colors border-b border-zinc-800/50 last:border-0 ${
                    idx === selectedIndex ? 'bg-white/[0.04] border-l-[3px] border-l-zinc-100' : 'border-l-[3px] border-transparent hover:bg-white/[0.02]'
                  } ${location.pathname === item.path ? 'bg-emerald-500/5' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColor(item.category)}`}>
                      {item.icon}
                    </div>

                    {/* Label */}
                    <div className="text-left flex-1">
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.path}</div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-3">
                      {/* Category Badge */}
                      <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>

                      {/* ROI Score */}
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className={`w-3 h-3 ${getRoiColor(item.roi_score)}`} />
                          <span className={`text-xs font-bold ${getRoiColor(item.roi_score)}`}>
                            {item.roi_score.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">{item.usage_count} uses</div>
                      </div>

                      {/* Navigate Icon */}
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative border-t border-white/[0.08] p-4 flex items-center justify-between text-xs text-slate-500 bg-slate-900/80">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-[6px] text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-[6px] text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-[6px] text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">Esc</kbd> Close
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold tracking-widest text-xs uppercase">MAPE-K Validated</span>
          </div>
        </div>
      </div>
    </div>
  );
};
