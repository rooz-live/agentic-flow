#!/usr/bin/env tsx
/**
 * SOXL/SOXS Neural Trading System
 * WSJF Priority 4: Trading system analysis
 *
 * Features:
 * - Real-time quote fetching via FMP Stable API
 * - Technical indicator calculation (RSI, MACD, Bollinger Bands)
 * - Neural signal generation (BUY/SELL/HOLD)
 * - Portfolio optimization for SOXL/SOXS pair
 * - Pattern metrics emission for all trades
 *
 * Semiconductor ETFs:
 * - SOXL: Direxion Daily Semiconductor Bull 3X Shares (leveraged long)
 * - SOXS: Direxion Daily Semiconductor Bear 3X Shares (leveraged short)
 */
interface TechnicalIndicators {
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHist: number;
    bb_upper: number;
    bb_middle: number;
    bb_lower: number;
    volume_ratio: number;
}
interface TradingSignal {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    price: number;
    timestamp: string;
    indicators: TechnicalIndicators;
    reason: string;
}
interface PortfolioAllocation {
    soxl_pct: number;
    soxs_pct: number;
    cash_pct: number;
    expected_return: number;
    risk_score: number;
    sharpe_ratio: number;
}
export declare class SOXLSOXSTrader {
    private fmpClient;
    private goalieDir;
    private priceHistory;
    constructor(fmpApiKey?: string);
    /**
     * Calculate RSI (Relative Strength Index)
     */
    private calculateRSI;
    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     */
    private calculateMACD;
    /**
     * Calculate Bollinger Bands
     */
    private calculateBollingerBands;
    /**
     * Calculate technical indicators for a symbol
     */
    private calculateIndicators;
    /**
     * Generate trading signal using neural heuristics
     */
    private generateSignal;
    /**
     * Optimize portfolio allocation for SOXL/SOXS
     */
    optimizePortfolio(soxlSignal: TradingSignal, soxsSignal: TradingSignal): PortfolioAllocation;
    /**
     * Log trading signal to .goalie/
     */
    private logSignal;
    /**
     * Analyze SOXL/SOXS and generate trading signals
     */
    analyze(): Promise<{
        soxlSignal: TradingSignal;
        soxsSignal: TradingSignal;
        portfolio: PortfolioAllocation;
    }>;
    /**
     * Backtest strategy (placeholder for future implementation)
     */
    backtest(startDate: string, endDate: string): Promise<void>;
}
export default SOXLSOXSTrader;
//# sourceMappingURL=soxl_soxs_trader.d.ts.map