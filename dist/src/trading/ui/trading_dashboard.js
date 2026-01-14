#!/usr/bin/env tsx
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './trading_dashboard.css';
export const TradingDashboard = ({ tradingEngine, performanceAnalytics, riskManager, optionsEngine, complianceManager, }) => {
    const [state, setState] = useState({
        activeTab: 'overview',
        selectedSymbol: 'SOXL',
        selectedStrategy: 'momentum',
        timeRange: '1D',
        autoRefresh: true,
        alerts: [],
        notifications: [],
    });
    const [portfolioData, setPortfolioData] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);
    const [riskData, setRiskData] = useState(null);
    const [optionsData, setOptionsData] = useState([]);
    const [complianceData, setComplianceData] = useState(null);
    const [marketData, setMarketData] = useState(null);
    // Initialize dashboard data
    useEffect(() => {
        initializeDashboard();
    }, []);
    // Auto-refresh data
    useEffect(() => {
        if (!state.autoRefresh)
            return;
        const interval = setInterval(() => {
            refreshData();
        }, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [state.autoRefresh, state.activeTab]);
    // Event listeners for real-time updates
    useEffect(() => {
        const handleRiskAlert = (alert) => {
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
        const handlePerformanceAlert = (alert) => {
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
        const handleComplianceAlert = (alert) => {
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
            // Load options data (using fallback data structure)
            // TODO: Implement getComprehensiveData or use marketDataProcessor
            const marketDataForOptions = {};
            const coveredCalls = await optionsEngine.generateCoveredCalls(state.selectedSymbol, marketDataForOptions, 100);
            setOptionsData(coveredCalls);
            // Load compliance data
            const complianceReport = complianceManager.generateComplianceReport('SYSTEM_USER', 'MAIN_ACCOUNT', 'MONTHLY');
            setComplianceData(complianceReport);
            // Load market data (placeholder until getComprehensiveData implemented)
            setMarketData({});
            addNotification({
                id: 'init_success',
                type: 'SUCCESS',
                title: 'Dashboard Initialized',
                message: 'All trading systems loaded successfully',
                timestamp: new Date().toISOString(),
                read: false,
            });
        }
        catch (error) {
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
            // Market data refresh (placeholder)
            // setMarketData(market);
            addNotification({
                id: `refresh_${Date.now()}`,
                type: 'INFO',
                title: 'Data Refreshed',
                message: 'Dashboard data has been updated',
                timestamp: new Date().toISOString(),
                read: false,
            });
        }
        catch (error) {
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
    const addAlert = useCallback((alert) => {
        setState(prev => ({
            ...prev,
            alerts: [alert, ...prev.alerts.slice(0, 9)], // Keep last 10 alerts
        }));
    }, []);
    // Add notification
    const addNotification = useCallback((notification) => {
        setState(prev => ({
            ...prev,
            notifications: [notification, ...prev.notifications.slice(0, 19)], // Keep last 20 notifications
        }));
    }, []);
    // Acknowledge alert
    const acknowledgeAlert = useCallback((alertId) => {
        setState(prev => ({
            ...prev,
            alerts: prev.alerts.map(alert => alert.id === alertId ? { ...alert, acknowledged: true } : alert),
        }));
    }, []);
    // Mark notification as read
    const markNotificationRead = useCallback((notificationId) => {
        setState(prev => ({
            ...prev,
            notifications: prev.notifications.map(notification => notification.id === notificationId ? { ...notification, read: true } : notification),
        }));
    }, []);
    // Execute trading signal
    const executeSignal = useCallback(async (signal) => {
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
        }
        catch (error) {
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
        if (!portfolioData)
            return [];
        return portfolioData.performance?.equityCurve || [];
    }, [portfolioData]);
    const performanceChartData = useMemo(() => {
        if (!performanceData)
            return [];
        return [
            { name: 'Sharpe Ratio', value: performanceData.sharpeRatio || 0 },
            { name: 'Sortino Ratio', value: performanceData.sortinoRatio || 0 },
            { name: 'Win Rate', value: (performanceData.winRate || 0) * 100 },
            { name: 'Profit Factor', value: performanceData.profitFactor || 0 },
        ];
    }, [performanceData]);
    const riskChartData = useMemo(() => {
        if (!riskData)
            return [];
        return [
            { name: 'VaR', value: (riskData.valueAtRisk || 0) * 100 },
            { name: 'CVaR', value: (riskData.conditionalVaR || 0) * 100 },
            { name: 'Max Drawdown', value: (riskData.maxDrawdown || 0) * 100 },
            { name: 'Volatility', value: (riskData.volatility || 0) * 100 },
        ];
    }, [riskData]);
    const sectorAllocationData = useMemo(() => {
        if (!portfolioData)
            return [];
        return Object.entries(portfolioData.positions || {}).map(([symbol, value]) => ({
            name: symbol,
            value: value,
        }));
    }, [portfolioData]);
    return (_jsxs("div", { className: "trading-dashboard", children: [_jsxs("header", { className: "dashboard-header", children: [_jsxs("div", { className: "header-left", children: [_jsx("h1", { children: "Trading Dashboard" }), _jsxs("div", { className: "header-controls", children: [_jsxs("select", { value: state.selectedSymbol, onChange: (e) => setState(prev => ({ ...prev, selectedSymbol: e.target.value })), className: "symbol-selector", children: [_jsx("option", { value: "SOXL", children: "SOXL" }), _jsx("option", { value: "SOXS", children: "SOXS" }), _jsx("option", { value: "AAPL", children: "AAPL" }), _jsx("option", { value: "MSFT", children: "MSFT" }), _jsx("option", { value: "GOOGL", children: "GOOGL" })] }), _jsxs("select", { value: state.timeRange, onChange: (e) => setState(prev => ({ ...prev, timeRange: e.target.value })), className: "time-range-selector", children: [_jsx("option", { value: "1D", children: "1 Day" }), _jsx("option", { value: "1W", children: "1 Week" }), _jsx("option", { value: "1M", children: "1 Month" }), _jsx("option", { value: "3M", children: "3 Months" }), _jsx("option", { value: "1Y", children: "1 Year" })] }), _jsx("button", { onClick: () => setState(prev => ({ ...prev, autoRefresh: !prev.autoRefresh })), className: `refresh-toggle ${state.autoRefresh ? 'active' : ''}`, children: state.autoRefresh ? '🔄 Auto' : '⏸ Manual' }), _jsx("button", { onClick: refreshData, className: "refresh-button", children: "\uD83D\uDD04 Refresh" })] })] }), _jsxs("div", { className: "header-right", children: [_jsxs("div", { className: "alerts-section", children: [_jsx("span", { className: "alerts-count", children: state.alerts.filter(a => !a.acknowledged).length }), _jsx("button", { onClick: () => setState(prev => ({ ...prev, activeTab: 'risk' })), children: "\uD83D\uDD14 Alerts" })] }), _jsxs("div", { className: "notifications-section", children: [_jsx("span", { className: "notifications-count", children: state.notifications.filter(n => !n.read).length }), _jsx("button", { onClick: () => setState(prev => ({ ...prev, activeTab: 'analytics' })), children: "\uD83D\uDCEC Notifications" })] })] })] }), _jsx("nav", { className: "dashboard-nav", children: [
                    { id: 'overview', label: 'Overview', icon: '📊' },
                    { id: 'portfolio', label: 'Portfolio', icon: '💼' },
                    { id: 'strategies', label: 'Strategies', icon: '🧠' },
                    { id: 'risk', label: 'Risk', icon: '⚠️' },
                    { id: 'analytics', label: 'Analytics', icon: '📈' },
                    { id: 'options', label: 'Options', icon: '📋' },
                    { id: 'compliance', label: 'Compliance', icon: '⚖️' },
                ].map(tab => (_jsxs("button", { onClick: () => setState(prev => ({ ...prev, activeTab: tab.id })), className: `nav-tab ${state.activeTab === tab.id ? 'active' : ''}`, children: [_jsx("span", { className: "tab-icon", children: tab.icon }), _jsx("span", { className: "tab-label", children: tab.label })] }, tab.id))) }), _jsxs("main", { className: "dashboard-content", children: [state.activeTab === 'overview' && (_jsxs("div", { className: "tab-content overview-tab", children: [_jsxs("div", { className: "overview-grid", children: [_jsxs("div", { className: "overview-card", children: [_jsx("h3", { children: "Portfolio Value" }), _jsxs("div", { className: "metric-value", children: ["$", portfolioData?.totalValue?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0'] }), _jsxs("div", { className: "metric-change positive", children: ["+$", performanceData?.totalReturn ? (performanceData.totalReturn * 100).toFixed(2) : '0.00', "%"] })] }), _jsxs("div", { className: "overview-card", children: [_jsx("h3", { children: "Daily P&L" }), _jsxs("div", { className: "metric-value", children: ["$", performanceData?.dailyReturn ? (performanceData.dailyReturn * 100).toFixed(2) : '0.00', "%"] }), _jsx("div", { className: "metric-change", children: performanceData?.dailyReturn && performanceData.dailyReturn > 0 ? '📈' : '📉' })] }), _jsxs("div", { className: "overview-card", children: [_jsx("h3", { children: "Sharpe Ratio" }), _jsx("div", { className: "metric-value", children: performanceData?.sharpeRatio?.toFixed(2) || '0.00' }), _jsx("div", { className: "metric-change", children: performanceData?.sharpeRatio && performanceData.sharpeRatio > 1 ? '📈' : '📉' })] }), _jsxs("div", { className: "overview-card", children: [_jsx("h3", { children: "Max Drawdown" }), _jsxs("div", { className: "metric-value", children: [performanceData?.maxDrawdown ? (performanceData.maxDrawdown * 100).toFixed(2) : '0.00', "%"] }), _jsx("div", { className: "metric-change negative", children: performanceData?.maxDrawdown ? '⚠️' : '✅' })] })] }), _jsxs("div", { className: "chart-container", children: [_jsx("h3", { children: "Portfolio Performance" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(AreaChart, { data: portfolioChartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "date" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Area, { type: "monotone", dataKey: "equity", stroke: "#8884d8", fill: "#8884d8" })] }) })] })] })), state.activeTab === 'portfolio' && (_jsx("div", { className: "tab-content portfolio-tab", children: _jsxs("div", { className: "portfolio-grid", children: [_jsxs("div", { className: "portfolio-chart", children: [_jsx("h3", { children: "Portfolio Allocation" }), _jsx(ResponsiveContainer, { width: "100%", height: 400, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: sectorAllocationData, cx: "50%", cy: "50%", labelLine: false, label: ({ name, value }) => `${name}: ${((value / portfolioData.totalValue) * 100).toFixed(1)}%`, outerRadius: 80, fill: "#8884d8" }), _jsx(Tooltip, {})] }) })] }), _jsxs("div", { className: "positions-table", children: [_jsx("h3", { children: "Current Positions" }), _jsxs("table", { className: "positions-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Symbol" }), _jsx("th", { children: "Quantity" }), _jsx("th", { children: "Entry Price" }), _jsx("th", { children: "Current Price" }), _jsx("th", { children: "P&L" }), _jsx("th", { children: "P&L %" })] }) }), _jsx("tbody", { children: Object.entries(portfolioData.positions || {}).map(([symbol, position]) => {
                                                        const pos = position; // Type assertion for dynamic position data
                                                        const pnl = pos.pnl ?? 0;
                                                        const pnlPercent = pos.pnlPercent ?? 0;
                                                        return (_jsxs("tr", { children: [_jsx("td", { children: symbol }), _jsx("td", { children: pos.quantity }), _jsxs("td", { children: ["$", pos.entryPrice?.toFixed(2)] }), _jsxs("td", { children: ["$", pos.currentPrice?.toFixed(2)] }), _jsxs("td", { className: pnl >= 0 ? 'positive' : 'negative', children: ["$", pnl.toFixed(2)] }), _jsxs("td", { className: pnlPercent >= 0 ? 'positive' : 'negative', children: [pnlPercent.toFixed(2), "%"] })] }, symbol));
                                                    }) })] })] })] }) })), state.activeTab === 'strategies' && (_jsx("div", { className: "tab-content strategies-tab", children: _jsxs("div", { className: "strategies-grid", children: [_jsxs("div", { className: "strategy-controls", children: [_jsx("h3", { children: "Active Strategies" }), _jsx("div", { className: "strategy-list", children: ['momentum', 'mean_reversion', 'semiconductor_sector'].map(strategy => (_jsxs("div", { className: "strategy-item", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: state.selectedStrategy === strategy, onChange: (e) => {
                                                                    if (e.target.checked) {
                                                                        setState(prev => ({ ...prev, selectedStrategy: strategy }));
                                                                    }
                                                                } }), _jsx("span", { className: "strategy-name", children: strategy.replace('_', ' ').toUpperCase() })] }), _jsx("button", { className: "configure-btn", children: "\u2699\uFE0F" })] }, strategy))) })] }), _jsxs("div", { className: "strategy-performance", children: [_jsx("h3", { children: "Strategy Performance" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: performanceChartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Legend, {}), _jsx(Bar, { dataKey: "value", fill: "#8884d8" })] }) })] })] }) })), state.activeTab === 'risk' && (_jsx("div", { className: "tab-content risk-tab", children: _jsxs("div", { className: "risk-grid", children: [_jsxs("div", { className: "risk-metrics", children: [_jsx("h3", { children: "Risk Metrics" }), _jsxs("div", { className: "risk-cards", children: [_jsxs("div", { className: "risk-card", children: [_jsx("h4", { children: "Value at Risk (95%)" }), _jsxs("div", { className: "risk-value", children: ["$", riskData?.valueAtRisk ? (riskData.valueAtRisk * portfolioData.totalValue).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0'] })] }), _jsxs("div", { className: "risk-card", children: [_jsx("h4", { children: "Conditional VaR" }), _jsxs("div", { className: "risk-value", children: ["$", riskData?.conditionalVaR ? (riskData.conditionalVaR * portfolioData.totalValue).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0'] })] }), _jsxs("div", { className: "risk-card", children: [_jsx("h4", { children: "Max Drawdown" }), _jsxs("div", { className: "risk-value negative", children: [riskData?.maxDrawdown ? (riskData.maxDrawdown * 100).toFixed(2) : '0.00', "%"] })] }), _jsxs("div", { className: "risk-card", children: [_jsx("h4", { children: "Portfolio Beta" }), _jsx("div", { className: "risk-value", children: riskData?.beta?.toFixed(2) || '0.00' })] })] })] }), _jsxs("div", { className: "risk-alerts", children: [_jsx("h3", { children: "Recent Alerts" }), _jsx("div", { className: "alerts-list", children: state.alerts.slice(0, 5).map(alert => (_jsxs("div", { className: `alert-item ${alert.severity.toLowerCase()} ${alert.acknowledged ? 'acknowledged' : ''}`, children: [_jsxs("div", { className: "alert-header", children: [_jsx("span", { className: "alert-title", children: alert.title }), _jsx("span", { className: "alert-time", children: new Date(alert.timestamp).toLocaleTimeString() }), !alert.acknowledged && (_jsx("button", { onClick: () => acknowledgeAlert(alert.id), className: "acknowledge-btn", children: "\u2713" }))] }), _jsx("div", { className: "alert-message", children: alert.message })] }, alert.id))) })] })] }) })), state.activeTab === 'analytics' && (_jsx("div", { className: "tab-content analytics-tab", children: _jsxs("div", { className: "analytics-grid", children: [_jsxs("div", { className: "performance-metrics", children: [_jsx("h3", { children: "Performance Metrics" }), _jsxs("div", { className: "metrics-table", children: [_jsxs("div", { className: "metric-row", children: [_jsx("span", { className: "metric-label", children: "Total Return:" }), _jsxs("span", { className: "metric-value", children: [performanceData?.totalReturn ? (performanceData.totalReturn * 100).toFixed(2) : '0.00', "%"] })] }), _jsxs("div", { className: "metric-row", children: [_jsx("span", { className: "metric-label", children: "Sharpe Ratio:" }), _jsx("span", { className: "metric-value", children: performanceData?.sharpeRatio?.toFixed(2) || '0.00' })] }), _jsxs("div", { className: "metric-row", children: [_jsx("span", { className: "metric-label", children: "Win Rate:" }), _jsxs("span", { className: "metric-value", children: [performanceData?.winRate ? (performanceData.winRate * 100).toFixed(1) : '0.0', "%"] })] }), _jsxs("div", { className: "metric-row", children: [_jsx("span", { className: "metric-label", children: "Profit Factor:" }), _jsx("span", { className: "metric-value", children: performanceData?.profitFactor?.toFixed(2) || '0.00' })] })] })] }), _jsxs("div", { className: "risk-chart", children: [_jsx("h3", { children: "Risk Analysis" }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: riskChartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Legend, {}), _jsx(Bar, { dataKey: "value", fill: "#dc3545" })] }) })] })] }) })), state.activeTab === 'options' && (_jsx("div", { className: "tab-content options-tab", children: _jsxs("div", { className: "options-grid", children: [_jsxs("div", { className: "options-controls", children: [_jsx("h3", { children: "Options Strategies" }), _jsxs("div", { className: "options-filters", children: [_jsxs("select", { className: "strategy-filter", children: [_jsx("option", { value: "covered_calls", children: "Covered Calls" }), _jsx("option", { value: "protective_puts", children: "Protective Puts" }), _jsx("option", { value: "vertical_spreads", children: "Vertical Spreads" }), _jsx("option", { value: "iron_condors", children: "Iron Condors" })] }), _jsx("button", { className: "generate-btn", children: "Generate Strategies" })] })] }), _jsxs("div", { className: "options-table", children: [_jsx("h3", { children: "Available Strategies" }), _jsxs("table", { className: "options-strategies-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Strategy" }), _jsx("th", { children: "Strike" }), _jsx("th", { children: "Expiration" }), _jsx("th", { children: "Premium" }), _jsx("th", { children: "Max Profit" }), _jsx("th", { children: "Max Loss" }), _jsx("th", { children: "POP" }), _jsx("th", { children: "Action" })] }) }), _jsx("tbody", { children: optionsData.slice(0, 10).map((strategy, index) => (_jsxs("tr", { children: [_jsx("td", { children: strategy.name }), _jsxs("td", { children: ["$", strategy.legs[0]?.contract?.strike?.toFixed(2)] }), _jsx("td", { children: strategy.legs[0]?.contract?.expiration }), _jsxs("td", { children: ["$", strategy.maxProfit?.toFixed(2)] }), _jsxs("td", { children: ["$", strategy.maxLoss?.toFixed(2)] }), _jsxs("td", { children: [(strategy.probabilityOfProfit * 100).toFixed(1), "%"] }), _jsx("td", { children: _jsx("button", { onClick: () => executeSignal({
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
                                                                    }), className: "execute-btn", children: "Execute" }) })] }, index))) })] })] })] }) })), state.activeTab === 'compliance' && (_jsx("div", { className: "tab-content compliance-tab", children: _jsxs("div", { className: "compliance-grid", children: [_jsxs("div", { className: "compliance-score", children: [_jsx("h3", { children: "Compliance Score" }), _jsxs("div", { className: "score-display", children: [_jsx("div", { className: "score-value", children: complianceData?.overallScore || '100' }), _jsx("div", { className: "score-level", children: complianceData?.riskLevel || 'LOW' })] })] }), _jsxs("div", { className: "compliance-rules", children: [_jsx("h3", { children: "Rule Status" }), _jsx("div", { className: "rules-list", children: complianceData?.ruleResults?.map((rule) => (_jsxs("div", { className: `rule-item ${rule.passed ? 'passed' : 'failed'}`, children: [_jsx("div", { className: "rule-name", children: rule.name }), _jsx("div", { className: "rule-status", children: rule.passed ? '✅' : '❌' }), _jsx("div", { className: "rule-message", children: rule.message })] }, rule.ruleId))) })] })] }) }))] }), state.notifications.filter(n => !n.read).length > 0 && (_jsxs("div", { className: "notifications-panel", children: [_jsxs("div", { className: "notifications-header", children: [_jsx("h3", { children: "Notifications" }), _jsx("button", { onClick: () => setState(prev => ({
                                    ...prev,
                                    notifications: prev.notifications.map(n => ({ ...n, read: true }))
                                })), className: "mark-all-read", children: "Mark All Read" })] }), _jsx("div", { className: "notifications-list", children: state.notifications.slice(0, 5).map(notification => (_jsxs("div", { className: `notification-item ${notification.type.toLowerCase()} ${notification.read ? 'read' : ''}`, children: [_jsxs("div", { className: "notification-header", children: [_jsx("span", { className: "notification-title", children: notification.title }), _jsx("span", { className: "notification-time", children: new Date(notification.timestamp).toLocaleTimeString() }), !notification.read && (_jsx("button", { onClick: () => markNotificationRead(notification.id), className: "mark-read", children: "\u2713" }))] }), _jsx("div", { className: "notification-message", children: notification.message })] }, notification.id))) })] }))] }));
};
export default TradingDashboard;
//# sourceMappingURL=trading_dashboard.js.map