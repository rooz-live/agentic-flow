/**
 * Economic metrics dashboard for COD/WSJF visualization
 */

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { PatternMetric, TimeSeriesData } from '../types/patterns';
import { cn } from '../../utils/cn';

interface EconomicMetricsDashboardProps {
  metrics: PatternMetric[];
  loading?: boolean;
}

interface EconomicTrendData {
  timestamp: string;
  cod: number;
  wsjf_score: number;
  total_value: number;
  pattern_count: number;
}

export function EconomicMetricsDashboard({
  metrics,
  loading = false
}: EconomicMetricsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [selectedCircle, setSelectedCircle] = useState<string>('all');

  // Process metrics for economic visualization
  const economicData = useMemo(() => {
    if (!metrics.length) return [];

    const filtered = metrics.filter(metric => {
      const metricDate = new Date(metric.ts);
      const now = new Date();
      let cutoffDate: Date;

      switch (timeRange) {
        case '24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      return metricDate >= cutoffDate &&
             (selectedCircle === 'all' || metric.circle === selectedCircle);
    });

    // Group by hour/day and aggregate economic metrics
    const grouped = new Map<string, EconomicTrendData>();

    filtered.forEach(metric => {
      const date = new Date(metric.ts);
      const key = timeRange === '24h'
        ? date.toLocaleString('en-US', { hour: 'numeric', hour12: false })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (!grouped.has(key)) {
        grouped.set(key, {
          timestamp: key,
          cod: 0,
          wsjf_score: 0,
          total_value: 0,
          pattern_count: 0
        });
      }

      const existing = grouped.get(key)!;
      existing.cod += metric.economic.cod || 0;
      existing.wsjf_score += metric.economic.wsjf_score || 0;
      existing.total_value += (metric.economic.cod || 0) + (metric.economic.wsjf_score || 0);
      existing.pattern_count += 1;
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );
  }, [metrics, timeRange, selectedCircle]);

  // Calculate economic statistics
  const economicStats = useMemo(() => {
    if (!economicData.length) {
      return {
        totalCod: 0,
        totalWsjf: 0,
        averageCod: 0,
        averageWsjf: 0,
        codTrend: 'neutral' as 'up' | 'down' | 'neutral',
        wsjfTrend: 'neutral' as 'up' | 'down' | 'neutral'
      };
    }

    const totalCod = economicData.reduce((sum, d) => sum + d.cod, 0);
    const totalWsjf = economicData.reduce((sum, d) => sum + d.wsjf_score, 0);
    const averageCod = totalCod / economicData.length;
    const averageWsjf = totalWsjf / economicData.length;

    // Calculate trends
    const recentData = economicData.slice(-3);
    const previousData = economicData.slice(-6, -3);

    const recentAvgCod = recentData.reduce((sum, d) => sum + d.cod, 0) / recentData.length;
    const previousAvgCod = previousData.length > 0
      ? previousData.reduce((sum, d) => sum + d.cod, 0) / previousData.length
      : recentAvgCod;

    const recentAvgWsjf = recentData.reduce((sum, d) => sum + d.wsjf_score, 0) / recentData.length;
    const previousAvgWsjf = previousData.length > 0
      ? previousData.reduce((sum, d) => sum + d.wsjf_score, 0) / previousData.length
      : recentAvgWsjf;

    return {
      totalCod,
      totalWsjf,
      averageCod,
      averageWsjf,
      codTrend: recentAvgCod > previousAvgCod ? 'up' : recentAvgCod < previousAvgCod ? 'down' : 'neutral',
      wsjfTrend: recentAvgWsjf > previousAvgWsjf ? 'up' : recentAvgWsjf < previousAvgWsjf ? 'down' : 'neutral'
    };
  }, [economicData]);

  // Circle breakdown for economic impact
  const circleBreakdown = useMemo(() => {
    const circleData = new Map<string, { cod: number; wsjf: number; count: number }>();

    metrics
      .filter(metric => selectedCircle === 'all' || metric.circle === selectedCircle)
      .forEach(metric => {
        if (!circleData.has(metric.circle)) {
          circleData.set(metric.circle, { cod: 0, wsjf: 0, count: 0 });
        }

        const existing = circleData.get(metric.circle)!;
        existing.cod += metric.economic.cod || 0;
        existing.wsjf += metric.economic.wsjf_score || 0;
        existing.count += 1;
      });

    return Array.from(circleData.entries())
      .map(([circle, data]) => ({
        circle,
        ...data,
        total: data.cod + data.wsjf
      }))
      .sort((a, b) => b.total - a.total);
  }, [metrics, selectedCircle]);

  // Get unique circles for filter
  const uniqueCircles = useMemo(() => {
    return Array.from(new Set(metrics.map(m => m.circle))).sort();
  }, [metrics]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              COD: <span className="font-medium">{formatCurrency(payload[0].value)}</span>
            </p>
            <p className="text-green-600">
              WSJF: <span className="font-medium">{formatCurrency(payload[1].value)}</span>
            </p>
            <p className="text-purple-600">
              Total Value: <span className="font-medium">
                {formatCurrency((payload[0].value || 0) + (payload[1].value || 0))}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCircle}
              onChange={(e) => setSelectedCircle(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Circles</option>
              {uniqueCircles.map(circle => (
                <option key={circle} value={circle}>{circle}</option>
              ))}
            </select>
          </div>

          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Economic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total COD</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(economicStats.totalCod)}
            </span>
            {economicStats.codTrend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
            {economicStats.codTrend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Avg: {formatCurrency(economicStats.averageCod)}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total WSJF</span>
            <BarChart3 className="w-4 h-4 text-green-500" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(economicStats.totalWsjf)}
            </span>
            {economicStats.wsjfTrend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
            {economicStats.wsjfTrend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Avg: {formatCurrency(economicStats.averageWsjf)}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Economic Value</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(economicStats.totalCod + economicStats.totalWsjf)}
          </span>
          <p className="text-xs text-gray-500 mt-1">
            Across {economicData.length} time periods
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Value per Pattern</span>
            <DollarSign className="w-4 h-4 text-yellow-500" />
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(
              economicData.length > 0
                ? (economicStats.totalCod + economicStats.totalWsjf) / economicData.reduce((sum, d) => sum + d.pattern_count, 0)
                : 0
            )}
          </span>
          <p className="text-xs text-gray-500 mt-1">
            Average economic impact
          </p>
        </div>
      </div>

      {/* Economic Trends Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Economic Trends Over Time</h3>
        <div className="h-80">
          {economicData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={economicData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => timeRange === '24h' ? `${value}:00` : value}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cod"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  name="COD"
                />
                <Area
                  type="monotone"
                  dataKey="wsjf_score"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="WSJF"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No economic data available for selected period</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Circle Economic Impact Breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Circle Economic Impact</h3>
        <div className="h-80">
          {circleBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={circleBreakdown} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="circle"
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'cod' ? 'COD' : name === 'wsjf' ? 'WSJF' : 'Total'
                  ]}
                />
                <Legend />
                <Bar dataKey="cod" stackId="a" fill="#3B82F6" name="COD" />
                <Bar dataKey="wsjf" stackId="a" fill="#10B981" name="WSJF" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No circle data available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}