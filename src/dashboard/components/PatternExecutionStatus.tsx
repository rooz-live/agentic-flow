/**
 * Real-time pattern execution status component
 */

import React from 'react';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Zap,
  Layers,
  Activity
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { PatternExecutionStatus as IPatternExecutionStatus } from '../types/patterns';

interface PatternExecutionStatusProps {
  statuses: IPatternExecutionStatus[];
  loading?: boolean;
  maxItems?: number;
}

export function PatternExecutionStatus({
  statuses,
  loading = false,
  maxItems = 10
}: PatternExecutionStatusProps) {
  const displayStatuses = statuses.slice(0, maxItems);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const formatDuration = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();

    if (duration < 60000) {
      return `${Math.floor(duration / 1000)}s`;
    }
    if (duration < 3600000) {
      return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
    }
    return `${Math.floor(duration / 3600000)}h ${Math.floor((duration % 3600000) / 60000)}m`;
  };

  const getProgressBarColor = (progress: number): string => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pattern Execution Status</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-gray-300 rounded-full" />
                  <div className="h-4 bg-gray-300 rounded w-32" />
                </div>
                <div className="h-4 bg-gray-300 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Pattern Execution Status</h3>
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-gray-600">
            {displayStatuses.filter(s => s.status === 'running').length} running
          </span>
        </div>
      </div>

      {displayStatuses.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No active pattern executions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayStatuses.map((status) => (
            <div
              key={status.patternId}
              className={cn(
                'p-4 rounded-lg border transition-all hover:shadow-sm',
                getStatusColor(status.status)
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(status.status)}
                  <div>
                    <p className="font-medium">{status.patternId}</p>
                    <p className="text-sm opacity-75">
                      {status.circle} • Depth {status.depth}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium capitalize">{status.status}</p>
                  <p className="text-xs opacity-75">
                    {formatDuration(status.startTime, status.endTime)}
                  </p>
                </div>
              </div>

              {/* Progress Bar for running patterns */}
              {status.status === 'running' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="opacity-75">Progress</span>
                    <span className="font-medium">{status.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        getProgressBarColor(status.progress)
                      )}
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                  <p className="text-xs mt-1 opacity-75">{status.currentStep}</p>
                </div>
              )}

              {/* Additional Details */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Play className="w-3 h-3" />
                    <span>Started {new Date(status.startTime).toLocaleTimeString()}</span>
                  </div>
                  {status.duration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{status.duration}s</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <Layers className="w-3 h-3" />
                  {/* @ts-expect-error - iteration may not be defined in all status types */}
                  <span>Iteration {status.iteration || 1}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {statuses.length > maxItems && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            +{statuses.length - maxItems} more executions
          </p>
        </div>
      )}
    </div>
  );
}