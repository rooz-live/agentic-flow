#!/usr/bin/env tsx
/**
 * Trading Dashboard and Controls UI
 *
 * Implements comprehensive trading interface:
 * - Dashboard with real-time portfolio and market overview
 * - Trading strategy configuration and backtesting tools
 * - Risk metrics and portfolio health visualization
 * - Alert and notification systems for market events
 * - Mobile-responsive design with VS Code integration
 * - Interactive charts and performance analytics
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ComplianceAlert, ComplianceManager } from '../core/compliance_manager';
import { OptionsStrategy, OptionsStrategyEngine } from '../core/options_strategy_engine';
import { PerformanceAnalytics, PerformanceMetrics } from '../core/performance_analytics';
import { RiskAlert, RiskManager } from '../core/risk_manager';
import { TradingEngine, TradingSignal } from '../core/trading_engine';
import './trading_dashboard.css';

interface DashboardProps {
  tradingEngine: TradingEngine;
  performanceAnalytics: PerformanceAnalytics;
  riskManager: RiskManager;
  optionsEngine: OptionsStrategyEngine;
  complianceManager: ComplianceManager;
}

interface DashboardState {
  activeTab: 'overview' | 'portfolio' | 'strategies' | 'risk' | 'analytics' | 'options' | 'compliance';
  selectedSymbol: string;
  selectedStrategy: string;
  timeRange: '1D' | '1W' | '1M' | '3M' | '1Y';
  autoRefresh: boolean;
  alerts: Alert[];
  notifications: Notification[];
}

interface Alert {
  id: string;
  type: 'RISK' | 'PERFORMANCE' | 'COMPLIANCE' | 'MARKET';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface Notification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export const TradingDashboard: React.FC<DashboardProps> = ({
  tradingEngine,
  performanceAnalytics,
  riskManager,
  optionsEngine,
  complianceManager,
}) => {
  const [state, setState] = useState<DashboardState>({
    activeTab: 'overview',
    selectedSymbol: 'SOXL',
    selectedStrategy: 'momentum',
    timeRange: '1D',
    autoRefresh: true,
    alerts: [],
    notifications: [],
  });

  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);
  const [riskData, setRiskData] = useState<any>(null);
  const [optionsData, setOptionsData] = useState<OptionsStrategy[]>([]);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [marketData, setMarketData] = useState<any>(null);

  // Initialize dashboard data
  useEffect(() => {
    initializeDashboard();
  }, []);

  // Auto-refresh data
  useEffect(() => {
    if (!state.autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [state.autoRefresh, state.activeTab]);

  // Event listeners for real-time updates
  useEffect(() => {
    const handleRiskAlert = (alert: RiskAlert) => {
      addAlert({
        id: alert.id,
        type: 'RISK',
        severity: alert.severity,
        title: `Risk Alert: ${alert.type}`,
        message: alert.message,
        timestamp: alert.timestamp,
        acknowledged: false,
      });
    };

    const handlePerformanceAlert = (alert: any) => {
      addAlert({
        id: `perf_${Date.now()}`,
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        title: 'Performance Alert',
        message: alert.message,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
    };

    const handleComplianceAlert = (alert: ComplianceAlert) => {
      addAlert({
        id: alert.id,
        type: 'COMPLIANCE',
        severity: alert.severity,
        title: `Compliance Alert: ${alert.type}`,
        message: alert.description,
        timestamp: alert.timestamp,
        acknowledged: false,
      });
    };

    riskManager.on('risk_alert', handleRiskAlert);
    performanceAnalytics.on('performance_alert', handlePerformanceAlert);
    complianceManager.on('compliance_alert', handleComplianceAlert);

    return () => {
      riskManager.off('risk_alert', handleRiskAlert);
      performanceAnalytics.off('performance_alert', handlePerformanceAlert);
      complianceManager.off('compliance_alert', handleComplianceAlert);
    };
  }, [riskManager, performanceAnalytics, complianceManager]);

  // Initialize dashboard
  const initializeDashboard = useCallback(async () => {
    try {
      // Load portfolio data
      const portfolio = tradingEngine.getPortfolioStatus();
      setPortfolioData(portfolio);

      // Load performance data
      const performance = performanceAnalytics.getCurrentPerformance();
      setPerformanceData(performance);

      // Load risk data
      const riskMetrics = riskManager.calculatePortfolioRisk(portfolio.positions);
      setRiskData(riskMetrics);

      // Load options data
      const marketDataForOptions = await tradingEngine.getComprehensiveData(state.selectedSymbol);
      const coveredCalls = await optionsEngine.generateCoveredCalls(state.selectedSymbol, marketDataForOptions, 100);
      setOptionsData(coveredCalls);

      // Load compliance data
      const complianceReport = complianceManager.generateComplianceReport('SYSTEM_USER', 'MAIN_ACCOUNT', 'MONTHLY');
      setComplianceData(complianceReport);

      // Load market data
      const market = await tradingEngine.getComprehensiveData(state.selectedSymbol);
      setMarketData(market);

      addNotification({
        id: 'init_success',
        type: 'SUCCESS',
        title: 'Dashboard Initialized',
        message: 'All trading systems loaded successfully',
        timestamp: new Date().toISOString(),
        read: false,
      });
    } catch (error) {
      addNotification({
        id: 'init_error',
        type: 'ERROR',
        title: 'Initialization Error',
        message: `Failed to initialize dashboard: ${error}`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
  }, [tradingEngine, performanceAnalytics, riskManager, optionsEngine, complianceManager, state.selectedSymbol]);

  // Refresh data
  const refreshData = useCallback(async () => {
    try {
      const portfolio = tradingEngine.getPortfolioStatus();
      setPortfolioData(portfolio);

      const performance = performanceAnalytics.getCurrentPerformance();
      setPerformanceData(performance);

      const market = await tradingEngine.getComprehensiveData(state.selectedSymbol);
      setMarketData(market);

      addNotification({
        id: `refresh_${Date.now()}`,
        type: 'INFO',
        title: 'Data Refreshed',
        message: 'Dashboard data has been updated',
        timestamp: new Date().toISOString(),
        read: false,
      });
    } catch (error) {
      addNotification({
        id: `refresh_error_${Date.now()}`,
        type: 'ERROR',
        title: 'Refresh Error',
        message: `Failed to refresh data: ${error}`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
  }, [tradingEngine, performanceAnalytics, state.selectedSymbol]);

  // Add alert
  const addAlert = useCallback((alert: Alert) => {
    setState(prev => ({
      ...prev,
      alerts: [alert, ...prev.alerts.slice(0, 9)], // Keep last 10 alerts
    }));
  }, []);

  // Add notification
  const addNotification = useCallback((notification: Notification) => {
    setState(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications.slice(0, 19)], // Keep last 20 notifications
    }));
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ),
    }));
  }, []);

  // Mark notification as read
  const markNotificationRead = useCallback((notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(notification =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      ),
    }));
  }, []);

  // Execute trading signal
  const executeSignal = useCallback(async (signal: TradingSignal) => {
    try {
      await tradingEngine.executeSignal(signal);
      addNotification({
        id: `exec_${Date.now()}`,
        type: 'SUCCESS',
        title: 'Signal Executed',
        message: `${signal.action} signal for ${signal.symbol} executed successfully`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    } catch (error) {
      addNotification({
        id: `exec_error_${Date.now()}`,
        type: 'ERROR',
        title: 'Execution Error',
        message: `Failed to execute signal: ${error}`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
  }, [tradingEngine]);

  // Memoized chart data
  const portfolioChartData = useMemo(() => {
    if (!portfolioData) return [];

    return portfolioData.performance?.equityCurve || [];
  }, [portfolioData]);

  const performanceChartData = useMemo(() => {
    if (!performanceData) return [];

    return [
      { name: 'Sharpe Ratio', value: performanceData.sharpeRatio || 0 },
      { name: 'Sortino Ratio', value: performanceData.sortinoRatio || 0 },
      { name: 'Win Rate', value: (performanceData.winRate || 0) * 100 },
      { name: 'Profit Factor', value: performanceData.profitFactor || 0 },
    ];
  }, [performanceData]);

  const riskChartData = useMemo(() => {
    if (!riskData) return [];

    return [
      { name: 'VaR', value: (riskData.valueAtRisk || 0) * 100 },
      { name: 'CVaR', value: (riskData.conditionalVaR || 0) * 100 },
      { name: 'Max Drawdown', value: (riskData.maxDrawdown || 0) * 100 },
      { name: 'Volatility', value: (riskData.volatility || 0) * 100 },
    ];
  }, [riskData]);

  const sectorAllocationData = useMemo(() => {
    if (!portfolioData) return [];

    return Object.entries(portfolioData.positions || {}).map(([symbol, value]) => ({
      name: symbol,
      value: value,
    }));
  }, [portfolioData]);

  return (
    <div className="trading-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Trading Dashboard</h1>
          <div className="header-controls">
            <select
              value={state.selectedSymbol}
              onChange={(e) => setState(prev => ({ ...prev, selectedSymbol: e.target.value }))}
              className="symbol-selector"
            >
              <option value="SOXL">SOXL</option>
              <option value="SOXS">SOXS</option>
              <option value="AAPL">AAPL</option>
              <option value="MSFT">MSFT</option>
              <option value="GOOGL">GOOGL</option>
            </select>

            <select
              value={state.timeRange}
              onChange={(e) => setState(prev => ({ ...prev, timeRange: e.target.value as any }))}
              className="time-range-selector"
            >
              <option value="1D">1 Day</option>
              <option value="1W">1 Week</option>
              <option value="1M">1 Month</option>
              <option value="3M">3 Months</option>
              <option value="1Y">1 Year</option>
            </select>

            <button
              onClick={() => setState(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }))}
              className={`refresh-toggle ${state.autoRefresh ? 'active' : ''}`}
            >
              {state.autoRefresh ? '🔄 Auto' : '⏸ Manual'}
            </button>

            <button onClick={refreshData} className="refresh-button">
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="header-right">
          <div className="alerts-section">
            <span className="alerts-count">
              {state.alerts.filter(a => !a.acknowledged).length}
            </span>
            <button onClick={() => setState(prev => ({ ...prev, activeTab: 'risk' }))}>
              🔔 Alerts
            </button>
          </div>

          <div className="notifications-section">
            <span className="notifications-count">
              {state.notifications.filter(n => !n.read).length}
            </span>
            <button onClick={() => setState(prev => ({ ...prev, activeTab: 'analytics' }))}>
              📬 Notifications
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'portfolio', label: 'Portfolio', icon: '💼' },
          { id: 'strategies', label: 'Strategies', icon: '🧠' },
          { id: 'risk', label: 'Risk', icon: '⚠️' },
          { id: 'analytics', label: 'Analytics', icon: '📈' },
          { id: 'options', label: 'Options', icon: '📋' },
          { id: 'compliance', label: 'Compliance', icon: '⚖️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setState(prev => ({ ...prev, activeTab: tab.id as any }))}
            className={`nav-tab ${state.activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Overview Tab */}
        {state.activeTab === 'overview' && (
          <div className="tab-content overview-tab">
            <div className="overview-grid">
              <div className="overview-card">
                <h3>Portfolio Value</h3>
                <div className="metric-value">
                  ${portfolioData?.totalValue?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0'}
                </div>
                <div className="metric-change positive">
                  +${performanceData?.totalReturn ? (performanceData.totalReturn * 100).toFixed(2) : '0.00'}%
                </div>
              </div>

              <div className="overview-card">
                <h3>Daily P&L</h3>
                <div className="metric-value">
                  ${performanceData?.dailyReturn ? (performanceData.dailyReturn * 100).toFixed(2) : '0.00'}%
                </div>
                <div className="metric-change">
                  {performanceData?.dailyReturn && performanceData.dailyReturn > 0 ? '📈' : '📉'}
                </div>
              </div>

              <div className="overview-card">
                <h3>Sharpe Ratio</h3>
                <div className="metric-value">
                  {performanceData?.sharpeRatio?.toFixed(2) || '0.00'}
                </div>
                <div className="metric-change">
                  {performanceData?.sharpeRatio && performanceData.sharpeRatio > 1 ? '📈' : '📉'}
                </div>
              </div>

              <div className="overview-card">
                <h3>Max Drawdown</h3>
                <div className="metric-value">
                  {performanceData?.maxDrawdown ? (performanceData.maxDrawdown * 100).toFixed(2) : '0.00'}%
                </div>
                <div className="metric-change negative">
                  {performanceData?.maxDrawdown ? '⚠️' : '✅'}
                </div>
              </div>
            </div>

            {/* Portfolio Chart */}
            <div className="chart-container">
              <h3>Portfolio Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={portfolioChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="equity" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {state.activeTab === 'portfolio' && (
          <div className="tab-content portfolio-tab">
            <div className="portfolio-grid">
              <div className="portfolio-chart">
                <h3>Portfolio Allocation</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={sectorAllocationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${((value / portfolioData.totalValue) * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="positions-table">
                <h3>Current Positions</h3>
                <table className="positions-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Quantity</th>
                      <th>Entry Price</th>
                      <th>Current Price</th>
                      <th>P&L</th>
                      <th>P&L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(portfolioData.positions || {}).map(([symbol, position]) => (
                      <tr key={symbol}>
                        <td>{symbol}</td>
                        <td>{position.quantity}</td>
                        <td>${position.entryPrice?.toFixed(2)}</td>
                        <td>${position.currentPrice?.toFixed(2)}</td>
                        <td className={position.pnl >= 0 ? 'positive' : 'negative'}>
                          ${position.pnl?.toFixed(2)}
                        </td>
                        <td className={position.pnlPercent >= 0 ? 'positive' : 'negative'}>
                          {position.pnlPercent?.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Strategies Tab */}
        {state.activeTab === 'strategies' && (
          <div className="tab-content strategies-tab">
            <div className="strategies-grid">
              <div className="strategy-controls">
                <h3>Active Strategies</h3>
                <div className="strategy-list">
                  {['momentum', 'mean_reversion', 'semiconductor_sector'].map(strategy => (
                    <div key={strategy} className="strategy-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={state.selectedStrategy === strategy}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setState(prev => ({ ...prev, selectedStrategy: strategy }));
                            }
                          }}
                        />
                        <span className="strategy-name">
                          {strategy.replace('_', ' ').toUpperCase()}
                        </span>
                      </label>
                      <button className="configure-btn">⚙️</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="strategy-performance">
                <h3>Strategy Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Risk Tab */}
        {state.activeTab === 'risk' && (
          <div className="tab-content risk-tab">
            <div className="risk-grid">
              <div className="risk-metrics">
                <h3>Risk Metrics</h3>
                <div className="risk-cards">
                  <div className="risk-card">
                    <h4>Value at Risk (95%)</h4>
                    <div className="risk-value">
                      ${riskData?.valueAtRisk ? (riskData.valueAtRisk * portfolioData.totalValue).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0'}
                    </div>
                  </div>

                  <div className="risk-card">
                    <h4>Conditional VaR</h4>
                    <div className="risk-value">
                      ${riskData?.conditionalVaR ? (riskData.conditionalVaR * portfolioData.totalValue).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0'}
                    </div>
                  </div>

                  <div className="risk-card">
                    <h4>Max Drawdown</h4>
                    <div className="risk-value negative">
                      {riskData?.maxDrawdown ? (riskData.maxDrawdown * 100).toFixed(2) : '0.00'}%
                    </div>
                  </div>

                  <div className="risk-card">
                    <h4>Portfolio Beta</h4>
                    <div className="risk-value">
                      {riskData?.beta?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="risk-alerts">
                <h3>Recent Alerts</h3>
                <div className="alerts-list">
                  {state.alerts.slice(0, 5).map(alert => (
                    <div key={alert.id} className={`alert-item ${alert.severity.toLowerCase()} ${alert.acknowledged ? 'acknowledged' : ''}`}>
                      <div className="alert-header">
                        <span className="alert-title">{alert.title}</span>
                        <span className="alert-time">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="acknowledge-btn"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                      <div className="alert-message">{alert.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {state.activeTab === 'analytics' && (
          <div className="tab-content analytics-tab">
            <div className="analytics-grid">
              <div className="performance-metrics">
                <h3>Performance Metrics</h3>
                <div className="metrics-table">
                  <div className="metric-row">
                    <span className="metric-label">Total Return:</span>
                    <span className="metric-value">
                      {performanceData?.totalReturn ? (performanceData.totalReturn * 100).toFixed(2) : '0.00'}%
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Sharpe Ratio:</span>
                    <span className="metric-value">
                      {performanceData?.sharpeRatio?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Win Rate:</span>
                    <span className="metric-value">
                      {performanceData?.winRate ? (performanceData.winRate * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Profit Factor:</span>
                    <span className="metric-value">
                      {performanceData?.profitFactor?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="risk-chart">
                <h3>Risk Analysis</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#dc3545" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Options Tab */}
        {state.activeTab === 'options' && (
          <div className="tab-content options-tab">
            <div className="options-grid">
              <div className="options-controls">
                <h3>Options Strategies</h3>
                <div className="options-filters">
                  <select className="strategy-filter">
                    <option value="covered_calls">Covered Calls</option>
                    <option value="protective_puts">Protective Puts</option>
                    <option value="vertical_spreads">Vertical Spreads</option>
                    <option value="iron_condors">Iron Condors</option>
                  </select>
                  <button className="generate-btn">Generate Strategies</button>
                </div>
              </div>

              <div className="options-table">
                <h3>Available Strategies</h3>
                <table className="options-strategies-table">
                  <thead>
                    <tr>
                      <th>Strategy</th>
                      <th>Strike</th>
                      <th>Expiration</th>
                      <th>Premium</th>
                      <th>Max Profit</th>
                      <th>Max Loss</th>
                      <th>POP</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optionsData.slice(0, 10).map((strategy, index) => (
                      <tr key={index}>
                        <td>{strategy.name}</td>
                        <td>${strategy.legs[0]?.contract?.strike?.toFixed(2)}</td>
                        <td>{strategy.legs[0]?.contract?.expiration}</td>
                        <td>${strategy.maxProfit?.toFixed(2)}</td>
                        <td>${strategy.maxLoss?.toFixed(2)}</td>
                        <td>{(strategy.probabilityOfProfit * 100).toFixed(1)}%</td>
                        <td>
                          <button
                            onClick={() => executeSignal({
                              id: strategy.id,
                              symbol: strategy.legs[0]?.contract?.symbol || '',
                              strategy: strategy.type,
                              action: 'BUY',
                              confidence: strategy.probabilityOfProfit,
                              price: 0,
                              quantity: 1,
                              timestamp: new Date().toISOString(),
                              indicators: {},
                              reason: strategy.name,
                              riskMetrics: {
                                stopLoss: 0,
                                takeProfit: 0,
                                positionSize: 0,
                                riskRewardRatio: 0,
                              },
                              governance: {
                                patternType: strategy.type,
                                complianceScore: 0.8,
                                riskCategory: 'MEDIUM',
                              },
                            })}
                            className="execute-btn"
                          >
                            Execute
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {state.activeTab === 'compliance' && (
          <div className="tab-content compliance-tab">
            <div className="compliance-grid">
              <div className="compliance-score">
                <h3>Compliance Score</h3>
                <div className="score-display">
                  <div className="score-value">
                    {complianceData?.overallScore || '100'}
                  </div>
                  <div className="score-level">
                    {complianceData?.riskLevel || 'LOW'}
                  </div>
                </div>
              </div>

              <div className="compliance-rules">
                <h3>Rule Status</h3>
                <div className="rules-list">
                  {complianceData?.ruleResults?.map((rule: any) => (
                    <div key={rule.ruleId} className={`rule-item ${rule.passed ? 'passed' : 'failed'}`}>
                      <div className="rule-name">{rule.name}</div>
                      <div className="rule-status">
                        {rule.passed ? '✅' : '❌'}
                      </div>
                      <div className="rule-message">{rule.message}</div>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            </div>
          )}
      </main>

      {/* Notifications Panel */}
      {state.notifications.filter(n => !n.read).length > 0 && (
        <div className="notifications-panel">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <button
              onClick={() => setState(prev => ({
                ...prev,
                notifications: prev.notifications.map(n => ({ ...n, read: true }))
              }))}
              className="mark-all-read"
            >
              Mark All Read
            </button>
          </div>
          <div className="notifications-list">
            {state.notifications.slice(0, 5).map(notification => (
              <div key={notification.id} className={`notification-item ${notification.type.toLowerCase()} ${notification.read ? 'read' : ''}`}>
                <div className="notification-header">
                  <span className="notification-title">{notification.title}</span>
                  <span className="notification-time">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </span>
                  {!notification.read && (
                    <button
                      onClick={() => markNotificationRead(notification.id)}
                      className="mark-read"
                    >
                      ✓
                    </button>
                  )}
                </div>
                <div className="notification-message">{notification.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingDashboard;
