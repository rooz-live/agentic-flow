#!/usr/bin/env tsx
/**
 * Market Data Integration and Processing System
 *
 * Implements comprehensive market data handling:
 * - Real-time market data feeds from multiple sources
 * - Technical analysis with chart patterns and indicators
 * - News and sentiment analysis integration
 * - Economic indicator tracking and analysis
 * - Sector rotation and thematic investment strategies
 * - Data quality validation and cleansing
 */
import { EventEmitter } from 'events';
import { FMPStableClient } from '../integrations/fmp_stable_client';
import { MarketData } from './trading_engine';
export interface TechnicalIndicators {
    sma5: number;
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHist: number;
    stochastic: {
        k: number;
        d: number;
    };
    williamsR: number;
    bollingerBands: {
        upper: number;
        middle: number;
        lower: number;
        width: number;
    };
    atr: number;
    volatility: number;
    volumeRatio: number;
    obv: number;
    vwap: number;
    support: number;
    resistance: number;
    beta: number;
    correlation: number;
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    strength: number;
}
export interface NewsItem {
    id: string;
    title: string;
    content: string;
    source: string;
    url: string;
    timestamp: string;
    sentiment: {
        score: number;
        confidence: number;
        magnitude: number;
    };
    relevance: {
        score: number;
        topics: string[];
    };
}
export interface EconomicIndicator {
    name: string;
    value: number;
    previous: number;
    change: number;
    changePercent: number;
    timestamp: string;
    importance: 'LOW' | 'MEDIUM' | 'HIGH';
    category: 'INFLATION' | 'EMPLOYMENT' | 'GDP' | 'INTEREST_RATE' | 'OTHER';
}
export interface SectorData {
    name: string;
    performance: number;
    momentum: number;
    relativeStrength: number;
    rotationSignal: 'IN' | 'OUT' | 'NEUTRAL';
    etfs: string[];
}
export interface MarketDataConfig {
    updateInterval: number;
    dataSources: string[];
    technicalIndicators: string[];
    sentimentSources: string[];
    economicIndicators: boolean;
    sectorAnalysis: boolean;
    cacheSize: number;
}
export declare class MarketDataProcessor extends EventEmitter {
    private fmpClient;
    private goalieDir;
    private config;
    private isRunning;
    private updateTimer;
    private priceHistory;
    private volumeHistory;
    private highHistory;
    private lowHistory;
    private technicalCache;
    private newsCache;
    private economicData;
    private sectorData;
    constructor(fmpClient: FMPStableClient, config?: Partial<MarketDataConfig>);
    /**
     * Start market data processing
     */
    start(): Promise<void>;
    /**
     * Stop market data processing
     */
    stop(): Promise<void>;
    /**
     * Get comprehensive market data for a symbol
     */
    getComprehensiveData(symbol: string): Promise<MarketData>;
    /**
     * Calculate comprehensive technical indicators
     */
    private calculateTechnicalIndicators;
    /**
     * Calculate Simple Moving Average
     */
    private calculateSMA;
    /**
     * Calculate Exponential Moving Average
     */
    private calculateEMA;
    /**
     * Calculate Relative Strength Index
     */
    private calculateRSI;
    /**
     * Calculate MACD
     */
    private calculateMACD;
    /**
     * Calculate Stochastic Oscillator
     */
    private calculateStochastic;
    /**
     * Calculate Williams %R
     */
    private calculateWilliamsR;
    /**
     * Calculate Bollinger Bands
     */
    private calculateBollingerBands;
    /**
     * Calculate Average True Range
     */
    private calculateATR;
    /**
     * Calculate historical volatility
     */
    private calculateVolatility;
    /**
     * Calculate volume ratio
     */
    private calculateVolumeRatio;
    /**
     * Calculate On-Balance Volume
     */
    private calculateOBV;
    /**
     * Calculate Volume Weighted Average Price
     */
    private calculateVWAP;
    /**
     * Calculate support level
     */
    private calculateSupport;
    /**
     * Calculate resistance level
     */
    private calculateResistance;
    /**
     * Calculate beta (simplified)
     */
    private calculateBeta;
    /**
     * Calculate correlation to market (simplified)
     */
    private calculateCorrelation;
    /**
     * Detect trend direction
     */
    private detectTrend;
    /**
     * Calculate trend strength
     */
    private calculateTrendStrength;
    /**
     * Get sentiment data for a symbol
     */
    private getSentimentData;
    /**
     * Get relevant economic indicators
     */
    private getRelevantEconomicIndicators;
    /**
     * Update price history
     */
    private updatePriceHistory;
    /**
     * Update volume history
     */
    private updateVolumeHistory;
    /**
     * Generate synthetic history for testing
     */
    private generateSyntheticHistory;
    /**
     * Get synthetic indicators for testing
     */
    private getSyntheticIndicators;
    /**
     * Initialize data on startup
     */
    private initializeData;
    /**
     * Update all data periodically
     */
    private updateData;
    /**
     * Load economic indicators
     */
    private loadEconomicIndicators;
    /**
     * Load sector data
     */
    private loadSectorData;
    /**
     * Get sector ETFs
     */
    private getSectorETFs;
    /**
     * Update economic indicators
     */
    private updateEconomicIndicators;
    /**
     * Update sector data
     */
    private updateSectorData;
}
export default MarketDataProcessor;
//# sourceMappingURL=market_data_processor.d.ts.map