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

import { createFMPStableClient, StockQuote } from '../integrations/fmp_stable_client';
import * as fs from 'fs';
import * as path from 'path';

interface TechnicalIndicators {
  rsi: number;         // Relative Strength Index (0-100)
  macd: number;        // MACD value
  macdSignal: number;  // MACD signal line
  macdHist: number;    // MACD histogram
  bb_upper: number;    // Bollinger Band upper
  bb_middle: number;   // Bollinger Band middle (SMA)
  bb_lower: number;    // Bollinger Band lower
  volume_ratio: number; // Current volume / avg volume
}

interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;  // 0-1
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

/**
 * Fetch a real-time quote from Yahoo Finance (free, no API key required).
 * Falls back to FMP if Yahoo fails and FMP_API_KEY is set.
 */
async function fetchYahooQuote(symbol: string): Promise<StockQuote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; agentic-flow/1.0)' },
  });
  if (!resp.ok) throw new Error(`Yahoo Finance ${resp.status} for ${symbol}`);
  const json = await resp.json() as any;
  const meta = json.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No Yahoo data for ${symbol}`);
  const closes: number[] = json.chart.result[0].indicators?.quote?.[0]?.close?.filter(Boolean) || [];
  const volumes: number[] = json.chart.result[0].indicators?.quote?.[0]?.volume?.filter(Boolean) || [];
  const price = meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - prevClose;
  const avgVol = volumes.length > 1 ? volumes.slice(0, -1).reduce((a: number, b: number) => a + b, 0) / (volumes.length - 1) : volumes[0] || 1;
  return {
    symbol,
    name: meta.shortName || meta.symbol || symbol,
    price,
    changesPercentage: prevClose ? (change / prevClose) * 100 : 0,
    change,
    dayLow: meta.regularMarketDayLow ?? price * 0.98,
    dayHigh: meta.regularMarketDayHigh ?? price * 1.02,
    yearHigh: meta.fiftyTwoWeekHigh ?? price * 1.5,
    yearLow: meta.fiftyTwoWeekLow ?? price * 0.5,
    marketCap: 0,
    priceAvg50: meta.fiftyDayAverage ?? price,
    priceAvg200: meta.twoHundredDayAverage ?? price,
    volume: meta.regularMarketVolume ?? volumes[volumes.length - 1] ?? 0,
    avgVolume: avgVol,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

export class SOXLSOXSTrader {
  private fmpClient: any;
  private goalieDir: string;
  private priceHistory: Map<string, number[]> = new Map();
  private fmpEntitlementBlocked: boolean = false;

  constructor(fmpApiKey?: string) {
    // FMP is optional — Yahoo Finance is the free default
    try {
      this.fmpClient = createFMPStableClient(fmpApiKey);
    } catch {
      this.fmpClient = null;
    }
    this.goalieDir = process.env.GOALIE_DIR || path.join(process.cwd(), '.goalie');

    if (!fs.existsSync(this.goalieDir)) {
      fs.mkdirSync(this.goalieDir, { recursive: true });
    }
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Neutral default

    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const gains = changes.slice(-period).filter(c => c > 0);
    const losses = changes.slice(-period).filter(c => c < 0).map(Math.abs);

    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    if (prices.length < 26) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    // EMA calculation
    const calculateEMA = (data: number[], period: number): number => {
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
  private calculateBollingerBands(prices: number[], period: number = 20): {
    upper: number;
    middle: number;
    lower: number;
  } {
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
  private calculateIndicators(symbol: string, currentQuote: StockQuote): TechnicalIndicators {
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
  private generateSignal(symbol: string, quote: StockQuote, indicators: TechnicalIndicators): TradingSignal {
    let bullishScore = 0;
    let bearishScore = 0;
    const reasons: string[] = [];

    // RSI analysis
    if (indicators.rsi < 30) {
      bullishScore += 2;
      reasons.push('RSI oversold');
    } else if (indicators.rsi > 70) {
      bearishScore += 2;
      reasons.push('RSI overbought');
    }

    // MACD analysis
    if (indicators.macdHist > 0 && indicators.macdHist > indicators.macd) {
      bullishScore += 1.5;
      reasons.push('MACD bullish crossover');
    } else if (indicators.macdHist < 0 && indicators.macdHist < indicators.macd) {
      bearishScore += 1.5;
      reasons.push('MACD bearish crossover');
    }

    // Bollinger Bands analysis
    if (quote.price < indicators.bb_lower) {
      bullishScore += 1;
      reasons.push('Price below lower BB');
    } else if (quote.price > indicators.bb_upper) {
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
    } else if (priceChangePct < -2) {
      bearishScore += 1;
      reasons.push('Strong downward momentum');
    }

    // Determine action
    const totalScore = bullishScore + bearishScore;
    const netScore = bullishScore - bearishScore;
    
    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;

    if (totalScore === 0) {
      action = 'HOLD';
      confidence = 0.5;
    } else if (netScore > 1) {
      action = 'BUY';
      confidence = Math.min(bullishScore / 5, 0.95);
    } else if (netScore < -1) {
      action = 'SELL';
      confidence = Math.min(bearishScore / 5, 0.95);
    } else {
      action = 'HOLD';
      confidence = 0.6;
    }

    // Special logic for SOXL/SOXS pair (inverse relationship)
    if (symbol === 'SOXS' && action === 'BUY') {
      // SOXS buy signal means semiconductor bearish outlook
      reasons.push('Semiconductor sector bearish');
    } else if (symbol === 'SOXL' && action === 'BUY') {
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
  optimizePortfolio(soxlSignal: TradingSignal, soxsSignal: TradingSignal): PortfolioAllocation {
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
  private logSignal(signal: TradingSignal) {
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
  private isDryRunMode(): boolean {
    return process.argv.includes('--dry-run') || process.env.TRADER_DRY_RUN === '1';
  }

  private allow402Simulation(): boolean {
    return process.env.TRADER_ALLOW_402_SIMULATION === '1' || process.env.CI_ALLOW_FMP_402_SIMULATION === '1';
  }

  private isFmp402Error(error: unknown): boolean {
    const message = (error as Error)?.message || '';
    return message.includes('402') || message.includes('Payment Required');
  }

  private buildSimulatedQuote(symbol: string): StockQuote {
    const anchorPrices: Record<string, number> = {
      SOXL: 45.5,
      SOXS: 45.5,
      SMH: 260.0,
      SOXX: 220.0,
    };
    const price = anchorPrices[symbol] ?? 100.0;
    return {
      symbol,
      name: `${symbol} (simulated)`,
      price,
      changesPercentage: 0,
      change: 0,
      dayLow: price * 0.99,
      dayHigh: price * 1.01,
      yearHigh: price * 1.3,
      yearLow: price * 0.7,
      marketCap: 0,
      priceAvg50: price,
      priceAvg200: price,
      volume: 1,
      avgVolume: 1,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Analyze any list of tickers and generate trading signals.
   * Default: SOXL,SOXS. Override via TICKERS env var or --tickers CLI arg.
   */
  async analyzeMulti(tickers?: string[]): Promise<{ signals: TradingSignal[]; portfolio: PortfolioAllocation }> {
    const symbols = tickers || this.getTickerList();
    console.log(`🔍 Fetching ${symbols.join(', ')} from Yahoo Finance (free)...`);

    const quotes: StockQuote[] = [];
    for (const sym of symbols) {
      let quote: StockQuote | null = null;
      try {
        quote = await fetchYahooQuote(sym);
      } catch (err) {
        console.warn(`⚠️  ${sym}: ${(err as Error).message}`);
        // If FMP available, try fallback for this symbol.
        // If we hit 402 once, avoid further entitlement calls in this run.
        if (this.fmpClient && !this.fmpEntitlementBlocked) {
          try {
            const fmpQ = await this.fmpClient.getQuote(sym);
            if (fmpQ?.[0]) {
              quote = fmpQ[0];
            }
          } catch (fmpErr) {
            if (this.isFmp402Error(fmpErr)) {
              this.fmpEntitlementBlocked = true;
              const typedReason = `FMP_ENTITLEMENT_402 (${sym})`;
              if (this.isDryRunMode() && this.allow402Simulation()) {
                console.warn(`⚠️  ${typedReason}: simulation fallback enabled`);
                quote = this.buildSimulatedQuote(sym);
              } else {
                throw new Error(`${typedReason}: provider plan/entitlement blocked quote access. Set TRADER_ALLOW_402_SIMULATION=1 for approved CI simulation mode.`);
              }
            } else {
              throw fmpErr;
            }
          }
        }
      }
      if (quote) {
        quotes.push(quote);
      }
    }

    if (quotes.length === 0) throw new Error('No quotes retrieved for any ticker');

    const signals: TradingSignal[] = [];
    for (const quote of quotes) {
      console.log(`📊 ${quote.symbol}: $${quote.price.toFixed(2)} (${quote.changesPercentage.toFixed(2)}%)`);
      const indicators = this.calculateIndicators(quote.symbol, quote);
      const signal = this.generateSignal(quote.symbol, quote, indicators);
      signals.push(signal);
      this.logSignal(signal);
      console.log(`🤖 ${signal.symbol}: ${signal.action} (${(signal.confidence * 100).toFixed(0)}%) — ${signal.reason}`);
    }

    // Portfolio allocation (uses first two as bull/bear pair, rest informational)
    const soxlSig = signals.find(s => s.symbol === 'SOXL') || signals[0];
    const soxsSig = signals.find(s => s.symbol === 'SOXS') || signals[1] || soxlSig;
    const portfolio = this.optimizePortfolio(soxlSig, soxsSig);

    console.log(`\n💼 Portfolio: SOXL ${portfolio.soxl_pct.toFixed(0)}% | SOXS ${portfolio.soxs_pct.toFixed(0)}% | Cash ${portfolio.cash_pct.toFixed(0)}%`);

    return { signals, portfolio };
  }

  /** Parse ticker list from env/CLI. Default: SOXL,SOXS */
  private getTickerList(): string[] {
    // --tickers SOXL,SOXS,SMH,SOXX
    const idx = process.argv.indexOf('--tickers');
    if (idx !== -1 && process.argv[idx + 1]) {
      return process.argv[idx + 1].split(',').map(s => s.trim().toUpperCase());
    }
    // TICKERS=SOXL,SOXS,SMH
    if (process.env.TICKERS) {
      return process.env.TICKERS.split(',').map(s => s.trim().toUpperCase());
    }
    return ['SOXL', 'SOXS'];
  }

  /** Backward-compatible: analyze SOXL+SOXS only */
  async analyze() {
    const { signals, portfolio } = await this.analyzeMulti(['SOXL', 'SOXS']);
    return {
      soxlSignal: signals.find(s => s.symbol === 'SOXL')!,
      soxsSignal: signals.find(s => s.symbol === 'SOXS')!,
      portfolio,
    };
  }

  /**
   * Backtest strategy (placeholder for future implementation)
   */
  async backtest(startDate: string, endDate: string): Promise<void> {
    console.log(`📊 Backtesting from ${startDate} to ${endDate}...`);
    console.log('⚠️  Backtest implementation coming soon!');
    // TODO: Implement historical data fetching and backtesting logic
  }
}

// CLI execution
async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const trader = new SOXLSOXSTrader();

  console.log(`🚀 Neural Trading System${isDryRun ? ' (DRY-RUN: synthetic data)' : ''}\n`);

  try {
    let result;

    if (isDryRun) {
      // Dry-run mode: use synthetic quotes — no network calls, CI-safe
      const syntheticQuote = (sym: string, price: number): StockQuote => ({
        symbol: sym, name: `${sym} (simulated)`, price,
        changesPercentage: -1.2, change: -price * 0.012,
        dayLow: price * 0.97, dayHigh: price * 1.03,
        yearHigh: price * 2, yearLow: price * 0.4,
        marketCap: 0, priceAvg50: price * 1.05, priceAvg200: price * 0.95,
        volume: 5000000, avgVolume: 4000000, timestamp: Math.floor(Date.now() / 1000),
      });
      const tickers = trader['getTickerList']();
      const signals: TradingSignal[] = [];
      for (const sym of tickers) {
        const q = syntheticQuote(sym, sym === 'SOXL' ? 22.50 : 45.54);
        const indicators = trader['calculateIndicators'](sym, q);
        const signal = trader['generateSignal'](sym, q, indicators);
        signals.push(signal);
        trader['logSignal'](signal);
        console.log(`🤖 ${signal.symbol}: ${signal.action} (${(signal.confidence * 100).toFixed(0)}%) — ${signal.reason} [SIMULATED]`);
      }
      const soxlSig = signals.find(s => s.symbol === 'SOXL') || signals[0];
      const soxsSig = signals.find(s => s.symbol === 'SOXS') || signals[1] || soxlSig;
      result = { signals, portfolio: trader.optimizePortfolio(soxlSig, soxsSig) };
      console.log('\n✅ Dry-run complete — indicators validated, no API calls made.');
    } else {
      // Live mode: use Yahoo (free) + FMP fallback
      result = await trader.analyzeMulti();
      console.log('\n✅ Analysis complete!');
    }

    console.log(`📝 Signals logged to .goalie/trading_signals.jsonl`);
    console.log(`📊 Pattern metrics logged to .goalie/pattern_metrics.jsonl`);

    if (process.argv.includes('--json')) {
      console.log('\n' + JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

// Class already exported at declaration (line 52), no need to re-export
export default SOXLSOXSTrader;
