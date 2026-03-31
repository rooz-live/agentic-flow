/**
 * Neural Trader — Server Smoke Tests
 *
 * Verifies all REST endpoints of the paper-trading server.
 * Runs the server on a random port, exercises each endpoint, shuts down.
 *
 * Run: node --test packages/neural-trader/tests/server.test.js
 */

const assert = require("assert");
const http = require("http");
const { execFile } = require("child_process");
const path = require("path");

const SERVER = path.join(__dirname, "..", "server.js");
const PORT = 19099 + Math.floor(Math.random() * 900);

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://localhost:${PORT}${urlPath}`, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      })
      .on("error", reject);
  });
}

function post(urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { hostname: "localhost", port: PORT, path: urlPath, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": data.length } },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(buf) });
          } catch {
            resolve({ status: res.statusCode, body: buf });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

let serverProc;

// Start server before tests
async function setup() {
  return new Promise((resolve, reject) => {
    serverProc = execFile("node", [SERVER, "--mode", "paper-trading"], {
      env: { ...process.env, PORT: String(PORT), SIGNAL_INTERVAL: "999999" },
    });
    serverProc.stderr.on("data", (d) => process.stderr.write(d));
    // Wait for server to start
    let retries = 0;
    const check = setInterval(() => {
      http
        .get(`http://localhost:${PORT}/health`, (res) => {
          clearInterval(check);
          resolve();
        })
        .on("error", () => {
          if (++retries > 30) {
            clearInterval(check);
            reject(new Error("Server failed to start"));
          }
        });
    }, 100);
  });
}

function teardown() {
  if (serverProc) serverProc.kill("SIGTERM");
}

// ── Tests ───────────────────────────────────────────────────────────

async function runTests() {
  let passed = 0;
  let failed = 0;

  function ok(name, condition, detail) {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.log(`  ✗ ${name}: ${detail || "assertion failed"}`);
      failed++;
    }
  }

  console.log(`neural-trader server smoke tests (port ${PORT})\n`);

  try {
    await setup();
  } catch (e) {
    console.error("Setup failed:", e.message);
    process.exit(1);
  }

  try {
    // GET /health
    const health = await get("/health");
    ok("GET /health returns 200", health.status === 200);
    ok("health.status is healthy", health.body.status === "healthy");
    ok("health.version is 2.8.0", health.body.version === "2.8.0");
    ok("health.mode is paper-trading", health.body.mode === "paper-trading");
    ok("health.engine is kelly-sharpe-v1", health.body.engine === "kelly-sharpe-v1");

    // GET /signals
    const signals = await get("/signals");
    ok("GET /signals returns 200", signals.status === 200);
    ok("signals has array", Array.isArray(signals.body.signals));
    ok("signals has 4 symbols", signals.body.signals.length === 4);
    ok("signals has portfolio_sharpe", typeof signals.body.portfolio_sharpe === "number");
    ok("first signal has symbol", typeof signals.body.signals[0].symbol === "string");
    ok("first signal has action", ["BUY", "SELL", "HOLD", "SKIP"].includes(signals.body.signals[0].action));
    ok("first signal has kelly_fraction", signals.body.signals[0].kelly_fraction >= 0);

    // GET /portfolio
    const portfolio = await get("/portfolio");
    ok("GET /portfolio returns 200", portfolio.status === 200);
    ok("portfolio has mode", portfolio.body.mode === "paper-trading");
    ok("portfolio has positions", Array.isArray(portfolio.body.positions));
    ok("total_allocated > 0", portfolio.body.total_allocated > 0);

    // POST /risk
    const risk = await post("/risk", {
      symbol: "BTC",
      volatility: 0.65,
      trend_strength: 0.4,
      mean_reversion: 0.15,
      volume_ratio: 1.3,
      risk_budget: 0.02,
      win_probability: 0.58,
      payoff_ratio: 2.1,
    });
    ok("POST /risk returns 200", risk.status === 200);
    ok("risk_score in [0,1]", risk.body.risk_score >= 0 && risk.body.risk_score <= 1);
    ok("kelly_fraction >= 0", risk.body.kelly_fraction >= 0);
    ok("sharpe_ratio >= 0", risk.body.sharpe_ratio >= 0);

    // POST /analyze
    const analyze = await post("/analyze", [
      { symbol: "TEST", volatility: 0.3, trend_strength: 0.5, mean_reversion: 0.2, volume_ratio: 1.0, risk_budget: 0.02, win_probability: 0.6, payoff_ratio: 2.0 },
    ]);
    ok("POST /analyze returns 200", analyze.status === 200);
    ok("analyze has signals", Array.isArray(analyze.body.signals));
    ok("analyze first signal is BUY", analyze.body.signals[0].action === "BUY");

    // GET /metrics
    const metrics = await get("/metrics");
    ok("GET /metrics returns 200", metrics.status === 200);
    ok("metrics has dpc", typeof metrics.body.dpc === "object");

    // 404 for unknown
    const notFound = await get("/nonexistent");
    ok("unknown path returns 404", notFound.status === 404);
  } finally {
    teardown();
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error(e);
  teardown();
  process.exit(1);
});
