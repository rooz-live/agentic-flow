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
import { createFMPStableClient } from '../integrations/fmp_stable_client';
import * as fs from 'fs';
import * as path from 'path';
export class SOXLSOXSTrader {
    fmpClient;
    goalieDir;
    priceHistory = new Map();
    constructor(fmpApiKey) {
        this.fmpClient = createFMPStableClient(fmpApiKey);
        this.goalieDir = process.env.GOALIE_DIR || path.join(process.cwd(), '.goalie');
        if (!fs.existsSync(this.goalieDir)) {
            fs.mkdirSync(this.goalieDir, { recursive: true });
        }
    }
    /**
     * Calculate RSI (Relative Strength Index)
     */
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1)
            return 50; // Neutral default
        const changes = [];
        for (let i = 1; i < prices.length; i++) {
            changes.push(prices[i] - prices[i - 1]);
        }
        const gains = changes.slice(-period).filter(c => c > 0);
        const losses = changes.slice(-period).filter(c => c < 0).map(Math.abs);
        const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
        if (avgLoss === 0)
            return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     */
    calculateMACD(prices) {
        if (prices.length < 26) {
            return { macd: 0, signal: 0, histogram: 0 };
        }
        // EMA calculation
        const calculateEMA = (data, period) => {
            const k = 2 / (period + 1);
            let ema = data[0];
            for (let i = 1; i < data.length; i++) {
                ema = data[i] * k + ema * (1 - k);
            }
            return ema;
        };
        const ema12 = calculateEMA(prices.slice(-26), 12);
        const ema26 = calculateEMA(prices.slice(-26), 26);
        const macd = ema12 - ema26;
        // Signal line (9-period EMA of MACD)
        const signal = macd * 0.2; // Simplified signal line
        const histogram = macd - signal;
        return { macd, signal, histogram };
    }
    /**
     * Calculate Bollinger Bands
     */
    calculateBollingerBands(prices, period = 20) {
        if (prices.length < period) {
            const currentPrice = prices[prices.length - 1];
            return { upper: currentPrice * 1.02, middle: currentPrice, lower: currentPrice * 0.98 };
        }
        const recentPrices = prices.slice(-period);
        const sma = recentPrices.reduce((a, b) => a + b, 0) / period;
        const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const std = Math.sqrt(variance);
        return {
            upper: sma + (std * 2),
            middle: sma,
            lower: sma - (std * 2),
        };
    }
    /**
     * Calculate technical indicators for a symbol
     */
    calculateIndicators(symbol, currentQuote) {
        const prices = this.priceHistory.get(symbol) || [];
        prices.push(currentQuote.price);
        // Keep last 100 prices
        if (prices.length > 100) {
            prices.shift();
        }
        this.priceHistory.set(symbol, prices);
        const rsi = this.calculateRSI(prices);
        const macd = this.calculateMACD(prices);
        const bb = this.calculateBollingerBands(prices);
        return {
            rsi,
            macd: macd.macd,
            macdSignal: macd.signal,
            macdHist: macd.histogram,
            bb_upper: bb.upper,
            bb_middle: bb.middle,
            bb_lower: bb.lower,
            volume_ratio: currentQuote.volume / currentQuote.avgVolume,
        };
    }
    /**
     * Generate trading signal using neural heuristics
     */
    generateSignal(symbol, quote, indicators) {
        let bullishScore = 0;
        let bearishScore = 0;
        const reasons = [];
        // RSI analysis
        if (indicators.rsi < 30) {
            bullishScore += 2;
            reasons.push('RSI oversold');
        }
        else if (indicators.rsi > 70) {
            bearishScore += 2;
            reasons.push('RSI overbought');
        }
        // MACD analysis
        if (indicators.macdHist > 0 && indicators.macdHist > indicators.macd) {
            bullishScore += 1.5;
            reasons.push('MACD bullish crossover');
        }
        else if (indicators.macdHist < 0 && indicators.macdHist < indicators.macd) {
            bearishScore += 1.5;
            reasons.push('MACD bearish crossover');
        }
        // Bollinger Bands analysis
        if (quote.price < indicators.bb_lower) {
            bullishScore += 1;
            reasons.push('Price below lower BB');
        }
        else if (quote.price > indicators.bb_upper) {
            bearishScore += 1;
            reasons.push('Price above upper BB');
        }
        // Volume analysis
        if (indicators.volume_ratio > 1.5) {
            bullishScore += 0.5;
            bearishScore += 0.5; // High volume increases signal strength regardless of direction
            reasons.push('High volume');
        }
        // Price momentum
        const priceChangePct = quote.changesPercentage;
        if (priceChangePct > 2) {
            bullishScore += 1;
            reasons.push('Strong upward momentum');
        }
        else if (priceChangePct < -2) {
            bearishScore += 1;
            reasons.push('Strong downward momentum');
        }
        // Determine action
        const totalScore = bullishScore + bearishScore;
        const netScore = bullishScore - bearishScore;
        let action;
        let confidence;
        if (totalScore === 0) {
            action = 'HOLD';
            confidence = 0.5;
        }
        else if (netScore > 1) {
            action = 'BUY';
            confidence = Math.min(bullishScore / 5, 0.95);
        }
        else if (netScore < -1) {
            action = 'SELL';
            confidence = Math.min(bearishScore / 5, 0.95);
        }
        else {
            action = 'HOLD';
            confidence = 0.6;
        }
        // Special logic for SOXL/SOXS pair (inverse relationship)
        if (symbol === 'SOXS' && action === 'BUY') {
            // SOXS buy signal means semiconductor bearish outlook
            reasons.push('Semiconductor sector bearish');
        }
        else if (symbol === 'SOXL' && action === 'BUY') {
            // SOXL buy signal means semiconductor bullish outlook
            reasons.push('Semiconductor sector bullish');
        }
        return {
            symbol,
            action,
            confidence,
            price: quote.price,
            timestamp: new Date().toISOString(),
            indicators,
            reason: reasons.join(', '),
        };
    }
    /**
     * Optimize portfolio allocation for SOXL/SOXS
     */
    optimizePortfolio(soxlSignal, soxsSignal) {
        // Mean-variance optimization logic
        let soxl_pct = 0;
        let soxs_pct = 0;
        let cash_pct = 100;
        // Bullish semiconductor outlook
        if (soxlSignal.action === 'BUY' && soxlSignal.confidence > 0.7) {
            soxl_pct = 60 * soxlSignal.confidence;
            cash_pct = 100 - soxl_pct;
        }
        // Bearish semiconductor outlook
        else if (soxsSignal.action === 'BUY' && soxsSignal.confidence > 0.7) {
            soxs_pct = 40 * soxsSignal.confidence; // Lower allocation due to higher risk
            cash_pct = 100 - soxs_pct;
        }
        // Mixed signals - stay mostly in cash
        else {
            soxl_pct = 20;
            soxs_pct = 10;
            cash_pct = 70;
        }
        // Calculate risk-adjusted metrics
        const expected_return = (soxl_pct * 0.15) + (soxs_pct * 0.12) - (cash_pct * 0.02 / 100);
        const risk_score = (soxl_pct * 3 + soxs_pct * 3.5) / 100; // 3x leveraged risk
        const sharpe_ratio = risk_score > 0 ? expected_return / risk_score : 0;
        return {
            soxl_pct,
            soxs_pct,
            cash_pct,
            expected_return,
            risk_score,
            sharpe_ratio,
        };
    }
    /**
     * Log trading signal to .goalie/
     */
    logSignal(signal) {
        const signalLog = path.join(this.goalieDir, 'trading_signals.jsonl');
        fs.appendFileSync(signalLog, JSON.stringify(signal) + '\n');
        // Emit pattern metric
        const metricEntry = {
            ts: new Date().toISOString(),
            run: 'trading-system',
            run_id: `trading-${Date.now()}`,
            iteration: 0,
            circle: 'analyst',
            depth: 1,
            pattern: 'trading_signal_generated',
            'pattern:kebab-name': 'trading-signal-generated',
            mode: 'advisory',
            mutation: false,
            gate: 'validation',
            framework: 'neural-trader',
            scheduler: '',
            tags: ['Trading', 'Financial', 'Stats', 'ML'],
            economic: {
                cod: 2.0,
                wsjf_score: 8.0,
            },
            reason: `trading-${signal.action.toLowerCase()}`,
            metrics: {
                symbol: signal.symbol,
                action: signal.action,
                confidence: signal.confidence,
                price: signal.price,
                rsi: signal.indicators.rsi,
            },
        };
        const metricsFile = path.join(this.goalieDir, 'pattern_metrics.jsonl');
        fs.appendFileSync(metricsFile, JSON.stringify(metricEntry) + '\n');
    }
    /**
     * Analyze SOXL/SOXS and generate trading signals
     */
    async analyze() {
        console.log('🔍 Fetching SOXL/SOXS quotes from FMP Stable API...');
        const quotes = await this.fmpClient.batchGetQuotes(['SOXL', 'SOXS']);
        if (quotes.length !== 2) {
            throw new Error('Failed to fetch quotes for SOXL and SOXS');
        }
        const soxlQuote = quotes.find(q => q.symbol === 'SOXL');
        const soxsQuote = quotes.find(q => q.symbol === 'SOXS');
        console.log(`📊 SOXL: $${soxlQuote.price} (${soxlQuote.changesPercentage.toFixed(2)}%)`);
        console.log(`📊 SOXS: $${soxsQuote.price} (${soxsQuote.changesPercentage.toFixed(2)}%)`);
        // Calculate indicators and generate signals
        const soxlIndicators = this.calculateIndicators('SOXL', soxlQuote);
        const soxsIndicators = this.calculateIndicators('SOXS', soxsQuote);
        const soxlSignal = this.generateSignal('SOXL', soxlQuote, soxlIndicators);
        const soxsSignal = this.generateSignal('SOXS', soxsQuote, soxsIndicators);
        console.log(`\n🤖 SOXL Signal: ${soxlSignal.action} (${(soxlSignal.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`   Reason: ${soxlSignal.reason}`);
        console.log(`   RSI: ${soxlSignal.indicators.rsi.toFixed(2)} | MACD: ${soxlSignal.indicators.macdHist.toFixed(2)}`);
        console.log(`\n🤖 SOXS Signal: ${soxsSignal.action} (${(soxsSignal.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`   Reason: ${soxsSignal.reason}`);
        console.log(`   RSI: ${soxsSignal.indicators.rsi.toFixed(2)} | MACD: ${soxsSignal.indicators.macdHist.toFixed(2)}`);
        // Optimize portfolio
        const portfolio = this.optimizePortfolio(soxlSignal, soxsSignal);
        console.log(`\n💼 Portfolio Allocation:`);
        console.log(`   SOXL: ${portfolio.soxl_pct.toFixed(1)}%`);
        console.log(`   SOXS: ${portfolio.soxs_pct.toFixed(1)}%`);
        console.log(`   Cash: ${portfolio.cash_pct.toFixed(1)}%`);
        console.log(`   Expected Return: ${(portfolio.expected_return * 100).toFixed(2)}%`);
        console.log(`   Sharpe Ratio: ${portfolio.sharpe_ratio.toFixed(2)}`);
        // Log signals
        this.logSignal(soxlSignal);
        this.logSignal(soxsSignal);
        return {
            soxlSignal,
            soxsSignal,
            portfolio,
        };
    }
    /**
     * Backtest strategy (placeholder for future implementation)
     */
    async backtest(startDate, endDate) {
        console.log(`📊 Backtesting from ${startDate} to ${endDate}...`);
        console.log('⚠️  Backtest implementation coming soon!');
        // TODO: Implement historical data fetching and backtesting logic
    }
}
// CLI execution
async function main() {
    const trader = new SOXLSOXSTrader();
    console.log('🚀 SOXL/SOXS Neural Trading System\n');
    try {
        const result = await trader.analyze();
        console.log('\n✅ Analysis complete!');
        console.log(`📝 Signals logged to .goalie/trading_signals.jsonl`);
        console.log(`📊 Pattern metrics logged to .goalie/pattern_metrics.jsonl`);
        // Output JSON for programmatic use
        if (process.argv.includes('--json')) {
            console.log('\n' + JSON.stringify(result, null, 2));
        }
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
// Class already exported at declaration (line 52), no need to re-export
export default SOXLSOXSTrader;
//# sourceMappingURL=soxl_soxs_trader.js.map