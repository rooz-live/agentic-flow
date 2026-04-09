/**
 * Trading Portfolio Analyzer
 * Technical analysis, options scanners, risk calculations for trading tools
 * Equivalent to portfolio_technical_analyzer.py but in TypeScript
 */

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Option {
  strike: number;
  expiry: Date;
  iv: number; // implied volatility
  hv: number; // historical volatility
  gamma: number;
  delta: number;
  type: 'call' | 'put';
}

export interface AnalysisResult {
  ta: {
    rsi: number[];
    macd: { macd: number; signal: number; histogram: number }[];
    bb: { upper: number; middle: number; lower: number }[];
  };
  soxlSoxs: {
    ratio: number[];
    correlation: number;
    signals: string[];
  };
  scanners: {
    volPremium: Option[];
    squeeze: boolean;
    highGamma: Option[];
  };
  risk: {
    var95: number;
    maxDrawdown: number;
  };
}

/**
 * Core portfolio technical analyzer
 */
export class PortfolioAnalyzer {
  /**
   * Compute RSI
   */
  static computeRSI(closes: number[], period: number = 14): number[] {
    if (closes.length < period + 1) return [];

    const rsi: number[] = [];
    let avgGain = 0;
    let avgLoss = 0;

    // Initial average
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      avgGain += change > 0 ? change : 0;
      avgLoss += change < 0 ? -change : 0;
    }
    avgGain /= period;
    avgLoss /= period;

    rsi.push(100 - (100 / (1 + avgGain / avgLoss)));

    // Subsequent
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;

      rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
    }

    return rsi;
  }

  /**
   * Compute MACD
   */
  static computeMACD(closes: number[], fast = 12, slow = 26, signal = 9): { macd: number[]; signal: number[]; histogram: number[] } {
    const emaFast = this.computeEMA(closes, fast);
    const emaSlow = this.computeEMA(closes, slow);
    const macdLine: number[] = [];
    const signalLine: number[] = [];
    const histogram: number[] = [];

    for (let i = 0; i < Math.max(emaFast.length, emaSlow.length); i++) {
      const macd = (emaFast[i] || 0) - (emaSlow[i] || 0);
      macdLine.push(macd);
    }

    // Signal is EMA of MACD
    const signalEma = this.computeEMA(macdLine, signal);
    for (let i = 0; i < macdLine.length; i++) {
      const sig = signalEma[i] || 0;
      signalLine.push(sig);
      histogram.push(macdLine[i] - sig);
    }

    return { macd: macdLine, signal: signalLine, histogram };
  }

  private static computeEMA(closes: number[], period: number): number[] {
    if (closes.length === 0) return [];

    const multiplier = 2 / (period + 1);
    const ema: number[] = [closes[0]];

    for (let i = 1; i < closes.length; i++) {
      ema.push((closes[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }

    return ema;
  }

  /**
   * Compute Bollinger Bands
   */
  static computeBB(closes: number[], period = 20, stdDev = 2): { upper: number[]; middle: number[]; lower: number[] } {
    const sma = this.computeSMA(closes, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < sma.length; i++) {
      const slice = closes.slice(i * period, (i + 1) * period);
      if (slice.length === period) {
        const mean = sma[i];
        const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
        const stdev = Math.sqrt(variance);
        upper.push(mean + stdDev * stdev);
        lower.push(mean - stdDev * stdev);
      }
    }

    return { upper, middle: sma, lower };
  }

  private static computeSMA(closes: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < closes.length; i++) {
      const slice = closes.slice(i - period + 1, i + 1);
      sma.push(slice.reduce((a, b) => a + b, 0) / period);
    }
    return sma;
  }

  /**
   * SOXL/SOXS analysis - leveraged pair trading
   */
  static analyzeSOXLPair(soxl: OHLCV[], soxs: OHLCV[]): { ratio: number[]; correlation: number; signals: string[] } {
    if (soxl.length !== soxs.length) throw new Error('Data length mismatch');

    const ratio: number[] = [];
    const returnsSoxl: number[] = [];
    const returnsSoxs: number[] = [];

    for (let i = 1; i < soxl.length; i++) {
      ratio.push(soxl[i].close / soxs[i].close);
      returnsSoxl.push(soxl[i].close / soxl[i-1].close - 1);
      returnsSoxs.push(soxs[i].close / soxs[i-1].close - 1);
    }

    const corr = this.pearsonCorrelation(returnsSoxl, returnsSoxs);
    const signals: string[] = [];
    const meanRatio = ratio.reduce((a, b) => a + b, 0) / ratio.length;
    const stdRatio = Math.sqrt(ratio.reduce((sum, r) => sum + Math.pow(r - meanRatio, 2), 0) / ratio.length);

    // Mean reversion signals
    for (let i = 0; i < ratio.length; i++) {
      const zscore = (ratio[i] - meanRatio) / stdRatio;
      if (zscore > 2) signals.push(`SOXL overvalued vs SOXS at ${soxl[i].timestamp}`);
      if (zscore < -2) signals.push(`SOXS overvalued vs SOXL at ${soxl[i].timestamp}`);
    }

    return { ratio, correlation: corr, signals };
  }

  private static pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    const num = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
    const denY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
    return num / (denX * denY);
  }

  /**
   * Options vol premium scanner
   */
  static scanVolPremium(options: Option[], threshold = 0.2): Option[] {
    return options.filter(o => o.iv - o.hv > threshold);
  }

  /**
   * Squeeze scanner (TTM Squeeze like: low BB width and low KC width)
   */
  static detectSqueeze(ohlcv: OHLCV[], bbPeriod = 20, kcPeriod = 20, kcMult = 1.5): boolean {
    if (ohlcv.length < Math.max(bbPeriod, kcPeriod)) return false;

    const closes = ohlcv.map(c => c.close);
    const highs = ohlcv.map(c => c.high);
    const lows = ohlcv.map(c => c.low);

    const bb = this.computeBB(closes, bbPeriod);
    const bbWidth = (bb.upper[bb.upper.length - 1] - bb.lower[bb.lower.length - 1]) / bb.middle[bb.middle.length - 1];

    const kcMiddle = this.computeSMA(closes, kcPeriod);
    const kcTrueRange = highs.slice(-kcPeriod).map((h, i) => Math.max(h - lows[i], Math.abs(h - closes[i-1] || 0), Math.abs(lows[i] - closes[i-1] || 0)));
    const kcAvgTr = kcTrueRange.reduce((a, b) => a + b, 0) / kcPeriod;
    const kcUpper = kcMiddle[kcMiddle.length - 1] + kcMult * kcAvgTr;
    const kcLower = kcMiddle[kcMiddle.length - 1] - kcMult * kcAvgTr;
    const kcWidth = (kcUpper - kcLower) / kcMiddle[kcMiddle.length - 1];

    const bbSqueeze = bbWidth < 0.1; // arbitrary threshold
    const kcSqueeze = kcWidth < 0.1;

    return bbSqueeze && kcSqueeze;
  }

  /**
   * Gamma scanner
   */
  static scanHighGamma(options: Option[], threshold = 0.05): Option[] {
    return options.filter(o => Math.abs(o.gamma) > threshold);
  }

  /**
   * Risk parameters
   */
  static computeVaR(returns: number[], confidence = 0.95): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    return sorted[index] || 0;
  }

  static computeMaxDrawdown(prices: number[]): number {
    let peak = prices[0];
    let maxDD = 0;

    for (const price of prices) {
      if (price > peak) peak = price;
      const dd = (peak - price) / peak;
      if (dd > maxDD) maxDD = dd;
    }

    return maxDD;
  }

  /**
   * Full analysis
   */
  static analyze(data: { underlying: OHLCV[]; soxl?: OHLCV[]; soxs?: OHLCV[]; options?: Option[] }): AnalysisResult {
    const ta = {
      rsi: this.computeRSI(data.underlying.map(d => d.close)),
      macd: this.computeMACD(data.underlying.map(d => d.close)).macd.slice(-1), // last
      bb: this.computeBB(data.underlying.map(d => d.close)).upper.slice(-1).map((u, i) => ({
        upper: u,
        middle: this.computeSMA(data.underlying.map(d => d.close), 20)[i],
        lower: this.computeBB(data.underlying.map(d => d.close)).lower[i]
      })) as any
    };

    const soxlSoxs = data.soxl && data.soxs ? this.analyzeSOXLPair(data.soxl, data.soxs) : { ratio: [], correlation: 0, signals: [] };

    const scanners = {
      volPremium: data.options ? this.scanVolPremium(data.options) : [],
      squeeze: data.underlying ? this.detectSqueeze(data.underlying) : false,
      highGamma: data.options ? this.scanHighGamma(data.options) : []
    };

    const returns = data.underlying.slice(1).map((d, i) => d.close / data.underlying[i].close - 1);
    const risk = {
      var95: this.computeVaR(returns),
      maxDrawdown: this.computeMaxDrawdown(data.underlying.map(d => d.close))
    };

    return { ta, soxlSoxs, scanners, risk };
  }

  /**
   * Generate mock data
   */
  static generateMockOHLCV(symbol: string, days: number = 252): OHLCV[] {
    const data: OHLCV[] = [];
    let price = 100;
    const drift = 0.0002;
    const vol = 0.02;

    for (let i = 0; i < days; i++) {
      const timestamp = new Date(Date.now() - (days - i) * 86400000);
      const change = (Math.random() - 0.5) * vol * 2 + drift;
      price *= (1 + change);
      const open = price * (1 + (Math.random() - 0.5) * 0.01);
      const high = Math.max(open, price) * (1 + Math.random() * 0.02);
      const low = Math.min(open, price) * (1 - Math.random() * 0.02);
      const close = low + Math.random() * (high - low);
      const volume = 1000000 + Math.random() * 5000000;

      data.push({ timestamp, open, high, low, close, volume });
    }

    return data;
  }

  static generateMockOptions(underlyingPrice: number, count = 20): Option[] {
    const options: Option[] = [];
    for (let i = 0; i < count; i++) {
      const strike = underlyingPrice * (0.8 + Math.random() * 0.4);
      const iv = 0.2 + Math.random() * 0.4;
      const hv = 0.15 + Math.random() * 0.2;
      const gamma = (Math.random() - 0.5) * 0.1;
      const delta = (Math.random() - 0.5) * 2;
      const type = Math.random() > 0.5 ? 'call' as const : 'put' as const;
      options.push({ strike, expiry: new Date(Date.now() + 30*86400000), iv, hv, gamma, delta, type });
    }
    return options;
  }
}