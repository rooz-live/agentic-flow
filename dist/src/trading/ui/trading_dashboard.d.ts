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
import React from 'react';
import { ComplianceManager } from '../core/compliance_manager';
import { OptionsStrategyEngine } from '../core/options_strategy_engine';
import { PerformanceAnalytics } from '../core/performance_analytics';
import { RiskManager } from '../core/risk_manager';
import { TradingEngine } from '../core/trading_engine';
import './trading_dashboard.css';
interface DashboardProps {
    tradingEngine: TradingEngine;
    performanceAnalytics: PerformanceAnalytics;
    riskManager: RiskManager;
    optionsEngine: OptionsStrategyEngine;
    complianceManager: ComplianceManager;
}
export declare const TradingDashboard: React.FC<DashboardProps>;
export default TradingDashboard;
//# sourceMappingURL=trading_dashboard.d.ts.map