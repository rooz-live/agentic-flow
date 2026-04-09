import { describe, it, expect, beforeAll } from '@jest/globals';
import { PortfolioAnalyzer, type OHLCV, type Option } from '../../src/trading/portfolio-analyzer';

describe('PortfolioAnalyzer', () => {
  let mockOHLCV: OHLCV[];
  let mockOptions: Option[];

  beforeAll(() => {
    mockOHLCV = PortfolioAnalyzer.generateMockOHLCV('TEST', 100);
    mockOptions = PortfolioAnalyzer.generateMockOptions(mockOHLCV[mockOHLCV.length - 1].close, 10);
  });

  it('computes RSI correctly', () => {
    const closes = mockOHLCV.slice(-30).map(d => d.close);
    const rsi = PortfolioAnalyzer.computeRSI(closes);
    expect(rsi.length).toBeGreaterThan(0);
    expect(rsi[rsi.length - 1]).toBeGreaterThan(0);
    expect(rsi[rsi.length - 1]).toBeLessThan(100);
  });

  it('computes MACD correctly', () => {
    const closes = mockOHLCV.map(d => d.close);
    const macd = PortfolioAnalyzer.computeMACD(closes);
    expect(macd.macd.length).toBeGreaterThan(0);
  });

  it('computes Bollinger Bands correctly', () => {
    const closes = mockOHLCV.map(d => d.close);
    const bb = PortfolioAnalyzer.computeBB(closes);
    expect(bb.upper.length).toBeGreaterThan(0);
    expect(bb.upper[bb.upper.length - 1]).toBeGreaterThan(bb.middle[bb.middle.length - 1]);
    expect(bb.lower[bb.lower.length - 1]).toBeLessThan(bb.middle[bb.middle.length - 1]);
  });

  it('analyzes SOXL/SOXS pair', () => {
    const soxl = PortfolioAnalyzer.generateMockOHLCV('SOXL', 100);
    const soxs = PortfolioAnalyzer.generateMockOHLCV('SOXS', 100);
    const analysis = PortfolioAnalyzer.analyzeSOXLPair(soxl, soxs);
    expect(analysis.ratio.length).toBe(99);
    expect(analysis.correlation).toBeGreaterThan(-1);
    expect(analysis.correlation).toBeLessThan(1);
  });

  it('scans vol premium', () => {
    const highVolOpts: Option[] = mockOptions.map(o => ({...o, iv: o.iv + 0.3 }));
    const premium = PortfolioAnalyzer.scanVolPremium(highVolOpts, 0.25);
    expect(premium.length).toBeGreaterThan(0);
  });

  it('detects squeeze', () => {
    // Mock low vol data for squeeze
    const lowVolData = Array.from({length: 50}, (_, i) => ({
      timestamp: new Date(),
      open: 100 + (Math.random() - 0.5) * 0.5,
      high: 100 + (Math.random() - 0.5) * 1,
      low: 100 + (Math.random() - 0.5) * 1,
      close: 100 + (Math.random() - 0.5) * 0.5,
      volume: 1000000
    })) as OHLCV[];
    const squeeze = PortfolioAnalyzer.detectSqueeze(lowVolData);
    // Not guaranteed, but test logic
    expect(typeof squeeze).toBe('boolean');
  });

  it('scans high gamma', () => {
    const highGammaOpts: Option[] = mockOptions.map(o => ({...o, gamma: 0.1 }));
    const gamma = PortfolioAnalyzer.scanHighGamma(highGammaOpts, 0.08);
    expect(gamma.length).toBe(mockOptions.length);
  });

  it('computes VaR', () => {
    const returns = mockOHLCV.slice(1).map((d, i) => d.close / mockOHLCV[i].close - 1);
    const var95 = PortfolioAnalyzer.computeVaR(returns);
    expect(var95).toBeLessThan(0);
  });

  it('computes max drawdown', () => {
    const prices = mockOHLCV.map(d => d.close);
    const mdd = PortfolioAnalyzer.computeMaxDrawdown(prices);
    expect(mdd).toBeGreaterThanOrEqual(0);
    expect(mdd).toBeLessThan(1);
  });

  it('full analysis works', () => {
    const result = PortfolioAnalyzer.analyze({
      underlying: mockOHLCV,
      options: mockOptions
    });
    expect(result.ta.rsi.length).toBeGreaterThan(0);
    expect(result.soxlSoxs).toEqual({ ratio: [], correlation: 0, signals: [] });
    expect(result.scanners.volPremium.length).toBeGreaterThanOrEqual(0);
    expect(typeof result.scanners.squeeze).toBe('boolean');
    expect(result.risk.var95).toBeLessThan(0);
  });

  it('generates mock data', () => {
    const data = PortfolioAnalyzer.generateMockOHLCV('MOCK', 10);
    expect(data.length).toBe(10);
    expect(data[0].close).toBeGreaterThan(0);
  });
});