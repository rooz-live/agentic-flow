#!/usr/bin/env tsx
/**
 * Advanced Options Strategy Implementation Framework
 *
 * Implements comprehensive options trading capabilities:
 * - Covered call writing for income generation
 * - Protective puts for portfolio insurance
 * - Spreads and complex options strategies
 * - Volatility trading strategies (VIX futures, options)
 * - Options pricing models and Greeks calculation
 * - Risk management for options positions
 * - Implied volatility analysis and term structure
 */
import { EventEmitter } from 'events';
import { MarketData } from './trading_engine';
export interface OptionContract {
    symbol: string;
    type: 'CALL' | 'PUT';
    strike: number;
    expiration: string;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    openInterest: number;
    impliedVolatility: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
}
export interface OptionsStrategy {
    id: string;
    name: string;
    type: 'COVERED_CALL' | 'PROTECTIVE_PUT' | 'VERTICAL_SPREAD' | 'IRON_CONDOR' | 'STRADDLE' | 'STRANGLE' | 'BUTTERFLY' | 'CALENDAR';
    legs: OptionLeg[];
    maxProfit: number;
    maxLoss: number;
    breakEvenPoints: number[];
    probabilityOfProfit: number;
    riskRewardRatio: number;
    impliedVolatility: number;
    daysToExpiration: number;
    capitalRequirement: number;
    annualizedReturn: number;
    greeks: {
        delta: number;
        gamma: number;
        theta: number;
        vega: number;
        rho: number;
    };
    recommendations: string[];
}
export interface OptionLeg {
    action: 'BUY' | 'SELL';
    contract: OptionContract;
    quantity: number;
    ratio: number;
}
export interface VolatilitySurface {
    strikes: number[];
    expirations: string[];
    impliedVolatilities: number[][];
    termStructure: {
        expiration: string;
        impliedVolatility: number;
    }[];
    skew: {
        strike: number;
        impliedVolatility: number;
    }[];
}
export interface OptionsConfig {
    maxCapitalPerTrade: number;
    maxDaysToExpiration: number;
    minDaysToExpiration: number;
    targetReturn: number;
    maxRisk: number;
    volatilityThreshold: number;
    probabilityOfProfitMin: number;
    strategies: string[];
}
export declare class OptionsStrategyEngine extends EventEmitter {
    private goalieDir;
    private config;
    private optionsCache;
    private volatilitySurface;
    private riskFreeRate;
    constructor(config?: Partial<OptionsConfig>);
    /**
     * Generate covered call strategies
     */
    generateCoveredCalls(symbol: string, marketData: MarketData, positionSize: number): Promise<OptionsStrategy[]>;
    /**
     * Generate protective put strategies
     */
    generateProtectivePuts(symbol: string, marketData: MarketData, positionSize: number): Promise<OptionsStrategy[]>;
    /**
     * Generate vertical spread strategies
     */
    generateVerticalSpreads(symbol: string, marketData: MarketData, direction: 'BULLISH' | 'BEARISH'): Promise<OptionsStrategy[]>;
    /**
     * Generate iron condor strategies
     */
    generateIronCondors(symbol: string, marketData: MarketData): Promise<OptionsStrategy[]>;
    /**
     * Calculate covered call strategy
     */
    private calculateCoveredCall;
    /**
     * Calculate protective put strategy
     */
    private calculateProtectivePut;
    /**
     * Calculate vertical spread strategy
     */
    private calculateVerticalSpread;
    /**
     * Calculate iron condor strategy
     */
    private calculateIronCondor;
    /**
     * Calculate Black-Scholes option price and Greeks
     */
    calculateBlackScholes(type: 'CALL' | 'PUT', stockPrice: number, strike: number, timeToExpiration: number, volatility: number, riskFreeRate?: number): {
        price: number;
        delta: number;
        gamma: number;
        theta: number;
        vega: number;
        rho: number;
    };
    /**
     * Calculate probability of profit for simple options
     */
    private calculateProbabilityOfProfit;
    /**
     * Calculate probability of profit for spreads
     */
    private calculateSpreadProbability;
    /**
     * Calculate probability of profit for iron condors
     */
    private calculateIronCondorProbability;
    /**
     * Normal cumulative distribution function
     */
    private normalCDF;
    /**
     * Normal probability density function
     */
    private normalPDF;
    /**
     * Error function approximation
     */
    private erf;
    /**
     * Calculate days to expiration
     */
    private calculateDaysToExpiration;
    /**
     * Validate strategy against config constraints
     */
    private validateStrategy;
    /**
     * Generate recommendations for covered calls
     */
    private generateCoveredCallRecommendations;
    /**
     * Generate recommendations for protective puts
     */
    private generateProtectivePutRecommendations;
    /**
     * Generate recommendations for vertical spreads
     */
    private generateVerticalSpreadRecommendations;
    /**
     * Generate recommendations for iron condors
     */
    private generateIronCondorRecommendations;
    /**
     * Get options chain for a symbol
     */
    private getOptionsChain;
    /**
     * Log strategy generation
     */
    private logStrategyGeneration;
}
export default OptionsStrategyEngine;
//# sourceMappingURL=options_strategy_engine.d.ts.map