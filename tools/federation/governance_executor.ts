import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

interface CodeFixProposal {
  pattern: string;
  description?: string;
  codeSnippet?: string;
  configSnippet?: string;
  testSnippet?: string;
  filePath?: string;
  mode?: 'dry-run' | 'apply';
  approvalRequired?: boolean;
  approverRole?: string;
  actionId?: string;
}

interface GuardrailSnapshot {
  autocommit: boolean;
  autoApplyEnabled: boolean;
  verifiedRate: number | null;
  verifiedThreshold: number;
  cpuPct: number | null;
  cpuThreshold: number;
  freeDiskGb: number | null;
  minDiskGb: number;
  blockedReasons: string[];
}

interface ExecutorSummary {
  runId?: string;
  attempted: number;
  applied: number;
  planned: number;
  skipped: number;
  failed: number;
  failureRate: number;
  rollback: boolean;
  guardrails: GuardrailSnapshot;
}

function getVerifiedRate(goalieDir: string): number | null {
  const retroPath = path.join(goalieDir, 'retro_coach.json');
  if (!fs.existsSync(retroPath)) return null;
  try {
    const raw = fs.readFileSync(retroPath, 'utf8');
    const data = JSON.parse(raw);
    const verified = Number(data?.insightsSummary?.verifiedCount ?? 0);
    const total = Number(data?.insightsSummary?.totalActions ?? 0);
    if (Number.isFinite(verified) && Number.isFinite(total) && total > 0) {
      return verified / total;
    }
  } catch {
    // ignore
  }
  return null;
}

function getCpuPercent(): number | null {
  const avg = os.loadavg?.()[0];
  const cores = os.cpus?.().length || 1;
  if (!avg || !Number.isFinite(avg) || cores <= 0) return null;
  return (avg / cores) * 100;
}

function getFreeDiskGb(dir: string): number | null {
  try {
    const out = execSync(`df -k "${dir}" | tail -1`, { encoding: 'utf8' });
    const parts = out.trim().split(/\s+/);
    const availableKb = parseInt(parts[3], 10);
    if (!Number.isNaN(availableKb)) {
      return availableKb / (1024 * 1024);
    }
  } catch {
    // ignore
  }
  return null;
}

async function readGovernanceJsonFromStdin(): Promise<any> {
  if (process.stdin.isTTY) {
    throw new Error('governance_executor: expected governance_agent JSON on stdin');
  }
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(String(chunk));
  }
  const text = chunks.join('');
  return text ? JSON.parse(text) : {};
}

async function applyProposals(
  proposals: CodeFixProposal[],
  opts: { dryRun: boolean; rootDir: string; safePatterns: Set<string>; executorLog: string; maxFailureRate: number },
): Promise<ExecutorSummary> {
  const touchedFiles = new Map<string, string | null>();
  let attempted = 0;
  let applied = 0;
  let planned = 0;
  let skipped = 0;
  let failed = 0;

  const nowIso = () => new Date().toISOString();
  const runId = process.env.AF_RUN_ID || undefined;
  const writeLog = async (entry: any) => {
    const base = runId ? { runId, ...entry } : entry;
    await fs.promises.mkdir(path.dirname(opts.executorLog), { recursive: true });
    await fs.promises.appendFile(opts.executorLog, JSON.stringify(base) + '\n', 'utf8');
  };

  for (const p of proposals) {
    if (p.mode !== 'apply' || p.approvalRequired) {
      skipped += 1;
      continue;
    }
    if (!opts.safePatterns.has(p.pattern)) {
      skipped += 1;
      await writeLog({
        timestamp: nowIso(),
        pattern: p.pattern,
        filePath: p.filePath,
        actionId: p.actionId,
        status: 'skipped',
        reason: 'pattern-not-safe',
      });
      continue;
    }

    const snippet = p.testSnippet || p.configSnippet || p.codeSnippet;
    if (!p.filePath || !snippet) {
      skipped += 1;
      await writeLog({
        timestamp: nowIso(),
        pattern: p.pattern,
        filePath: p.filePath,
        actionId: p.actionId,
        status: 'skipped',
        reason: 'missing-snippet-or-path',
      });
      continue;
    }

    attempted += 1;
    const absPath = path.resolve(opts.rootDir, p.filePath);
    const baseLog = {
      timestamp: nowIso(),
      pattern: p.pattern,
      filePath: absPath,
      actionId: p.actionId,
      mode: p.mode,
      approvalRequired: p.approvalRequired ?? true,
      dryRun: opts.dryRun,
    };

    if (opts.dryRun) {
      planned += 1;
      await writeLog({ ...baseLog, status: 'planned' });
      continue;
    }

    try {
      if (!touchedFiles.has(absPath)) {
        const original = fs.existsSync(absPath)
          ? await fs.promises.readFile(absPath, 'utf8')
          : null;
        touchedFiles.set(absPath, original);
      }

      const current = fs.existsSync(absPath)
        ? await fs.promises.readFile(absPath, 'utf8')
        : '';
      if (current.includes(snippet)) {
        skipped += 1;
        await writeLog({ ...baseLog, status: 'skipped', reason: 'snippet-already-present' });
        continue;
      }

      const next = current.length ? `${current.trimEnd()}\n\n${snippet}\n` : `${snippet}\n`;
      await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
      await fs.promises.writeFile(absPath, next, 'utf8');
      applied += 1;
      await writeLog({ ...baseLog, status: 'applied' });
    } catch (err: any) {
      failed += 1;
      await writeLog({ ...baseLog, status: 'failed', error: String(err?.message || err) });
    }
  }

  const total = attempted || 1;
  const failureRate = total > 0 ? (failed / total) * 100 : 0;
  let rollback = false;

  if (!opts.dryRun && attempted > 0 && failureRate >= opts.maxFailureRate && touchedFiles.size) {
    rollback = true;
    for (const [file, original] of touchedFiles.entries()) {
      try {
        if (original === null) {
          if (fs.existsSync(file)) await fs.promises.unlink(file);
        } else {
          await fs.promises.writeFile(file, original, 'utf8');
        }
      } catch {
        // ignore rollback errors
      }
    }
  }

  return {
    runId,
    attempted,
    applied,
    planned,
    skipped,
    failed,
    failureRate,
    rollback,
    guardrails: {
      autocommit: process.env.AF_ALLOW_CODE_AUTOCOMMIT === '1',
      autoApplyEnabled: process.env.AF_GOVERNANCE_AUTO_APPLY_ENABLED === '1',
      verifiedRate: null,
      verifiedThreshold: parseFloat(process.env.AF_GOVERNANCE_AUTO_APPLY_VERIFIED_THRESHOLD || '0') || 0,
      cpuPct: null,
      cpuThreshold: parseInt(process.env.AF_EXECUTOR_CPU_THRESHOLD || '0', 10) || 0,
      freeDiskGb: null,
      minDiskGb: parseFloat(process.env.AF_EXECUTOR_MIN_DISK_GB || '0') || 0,
      blockedReasons: [],
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const payload = await readGovernanceJsonFromStdin();
  const goalieDir = typeof payload.goalieDir === 'string'
    ? payload.goalieDir
    : path.join(process.cwd(), '.goalie');

  const verifiedRate = getVerifiedRate(goalieDir);
  const verifiedThreshold = parseFloat(process.env.AF_GOVERNANCE_AUTO_APPLY_VERIFIED_THRESHOLD || '0') || 0;
  const cpuPct = getCpuPercent();
  const cpuThreshold = parseInt(process.env.AF_EXECUTOR_CPU_THRESHOLD || '0', 10) || 0;
  const freeDiskGb = getFreeDiskGb(goalieDir);
  const minDiskGb = parseFloat(process.env.AF_EXECUTOR_MIN_DISK_GB || '0') || 0;
  const maxFailureRate = parseFloat(process.env.AF_EXECUTOR_MAX_FAILURE_RATE || '50') || 50;

  const safePatternsEnv = process.env.AF_GOVERNANCE_AUTO_APPLY_SAFE_PATTERNS || '';
  const safePatterns = new Set(
    safePatternsEnv
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0),
  );

  const autocommit = process.env.AF_ALLOW_CODE_AUTOCOMMIT === '1';
  const autoApplyEnabled = process.env.AF_GOVERNANCE_AUTO_APPLY_ENABLED === '1';

  const blockedReasons: string[] = [];
  if (!autocommit) blockedReasons.push('AF_ALLOW_CODE_AUTOCOMMIT!=1');
  if (!autoApplyEnabled) blockedReasons.push('AF_GOVERNANCE_AUTO_APPLY_ENABLED!=1');
  if (verifiedThreshold > 0 && (verifiedRate ?? 0) < verifiedThreshold) blockedReasons.push('verifiedRate-below-threshold');
  if (cpuThreshold > 0 && (cpuPct ?? 0) >= cpuThreshold) blockedReasons.push('cpu-threshold-exceeded');
  if (minDiskGb > 0 && (freeDiskGb ?? 0) < minDiskGb) blockedReasons.push('disk-below-minimum');

  let summary: ExecutorSummary;
  if (blockedReasons.length) {
    summary = {
      attempted: 0,
      applied: 0,
      planned: 0,
      skipped: 0,
      failed: 0,
      failureRate: 0,
      rollback: false,
      guardrails: {
        autocommit,
        autoApplyEnabled,
        verifiedRate,
        verifiedThreshold,
        cpuPct,
        cpuThreshold,
        freeDiskGb,
        minDiskGb,
        blockedReasons,
      },
    };
    console.error('governance_executor: guardrail block', blockedReasons.join(', '));
  } else {
    const executorLog = path.join(goalieDir, 'executor_log.jsonl');
    summary = await applyProposals(payload.codeFixProposals || [], {
      dryRun,
      rootDir: process.cwd(),
      safePatterns,
      executorLog,
      maxFailureRate,
    });
    summary.guardrails = {
      autocommit,
      autoApplyEnabled,
      verifiedRate,
      verifiedThreshold,
      cpuPct,
      cpuThreshold,
      freeDiskGb,
      minDiskGb,
      blockedReasons: [],
    };
  }

  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');

  if (!blockedReasons.length && summary.rollback) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('governance_executor: fatal error', err);
  process.exitCode = 1;
});

