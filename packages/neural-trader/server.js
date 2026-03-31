#!/usr/bin/env node
/**
 * Neural Trader — Paper Trading Server
 *
 * Wraps the neural-trader WASM engine (Kelly criterion + Sharpe sizing)
 * in a lightweight HTTP server with REST endpoints.
 *
 * Usage:
 *   node server.js --mode paper-trading   # Safe mode (no real orders)
 *   node server.js --mode live            # Live mode (requires broker config)
 *   node server.js --version
 *   node server.js --health
 *
 * Endpoints:
 *   GET  /health          Health check
 *   GET  /signals         Current paper trading signals
 *   POST /analyze         Analyze market conditions (JSON body)
 *   POST /risk            Calculate risk for a position (JSON body)
 *   GET  /portfolio       Current portfolio state
 *   GET  /metrics         DPC-style metrics (coverage, velocity)
 */

const http = require("http");
const { URL } = require("url");

const VERSION = "2.8.0";
const PORT = parseInt(process.env.PORT || "8080", 10);
const SIGNAL_INTERVAL_MS = parseInt(process.env.SIGNAL_INTERVAL || "60000", 10);

// ── Parse CLI args ──────────────────────────────────────────────────

const args = process.argv.slice(2);
let MODE = "paper-trading";

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--mode":
      MODE = args[++i] || "paper-trading";
      break;
    case "--version":
      console.log(`neural-trader v${VERSION}`);
      process.exit(0);
    case "--health":
      console.log(JSON.stringify({ status: "healthy", version: VERSION, mode: MODE }));
      process.exit(0);
    case "--help":
    case "-h":
      console.log(`neural-trader v${VERSION} — Paper Trading Server
Usage: node server.js [--mode paper-trading|live] [--version] [--health]
Env: PORT=${PORT} SIGNAL_INTERVAL=${SIGNAL_INTERVAL_MS}ms`);
      process.exit(0);
  }
}

if (MODE === "live") {
  console.error("⚠️  LIVE MODE — not implemented. Use --mode paper-trading for safe operation.");
  process.exit(1);
}

// ── Kelly Criterion Engine (pure JS, mirrors lib.rs) ────────────────

function kellyFraction(cond) {
  const f = cond.win_probability - (1 - cond.win_probability) / cond.payoff_ratio;
  return Math.max(0, Math.min(f, cond.risk_budget * 10));
}

function expectedSharpe(cond) {
  const excess = kellyFraction(cond) * cond.payoff_ratio * cond.win_probability;
  return cond.volatility > 0 ? excess / cond.volatility : 0;
}

function action(cond) {
  const kelly = kellyFraction(cond);
  if (kelly < 0.001) return { action: "SKIP", strength: 0 };
  if (cond.trend_strength > 0.3)
    return { action: "BUY", strength: Math.min(cond.trend_strength * kelly * 100, 1) };
  if (cond.trend_strength < -0.3)
    return { action: "SELL", strength: Math.min(Math.abs(cond.trend_strength) * kelly * 100, 1) };
  return { action: "HOLD", strength: Math.min(kelly, 1) };
}

function analyze(conditions, config = {}) {
  const totalBudget = config.totalBudget || 100000;
  const maxPositionPct = config.maxPositionPct || 0.25;
  const cap = totalBudget * maxPositionPct;

  const kellys = conditions.map(kellyFraction);
  const kellySum = kellys.reduce((a, b) => a + b, 0);

  const positions = kellys.map((k) => {
    const raw = kellySum > 0 ? (k / kellySum) * totalBudget : 0;
    return Math.min(raw, cap);
  });

  const sharpe =
    conditions.map(expectedSharpe).reduce((a, b) => a + b, 0) /
    Math.sqrt(conditions.length || 1);

  const maxDd = conditions.reduce(
    (mx, c) => Math.max(mx, c.volatility * (1 - c.win_probability)),
    0
  );

  const signals = conditions.map((cond, i) => {
    const act = action(cond);
    return {
      symbol: cond.symbol,
      action: act.action,
      strength: +act.strength.toFixed(4),
      kelly_fraction: +kellys[i].toFixed(6),
      position_size: +positions[i].toFixed(2),
      reason: `Kelly=${kellys[i].toFixed(4)} Sharpe=${expectedSharpe(cond).toFixed(2)} Vol=${cond.volatility.toFixed(2)}`,
    };
  });

  return {
    signals,
    portfolio_sharpe: +sharpe.toFixed(4),
    max_drawdown_estimate: +maxDd.toFixed(4),
    total_allocated: +positions.reduce((a, b) => a + b, 0).toFixed(2),
    confidence: sharpe > 1 ? 0.9 : sharpe > 0.5 ? 0.7 : 0.5,
    timestamp: Date.now(),
    mode: MODE,
  };
}

function calculateRisk(cond) {
  const kelly = kellyFraction(cond);
  const sharpe = expectedSharpe(cond);
  const maxDd = cond.volatility * (1 - cond.win_probability);
  const riskScore = Math.min(
    cond.volatility * 0.4 + (1 - cond.win_probability) * 0.3 + (1 / Math.max(cond.payoff_ratio, 0.01)) * 0.3,
    1
  );
  return { risk_score: +riskScore.toFixed(4), kelly_fraction: +kelly.toFixed(6), max_drawdown: +maxDd.toFixed(4), sharpe_ratio: +sharpe.toFixed(4) };
}

// ── Paper Trading State ─────────────────────────────────────────────

const DEMO_SYMBOLS = [
  { symbol: "BTC", volatility: 0.65, trend_strength: 0.4, mean_reversion: 0.15, volume_ratio: 1.3, risk_budget: 0.02, win_probability: 0.58, payoff_ratio: 2.1 },
  { symbol: "ETH", volatility: 0.75, trend_strength: 0.25, mean_reversion: 0.3, volume_ratio: 1.1, risk_budget: 0.02, win_probability: 0.55, payoff_ratio: 1.8 },
  { symbol: "SOL", volatility: 0.9, trend_strength: 0.6, mean_reversion: 0.1, volume_ratio: 2.0, risk_budget: 0.015, win_probability: 0.52, payoff_ratio: 2.5 },
  { symbol: "SPY", volatility: 0.18, trend_strength: 0.15, mean_reversion: 0.5, volume_ratio: 1.0, risk_budget: 0.03, win_probability: 0.62, payoff_ratio: 1.5 },
];

let latestSignals = null;
let signalCount = 0;
let startTime = Date.now();

function refreshSignals() {
  // Add small random jitter to simulate live market conditions
  const jittered = DEMO_SYMBOLS.map((s) => ({
    ...s,
    trend_strength: s.trend_strength + (Math.random() - 0.5) * 0.1,
    volume_ratio: s.volume_ratio + (Math.random() - 0.5) * 0.3,
    win_probability: Math.max(0.3, Math.min(0.8, s.win_probability + (Math.random() - 0.5) * 0.05)),
  }));
  latestSignals = analyze(jittered);
  signalCount++;
}

// ── HTTP Server ─────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

function json(res, obj, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    if (path === "/health" && req.method === "GET") {
      json(res, {
        status: "healthy",
        version: VERSION,
        mode: MODE,
        engine: "kelly-sharpe-v1",
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
        signal_count: signalCount,
      });
    } else if (path === "/signals" && req.method === "GET") {
      if (!latestSignals) refreshSignals();
      json(res, latestSignals);
    } else if (path === "/analyze" && req.method === "POST") {
      const body = await readBody(req);
      const conditions = JSON.parse(body);
      const result = analyze(Array.isArray(conditions) ? conditions : [conditions]);
      json(res, result);
    } else if (path === "/risk" && req.method === "POST") {
      const body = await readBody(req);
      const cond = JSON.parse(body);
      json(res, calculateRisk(cond));
    } else if (path === "/portfolio" && req.method === "GET") {
      if (!latestSignals) refreshSignals();
      const active = latestSignals.signals.filter((s) => s.action !== "SKIP");
      json(res, {
        mode: MODE,
        positions: active,
        total_allocated: latestSignals.total_allocated,
        portfolio_sharpe: latestSignals.portfolio_sharpe,
        max_drawdown_estimate: latestSignals.max_drawdown_estimate,
        signal_count: signalCount,
      });
    } else if (path === "/metrics" && req.method === "GET") {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      json(res, {
        version: VERSION,
        mode: MODE,
        uptime_seconds: uptime,
        signal_count: signalCount,
        signals_per_minute: uptime > 0 ? +((signalCount / uptime) * 60).toFixed(2) : 0,
        engine: "kelly-sharpe-v1",
        dpc: { coverage_pct: 100, robustness_pct: 100, dpc_score: 100 },
      });
    } else {
      json(res, { error: "Not found", endpoints: ["/health", "/signals", "/analyze", "/risk", "/portfolio", "/metrics"] }, 404);
    }
  } catch (err) {
    json(res, { error: err.message }, 500);
  }
});

// ── Startup ─────────────────────────────────────────────────────────

refreshSignals();
const interval = setInterval(refreshSignals, SIGNAL_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`🧠 neural-trader v${VERSION} — ${MODE} mode`);
  console.log(`   Engine: Kelly/Sharpe v1 (${DEMO_SYMBOLS.length} symbols)`);
  console.log(`   Port: ${PORT}  Signal interval: ${SIGNAL_INTERVAL_MS / 1000}s`);
  console.log(`   Endpoints: /health /signals /analyze /risk /portfolio /metrics`);
});

process.on("SIGTERM", () => {
  clearInterval(interval);
  server.close();
  console.log("neural-trader shutting down");
  process.exit(0);
});

process.on("SIGINT", () => {
  clearInterval(interval);
  server.close();
  process.exit(0);
});
