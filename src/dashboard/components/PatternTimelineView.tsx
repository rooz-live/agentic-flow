/**
 * Interactive timeline view for pattern analysis
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  ZoomIn,
  ZoomOut,
  Filter,
  Download,
  Play,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause
} from 'lucide-react';
import { PatternMetric } from '../types/patterns';
import { cn } from '../../utils/cn';

interface PatternTimelineViewProps {
  metrics: PatternMetric[];
  loading?: boolean;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  pattern: string;
  circle: string;
  type: 'success' | 'failure' | 'warning' | 'info';
  title: string;
  description: string;
  details: Record<string, any>;
  economicImpact: number;
}

interface TimeRange {
  start: Date;
  end: Date;
}

export function PatternTimelineView({
  metrics,
  loading = false
}: PatternTimelineViewProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'success' | 'failure' | 'warning'>('all');

  // Process metrics into timeline events
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    const cutoffDate = new Date();
    switch (selectedTimeRange) {
      case '1h':
        cutoffDate.setHours(cutoffDate.getHours() - 1);
        break;
      case '6h':
        cutoffDate.setHours(cutoffDate.getHours() - 6);
        break;
      case '24h':
        cutoffDate.setDate(cutoffDate.getDate() - 1);
        break;
      case '7d':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        break;
    }

    const filteredMetrics = metrics.filter(metric => {
      const metricDate = new Date(metric.ts);
      if (metricDate < cutoffDate) return false;

      if (selectedPatterns.length > 0 && !selectedPatterns.includes(metric.pattern)) {
        return false;
      }

      if (selectedCircles.length > 0 && !selectedCircles.includes(metric.circle)) {
        return false;
      }

      return true;
    });

    filteredMetrics.forEach(metric => {
      // Determine event type based on metrics and status
      let type: TimelineEvent['type'] = 'info';
      let title = metric.pattern;
      let description = `Executed in ${metric.circle} (depth ${metric.depth})`;

      // Analyze the action and mode to determine event type
      if (metric.action?.includes('failed') || metric.mode === 'enforcement' && metric.mutation) {
        type = 'failure';
        title = `${metric.pattern} - Failed`;
        description = `Pattern execution failed in ${metric.circle}`;
      } else if (metric.action?.includes('warning') || metric.tags?.includes('risk')) {
        type = 'warning';
        title = `${metric.pattern} - Warning`;
        description = `Potential issue detected in ${metric.circle}`;
      } else if (metric.mode === 'advisory' || metric.action?.includes('completed')) {
        type = 'success';
        title = `${metric.pattern} - Success`;
        description = `Successfully executed in ${metric.circle}`;
      }

      // Apply filter
      if (filterType !== 'all' && type !== filterType) {
        return;
      }

      const economicImpact = (metric.economic?.cod || 0) + (metric.economic?.wsjf_score || 0);

      events.push({
        id: metric.run_id || `${metric.ts}-${metric.pattern}`,
        timestamp: metric.ts,
        pattern: metric.pattern,
        circle: metric.circle,
        type,
        title,
        description,
        details: {
          mode: metric.mode,
          iteration: metric.iteration,
          depth: metric.depth,
          gate: metric.gate,
          action: metric.action,
          tags: metric.tags,
          metrics: metric.metrics
        },
        economicImpact
      });
    });

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [metrics, selectedTimeRange, selectedPatterns, selectedCircles, filterType]);

  // Get unique patterns and circles for filters
  const uniquePatterns = useMemo(() => {
    return Array.from(new Set(metrics.map(m => m.pattern))).sort();
  }, [metrics]);

  const uniqueCircles = useMemo(() => {
    return Array.from(new Set(metrics.map(m => m.circle))).sort();
  }, [metrics]);

  // Zoom functionality
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  // Get event type styling
  const getEventStyling = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          color: 'bg-green-500',
          border: 'border-green-200',
          background: 'bg-green-50'
        };
      case 'failure':
        return {
          icon: XCircle,
          color: 'bg-red-500',
          border: 'border-red-200',
          background: 'bg-red-50'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'bg-yellow-500',
          border: 'border-yellow-200',
          background: 'bg-yellow-50'
        };
      default:
        return {
          icon: Clock,
          color: 'bg-blue-500',
          border: 'border-blue-200',
          background: 'bg-blue-50'
        };
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) {
      return 'just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Export timeline data
  const exportTimeline = useCallback(() => {
    const data = timelineEvents.map(event => ({
      timestamp: event.timestamp,
      pattern: event.pattern,
      circle: event.circle,
      type: event.type,
      title: event.title,
      description: event.description,
      economicImpact: event.economicImpact,
      ...event.details
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pattern-timeline-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [timelineEvents]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pattern Timeline</h3>
        <div className="space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="w-20 h-4 bg-gray-200 rounded" />
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1 h-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Pattern Execution Timeline</h3>

        <div className="flex items-center space-x-4">
          {/* Time range selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          {/* Filter type selector */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Events</option>
            <option value="success">Success</option>
            <option value="failure">Failures</option>
            <option value="warning">Warnings</option>
          </select>

          {/* Zoom controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Export button */}
          <button
            onClick={exportTimeline}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Advanced filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Advanced Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pattern filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patterns</label>
            <select
              multiple
              value={selectedPatterns}
              onChange={(e) => setSelectedPatterns(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              size={3}
            >
              {uniquePatterns.map(pattern => (
                <option key={pattern} value={pattern}>{pattern}</option>
              ))}
            </select>
          </div>

          {/* Circle filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Circles</label>
            <select
              multiple
              value={selectedCircles}
              onChange={(e) => setSelectedCircles(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              size={3}
            >
              {uniqueCircles.map(circle => (
                <option key={circle} value={circle}>{circle}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedPatterns([]);
            setSelectedCircles([]);
          }}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800"
        >
          Clear filters
        </button>
      </div>

      {/* Timeline */}
      {timelineEvents.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No events found for the selected time range and filters</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {timelineEvents.map((event, index) => {
            const styling = getEventStyling(event.type);
            const Icon = styling.icon;

            return (
              <div
                key={event.id}
                className={cn(
                  "flex items-start space-x-4 p-4 rounded-lg border transition-all hover:shadow-sm",
                  styling.border,
                  styling.background
                )}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'left center' }}
              >
                {/* Timestamp */}
                <div className="w-24 flex-shrink-0 text-sm text-gray-500">
                  {formatTimestamp(event.timestamp)}
                </div>

                {/* Event indicator */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  styling.color
                )}>
                  <Icon className="w-4 h-4 text-white" />
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 truncate">{event.title}</h4>
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded",
                      event.type === 'success' && "bg-green-100 text-green-800",
                      event.type === 'failure' && "bg-red-100 text-red-800",
                      event.type === 'warning' && "bg-yellow-100 text-yellow-800",
                      event.type === 'info' && "bg-blue-100 text-blue-800"
                    )}>
                      {event.type}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{event.description}</p>

                  {showDetails && (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center space-x-4 text-gray-500">
                        <span>Circle: <span className="font-medium text-gray-700">{event.circle}</span></span>
                        <span>Iteration: <span className="font-medium text-gray-700">{event.details.iteration}</span></span>
                        <span>Depth: <span className="font-medium text-gray-700">{event.details.depth}</span></span>
                      </div>

                      {event.economicImpact > 0 && (
                        <div className="text-gray-500">
                          Economic Impact: <span className="font-medium text-gray-700">
                            ${event.economicImpact.toLocaleString()}
                          </span>
                        </div>
                      )}

                      {event.details.tags && event.details.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {event.details.tags.map((tag: string, tagIndex: number) => (
                            <span
                              key={tagIndex}
                              className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <p className="text-gray-600 mb-1">Total Events</p>
            <p className="font-medium text-gray-900">{timelineEvents.length}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-1">Success Rate</p>
            <p className="font-medium text-green-600">
              {timelineEvents.length > 0
                ? `${((timelineEvents.filter(e => e.type === 'success').length / timelineEvents.length) * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-1">Failures</p>
            <p className="font-medium text-red-600">
              {timelineEvents.filter(e => e.type === 'failure').length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-1">Warnings</p>
            <p className="font-medium text-yellow-600">
              {timelineEvents.filter(e => e.type === 'warning').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}