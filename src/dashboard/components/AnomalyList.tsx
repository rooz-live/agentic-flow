/**
 * Anomaly detection and alerting component
 */

import React from 'react';

import { cn } from '../../utils/cn';
import { AnomalyDetection } from '../types/patterns';
import { AlertTriangle, AlertCircle, AlertOctagon, Info, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react';


interface AnomalyListProps {
  anomalies: AnomalyDetection[];
  loading?: boolean;
  maxItems?: number;
  onResolve?: (id: string) => void;
  onInvestigate?: (id: string) => void;
}

export function AnomalyList({
  anomalies,
  loading = false,
  maxItems = 5,
  onResolve,
  onInvestigate
}: AnomalyListProps) {
  const displayAnomalies = anomalies.slice(0, maxItems);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'investigating':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'active':
      default:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) {
      return 'just now';
    }
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    }
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    }
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Anomalies</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-gray-300 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-300 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-300 rounded w-2/3" />
                  </div>
                </div>
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
        <h3 className="text-lg font-semibold text-gray-900">Recent Anomalies</h3>
        <div className="flex items-center space-x-2">
          {displayAnomalies.filter(a => a.status === 'active').length > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              {displayAnomalies.filter(a => a.status === 'active').length} active
            </span>
          )}
        </div>
      </div>

      {displayAnomalies.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No anomalies detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayAnomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={cn(
                'p-4 rounded-lg border transition-all hover:shadow-sm',
                getSeverityColor(anomaly.severity)
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start space-x-3">
                  {getSeverityIcon(anomaly.severity)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">{anomaly.title}</p>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded',
                        anomaly.severity === 'critical' || anomaly.severity === 'high'
                          ? 'bg-red-100 text-red-800'
                          : anomaly.severity === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      )}>
                        {anomaly.severity}
                      </span>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded',
                        anomaly.type === 'performance' ? 'bg-purple-100 text-purple-800' :
                        anomaly.type === 'economic' ? 'bg-green-100 text-green-800' :
                        anomaly.type === 'system' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {anomaly.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getStatusIcon(anomaly.status)}
                </div>
              </div>

              {/* Affected Patterns */}
              {anomaly.affectedPatterns.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Affected patterns:</p>
                  <div className="flex flex-wrap gap-1">
                    {anomaly.affectedPatterns.map((pattern, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white bg-opacity-60 text-xs rounded"
                      >
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Actions */}
              {anomaly.recommendedActions.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Recommended actions:</p>
                  <ul className="text-xs space-y-1">
                    {anomaly.recommendedActions.slice(0, 2).map((action, index) => (
                      <li key={index} className="flex items-center space-x-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer with actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 border-opacity-50">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(anomaly.timestamp)}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {anomaly.status === 'active' && onInvestigate && (
                    <button
                      onClick={() => onInvestigate(anomaly.id)}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Investigate</span>
                    </button>
                  )}
                  {anomaly.status !== 'resolved' && onResolve && (
                    <button
                      onClick={() => onResolve(anomaly.id)}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {anomalies.length > maxItems && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            +{anomalies.length - maxItems} more anomalies
          </p>
        </div>
      )}
    </div>
  );
}