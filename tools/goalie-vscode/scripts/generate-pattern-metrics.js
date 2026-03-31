#!/usr/bin/env node
/*
 * Generates representative pattern_metrics.jsonl fixtures that cover
 * TensorFlow, PyTorch, multi-node HPC, and Stats anomaly workloads so the VSIX
 * workload lenses/renderers can be exercised locally.
 */
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const map = new Map();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      map.set(arg, next);
      i += 1;
    } else {
      map.set(arg, true);
    }
  }
  return map;
}

function getArg(args, key, defaultValue) {
  if (!args.has(key)) return defaultValue;
  const value = args.get(key);
  if (value === true) return true;
  return value;
}

const args = parseArgs();
const workspaceRoot = process.cwd();
const defaultGoalieDir = path.resolve(workspaceRoot, 'investing', 'agentic-flow', '.goalie');
const goalieDir = path.resolve(getArg(args, '--goalie-dir', defaultGoalieDir));
const outputFile = path.resolve(getArg(args, '--output', path.join(goalieDir, 'pattern_metrics.jsonl')));
const mode = getArg(args, '--mode', 'append'); // append | overwrite
const samplesPerWorkload = parseInt(getArg(args, '--per-workload', '4'), 10) || 4;

if (!fs.existsSync(goalieDir)) {
  fs.mkdirSync(goalieDir, { recursive: true });
}

function randomBetween(min, max, precision = 2) {
  const raw = Math.random() * (max - min) + min;
  const factor = 10 ** precision;
  return Math.round(raw * factor) / factor;
}

function futureTimestamp(minutesAhead) {
  const ts = new Date(Date.now() + minutesAhead * 60 * 1000);
  return ts.toISOString();
}

function buildTensorFlowFixtures(count) {
  const fixtures = [];
  for (let i = 0; i < count; i += 1) {
    fixtures.push({
      pattern: 'ml-training-guardrail',
      circle: 'model-training',
      depth: 1 + (i % 2),
      framework: 'tensorflow',
      tags: ['ML', 'tpus', 'distribution-check'],
      host: 'tpu-v4-pod',
      gpu_util_pct: randomBetween(70, 98),
      p99_latency_ms: randomBetween(80, 260),
      economic: {
        cod: randomBetween(800, 2400),
        wsjf_score: randomBetween(6, 12),
      },
      ts: futureTimestamp(i * 3),
    });
  }
  fixtures.push({
    pattern: 'tf-distribution-check',
    circle: 'model-training',
    depth: 2,
    framework: 'tensorflow',
    tags: ['ML', 'distribution-shift'],
    host: 'tpu-v5-lite',
    p99_latency_ms: randomBetween(120, 400),
    economic: { cod: randomBetween(600, 1600), wsjf_score: randomBetween(5, 9) },
    ts: futureTimestamp(count * 3 + 5),
  });
  return fixtures;
}

function buildPyTorchFixtures(count) {
  const fixtures = [];
  for (let i = 0; i < count; i += 1) {
    fixtures.push({
      pattern: 'torch-grad-stability',
      circle: 'model-training',
      depth: 3,
      framework: 'pytorch',
      tags: ['ML', 'nan-gradients'],
      host: 'a100-cluster',
      gpu_util_pct: randomBetween(55, 95),
      p99_latency_ms: randomBetween(250, 700),
      economic: {
        cod: randomBetween(500, 1500),
        wsjf_score: randomBetween(4, 9),
      },
      ts: futureTimestamp(15 + i * 4),
    });
  }
  fixtures.push({
    pattern: 'oom-recovery',
    circle: 'model-training',
    depth: 2,
    framework: 'pytorch',
    tags: ['ML', 'memory'],
    host: 'h100-lab',
    gpu_util_pct: randomBetween(40, 60),
    economic: { cod: randomBetween(900, 2600), wsjf_score: randomBetween(3, 7) },
    ts: futureTimestamp(45 + count * 4),
  });
  return fixtures;
}

function buildHpcFixtures(count) {
  const schedulers = ['slurm', 'lsf', 'kubernetes'];
  const fixtures = [];
  for (let i = 0; i < count; i += 1) {
    const scheduler = schedulers[i % schedulers.length];
    const nodeCount = 8 * (i + 2);
    fixtures.push({
      pattern: 'hpc-batch-window',
      circle: 'simulation',
      depth: 1,
      scheduler,
      node_count: nodeCount,
      queue_time_sec: randomBetween(900, 5400, 0),
      gpu_util_pct: randomBetween(25, 80),
      p99_latency_ms: randomBetween(1500, 6000, 0),
      tags: ['HPC', 'queue-latency'],
      economic: {
        cod: randomBetween(2500, 7000),
        computeCost: randomBetween(600, 1800),
        wsjf_score: randomBetween(10, 18),
      },
      ts: futureTimestamp(60 + i * 6),
    });
  }
  fixtures.push({
    pattern: 'cluster-fragmentation',
    circle: 'simulation',
    depth: 2,
    scheduler: 'slurm',
    node_count: 96,
    queue_time_sec: randomBetween(1800, 3600, 0),
    gpu_util_pct: randomBetween(10, 40),
    tags: ['HPC', 'fragmentation'],
    economic: { cod: randomBetween(3000, 8000), computeCost: randomBetween(800, 1600) },
    ts: futureTimestamp(60 + count * 6 + 5),
  });
  return fixtures;
}

function buildStatsFixtures(count) {
  const patterns = ['stat-robustness-sweep', 'multiple-testing-correction', 'data-leakage-detection'];
  const fixtures = [];
  for (let i = 0; i < count; i += 1) {
    const pattern = patterns[i % patterns.length];
    fixtures.push({
      pattern,
      circle: 'analytics',
      depth: 3,
      tags: ['Stats', 'analysis'],
      host: 'analytics-airflow',
      economic: {
        cod: randomBetween(200, 900),
        wsjf_score: randomBetween(1, 4),
      },
      ts: futureTimestamp(120 + i * 5),
    });
  }
  fixtures.push({
    pattern: 'outlier-sensitivity',
    circle: 'analytics',
    depth: 2,
    tags: ['Stats', 'device/web'],
    economic: { cod: randomBetween(150, 500), wsjf_score: randomBetween(1, 3) },
    ts: futureTimestamp(120 + count * 5 + 5),
  });
  return fixtures;
}

function dedupeBySignature(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const key = [entry.pattern, entry.circle, entry.depth, entry.ts || 'na'].join('|');
    if (seen.has(key)) continue;
    seen.set(key, entry);
  }
  return Array.from(seen.values());
}

function loadExisting(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (err) {
        console.warn('[generate-pattern-metrics] Skipping malformed line:', err.message);
        return undefined;
      }
    })
    .filter(Boolean);
}

function main() {
  const existing = mode === 'append' ? loadExisting(outputFile) : [];
  const generated = [
    ...buildTensorFlowFixtures(samplesPerWorkload),
    ...buildPyTorchFixtures(samplesPerWorkload),
    ...buildHpcFixtures(samplesPerWorkload),
    ...buildStatsFixtures(Math.max(2, Math.round(samplesPerWorkload / 2))),
  ];

  const merged = dedupeBySignature([...existing, ...generated]);
  const payload = merged.map(obj => JSON.stringify(obj)).join('\n') + '\n';
  fs.writeFileSync(outputFile, payload, 'utf8');

  console.log(
    `[generate-pattern-metrics] Wrote ${generated.length} new fixtures (${merged.length} total) to ${outputFile}`,
  );
  console.log(`[generate-pattern-metrics] Mode=${mode}, per-workload=${samplesPerWorkload}`);
}

main();
