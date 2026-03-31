#!/usr/bin/env node
"use strict";
/**
 * Consumer smoke-test for @agentic-flow/neural-trader
 *
 * Tests both the JS surface (index.js) and the WASM pkg if available.
 * Pure Node.js — no external deps.
 */

const assert = require("assert");
const path = require("path");
const fs = require("fs");

const mod = require(path.resolve(__dirname, "..", "index.js"));

let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

function skip(name, reason) {
  skipped++;
  console.log(`  ⊘ ${name} (skipped: ${reason})`);
}

console.log("neural-trader consumer tests\n");

// ── JS surface tests ────────────────────────────────────────────────
console.log("JS surface:");

test("exports status function", () => {
  assert.strictEqual(typeof mod.status, "function");
});

test("status() returns 'active'", () => {
  assert.strictEqual(mod.status(), "active");
});

test("module is a non-null object", () => {
  assert.ok(mod != null && typeof mod === "object" || typeof mod === "function");
});

// ── WASM pkg tests (only if built) ──────────────────────────────────
const pkgPath = path.resolve(__dirname, "..", "pkg", "neural_trader.js");
const hasPkg = fs.existsSync(pkgPath);

console.log("\nWASM pkg:");

if (!hasPkg) {
  skip("WASM tests", "pkg/ not built — run wasm-pack build first");
} else {
  const wasm = require(pkgPath);

  test("WASM exports NeuralTrader constructor", () => {
    assert.strictEqual(typeof wasm.NeuralTrader, "function");
  });

  test("WASM exports greet function", () => {
    assert.strictEqual(typeof wasm.greet, "function");
  });

  test("NeuralTrader can be instantiated", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({
      riskThreshold: 0.15,
      maxPositionPct: 0.25,
      totalBudget: 100000
    }));
    assert.ok(trader);
  });

  test("get_health returns uninitialized before init", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({}));
    const health = JSON.parse(trader.get_health());
    assert.strictEqual(health.status, "uninitialized");
    assert.strictEqual(health.version, "2.9.0");
    assert.strictEqual(health.engine, "kelly-sharpe-v1");
  });

  test("get_health returns healthy after init", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({}));
    trader.initialize();
    const health = JSON.parse(trader.get_health());
    assert.strictEqual(health.status, "healthy");
  });

  test("analyze returns error before init", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({}));
    const result = JSON.parse(trader.analyze(JSON.stringify([])));
    assert.ok(result.error);
  });

  test("analyze produces BUY signal for bullish BTC", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({ totalBudget: 100000 }));
    trader.initialize();
    const conditions = [{
      symbol: "BTC",
      volatility: 0.5,
      trend_strength: 0.6,
      mean_reversion: 0.2,
      volume_ratio: 1.5,
      risk_budget: 0.02,
      win_probability: 0.6,
      payoff_ratio: 2.0
    }];
    const result = JSON.parse(trader.analyze(JSON.stringify(conditions)));
    assert.ok(result.signals, "should have signals");
    assert.strictEqual(result.signals.length, 1);
    assert.strictEqual(result.signals[0].action, "BUY");
    assert.ok(result.signals[0].kelly_fraction > 0, "kelly > 0");
    assert.ok(result.signals[0].position_size > 0, "position > 0");
    assert.ok(result.portfolio_sharpe > 0, "sharpe > 0");
  });

  test("analyze produces SKIP for no-edge asset", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({}));
    trader.initialize();
    const conditions = [{
      symbol: "X",
      volatility: 0.3,
      trend_strength: 0.8,
      mean_reversion: 0.5,
      volume_ratio: 1.0,
      risk_budget: 0.02,
      win_probability: 0.3,
      payoff_ratio: 1.0
    }];
    const result = JSON.parse(trader.analyze(JSON.stringify(conditions)));
    assert.strictEqual(result.signals[0].action, "SKIP");
  });

  test("calculate_risk returns valid risk score", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({}));
    const result = JSON.parse(trader.calculate_risk(JSON.stringify({
      symbol: "ETH",
      volatility: 0.8,
      trend_strength: 0.1,
      mean_reversion: 0.3,
      volume_ratio: 2.0,
      risk_budget: 0.03,
      win_probability: 0.55,
      payoff_ratio: 1.5
    })));
    assert.ok(result.risk_score >= 0 && result.risk_score <= 1, `risk_score=${result.risk_score}`);
    assert.ok(result.kelly_fraction >= 0, "kelly >= 0");
    assert.ok(result.sharpe_ratio >= 0, "sharpe >= 0");
  });

  test("multi-asset allocation respects 25% cap", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({ totalBudget: 100000, maxPositionPct: 0.25 }));
    trader.initialize();
    const conditions = [];
    for (const sym of ["BTC", "ETH", "SOL", "AAPL"]) {
      conditions.push({
        symbol: sym,
        volatility: 0.4,
        trend_strength: 0.5,
        mean_reversion: 0.3,
        volume_ratio: 1.2,
        risk_budget: 0.02,
        win_probability: 0.6,
        payoff_ratio: 2.0
      });
    }
    const result = JSON.parse(trader.analyze(JSON.stringify(conditions)));
    for (const sig of result.signals) {
      assert.ok(sig.position_size <= 25001, `${sig.symbol} pos=${sig.position_size} exceeds 25%`);
    }
    assert.ok(result.total_allocated <= 100001, `total=${result.total_allocated}`);
  });

  // ── Agreement ROI tests ─────────────────────────────────────────
  console.log("\nAgreement ROI:");

  test("evaluate_agreement returns ROI for coaching agreement", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({}));
    const agreement = {
      name: "Agentics coaching (intro)",
      hourly_rate: 75,
      hours_contracted: 10,
      probability_of_payment: 0.85,
      cost_per_hour: 15,
      time_to_payment_days: 30,
      market_rate_low: 150,
      market_rate_high: 350
    };
    const result = JSON.parse(trader.evaluate_agreement(JSON.stringify(agreement)));
    assert.strictEqual(result.name, "Agentics coaching (intro)");
    assert.strictEqual(result.gross_revenue, 750);
    assert.strictEqual(result.net_profit, 600);
    assert.ok(result.roi_pct === 400, `roi=${result.roi_pct}`);
    assert.ok(result.expected_roi_pct === 340, `expected_roi=${result.expected_roi_pct}`);
    assert.ok(result.kelly_fraction > 0.8, `kelly=${result.kelly_fraction}`);
    assert.strictEqual(result.evidence_tier, "REAL");
    assert.strictEqual(result.evidence_score, 85);
  });

  test("evaluate_agreement upgrades to ACTUAL at 95% payment prob", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({}));
    const agreement = {
      name: "Signed contract",
      hourly_rate: 150,
      hours_contracted: 20,
      probability_of_payment: 0.95,
      cost_per_hour: 20,
      time_to_payment_days: 15,
      market_rate_low: 150,
      market_rate_high: 350
    };
    const result = JSON.parse(trader.evaluate_agreement(JSON.stringify(agreement)));
    assert.strictEqual(result.evidence_tier, "ACTUAL");
    assert.strictEqual(result.evidence_score, 100);
    assert.ok(result.recommendation.includes("STRONG"), result.recommendation);
  });

  test("evaluate_agreement shows PSEUDO for unsigned speculative", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({}));
    const agreement = {
      name: "Cold outreach",
      hourly_rate: 75,
      hours_contracted: 10,
      probability_of_payment: 0.2,
      cost_per_hour: 15,
      time_to_payment_days: 60,
      market_rate_low: 150,
      market_rate_high: 350
    };
    const result = JSON.parse(trader.evaluate_agreement(JSON.stringify(agreement)));
    assert.strictEqual(result.evidence_tier, "PSEUDO");
    assert.strictEqual(result.evidence_score, 20);
  });

  test("evaluate_agreement SKIP on negative profit", () => {
    const trader = new wasm.NeuralTrader(JSON.stringify({}));
    const agreement = {
      name: "Below-cost work",
      hourly_rate: 10,
      hours_contracted: 10,
      probability_of_payment: 0.9,
      cost_per_hour: 50,
      time_to_payment_days: 30,
      market_rate_low: 150,
      market_rate_high: 350
    };
    const result = JSON.parse(trader.evaluate_agreement(JSON.stringify(agreement)));
    assert.ok(result.net_profit < 0, `net_profit=${result.net_profit}`);
    assert.ok(result.recommendation.includes("SKIP"), result.recommendation);
  });
}

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);
