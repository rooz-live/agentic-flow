import * as fs from 'fs';
import * as readline from 'readline';
import * as yaml from 'yaml';

export interface PatternEvent {
  ts?: string;
  pattern?: string;
  gate?: string;
  run?: string;
  circle?: string;
  category?: string;
  fix_proposal?: string;
  [key: string]: any;
}

export async function readJsonl<T = any>(filePath: string): Promise<T[]> {
  const results: T[] = [];
  if (!fs.existsSync(filePath)) return results;

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
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

export function summarizePatterns(patterns: PatternEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ev of patterns) {
    const key = ev.pattern || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function getActionKeys(goalieDir: string): Set<string> {
  const actionsPath = `${goalieDir}/OBSERVABILITY_ACTIONS.yaml`;
  const keys = new Set<string>();
  if (!fs.existsSync(actionsPath)) return keys;
  try {
    const raw = fs.readFileSync(actionsPath, 'utf8');
    const doc: any = yaml.parse(raw) || {};
    const items: any[] = doc.items || [];
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

export class PatternBaselineDelta {
  pattern!: string;
  circle!: string;
  depth!: number;
  baselineScore?: number;
  currentScore?: number;
  delta?: number;
  deltaPct?: number;
}

export function computeCodBaselineDeltas(patterns: PatternEvent[]): PatternBaselineDelta[] {
  type Acc = {
    pattern: string;
    circle: string;
    depth: number;
    firstTs?: number;
    lastTs?: number;
    firstCod?: number;
    lastCod?: number;
  };

  const byKey = new Map<string, Acc>();

  for (const ev of patterns) {
    const pattern = ev.pattern || 'unknown';
    const circle = String(ev.circle ?? '<none>');
    const depth = typeof (ev as any).depth === 'number' ? (ev as any).depth : 0;
    const tsStr = (ev.ts || (ev as any).timestamp) as string | undefined;
    const ts = tsStr ? Date.parse(tsStr) : Number.NaN;
    const cod =
      (ev as any).economic && typeof (ev as any).economic.cod === 'number'
        ? (ev as any).economic.cod
        : undefined;
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

  const results: PatternBaselineDelta[] = [];
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
