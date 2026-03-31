/**
 * NAPI-RS Integration Tests
 * Tests the FFI layer: Rust Core → NAPI-RS → Node.js
 * 
 * Run: npm test (after napi build --platform)
 */

const { 
  WsjfCalculator, 
  PortfolioManager, 
  PerformanceCalc, 
  RiskAnalysis, 
  Cache,
  calculateSystemicScore,
  domainHealthCheck 
} = require('../rust/ffi');

const assert = require('assert');

describe('NAPI-RS FFI Integration', function() {
  
  describe('Domain Health Check', () => {
    it('should return healthy status for all modules', () => {
      const health = JSON.parse(domainHealthCheck());
      assert.strictEqual(health.status, 'HEALTHY');
      assert.strictEqual(health.modules_operational, health.modules_total);
      assert(health.modules.length > 0);
      assert(health.rust_core_version);
    });
  });

  describe('WSJF Calculator', () => {
    let wsjf;
    
    beforeEach(() => {
      wsjf = new WsjfCalculator();
    });

    it('should calculate WSJF score correctly', () => {
      const item = wsjf.calculate(
        "TASK-001",
        "Settlement validation",
        8,  // business value
        9,  // time criticality
        7,  // risk reduction
        2,  // job size
        "Court deadline imminent"
      );
      
      assert.strictEqual(item.id, "TASK-001");
      assert.strictEqual(item.description, "Settlement validation");
      // WSJF = (8 + 9 + 7) / 2 = 12.0
      assert.strictEqual(item.wsjf_score, 12.0);
      assert(item.scored_at);
      assert.strictEqual(item.justification, "Court deadline imminent");
    });

    it('should reject invalid bounds', () => {
      assert.throws(() => {
        wsjf.calculate("TASK-002", "Test", 15, 5, 5, 3, null);
      }, /business_value.*must be between 1 and 10/);
    });

    it('should require justification for extreme values', () => {
      assert.throws(() => {
        wsjf.calculate("TASK-003", "Test", 10, 5, 5, 1, null);
      }, /justification required/);
    });

    it('should detect anti-patterns', () => {
      const items = [
        wsjf.calculate("A", "Task A", 8, 8, 8, 2, "High priority"),
        wsjf.calculate("B", "Task B", 8, 8, 8, 2, "Also high"),
        wsjf.calculate("C", "Task C", 1, 1, 1, 1, "Low")
      ];
      
      const warnings = wsjf.detectAntiPatterns(items);
      assert(warnings.length > 0);
      assert(warnings.some(w => w.includes("identical") || w.includes("clustering")));
    });

    it('should prioritize items by WSJF score', () => {
      const items = [
        wsjf.calculate("LOW", "Low priority", 5, 5, 5, 5, "Medium"),
        wsjf.calculate("HIGH", "High priority", 10, 10, 10, 1, "Critical"),
        wsjf.calculate("MID", "Mid priority", 7, 7, 7, 3, "Normal")
      ];
      
      const sorted = wsjf.prioritize(items);
      assert.strictEqual(sorted[0].id, "HIGH");
      assert.strictEqual(sorted[1].id, "MID");
      assert.strictEqual(sorted[2].id, "LOW");
    });

    it('should apply time decay correctly', () => {
      const item = wsjf.calculate("TASK", "Test", 5, 5, 5, 3, "Test");
      // 50% elapsed toward deadline
      const decayed = wsjf.withTimeDecay(item, 0.5);
      
      // Time criticality should increase
      assert(decayed.time_criticality >= item.time_criticality);
    });

    it('should detect stale scores', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5); // 5 days ago
      
      const isStale = wsjf.isStale(oldDate.toISOString());
      assert.strictEqual(isStale, true);
    });
  });

  describe('Portfolio Manager', () => {
    let portfolio;
    
    beforeEach(() => {
      portfolio = new PortfolioManager("Test Portfolio", "USD");
    });

    it('should create portfolio with correct currency', () => {
      assert.strictEqual(portfolio.name(), "Test Portfolio");
      assert(portfolio.portfolioId()); // UUID format
    });

    it('should add equity holding', () => {
      portfolio.addEquity("AAPL", "NASDAQ", "Technology", "Large", 100.0, 15000.0);
      
      assert.strictEqual(portfolio.holdingCount(), 1);
      
      const holdings = portfolio.listHoldings();
      assert.strictEqual(holdings.length, 1);
      assert.strictEqual(holdings[0].asset_name, "AAPL");
      assert.strictEqual(holdings[0].quantity, 100.0);
      assert.strictEqual(holdings[0].cost_basis, 15000.0);
    });

    it('should add crypto holding', () => {
      portfolio.addCrypto("BTC", "Bitcoin", "Coin", 0.5, 25000.0);
      
      assert.strictEqual(portfolio.holdingCount(), 1);
      
      const holdings = portfolio.listHoldings();
      assert.strictEqual(holdings[0].asset_name, "BTC");
      assert.strictEqual(holdings[0].quantity, 0.5);
    });

    it('should calculate total value', () => {
      portfolio.addEquity("AAPL", "NASDAQ", "Technology", "Large", 100.0, 15000.0);
      
      const prices = { "AAPL": 175.0 };
      const value = portfolio.totalValue(prices);
      
      // 100 shares × $175 = $17,500
      assert.strictEqual(value, 17500.0);
    });

    it('should calculate unrealized gain/loss', () => {
      portfolio.addEquity("AAPL", "NASDAQ", "Technology", "Large", 100.0, 15000.0);
      
      const prices = { "AAPL": 175.0 };
      const gain = portfolio.unrealizedGain(prices);
      
      // ($175 - $150 cost basis per share) × 100 = $2,500
      assert.strictEqual(gain, 2500.0);
    });

    it('should calculate return percentage', () => {
      portfolio.addEquity("AAPL", "NASDAQ", "Technology", "Large", 100.0, 15000.0);
      
      const prices = { "AAPL": 180.0 };
      const ret = portfolio.returnPercentage(prices);
      
      // ($180 - $150) / $150 = 20%
      assert.strictEqual(ret, 0.20);
    });

    it('should calculate rebalancing trades', () => {
      portfolio.addEquity("AAPL", "NASDAQ", "Technology", "Large", 100.0, 15000.0);
      portfolio.addEquity("MSFT", "NASDAQ", "Technology", "Large", 50.0, 10000.0);
      
      // Target: 50% AAPL, 50% MSFT
      // Current: AAPL @ $175 = $17,500, MSFT @ $200 = $10,000
      // Total = $27,500
      // Current %: AAPL 63.6%, MSFT 36.4%
      
      const targets = { "AAPL": 50.0, "MSFT": 50.0 };
      const prices = { "AAPL": 175.0, "MSFT": 200.0 };
      
      const trades = portfolio.rebalancingTrades(targets, prices);
      
      assert(trades.length > 0);
      // Should recommend selling some AAPL, buying MSFT
      const aaplTrade = trades.find(t => t.asset_name === "AAPL");
      const msftTrade = trades.find(t => t.asset_name === "MSFT");
      
      if (aaplTrade) {
        assert.strictEqual(aaplTrade.action, "Sell");
      }
    });

    it('should serialize to JSON', () => {
      portfolio.addEquity("AAPL", "NASDAQ", "Technology", "Large", 100.0, 15000.0);
      
      const json = portfolio.toJson();
      const parsed = JSON.parse(json);
      
      assert.strictEqual(parsed.name, "Test Portfolio");
      assert(Array.isArray(parsed.holdings));
    });
  });

  describe('Performance Calculator', () => {
    let perf;
    
    beforeEach(() => {
      perf = new PerformanceCalc();
    });

    it('should calculate Sharpe ratio', () => {
      // Monthly returns: 5%, -2%, 8%, 3%, -1%
      const returns = [0.05, -0.02, 0.08, 0.03, -0.01];
      const riskFree = 0.02; // 2% monthly risk-free
      
      const sharpe = perf.sharpeRatio(returns, riskFree);
      
      // Sharpe = (mean(return) - riskFree) / stdDev(return)
      assert(typeof sharpe === 'number');
      assert(!isNaN(sharpe));
    });

    it('should calculate max drawdown', () => {
      // Portfolio values over time
      const values = [100000, 105000, 98000, 110000, 102000];
      
      const mdd = perf.maxDrawdown(values, "USD");
      
      // MDD = (peak - trough) / peak
      assert(mdd >= 0);
      assert(mdd <= 1);
    });

    it('should calculate CAGR', () => {
      const initial = 100000;
      const final = 150000;
      const years = 3;
      
      const cagr = perf.cagr(initial, final, years, "USD");
      
      // CAGR = (final/initial)^(1/years) - 1
      // = (1.5)^(1/3) - 1 ≈ 14.5%
      assert(cagr > 0.14 && cagr < 0.15);
    });

    it('should calculate total return', () => {
      const initial = 100000;
      const final = 125000;
      
      const ret = perf.totalReturn(initial, final, "USD");
      
      assert.strictEqual(ret, 0.25); // 25%
    });

    it('should calculate mean', () => {
      const values = [1, 2, 3, 4, 5];
      const mean = perf.mean(values);
      
      assert.strictEqual(mean, 3.0);
    });

    it('should calculate standard deviation', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const sd = perf.stdDev(values);
      
      // Sample std dev ≈ 2.138
      assert(sd > 2 && sd < 2.5);
    });
  });

  describe('Risk Analysis', () => {
    let risk;
    
    beforeEach(() => {
      risk = new RiskAnalysis();
    });

    it('should calculate Value at Risk', () => {
      const portfolioValue = 1000000;
      const confidence = 0.95;
      const dailyVol = 0.02; // 2% daily volatility
      const horizon = 10; // 10 days
      
      const var = risk.valueAtRisk(portfolioValue, confidence, dailyVol, horizon, "USD");
      
      // VaR = portfolioValue × z-score × volatility × sqrt(horizon)
      // 95% z-score ≈ 1.645
      // VaR ≈ 1,000,000 × 1.645 × 0.02 × √10 ≈ $104,000
      assert(var > 0);
      assert(var < portfolioValue * 0.2); // Should be < 20%
    });

    it('should calculate volatility', () => {
      const returns = [0.01, -0.02, 0.015, 0.005, -0.01, 0.02, -0.005, 0.01];
      
      const vol = risk.volatility(returns);
      
      assert(vol > 0);
      assert(vol < 0.5); // Reasonable volatility range
    });

    it('should calculate annualized volatility', () => {
      // Daily returns
      const dailyReturns = [0.01, -0.02, 0.015, 0.005, -0.01];
      
      const annVol = risk.annualisedVolatility(dailyReturns);
      
      // AnnVol = DailyVol × √252
      assert(annVol > 0);
    });

    it('should calculate beta', () => {
      // Portfolio and market returns
      const portfolioReturns = [0.02, -0.01, 0.03, 0.01, -0.02];
      const marketReturns = [0.01, -0.005, 0.02, 0.005, -0.01];
      
      const beta = risk.beta(portfolioReturns, marketReturns);
      
      // Beta ≈ 1.5 (portfolio moves more than market)
      assert(beta > 0);
    });

    it('should calculate correlation', () => {
      const seriesA = [0.01, 0.02, -0.01, 0.015, 0.005];
      const seriesB = [0.005, 0.025, -0.015, 0.02, 0.0];
      
      const corr = risk.correlation(seriesA, seriesB);
      
      // Correlation should be between -1 and 1
      assert(corr >= -1 && corr <= 1);
      // These series are positively correlated
      assert(corr > 0);
    });
  });

  describe('LRU Cache', () => {
    it('should store and retrieve values', async () => {
      const cache = new Cache(100);
      
      await cache.put("key1", "value1");
      const value = await cache.get("key1");
      
      assert.strictEqual(value, "value1");
    });

    it('should return null for missing keys', async () => {
      const cache = new Cache(100);
      
      const value = await cache.get("missing");
      
      assert.strictEqual(value, null);
    });

    it('should respect capacity limit', async () => {
      const cache = new Cache(2);
      
      await cache.put("a", "1");
      await cache.put("b", "2");
      await cache.put("c", "3"); // Evicts "a"
      
      assert.strictEqual(await cache.get("a"), null);
      assert.strictEqual(await cache.get("b"), "2");
      assert.strictEqual(await cache.get("c"), "3");
    });

    it('should promote to MRU on get', async () => {
      const cache = new Cache(2);
      
      await cache.put("a", "1");
      await cache.put("b", "2");
      await cache.get("a"); // Promote "a" to MRU
      await cache.put("c", "3"); // Should evict "b" (LRU)
      
      assert.strictEqual(await cache.get("a"), "1");
      assert.strictEqual(await cache.get("b"), null);
    });

    it('should check contains without promotion', async () => {
      const cache = new Cache(2);
      
      await cache.put("a", "1");
      await cache.put("b", "2");
      
      assert.strictEqual(await cache.contains("a"), true);
      
      await cache.put("c", "3"); // "a" still LRU, gets evicted
      
      assert.strictEqual(await cache.get("a"), null);
    });

    it('should remove specific keys', async () => {
      const cache = new Cache(100);
      
      await cache.put("key", "value");
      const removed = await cache.remove("key");
      
      assert.strictEqual(removed, "value");
      assert.strictEqual(await cache.get("key"), null);
    });

    it('should clear all entries', async () => {
      const cache = new Cache(100);
      
      await cache.put("a", "1");
      await cache.put("b", "2");
      await cache.clear();
      
      assert.strictEqual(await cache.isEmpty(), true);
    });

    it('should return correct length', async () => {
      const cache = new Cache(100);
      
      assert.strictEqual(await cache.len(), 0);
      
      await cache.put("a", "1");
      assert.strictEqual(await cache.len(), 1);
      
      await cache.put("b", "2");
      assert.strictEqual(await cache.len(), 2);
    });

    it('should return keys in LRU order', async () => {
      const cache = new Cache(100);
      
      await cache.put("a", "1");
      await cache.put("b", "2");
      await cache.put("c", "3");
      await cache.get("a"); // Promote "a" to MRU
      
      const keys = await cache.keysLruOrder();
      
      // LRU order: b, c, a
      assert.deepStrictEqual(keys, ["b", "c", "a"]);
    });

    it('should snapshot and restore', async () => {
      const cache = new Cache(100);
      
      await cache.put("a", "1");
      await cache.put("b", "2");
      await cache.get("a"); // Promote "a"
      
      const snapshot = await cache.snapshot();
      
      // Restore to new cache
      const restored = Cache.restore(snapshot, 100);
      
      assert.strictEqual(await restored.get("a"), "1");
      assert.strictEqual(await restored.get("b"), "2");
      assert.strictEqual(await restored.len(), 2);
    });
  });

  describe('Systemic Score', () => {
    it('should return LitigationReady for high scores', () => {
      const result = calculateSystemicScore(35);
      
      assert.strictEqual(result.score, 35);
      assert.strictEqual(result.max_score, 40);
      assert.strictEqual(result.verdict, "LitigationReady");
    });

    it('should return SettlementOnly for medium scores', () => {
      const result = calculateSystemicScore(20);
      
      assert.strictEqual(result.score, 20);
      assert.strictEqual(result.verdict, "SettlementOnly");
    });

    it('should return Defer for low scores', () => {
      const result = calculateSystemicScore(8);
      
      assert.strictEqual(result.score, 8);
      assert.strictEqual(result.verdict, "Defer");
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid currency codes', () => {
      assert.throws(() => {
        new PortfolioManager("Test", "INVALID");
      }, /Invalid currency/);
    });

    it('should handle invalid exchange names', () => {
      const portfolio = new PortfolioManager("Test", "USD");
      
      assert.throws(() => {
        portfolio.addEquity("AAPL", "INVALID", "Technology", "Large", 100, 15000);
      }, /Unknown exchange/);
    });

    it('should handle mismatched price maps', () => {
      const portfolio = new PortfolioManager("Test", "USD");
      portfolio.addEquity("AAPL", "NASDAQ", "Technology", "Large", 100, 15000);
      
      // Missing price for AAPL
      assert.throws(() => {
        portfolio.totalValue({});
      }, /Price not found/);
    });
  });
});

// Run tests if executed directly
if (require.main === module) {
  const Mocha = require('mocha');
  const mocha = new Mocha();
  mocha.suite.emit('pre-require', global, __filename, mocha);
  
  describe('NAPI-RS FFI Integration', function() {
    // Tests defined above
  });
  
  mocha.run(failures => {
    process.exitCode = failures ? 1 : 0;
  });
}
