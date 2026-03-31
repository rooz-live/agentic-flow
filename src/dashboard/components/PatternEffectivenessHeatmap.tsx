/**
 * Pattern effectiveness heatmap visualization component
 */

import React, { useState, useMemo } from 'react';
import {
  PatternHeatmapData,
  PatternMetric
} from '../types/patterns';
import { cn } from '../../utils/cn';

interface PatternEffectivenessHeatmapProps {
  metrics: PatternMetric[];
  loading?: boolean;
}

interface HeatmapCell {
  pattern: string;
  circle: string;
  effectiveness: number;
  frequency: number;
  economicImpact: number;
  count: number;
}

interface ColorScale {
  min: number;
  max: number;
  colors: string[];
}

export function PatternEffectivenessHeatmap({
  metrics,
  loading = false
}: PatternEffectivenessHeatmapProps) {
  const [selectedMetric, setSelectedMetric] = useState<'effectiveness' | 'frequency' | 'economic'>('effectiveness');
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);

  // Process metrics into heatmap data
  const heatmapData = useMemo(() => {
    const cellMap = new Map<string, HeatmapCell>();
    const patternSet = new Set<string>();
    const circleSet = new Set<string>();

    metrics.forEach(metric => {
      const key = `${metric.pattern}-${metric.circle}`;
      patternSet.add(metric.pattern);
      circleSet.add(metric.circle);

      if (!cellMap.has(key)) {
        cellMap.set(key, {
          pattern: metric.pattern,
          circle: metric.circle,
          effectiveness: 0,
          frequency: 0,
          economicImpact: 0,
          count: 0
        });
      }

      const cell = cellMap.get(key)!;

      // Calculate effectiveness based on success indicators
      const success = metric.mode !== 'enforcement' ||
                    (metric.action && !metric.action.includes('failed'));

      cell.effectiveness = (cell.effectiveness * cell.count + (success ? 1 : 0)) / (cell.count + 1);
      cell.frequency += 1;
      cell.economicImpact += (metric.economic?.cod || 0) + (metric.economic?.wsjf_score || 0);
      cell.count += 1;
    });

    return {
      cells: Array.from(cellMap.values()),
      patterns: Array.from(patternSet).sort(),
      circles: Array.from(circleSet).sort()
    };
  }, [metrics]);

  // Calculate color scale
  const colorScale = useMemo(() => {
    const values = heatmapData.cells.map(cell => {
      switch (selectedMetric) {
        case 'effectiveness':
          return cell.effectiveness;
        case 'frequency':
          return cell.frequency;
        case 'economic':
          return cell.economicImpact;
        default:
          return cell.effectiveness;
      }
    });

    const min = Math.min(...values);
    const max = Math.max(...values);

    // Color schemes for different metrics
    const colors = selectedMetric === 'effectiveness'
      ? ['#FEE2E2', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D']
      : selectedMetric === 'frequency'
      ? ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#92400E']
      : ['#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'];

    return { min, max, colors };
  }, [heatmapData.cells, selectedMetric]);

  // Get color for a value
  const getColor = (value: number): string => {
    const { min, max, colors } = colorScale;
    const normalized = max > min ? (value - min) / (max - min) : 0;
    const index = Math.floor(normalized * (colors.length - 1));
    return colors[Math.max(0, Math.min(index, colors.length - 1))];
  };

  // Format value for display
  const formatValue = (value: number): string => {
    switch (selectedMetric) {
      case 'effectiveness':
        return `${(value * 100).toFixed(1)}%`;
      case 'frequency':
        return value.toString();
      case 'economic':
        return `$${(value / 1000).toFixed(1)}k`;
      default:
        return value.toString();
    }
  };

  // Get cell for pattern-circle combination
  const getCell = (pattern: string, circle: string): HeatmapCell | null => {
    return heatmapData.cells.find(cell => cell.pattern === pattern && cell.circle === circle) || null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pattern Effectiveness Heatmap</h3>
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (heatmapData.patterns.length === 0 || heatmapData.circles.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pattern Effectiveness Heatmap</h3>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500">No pattern data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Pattern Effectiveness Heatmap</h3>

        <div className="flex items-center space-x-4">
          {/* Metric selector */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="effectiveness">Effectiveness</option>
            <option value="frequency">Frequency</option>
            <option value="economic">Economic Impact</option>
          </select>

          {/* Color scale legend */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Low</span>
            <div className="flex space-x-1">
              {colorScale.colors.map((color, index) => (
                <div
                  key={index}
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">High</span>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header row with circle names */}
          <div className="flex border-b border-gray-200 pb-2 mb-2">
            <div className="w-48 flex-shrink-0" />
            {heatmapData.circles.map((circle) => (
              <div
                key={circle}
                className={cn(
                  "flex-1 min-w-20 px-2 text-center text-xs font-medium text-gray-700 cursor-pointer",
                  selectedCircle === circle && "bg-blue-50 rounded"
                )}
                onClick={() => setSelectedCircle(selectedCircle === circle ? null : circle)}
              >
                <div className="transform rotate-0 lg:transform lg:-rotate-45 lg:origin-center lg:mt-4">
                  {circle}
                </div>
              </div>
            ))}
          </div>

          {/* Pattern rows */}
          <div className="space-y-1">
            {heatmapData.patterns.map((pattern) => (
              <div key={pattern} className="flex items-center">
                {/* Pattern name */}
                <div
                  className={cn(
                    "w-48 pr-2 text-sm font-medium text-gray-900 truncate cursor-pointer",
                    selectedPattern === pattern && "bg-blue-50 rounded"
                  )}
                  onClick={() => setSelectedPattern(selectedPattern === pattern ? null : pattern)}
                  title={pattern}
                >
                  {pattern}
                </div>

                {/* Heatmap cells */}
                {heatmapData.circles.map((circle) => {
                  const cell = getCell(pattern, circle);
                  const value = cell ? cell[selectedMetric] : 0;
                  const color = cell ? getColor(value) : '#F9FAFB';
                  const isHighlighted =
                    (selectedPattern && selectedPattern === pattern) ||
                    (selectedCircle && selectedCircle === circle);

                  return (
                    <div
                      key={circle}
                      className={cn(
                        "flex-1 min-w-20 h-8 m-px rounded cursor-pointer border border-gray-200 flex items-center justify-center text-xs font-medium transition-all hover:ring-2 hover:ring-blue-400",
                        isHighlighted && "ring-2 ring-blue-400",
                        !cell && "text-gray-400"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setSelectedPattern(cell ? pattern : null);
                        setSelectedCircle(cell ? circle : null);
                      }}
                      title={cell ? `${pattern} in ${circle}: ${formatValue(value)}` : 'No data'}
                    >
                      {cell && (
                        <span className={cn(
                          "text-xs",
                          (value > (colorScale.max * 0.6)) && "text-white",
                          (value <= (colorScale.max * 0.6)) && "text-gray-800"
                        )}>
                          {selectedMetric === 'effectiveness' ? `${(value * 100).toFixed(0)}%` :
                           selectedMetric === 'frequency' ? value.toString() :
                           `$${(value / 1000).toFixed(0)}k`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed information panel */}
      {selectedPattern && selectedCircle && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-blue-900">
              {selectedPattern} in {selectedCircle}
            </h4>
            <button
              onClick={() => {
                setSelectedPattern(null);
                setSelectedCircle(null);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </div>

          {(() => {
            const cell = getCell(selectedPattern, selectedCircle);
            if (!cell) {
              return <p className="text-sm text-blue-700">No data available for this combination</p>;
            }

            return (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Effectiveness</p>
                  <p className="font-medium text-blue-900">{formatValue(cell.effectiveness)}</p>
                </div>
                <div>
                  <p className="text-blue-700">Frequency</p>
                  <p className="font-medium text-blue-900">{cell.frequency} executions</p>
                </div>
                <div>
                  <p className="text-blue-700">Economic Impact</p>
                  <p className="font-medium text-blue-900">{formatValue(cell.economicImpact)}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Summary statistics */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-600 mb-1">Total Patterns</p>
            <p className="font-medium text-gray-900">{heatmapData.patterns.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-600 mb-1">Total Circles</p>
            <p className="font-medium text-gray-900">{heatmapData.circles.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-600 mb-1">Data Points</p>
            <p className="font-medium text-gray-900">{heatmapData.cells.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}