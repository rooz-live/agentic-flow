/**
 * Circle-based pattern distribution chart component
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CircleMetrics } from '../types/patterns';

interface CircleDistributionChartProps {
  circleMetrics: CircleMetrics[];
  loading?: boolean;
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316'  // orange
];

export function CircleDistributionChart({
  circleMetrics,
  loading = false
}: CircleDistributionChartProps) {
  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-64 h-64 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (circleMetrics.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-500">No circle data available</p>
        </div>
      </div>
    );
  }

  // Prepare data for the pie chart
  const chartData = circleMetrics.map((circle, index) => ({
    name: circle.name,
    value: circle.totalPatterns,
    activePatterns: circle.activePatterns,
    successRate: circle.successRate,
    economicImpact: circle.totalEconomicImpact,
    color: COLORS[index % COLORS.length]
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">
              Total Patterns: <span className="font-medium text-gray-900">{data.value}</span>
            </p>
            <p className="text-gray-600">
              Active: <span className="font-medium text-gray-900">{data.activePatterns}</span>
            </p>
            <p className="text-gray-600">
              Success Rate: <span className="font-medium text-gray-900">{(data.successRate * 100).toFixed(1)}%</span>
            </p>
            <p className="text-gray-600">
              Economic Impact: <span className="font-medium text-gray-900">
                ${data.economicImpact.toLocaleString()}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label
  const renderCustomLabel = (entry: any) => {
    const percentage = ((entry.value / circleMetrics.reduce((sum, c) => sum + c.totalPatterns, 0)) * 100).toFixed(1);
    return `${percentage}%`;
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value, entry: any) => (
              <span className="text-sm text-gray-700">
                {value} ({entry.payload.value})
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Additional Stats Below Chart */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {circleMetrics.map((circle, index) => (
          <div key={circle.name} className="text-center">
            <div
              className="w-3 h-3 rounded-full mx-auto mb-1"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <p className="text-xs font-medium text-gray-900">{circle.name}</p>
            <p className="text-xs text-gray-600">
              {(circle.successRate * 100).toFixed(1)}% success
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}