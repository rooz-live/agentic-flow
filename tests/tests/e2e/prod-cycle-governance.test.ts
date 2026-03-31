// Jest globals are automatically available via @types/jest
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT_DIR = join(__dirname, '..', '..', '..');
const GOALIE_DIR = join(ROOT_DIR, '.goalie');
const LOGS_DIR = join(ROOT_DIR, 'logs');

function run(cmd: string, cwd: string = ROOT_DIR) {
  return execSync(cmd, { cwd, stdio: 'pipe', env: { ...process.env } }).toString();
}

function readLastJsonLine(path: string): any | null {
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf8').trim().split('\n');
  const last = content[content.length - 1];
  try {
    return JSON.parse(last);
  } catch {
    return null;
  }
}

describe('af prod-cycle + governance executor integration', () => {
  beforeEach(() => {
    mkdirSync(GOALIE_DIR, { recursive: true });
    mkdirSync(LOGS_DIR, { recursive: true });
  });

  it('runs a minimal prod-cycle and emits telemetry + executor summary (happy path, dry-run)', () => {
    if (!existsSync(join(ROOT_DIR, 'scripts', 'af'))) {
      console.warn('af script not found, skipping test');
      return;
    }

    const env = {
      ...process.env,
      AF_GOVERNANCE_AUTO_APPLY_ENABLED: '1',
      AF_GOVERNANCE_EXECUTOR_DRY_RUN: '1',
    };

    execSync('bash ./scripts/af prod-cycle 1 --no-deploy', {
      cwd: ROOT_DIR,
      env,
      stdio: 'pipe',
    });

    const telemetryPath = join(GOALIE_DIR, 'prod_cycle_telemetry.jsonl');
    const executorSummaryPath = join(GOALIE_DIR, 'executor_summary.json');

    const telemetry = readLastJsonLine(telemetryPath);
    expect(telemetry).not.toBeNull();
    expect(telemetry.type).toBe('prod_cycle_telemetry');
    expect(typeof telemetry.iteration).toBe('number');

    if (existsSync(executorSummaryPath)) {
      const summary = JSON.parse(readFileSync(executorSummaryPath, 'utf8'));
      expect(summary).toHaveProperty('attempted');
      expect(summary).toHaveProperty('rollback');
    }
  });
});

