import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useSovereign } from '../contexts/SovereignContext';

export const TelemetryDashboard: React.FC = () => {
  const { yieldData, goodreadsQuotes } = useSovereign();
  
  return (
    <div className="glass-panel p-5 flex flex-col space-y-6">
      <div className="bg-[#0B0F19] p-5 rounded-lg border border-gray-800 relative overflow-hidden">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Archetype Context: Capital Yield & Arbitrage</h3>
        <blockquote className="text-sm font-mono text-gray-300 italic border-l-2 border-blue-500/50 pl-4 mb-2">
          "{goodreadsQuotes.cfo}"
        </blockquote>
        <blockquote className="text-sm font-mono text-gray-400 italic border-l-2 border-blue-900/50 pl-4 mb-2">
          "{goodreadsQuotes.cfo_sub}"
        </blockquote>
        <p className="text-[10px] text-blue-400 font-mono">- Goodreads Curated Wisdom</p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center">
            <ArrowRightLeft className="w-4 h-4 mr-2" /> The Ultimate Yield Curve
          </h2>
          <div className="flex space-x-3 text-xs font-mono">
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-mesh-danger mr-1"></span>HOLD_NOMINAL</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-mesh-success mr-1"></span>SELL_CASCADE / HARD_LIQUIDATE</span>
          </div>
        </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={yieldData}>
            <defs>
              <linearGradient id="colorZ" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
            <XAxis dataKey="time" stroke="#6B7280" tick={{fontSize: 12}} />
            <YAxis stroke="#6B7280" tick={{fontSize: 12}} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
              itemStyle={{ color: '#E5E7EB' }}
            />
            <Area type="monotone" dataKey="zScore" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorZ)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
};
