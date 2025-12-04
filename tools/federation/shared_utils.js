import * as fs from 'fs';
import * as readline from 'readline';
import * as yaml from 'yaml';

// Runtime placeholders so ESM import names exist; TS uses these as types only.
export class PatternEvent {}
export class MetricsEvent {}
export class PatternBaselineDelta {}

export async function readJsonl(filePath) {
  const results = [];
  if (!fs.existsSync(filePath)) return results;

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      results.push(JSON.parse(line));
    } catch {
      // ignore malformed lines
    }
  }

  return results;
}

export function summarizePatterns(patterns) {
  const counts = new Map();
  for (const ev of patterns) {
    const key = ev.pattern || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function getActionKeys(goalieDir) {
  const actionsPath = `${goalieDir}/OBSERVABILITY_ACTIONS.yaml`;
  const keys = new Set();
  if (!fs.existsSync(actionsPath)) return keys;

  try {
    const raw = fs.readFileSync(actionsPath, 'utf8');
    const doc = yaml.parse(raw) || {};
    const items = doc.items || [];
    for (const it of items) {
      const circle = it.circle || '<none>';
      const depth = typeof it.depth === 'number' ? it.depth : 0;
      keys.add(`${circle}|${depth}`);
    }
  } catch {
    // ignore YAML errors
  }

  return keys;
}

export function computeCodBaselineDeltas(patterns) {
  const byKey = new Map();

  for (const ev of patterns) {
    const pattern = ev.pattern || 'unknown';
    const circle = String(ev.circle ?? '<none>');
    const depth = typeof ev.depth === 'number' ? ev.depth : 0;
    const tsStr = ev.ts || ev.timestamp;
    const ts = tsStr ? Date.parse(tsStr) : Number.NaN;
    const economic = ev.economic;
    const cod = economic && typeof economic.cod === 'number' ? economic.cod : undefined;
    const key = `${pattern}|${circle}|${depth}`;

    let acc = byKey.get(key);
    if (!acc) {
      acc = { pattern, circle, depth };
      byKey.set(key, acc);
    }

    if (!Number.isNaN(ts)) {
      if (acc.firstTs === undefined || ts < acc.firstTs) {
        acc.firstTs = ts;
        if (cod !== undefined) acc.firstCod = cod;
      }
      if (acc.lastTs === undefined || ts > acc.lastTs) {
        acc.lastTs = ts;
        if (cod !== undefined) acc.lastCod = cod;
      }
    }
  }

  const results = [];
  for (const acc of byKey.values()) {
    const baselineScore = acc.firstCod;
    const currentScore = acc.lastCod;
    if (
      baselineScore === undefined ||
      currentScore === undefined ||
      baselineScore === 0
    ) {
      continue;
    }
    const delta = currentScore - baselineScore;
    const deltaPct = (delta / baselineScore) * 100;
    results.push({
      pattern: acc.pattern,
      circle: acc.circle,
      depth: acc.depth,
      baselineScore,
      currentScore,
      delta,
      deltaPct,
    });
  }

  return results;
}
