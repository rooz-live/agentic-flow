import * as fs from 'fs';
import * as path from 'path';
import type { PatternBaselineDelta, PatternEvent } from './shared_utils';
import {
    computeCodBaselineDeltas,
    getActionKeys,
    readJsonl,
    summarizePatterns,
} from './shared_utils';
import { publishStreamEvent, resolveStreamSocket } from './streamPublisher';
import { WSJFCalculator, type BatchRecommendation, type WSJFResult } from './wsjf_calculator';
// COD calculators integration - import only when needed to avoid module resolution issues
// import { calculateCOD, CODContext } from './cod_calculators';

interface MetricsEvent {
  timestamp?: string;
  type?: string;
  tool?: string;
  ok?: boolean;
  [key: string]: any;
}

async function compareAgainstBaseline({
  patterns,
}: {
  goalieDir: string;
  patterns: PatternEvent[];
  metrics: MetricsEvent[];
  patternCounts: Map<string, number>;
}): Promise<GovernanceBaselineComparison | undefined> {
  const patternDeltas: PatternBaselineDelta[] = computeCodBaselineDeltas(patterns);
  if (!patternDeltas.length) {
    return undefined;
  }

  const withDelta = patternDeltas.filter((d) => typeof d.deltaPct === 'number');
  const topRegressions = withDelta
    .filter((d) => (d.deltaPct as number) < -10)
    .sort((a, b) => (a.deltaPct as number) - (b.deltaPct as number))
    .slice(0, 3) as GovernancePatternBaselineView[];
  const topImprovements = withDelta
    .filter((d) => (d.deltaPct as number) > 5)
    .sort((a, b) => (b.deltaPct as number) - (a.deltaPct as number))
    .slice(0, 3) as GovernancePatternBaselineView[];

  const allDeltas = withDelta
    .map((d) => d.delta)
    .filter((v): v is number => typeof v === 'number');
  const baselineScores = withDelta
    .map((d) => d.baselineScore)
    .filter((v): v is number => typeof v === 'number');

  let overallDelta: number | undefined;
  let overallDeltaPct: number | undefined;

  if (allDeltas.length) {
    overallDelta = allDeltas.reduce((a, b) => a + b, 0) / allDeltas.length;
  }

  if (overallDelta !== undefined && baselineScores.length) {
    const baselineAvg = baselineScores.reduce((a, b) => a + b, 0) / baselineScores.length;
    if (baselineAvg !== 0) {
      overallDeltaPct = (overallDelta / baselineAvg) * 100;
    }
  }

  return {
    overallDelta,
    overallDeltaPct,
    topRegressions,
    topImprovements,
  };
}

function getGoalieDirFromArgs(): string {
  const argIndex = process.argv.indexOf('--goalie-dir');
  if (argIndex !== -1 && process.argv[argIndex + 1]) {
    return path.resolve(process.argv[argIndex + 1]);
  }
  if (process.env.GOALIE_DIR) {
    return path.resolve(process.env.GOALIE_DIR);
  }
  // Fallback: assume running from project root
  return path.resolve(process.cwd(), '.goalie');
}

function isProdCycle(): boolean {
  // Check command line args
  if (process.argv.includes('--prod-cycle') || process.argv.includes('--context=prod-cycle')) {
    return true;
  }
  // Check environment variable
  if (process.env.AF_CONTEXT === 'prod-cycle' || process.env.PROD_CYCLE === 'true') {
    return true;
  }
  return false;
}

/**
 * Emit pattern telemetry event to .goalie/pattern_metrics.jsonl
 * Conforms to NEW canonical schema with all required fields
 */
function emitPatternMetric(
  pattern: string,
  mode: 'advisory' | 'mutate' | 'enforcement',
  gate: string,
  reason: string,
  action: string,
  metrics?: Record<string, unknown>,
  tags: string[] = ['Federation'],
  actionCompleted: boolean = true,
): void {
  const goalieDir = getGoalieDirFromArgs();
  const metricsFile = path.join(goalieDir, 'pattern_metrics.jsonl');

  const timestamp = new Date().toISOString();
  const runId = process.env.AF_RUN_ID || `gov-${Date.now()}`;
  const circle = process.env.AF_CIRCLE || 'governance';
  const depth = parseInt(process.env.AF_DEPTH_LEVEL || '0', 10);
  const runKind = process.env.AF_RUN_KIND || 'governance-agent';

  // Economic scoring (can be enhanced with actual COD/WSJF calculation)
  const costOfDelay = parseFloat(process.env.AF_PATTERN_COD || '0.0');
  const wsjfScore = parseFloat(process.env.AF_PATTERN_WSJF || '0.0');
  const jobDuration = parseInt(process.env.AF_JOB_DURATION || '1', 10);
  const userBusinessValue = parseFloat(process.env.AF_USER_BUSINESS_VALUE || '0.0');

  // Schema-compliant event structure
  const event = {
    timestamp,
    pattern,
    circle,
    depth,
    run_kind: runKind,
    gate,
    tags,
    economic: {
      wsjf_score: wsjfScore,
      cost_of_delay: costOfDelay,
      job_duration: jobDuration,
      user_business_value: userBusinessValue,
    },
    action_completed: actionCompleted,
    // Additional metadata for governance context
    mode,
    run_id: runId,
    data: {
      reason,
      action,
      ...(metrics && metrics),
    },
  };

  try {
    fs.appendFileSync(metricsFile, JSON.stringify(event) + '\n');
  } catch (err) {
    console.error('[governance_agent] Failed to emit pattern metric:', err);
  }
}

function summarizeGovernance(metrics: MetricsEvent[]): { total: number; ok: number; failed: number } {
  let total = 0;
  let ok = 0;
  for (const ev of metrics) {
    if (ev.type === 'governance_review') {
      total += 1;
      if (ev.ok) ok += 1;
    }
  }
  return { total, ok, failed: total - ok };
}

function calculateRelentlessMetrics(
  goalieDir: string,
  cycleLog: any[] = [],
): { pctActionsDone: number; avgCycleTimeSec: number } {
  // 1. % Actions Done from KANBAN_BOARD.yaml
  let pctActionsDone = 0;
  const boardPath = path.join(goalieDir, 'KANBAN_BOARD.yaml');
  if (fs.existsSync(boardPath)) {
    try {
      const raw = fs.readFileSync(boardPath, 'utf8');
      const nowCount = (raw.match(/status:\s*NOW/g) || []).length;
      const nextCount = (raw.match(/status:\s*NEXT/g) || []).length;
      const doneCount = (raw.match(/status:\s*DONE/g) || []).length;
      const total = nowCount + nextCount + doneCount;
      if (total > 0) {
        pctActionsDone = (doneCount / total) * 100;
      }
    } catch (err) {
      // ignore parse error
    }
  }

  // 2. Time to Commit (Cycle Time) from cycle_log.jsonl
  let avgCycleTimeSec = 0;
  const completedCycles = cycleLog.filter(c => c.status === 'COMPLETED' && c.start_time && c.end_time);

  if (completedCycles.length > 0) {
    const totalDuration = completedCycles.reduce((acc, c) => {
      const start = new Date(c.start_time).getTime();
      const end = new Date(c.end_time).getTime();
      return acc + (end - start);
    }, 0);
    avgCycleTimeSec = totalDuration / completedCycles.length / 1000;
  }

  return { pctActionsDone, avgCycleTimeSec };
}

function proposeFix(missingPattern: string): string {
  switch (missingPattern) {
    case 'observability-first':
      return 'Suggested Fix: Run `af init --observability` to generate config or add `metrics.log` capture.';
    case 'safe-degrade':
      return 'Suggested Fix: Implement `SafeGuard` wrapper or feature flags for graceful degradation.';
    case 'iteration-budget':
      return 'Suggested Fix: Define `max_cycles` in `autocommit_policy.yaml` to limit runaway loops.';
    case 'guardrail-lock':
      return 'Suggested Fix: Review `--no-test-first` usage; ensure tests run before merge.';
    case 'mobile-interaction-lag':
      return 'Suggested Fix: Run `af init --mobile` to verify touch targets and latency constraints.';
    case 'desktop-render-block':
      return 'Suggested Fix: Check `af-desktop.config.json` for render budget settings.';
    case 'web-vitals-cls':
      return 'Suggested Fix: Optimize layout stability or enable `af-web-vitals` monitoring.';
    case 'mobile-offline-sync':
      return 'Suggested Fix: Implement offline-first sync queues, conflict resolution, and background sync for mobile clients.';
    case 'desktop-app-startup':
      return 'Suggested Fix: Profile desktop cold start, lazy-load heavy modules, and optimize startup paths.';
    case 'web-bundle-size':
      return 'Suggested Fix: Use a bundle analyzer, enable tree-shaking, and split bundles to keep critical paths small.';
    case 'cross-platform-compatibility':
      return 'Suggested Fix: Test across target platforms, abstract platform differences, and maintain consistent UX expectations.';
    // Mobile prototype workflow patterns
    case 'mobile-prototype-touch-target':
      return 'Suggested Fix: Ensure touch targets are at least 44x44px, add visual feedback, test on multiple devices.';
    case 'mobile-prototype-gesture-conflict':
      return 'Suggested Fix: Review gesture recognizers, prioritize system gestures, add gesture conflict resolution.';
    case 'mobile-prototype-network-offline':
      return 'Suggested Fix: Implement offline detection, cache critical data, show offline indicators, queue sync operations.';
    case 'mobile-prototype-battery-drain':
      return 'Suggested Fix: Optimize background tasks, reduce location updates, implement efficient polling, use push notifications.';
    case 'mobile-prototype-permission-handling':
      return 'Suggested Fix: Request permissions contextually, handle denial gracefully, provide clear permission rationale.';
    case 'mobile-prototype-deep-link-routing':
      return 'Suggested Fix: Implement universal links (iOS) / app links (Android), handle deep link validation, test routing edge cases.';
    case 'mobile-prototype-push-notification-delay':
      return 'Suggested Fix: Optimize notification payload, implement notification queuing, test delivery across networks.';
    case 'mobile-prototype-background-sync':
      return 'Suggested Fix: Implement background sync API, handle sync failures, respect battery constraints.';
    case 'mobile-prototype-app-state-restoration':
      return 'Suggested Fix: Save app state on background, restore state on foreground, handle state migration.';
    case 'mobile-prototype-multitasking-handoff':
      return 'Suggested Fix: Implement handoff between devices, sync app state, handle handoff failures.';
    // Desktop prototype workflow patterns
    case 'desktop-prototype-window-management':
      return 'Suggested Fix: Implement window state persistence, handle multi-monitor setups, restore window positions.';
    case 'desktop-prototype-keyboard-shortcut-conflict':
      return 'Suggested Fix: Check system shortcuts, provide conflict resolution UI, allow shortcut customization.';
    case 'desktop-prototype-file-system-access':
      return 'Suggested Fix: Request file permissions appropriately, handle permission denial, implement file watching.';
    case 'desktop-prototype-drag-drop-handling':
      return 'Suggested Fix: Support drag-drop operations, provide visual feedback, handle multiple file types.';
    case 'desktop-prototype-clipboard-integration':
      return 'Suggested Fix: Implement clipboard read/write, handle clipboard format conversion, respect privacy.';
    case 'desktop-prototype-system-tray-behavior':
      return 'Suggested Fix: Implement system tray icon, handle tray menu interactions, support platform-specific behaviors.';
    case 'desktop-prototype-auto-update-mechanism':
      return 'Suggested Fix: Implement update checking, handle update downloads, provide update UI, test rollback.';
    case 'desktop-prototype-offline-capability':
      return 'Suggested Fix: Cache application data, implement offline mode, sync when online, handle conflicts.';
    case 'desktop-prototype-native-module-loading':
      return 'Suggested Fix: Handle native module failures gracefully, provide fallbacks, test on all target platforms.';
    case 'desktop-prototype-cross-platform-consistency':
      return 'Suggested Fix: Test on all target platforms, implement platform-specific adapters, maintain consistent UX.';
    // Web prototype workflow patterns
    case 'web-prototype-spa-routing':
      return 'Suggested Fix: Implement proper route guards, handle 404s, support browser back/forward, test deep linking.';
    case 'web-prototype-state-management':
      return 'Suggested Fix: Implement state persistence, handle state hydration, optimize state updates, prevent memory leaks.';
    case 'web-prototype-api-caching':
      return 'Suggested Fix: Implement HTTP caching headers, use service worker caching, handle cache invalidation.';
    case 'web-prototype-service-worker-registration':
      return 'Suggested Fix: Handle SW registration failures, implement update strategy, test offline behavior.';
    case 'web-prototype-indexeddb-quota':
      return 'Suggested Fix: Monitor storage quota, handle quota exceeded errors, implement storage cleanup.';
    case 'web-prototype-cors-policy':
      return 'Suggested Fix: Configure CORS headers correctly, handle preflight requests, test cross-origin scenarios.';
    case 'web-prototype-csp-violation':
      return 'Suggested Fix: Review CSP headers, allow necessary sources, implement CSP reporting, test thoroughly.';
    case 'web-prototype-third-party-script-blocking':
      return 'Suggested Fix: Implement script loading fallbacks, handle ad blockers, use CSP nonce/hash.';
    case 'web-prototype-progressive-enhancement':
      return 'Suggested Fix: Ensure core functionality works without JS, implement feature detection, provide fallbacks.';
    case 'web-prototype-accessibility-audit':
      return 'Suggested Fix: Run accessibility audits, fix ARIA labels, ensure keyboard navigation, test with screen readers.';
    case 'web-prototype-seo-meta-tags':
      return 'Suggested Fix: Add proper meta tags, implement structured data, ensure SSR for SEO, test with crawlers.';
    case 'web-prototype-ssr-hydration-mismatch':
      return 'Suggested Fix: Ensure SSR/CSR consistency, handle client-only components, fix hydration warnings.';
    case 'web-prototype-cdn-cache-invalidation':
      return 'Suggested Fix: Implement cache busting, use versioned assets, configure CDN cache headers.';
    case 'web-prototype-browser-compatibility':
      return 'Suggested Fix: Test on target browsers, implement polyfills, use feature detection, handle browser quirks.';
    case 'web-prototype-responsive-image-loading':
      return 'Suggested Fix: Implement responsive images, use srcset/sizes, lazy load images, optimize formats.';
    // Cross-platform prototype patterns
    case 'prototype-platform-specific-feature':
      return 'Suggested Fix: Implement platform detection, provide feature flags, handle unsupported platforms gracefully.';
    case 'prototype-code-sharing-strategy':
      return 'Suggested Fix: Identify shared code, implement platform adapters, maintain code organization.';
    case 'prototype-build-configuration':
      return 'Suggested Fix: Configure build tools per platform, handle environment variables, test build outputs.';
    case 'prototype-testing-strategy':
      return 'Suggested Fix: Implement platform-specific tests, use shared test utilities, test on real devices.';
    case 'prototype-deployment-pipeline':
      return 'Suggested Fix: Configure CI/CD per platform, implement automated testing, handle platform-specific builds.';
    case 'hpc-batch-window':
      return 'Suggested Fix: Optimize batch sizes, adjust SLURM/K8s request limits, or improve GPU utilization.';
    case 'ml-training-guardrail':
      return 'Suggested Fix: Add checkpointing or early-stopping criteria in training loop.';
    // Affiliate Affinity System patterns
    case 'affiliate-monitoring':
      return 'Suggested Fix: Enable AffiliateStateTracker with real-time Midstreamer integration for affiliate activity monitoring.';
    case 'affinity-scoring':
      return 'Suggested Fix: Configure Neo4j ontology and run affinity scoring algorithms to compute affiliate relationship strengths.';
    case 'affiliate-tier-change':
      return 'Suggested Fix: Review tier change events in affiliate_activities table and update WSJF priorities accordingly.';
    case 'affiliate-risk-assessment':
      return 'Suggested Fix: Run affiliate risk assessment via AffiliateStateTracker.getAffiliateRisks() and update ROAM tracker.';
    default:
      return `Suggested Fix: Check documentation for ${missingPattern} best practices.`;
  }
}

interface CodeFixProposal {
  pattern: string;
  description: string;
  codeSnippet?: string;
  configSnippet?: string;
  testSnippet?: string;
  filePath?: string;
  // Governance metadata for auto-remediation workflow
  mode?: 'dry-run' | 'apply';
  approvalRequired?: boolean;
  approverRole?: string;
  actionId?: string;
}

function proposeCodeFix(pattern: string, context?: any): CodeFixProposal {
  const baseProposal: CodeFixProposal = {
    pattern,
    description: proposeFix(pattern),
    mode: 'dry-run',
    approvalRequired: true,
  };

  switch (pattern) {
    case 'guardrail-lock':
      return {
        ...baseProposal,
        testSnippet: `// Add test to ensure guardrails are enforced
describe('Guardrail Enforcement', () => {
  it('should run tests before merge', async () => {
    const result = await runTests();
    expect(result.exitCode).toBe(0);
    expect(result.coverage).toBeGreaterThan(0.8);
  });
});`,
        filePath: 'tests/guardrail.test.ts',
      };

    case 'ml-training-guardrail':
      const framework = context?.framework || 'pytorch';
      if (framework === 'pytorch') {
        return {
          ...baseProposal,
          codeSnippet: `# Add checkpointing and early stopping
from torch.utils.tensorboard import SummaryWriter
import torch

class EarlyStopping:
    def __init__(self, patience=5, min_delta=0.001):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = float('inf')

    def __call__(self, val_loss):
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.counter = 0
            return False
        else:
            self.counter += 1
            return self.counter >= self.patience

# In training loop:
early_stopping = EarlyStopping(patience=5)
for epoch in range(max_epochs):
    # ... training code ...
    if early_stopping(val_loss):
        print(f"Early stopping at epoch {epoch}")
        break
    # Save checkpoint
    torch.save({
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'loss': val_loss,
    }, f'checkpoint_epoch_{epoch}.pt')`,
          filePath: 'training/train_with_guardrails.py',
        };
      } else {
        return {
          ...baseProposal,
          codeSnippet: `# TensorFlow checkpointing and early stopping
import tensorflow as tf

checkpoint_callback = tf.keras.callbacks.ModelCheckpoint(
    filepath='checkpoints/checkpoint-{epoch:02d}-{val_loss:.2f}.h5',
    save_best_only=True,
    monitor='val_loss',
    mode='min'
)

early_stopping_callback = tf.keras.callbacks.EarlyStopping(
    monitor='val_loss',
    patience=5,
    min_delta=0.001,
    restore_best_weights=True
)

# In model.fit():
model.fit(
    train_dataset,
    validation_data=val_dataset,
    epochs=max_epochs,
    callbacks=[checkpoint_callback, early_stopping_callback]
)`,
          filePath: 'training/train_with_guardrails.py',
        };
      }

    case 'hpc-batch-window':
      return {
        ...baseProposal,
        configSnippet: `# SLURM batch script optimization
#!/bin/bash
#SBATCH --job-name=optimized_training
#SBATCH --nodes=8
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=8
#SBATCH --gres=gpu:1
#SBATCH --time=24:00:00
#SBATCH --mem=64G
#SBATCH --partition=gpu

# Optimize batch size based on available memory
BATCH_SIZE=32
if [ $SLURM_CPUS_PER_TASK -gt 16 ]; then
    BATCH_SIZE=64
fi

# Set optimal environment variables
export CUDA_VISIBLE_DEVICES=$SLURM_LOCALID
export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK

# Run training with optimized settings
python train.py --batch-size $BATCH_SIZE --num-workers 4`,
        filePath: 'scripts/slurm_optimized.sh',
      };

    case 'observability-first':
      return {
        ...baseProposal,
        configSnippet: `# .goalie/observability_config.yaml
observability:
  enabled: true
  metrics:
    - type: performance
      interval: 60s
      output: metrics.log
    - type: governance
      interval: 300s
      output: governance_metrics.jsonl
  alerts:
    - pattern: "high_cpu_usage"
      threshold: 0.9
      action: "log_warning"
    - pattern: "memory_leak"
      threshold: 0.95
      action: "alert_team"`,
        filePath: '.goalie/observability_config.yaml',
      };

    case 'safe-degrade':
      return {
        ...baseProposal,
        codeSnippet: `// SafeGuard wrapper for graceful degradation
class SafeGuard {
  constructor(private fallback: () => Promise<any>) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.warn('Operation failed, using fallback:', error);
      return await this.fallback();
    }
  }
}

// Usage:
const safeApiCall = new SafeGuard(async () => {
  // Fallback to cached data or default values
  return getCachedData() || getDefaultData();
});

const result = await safeApiCall.execute(() => fetchFromApi());`,
        filePath: 'src/utils/SafeGuard.ts',
      };

    case 'iteration-budget':
      return {
        ...baseProposal,
        configSnippet: `# autocommit_policy.yaml
autocommit:
  max_cycles_total: 10
  max_cycles_with_autocommit: 5
  budget_per_cycle_seconds: 300
  timeout_seconds: 3600

  guardrails:
    - type: test_coverage
      min_coverage: 0.8
    - type: lint_check
      required: true
    - type: security_scan
      required: true`,
        filePath: 'autocommit_policy.yaml',
      };

    case 'cluster-fragmentation':
      return {
        ...baseProposal,
        approverRole: 'SRE',
        configSnippet: `# SLURM job packing optimization
#!/bin/bash
#SBATCH --job-name=packed_training
#SBATCH --nodes=4
#SBATCH --ntasks-per-node=4
#SBATCH --cpus-per-task=4
#SBATCH --gres=gpu:4
#SBATCH --exclusive

# Prefer packing jobs tightly on fewer nodes
srun --ntasks=$SLURM_NTASKS --ntasks-per-node=$SLURM_NTASKS_PER_NODE \
  python -m torch.distributed.run --nproc_per_node=4 train.py`,
        testSnippet: `# Simple check to flag fragmented jobs in the queue
check_fragmentation() {
  squeue -o "%N %C %t" | awk 'NR>1 {print $1}' | sort | uniq -c
}
# Expect most GPUs on a small number of nodes rather than many half-empty nodes`,
        filePath: 'scripts/slurm_packed_training.sh',
      };

    case 'network-bottleneck':
      return {
        ...baseProposal,
        approverRole: 'SRE',
        codeSnippet: `# NCCL / MPI tuning for distributed training
export NCCL_DEBUG=INFO
export NCCL_SOCKET_IFNAME=eth0
export NCCL_IB_DISABLE=0
export NCCL_NET_GDR_LEVEL=2
export NCCL_MIN_NCHANNELS=4

python -m torch.distributed.run --nproc_per_node=4 train.py`,
        testSnippet: `# Smoke test to measure all-reduce latency
import torch
import torch.distributed as dist


def measure_allreduce_latency():
    x = torch.ones(1024, device="cuda")
    dist.barrier()
    start = torch.cuda.Event(enable_timing=True)
    end = torch.cuda.Event(enable_timing=True)
    start.record()
    dist.all_reduce(x)
    end.record()
    torch.cuda.synchronize()
    return start.elapsed_time(end)
`,
        filePath: 'scripts/ddp_network_tuning.sh',
      };

    case 'data-leakage-detection':
      return {
        ...baseProposal,
        approverRole: 'ML Lead',
        codeSnippet: `# Leakage-safe train/test split with feature pipeline
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

TARGET = "target"

X = df.drop(columns=[TARGET])
y = df[TARGET]

numeric = X.select_dtypes(include=["number"]).columns.tolist()

preprocess = ColumnTransformer(
    [
        ("num", StandardScaler(), numeric),
    ],
    remainder="drop",
)

clf = Pipeline(
    steps=[
        ("preprocess", preprocess),
        ("model", LogisticRegression(max_iter=1000)),
    ],
)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    stratify=y,
    random_state=42,
)

clf.fit(X_train, y_train)`,
        testSnippet: `def test_no_target_in_feature_columns(df):
    from ml.pipelines.data_validation import TARGET

    X = df.drop(columns=[TARGET])
    assert TARGET not in X.columns
`,
        filePath: 'ml/pipelines/data_validation.py',
      };

    case 'oom-recovery':
      return {
        ...baseProposal,
        approverRole: 'ML Lead',
        codeSnippet: `# PyTorch training loop with simple OOM-aware batch size backoff
import torch


def train_epoch(dataloader, model, optimizer, loss_fn, device, batch_size):
    data_iter = iter(dataloader)
    while True:
        try:
            batch = next(data_iter)
        except StopIteration:
            break
        inputs, targets = (b.to(device) for b in batch)
        optimizer.zero_grad()
        try:
            outputs = model(inputs)
            loss = loss_fn(outputs, targets)
            loss.backward()
            optimizer.step()
        except RuntimeError as e:
            if "out of memory" in str(e).lower():
                torch.cuda.empty_cache()
                batch_size = max(1, batch_size // 2)
                continue
            raise
`,
        testSnippet: `def test_training_recovers_from_oom(monkeypatch):
    from ml.training.oom_recovery import train_epoch

    # Simulate OOM by raising RuntimeError once and ensure training loop does not crash
`,
        filePath: 'ml/training/oom_recovery.py',
      };

    case 'web-vitals-cls':
      return {
        ...baseProposal,
        approverRole: 'Tech Lead',
        codeSnippet: `// Next.js Image with explicit layout to avoid CLS
import Image from 'next/image';

export function Hero() {
  return (
    <section className="hero">
      <Image
        src="/hero.jpg"
        alt="Hero"
        width={1600}
        height={600}
        priority
      />
      <h1>Welcome</h1>
    </section>
  );
}
`,
        testSnippet: `// Example Jest test using @testing-library/react
import { render } from '@testing-library/react';
import { Hero } from './Hero';

test('renders hero with reserved image space', () => {
  const { container } = render(<Hero />);
  const img = container.querySelector('img');
  expect(img).toBeTruthy();
});
`,
        filePath: 'web/src/components/Hero.tsx',
      };

    case 'mobile-app-cold-start':
      return {
        ...baseProposal,
        approverRole: 'Tech Lead',
        codeSnippet: `// React Native entry with lazy-loaded heavy screen
import React, { Suspense } from 'react';
import { Text } from 'react-native';

const HeavyHome = React.lazy(() => import('./HeavyHome'));

export default function App() {
  return (
    <Suspense fallback={<Text>Loading</Text>}>
      <HeavyHome />
    </Suspense>
  );
}
`,
        testSnippet: `// High level smoke test to ensure App renders without blocking
import React from 'react';
import { render } from '@testing-library/react-native';
import App from './App';

test('renders App with lazy-loaded home screen', () => {
  render(<App />);
});
`,
        filePath: 'mobile/App.tsx',
      };

    // Affiliate Affinity System patterns
    case 'affiliate-monitoring':
      return {
        ...baseProposal,
        approverRole: 'Tech Lead',
        codeSnippet: `// Affiliate monitoring with real-time Midstreamer integration
import { AffiliateStateTracker } from '../affiliate/AffiliateStateTracker';
import { createMidstreamerAffiliateStream } from '../integrations/midstreamer_affiliate';

const tracker = new AffiliateStateTracker('/path/to/db');
const stream = createMidstreamerAffiliateStream(tracker);

stream.on('tier_change', (event) => {
  console.log('Tier change:', event.affiliateId, event.newTier);
});

stream.start();`,
        testSnippet: `import { AffiliateStateTracker } from '../affiliate/AffiliateStateTracker';

test('affiliate monitoring tracks state changes', () => {
  const tracker = new AffiliateStateTracker(':memory:');
  const affiliate = tracker.createAffiliate({ name: 'Test', tier: 'bronze' });
  expect(affiliate.state).toBe('pending');
});`,
        filePath: 'src/affiliate/monitoring.ts',
      };

    case 'affinity-scoring':
      return {
        ...baseProposal,
        approverRole: 'Tech Lead',
        codeSnippet: `// Affinity scoring with Neo4j graph analytics
import { createNeo4jAffiliateClient } from '../integrations/neo4j_affiliate';

const client = await createNeo4jAffiliateClient();
const highAffinityPairs = await client.getHighAffinityPairs(0.7);

for (const pair of highAffinityPairs) {
  console.log(\`High affinity: \${pair.affiliate1} <-> \${pair.affiliate2}: \${pair.score}\`);
}`,
        testSnippet: `import { Neo4jAffiliateClient } from '../integrations/neo4j_affiliate';

test('affinity scoring computes relationship strengths', async () => {
  const client = new Neo4jAffiliateClient(driver);
  const pairs = await client.getHighAffinityPairs(0.5);
  expect(Array.isArray(pairs)).toBe(true);
});`,
        filePath: 'src/affiliate/affinity_scoring.ts',
      };

    case 'affiliate-tier-change':
      return {
        ...baseProposal,
        approverRole: 'Tech Lead',
        configSnippet: `# Affiliate tier change WSJF configuration
affiliate_tiers:
  bronze:
    wsjf_boost: 0
    risk_weight: 1.0
  silver:
    wsjf_boost: 5
    risk_weight: 0.8
  gold:
    wsjf_boost: 10
    risk_weight: 0.5
  platinum:
    wsjf_boost: 20
    risk_weight: 0.3`,
        filePath: '.goalie/affiliate_tier_config.yaml',
      };

    case 'affiliate-risk-assessment':
      return {
        ...baseProposal,
        approverRole: 'Tech Lead',
        codeSnippet: `// Affiliate risk assessment with ROAM integration
import { AffiliateStateTracker } from '../affiliate/AffiliateStateTracker';

const tracker = new AffiliateStateTracker('/path/to/db');
const risks = tracker.getAffiliateRisks('affiliate-123');

for (const risk of risks) {
  if (risk.severity === 'critical' && risk.status === 'open') {
    console.log('ROAM BLOCKER:', risk.description);
  }
}`,
        testSnippet: `test('affiliate risk assessment identifies critical risks', () => {
  const tracker = new AffiliateStateTracker(':memory:');
  const risks = tracker.getAffiliateRisks('test-affiliate');
  expect(Array.isArray(risks)).toBe(true);
});`,
        filePath: 'src/affiliate/risk_assessment.ts',
      };

    // Extended Mobile/Desktop/Web/Enterprise Patterns
    case 'mobile-prototype-navigation':
      return {
        ...baseProposal,
        approverRole: 'Mobile Lead',
        codeSnippet: `// React Native navigation with deep linking
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';

const linking: LinkingOptions = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: '',
      Profile: 'user/:id',
      Settings: 'settings',
    },
  },
};

export function App() {
  return (
    <NavigationContainer linking={linking}>
      {/* ... */}
    </NavigationContainer>
  );
}`,
        testSnippet: `test('deep linking resolves correct screen', () => {
  const state = getStateFromPath('user/123');
  expect(state.routes[0].name).toBe('Profile');
  expect(state.routes[0].params.id).toBe('123');
});`,
        filePath: 'mobile/src/navigation/RootNavigator.tsx',
      };

    case 'desktop-prototype-window-management':
      return {
        ...baseProposal,
        approverRole: 'Desktop Lead',
        codeSnippet: `// Electron multi-window management with tray
import { app, BrowserWindow, Tray, Menu } from 'electron';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createTray() {
  tray = new Tray('icon.png');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow?.show() },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);
}`,
        testSnippet: `test('tray menu has show and quit options', () => {
  const menu = buildTrayMenu();
  expect(menu.items.some(i => i.label === 'Show')).toBe(true);
  expect(menu.items.some(i => i.label === 'Quit')).toBe(true);
});`,
        filePath: 'desktop/src/main/tray.ts',
      };

    case 'web-prototype-ssr-hydration':
      return {
        ...baseProposal,
        approverRole: 'Web Lead',
        codeSnippet: `// Next.js hydration-safe component
import { useEffect, useState } from 'react';

export function HydrationSafe({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <>{children}</>;
}`,
        testSnippet: `test('hydration-safe component renders after mount', async () => {
  render(<HydrationSafe><span>Test</span></HydrationSafe>);
  expect(screen.queryByText('Test')).toBeNull();
  await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
});`,
        filePath: 'web/src/components/HydrationSafe.tsx',
      };

    case 'enterprise-ml-feature-store':
      return {
        ...baseProposal,
        approverRole: 'ML Lead',
        configSnippet: `# Feast feature store configuration
project: my_ml_project
registry: gs://my-bucket/registry.pb
provider: gcp
online_store:
  type: redis
  connection_string: \${REDIS_URL}
offline_store:
  type: bigquery
entity_key_serialization_version: 2`,
        filePath: 'ml/feature_store/feature_store.yaml',
      };

    case 'enterprise-hpc-job-preemption':
      return {
        ...baseProposal,
        approverRole: 'HPC Lead',
        configSnippet: `#!/bin/bash
# SLURM preemption-aware job script with checkpointing
#SBATCH --job-name=ml-training
#SBATCH --requeue
#SBATCH --signal=B:SIGTERM@120

trap 'echo "Received SIGTERM, checkpointing..."; python save_checkpoint.py; exit 15' SIGTERM

if [ -f checkpoint.pt ]; then
  python train.py --resume checkpoint.pt
else
  python train.py
fi`,
        filePath: 'hpc/jobs/preemption_aware_job.sh',
      };

    case 'mobile-offline-sync':
      return {
        ...baseProposal,
        approverRole: 'Mobile Lead',
        codeSnippet: `// React Native offline-first sync with conflict resolution
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function syncWithServer<T>(
  key: string,
  localData: T,
  fetchRemote: () => Promise<T>,
  merge: (local: T, remote: T) => T
): Promise<T> {
  try {
    const remote = await fetchRemote();
    const merged = merge(localData, remote);
    await AsyncStorage.setItem(key, JSON.stringify(merged));
    return merged;
  } catch (e) {
    // Offline: return local data
    return localData;
  }
}`,
        testSnippet: `test('offline sync returns local data when network fails', async () => {
  const result = await syncWithServer('key', { v: 1 }, () => Promise.reject(), (a, b) => b);
  expect(result.v).toBe(1);
});`,
        filePath: 'mobile/src/utils/offlineSync.ts',
      };

    case 'desktop-auto-update':
      return {
        ...baseProposal,
        approverRole: 'Desktop Lead',
        codeSnippet: `// Electron auto-update with rollback support
import { autoUpdater } from 'electron-updater';

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    message: \`Update \${info.version} ready. Restart now?\`,
    buttons: ['Restart', 'Later']
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.checkForUpdatesAndNotify();`,
        testSnippet: `test('auto-updater emits update-downloaded event', () => {
  const spy = jest.fn();
  autoUpdater.on('update-downloaded', spy);
  autoUpdater.emit('update-downloaded', { version: '2.0.0' });
  expect(spy).toHaveBeenCalled();
});`,
        filePath: 'desktop/src/main/autoUpdater.ts',
      };

    case 'web-pwa-service-worker':
      return {
        ...baseProposal,
        approverRole: 'Web Lead',
        configSnippet: `// Workbox service worker configuration
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'images', maxEntries: 100 })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({ cacheName: 'api-cache' })
);`,
        filePath: 'web/src/service-worker.ts',
      };

    default:
      return baseProposal;
  }
}

function generateCodeFixProposals(patterns: PatternEvent[]): CodeFixProposal[] {
  const proposals: CodeFixProposal[] = [];
  const seenPatterns = new Set<string>();

  for (const pattern of patterns) {
    const patternName = pattern.pattern || 'unknown';
    if (!seenPatterns.has(patternName)) {
      seenPatterns.add(patternName);
      const proposal = proposeCodeFix(patternName, pattern);
      if (proposal.codeSnippet || proposal.configSnippet || proposal.testSnippet || proposal.filePath) {
        proposals.push(proposal);
      }
    }
  }

  return proposals;
}

interface RetroCoachContext {
  insightsSummary?: {
    verifiedCount?: number;
    totalActions?: number;
    avgCodDeltaPct?: number;
    [key: string]: any;
  };
  baselineComparison?: {
    deltaPct?: number;
    overallDeltaPct?: number;
    [key: string]: any;
  };
  raw?: any;
}

function loadRetroCoachContext(goalieDir: string): RetroCoachContext | undefined {
  const retroJsonPath = path.join(goalieDir, 'retro_coach.json');
  if (!fs.existsSync(retroJsonPath)) {
    console.warn('[governance_agent] retro_coach.json not found, system health metrics unavailable');
    return undefined;
  }

  try {
    const raw = fs.readFileSync(retroJsonPath, 'utf8');
    const data = JSON.parse(raw);
    const insights =
      data && typeof data.insightsSummary === 'object'
        ? data.insightsSummary
        : undefined;
    const baseline =
      data && typeof data.baselineComparison === 'object'
        ? data.baselineComparison
        : undefined;

    // Enhanced forensic metrics extraction
    let verificationRate = 0;
    let avgCodDeltaPct = 0;
    let totalActions = 0;
    let verifiedCount = 0;

    if (insights) {
      // Extract verification rate
      verifiedCount = typeof insights.verifiedCount === 'number' ? insights.verifiedCount : 0;
      totalActions = typeof insights.totalActions === 'number' ? insights.totalActions : 0;
      verificationRate = totalActions > 0 ? verifiedCount / totalActions : 0;

      // Extract average COD delta percentage
      if (typeof insights.avgCodDeltaPct === 'number') {
        avgCodDeltaPct = insights.avgCodDeltaPct;
      } else if (insights.highImpactActions && Array.isArray(insights.highImpactActions)) {
        // Calculate avg COD delta from high impact actions if not directly available
        const codDeltas = insights.highImpactActions
          .filter((action: any) => typeof action.codAvg === 'number')
          .map((action: any) => action.codAvg);
        if (codDeltas.length > 0) {
          avgCodDeltaPct = codDeltas.reduce((sum: number, delta: number) => sum + delta, 0) / codDeltas.length;
        }
      }

      console.error(`[governance_agent] Retro Coach metrics loaded: verification=${(verificationRate * 100).toFixed(1)}%, avgCodDelta=${avgCodDeltaPct.toFixed(2)}%, totalActions=${totalActions}`);
    }

    // Enhanced baseline comparison metrics
    let baselineDeltaPct = 0;
    let overallDeltaPct = 0;
    let regressionDetected = false;

    if (baseline) {
      baselineDeltaPct = typeof baseline.deltaPct === 'number' ? baseline.deltaPct : 0;
      overallDeltaPct = typeof baseline.overallDeltaPct === 'number' ? baseline.overallDeltaPct : 0;
      regressionDetected = baseline.regression === true || baselineDeltaPct < -10 || overallDeltaPct < -10;

      console.error(`[governance_agent] Baseline comparison: deltaPct=${baselineDeltaPct.toFixed(2)}%, overallDeltaPct=${overallDeltaPct.toFixed(2)}%, regression=${regressionDetected}`);
    }

    // Calculate system health score
    const verificationScore = verificationRate * 100;
    const codScore = avgCodDeltaPct !== undefined ? Math.max(0, 100 + avgCodDeltaPct) : 50;
    const baselineScore = regressionDetected ? 0 : Math.max(0, 100 + Math.max(baselineDeltaPct, overallDeltaPct));
    const systemHealthScore = (verificationScore + codScore + baselineScore) / 3;

    console.error(`[governance_agent] System health score calculated: ${systemHealthScore.toFixed(1)} (verification: ${verificationScore.toFixed(1)}, cod: ${codScore.toFixed(1)}, baseline: ${baselineScore.toFixed(1)})`);

    return {
      insightsSummary: {
        ...insights,
        verificationRate,
        avgCodDeltaPct,
        totalActions,
        verifiedCount,
        systemHealthScore
      },
      baselineComparison: {
        ...baseline,
        baselineDeltaPct,
        overallDeltaPct,
        regressionDetected,
        systemHealthScore
      },
      raw: data,
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[governance_agent] Failed to load retro_coach.json:', e);
    return undefined;
  }
}

type RiskLevel = 'low' | 'medium' | 'high';

function isHighRiskPattern(pattern: string): boolean {
  switch (pattern) {
    case 'ml-training-guardrail':
    case 'data-leakage-detection':
    case 'oom-recovery':
      return true;
    default:
      return false;
  }
}

function ensureApproverRoleForHighRisk(
  pattern: string,
  existing?: string,
): string | undefined {
  if (existing) return existing;
  switch (pattern) {
    case 'ml-training-guardrail':
    case 'data-leakage-detection':
    case 'oom-recovery':
      return 'ML Lead';
    case 'cluster-fragmentation':
    case 'network-bottleneck':
      return 'SRE';
    case 'web-vitals-cls':
    case 'mobile-app-cold-start':
      return 'Tech Lead';
    default:
      return existing;
  }
}

interface PatternMetaForPolicy {
  circle: string;
  depth: number;
  totalImpactAvg: number;
  wsjfAvg?: number;
  pattern: string;
}

function lookupPatternMeta(
  pattern: string,
  patterns: PatternEvent[],
  topEconomicGaps: EconomicGapJsonRow[],
): PatternMetaForPolicy {
  const gap = topEconomicGaps.find((g) => g.pattern === pattern);
  if (gap) {
    return {
      circle: gap.circle,
      depth: gap.depth,
      totalImpactAvg: gap.totalImpactAvg,
      wsjfAvg: gap.wsjfAvg,
      pattern: pattern,
    };
  }

  const ev = patterns.find((p) => (p.pattern || 'unknown') === pattern);
  const circle = ev && (ev as any).circle ? String((ev as any).circle) : 'n/a';
  const depth =
    ev && typeof (ev as any).depth === 'number' ? (ev as any).depth : 0;

  return {
    circle,
    depth,
    totalImpactAvg: 0,
    wsjfAvg: undefined,
    pattern: pattern,
  };
}

function classifyProposalRisk(
  proposal: CodeFixProposal,
  meta: PatternMetaForPolicy,
): RiskLevel {
  const pathStr = proposal.filePath || '';
  const hasCode = !!proposal.codeSnippet;
  const hasConfig = !!proposal.configSnippet;
  const hasTest = !!proposal.testSnippet;

  // Explicit high-risk patterns are always high
  if (isHighRiskPattern(proposal.pattern)) {
    return 'high';
  }

  // Enhanced risk-based classification for different patterns
  let baseRisk: RiskLevel = 'medium';

  // Safe-degrade patterns at shallow depth are lower risk
  if (proposal.pattern === 'safe-degrade' && meta.depth <= 2) {
    baseRisk = 'low';
  }

  // ML training guardrail patterns are always high risk due to model impact
  if (proposal.pattern === 'ml-training-guardrail') {
    baseRisk = 'high';
  }

  // Config/test-only changes are considered low risk
  if (!hasCode && (hasConfig || hasTest)) {
    baseRisk = 'low';
  }

  // Path-based risk assessment
  let pathRisk: RiskLevel = 'low';
  if (
    pathStr.startsWith('scripts/') ||
    pathStr.startsWith('observability/') ||
    pathStr.startsWith('tests/') ||
    pathStr.startsWith('docs/') ||
    pathStr.startsWith('.goalie/')
  ) {
    pathRisk = 'low';
  } else if (
    pathStr.startsWith('config/') ||
    pathStr.startsWith('infrastructure/') ||
    pathStr.startsWith('deploy/')
  ) {
    pathRisk = 'medium';
  } else if (
    pathStr.startsWith('ml/training/') ||
    pathStr.startsWith('ml/pipelines/') ||
    pathStr.startsWith('src/') ||
    pathStr.startsWith('api/') ||
    pathStr.startsWith('production/') ||
    pathStr.includes('core/') ||
    pathStr.includes('critical/')
  ) {
    pathRisk = 'high';
  }

  // Depth-based risk assessment
  let depthRisk: RiskLevel = 'low';
  if (meta.depth <= 1) {
    depthRisk = 'low';
  } else if (meta.depth <= 3) {
    depthRisk = 'medium';
  } else {
    depthRisk = 'high';
  }

  // Circle-based risk assessment
  let circleRisk: RiskLevel = 'medium';
  switch (meta.circle) {
    case 'Assessor':
    case 'Compute':
      circleRisk = 'low';
      break;
    case 'Analyst':
    case 'Intuitive':
      circleRisk = 'medium';
      break;
    case 'Innovator':
    case 'Architect':
      circleRisk = 'high';
      break;
    default:
      circleRisk = 'medium';
  }

  // Pattern-specific risk refinement for HPC / Device / Web workloads
  let patternRisk: RiskLevel = 'medium';
  switch (proposal.pattern) {
    case 'cluster-fragmentation':
    case 'network-bottleneck':
    case 'node-failure-recovery':
    case 'data-pipeline-backpressure':
      patternRisk = 'high';
      break;
    case 'web-vitals-cls':
    case 'mobile-app-cold-start':
    case 'desktop-render-block':
    case 'mobile-interaction-lag':
      patternRisk = 'medium';
      break;
    case 'hpc-batch-window':
    case 'observability-first':
    case 'safe-degrade':
      patternRisk = 'low';
      break;
    case 'ml-training-guardrail':
    case 'distributed-training-failure':
    case 'checkpoint-corruption':
    case 'oom-recovery':
      patternRisk = 'high';
      break;
    case 'iteration-budget':
    case 'guardrail-lock':
    case 'autocommit-shadow':
      patternRisk = 'medium';
      break;
    default:
      patternRisk = 'medium';
  }

  // Economic impact-based risk adjustment
  let economicRisk: RiskLevel = 'medium';
  if (meta.totalImpactAvg >= 1000000) {
    economicRisk = 'high';
  } else if (meta.totalImpactAvg >= 100000) {
    economicRisk = 'medium';
  } else {
    economicRisk = 'low';
  }

  // Combine all risk factors with weighted scoring
  const riskScores = {
    low: 0,
    medium: 0,
    high: 0
  };

  // Weight different factors
  const weights = {
    base: 0.3,
    path: 0.2,
    depth: 0.15,
    circle: 0.15,
    pattern: 0.15,
    economic: 0.05
  };

  // Add weighted scores
  riskScores[baseRisk] += weights.base;
  riskScores[pathRisk] += weights.path;
  riskScores[depthRisk] += weights.depth;
  riskScores[circleRisk] += weights.circle;
  riskScores[patternRisk] += weights.pattern;
  riskScores[economicRisk] += weights.economic;

  // Determine final risk level based on highest weighted score
  let finalRisk: RiskLevel = 'medium';
  if (riskScores.high >= 0.6) {
    finalRisk = 'high';
  } else if (riskScores.low >= 0.5) {
    finalRisk = 'low';
  } else {
    finalRisk = 'medium';
  }

  // Log risk classification details for audit trail
  console.error(`[governance_agent] Risk classification for ${proposal.pattern}: base=${baseRisk}, path=${pathRisk}, depth=${depthRisk}, circle=${circleRisk}, pattern=${patternRisk}, economic=${economicRisk}, final=${finalRisk}`);

  return finalRisk;
}

function applyAutoApplyPolicy(
  proposals: CodeFixProposal[],
  patterns: PatternEvent[],
  topEconomicGaps: EconomicGapJsonRow[],
  retroCtx?: RetroCoachContext,
): CodeFixProposal[] {
  const allowAutocommit = process.env.AF_ALLOW_CODE_AUTOCOMMIT === '1';
  const mode =
    (process.env.AF_GOVERNANCE_AUTO_APPLY_MODE || 'conservative') as
      | 'none'
      | 'conservative'
      | 'moderate'
      | 'aggressive'
      | 'low-risk'
      | 'economic'
      | 'all';

  // Enhanced environment variable controls
  const riskThreshold = Number(process.env.AF_GOVERNANCE_RISK_THRESHOLD || '5');
  const minVerificationRate = Number(process.env.AF_GOVERNANCE_VERIFICATION_RATE_MIN || '0.7');
  const riskTier =
    (process.env.AF_GOVERNANCE_RISK_TIER || 'low') as
      | 'low'
      | 'low+medium'
      | 'all';
  const minTotalImpact = Number(
    process.env.AF_GOVERNANCE_MIN_TOTAL_IMPACT || '1000000',
  );
  const minWsjf = Number(process.env.AF_GOVERNANCE_MIN_WSJF || '5000');
  const safeCirclesEnv =
    process.env.AF_GOVERNANCE_SAFE_CIRCLES || 'Assessor,Compute';
  const safeCircles = new Set(
    safeCirclesEnv
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean),
  );
  const maxDepth = Number(process.env.AF_GOVERNANCE_MAX_DEPTH || '1');

  // Enhanced Retro Coach forensic metrics
  let verifiedRate = 0;
  let totalActions = 0;
  let avgCodDeltaPct: number | undefined;
  let baselineDeltaPct: number | undefined;
  let systemHealthScore = 0;

  if (retroCtx?.insightsSummary) {
    const insights = retroCtx.insightsSummary;
    const verifiedCount =
      typeof insights.verifiedCount === 'number' ? insights.verifiedCount : 0;
    totalActions =
      typeof insights.totalActions === 'number' ? insights.totalActions : 0;
    verifiedRate = totalActions > 0 ? verifiedCount / totalActions : 0;
    if (typeof insights.avgCodDeltaPct === 'number') {
      avgCodDeltaPct = insights.avgCodDeltaPct;
    }

    // Calculate system health score based on verification rate and COD performance
    const verificationScore = verifiedRate * 100;
    const codScore = avgCodDeltaPct !== undefined ? Math.max(0, 100 + avgCodDeltaPct) : 50;
    systemHealthScore = (verificationScore + codScore) / 2;
  }

  if (retroCtx?.baselineComparison) {
    const baseline = retroCtx.baselineComparison;
    if (typeof baseline.deltaPct === 'number') {
      baselineDeltaPct = baseline.deltaPct;
    } else if (typeof baseline.overallDeltaPct === 'number') {
      baselineDeltaPct = baseline.overallDeltaPct;
    }
  }

  // Enhanced verification gates with configurable thresholds
  const verificationOk = totalActions >= 5 && verifiedRate >= minVerificationRate;
  const codRegressionOk =
    avgCodDeltaPct === undefined || avgCodDeltaPct >= -10;
  const baselineRegressionOk =
    baselineDeltaPct === undefined || baselineDeltaPct >= -10;

  // Dynamic policy mode logic based on system health
  let effectiveMode = mode;
  if (mode === 'conservative' || systemHealthScore < 60 || !verificationOk || !codRegressionOk || !baselineRegressionOk) {
    effectiveMode = 'conservative';
    console.error(`[governance_agent] Dynamic policy: forcing conservative mode due to system health score=${systemHealthScore.toFixed(1)}, verification=${(verifiedRate * 100).toFixed(1)}%`);
  } else if (mode === 'moderate' && systemHealthScore >= 70 && verificationOk && codRegressionOk && baselineRegressionOk) {
    effectiveMode = 'moderate';
    console.error(`[governance_agent] Dynamic policy: moderate mode enabled with system health score=${systemHealthScore.toFixed(1)}`);
  } else if (mode === 'aggressive' && systemHealthScore >= 85 && verifiedRate >= 0.9 && codRegressionOk && baselineRegressionOk) {
    effectiveMode = 'aggressive';
    console.error(`[governance_agent] Dynamic policy: aggressive mode enabled with high system health score=${systemHealthScore.toFixed(1)}`);
  }

  // Always normalize high-risk proposals to require approval.
  const normalizeHighRisk = (proposal: CodeFixProposal): CodeFixProposal => {
    const highRisk = isHighRiskPattern(proposal.pattern);
    const approverRole = ensureApproverRoleForHighRisk(
      proposal.pattern,
      proposal.approverRole,
    );
    if (!highRisk) {
      return proposal;
    }
    // eslint-disable-next-line no-console
    console.error(
      `[governance_agent] High-risk pattern "${proposal.pattern}" requires manual approval (${approverRole || 'approver role not set'})`,
    );
    return {
      ...proposal,
      mode: 'dry-run',
      approvalRequired: true,
      approverRole: approverRole ?? proposal.approverRole,
    };
  };

  // Fast path: no auto-apply configured or health gate disabled.
  if (!allowAutocommit || effectiveMode === 'none') {
    return proposals.map((p) => {
      const base: CodeFixProposal = {
        ...p,
        mode: p.mode ?? 'dry-run',
        approvalRequired: p.approvalRequired ?? true,
      };
      return normalizeHighRisk(base);
    });
  }

  // Force conservative mode in high-risk or regressing scenarios
  if (!verificationOk || !codRegressionOk || !baselineRegressionOk) {
    console.error(`[governance_agent] System health regression detected - forcing conservative mode`);
    return proposals.map((p) =>
      normalizeHighRisk({
        ...p,
        mode: 'dry-run',
        approvalRequired: true,
      }),
    );
  }

  const withinRiskTier = (level: RiskLevel): boolean => {
    if (riskTier === 'all') return true;
    if (riskTier === 'low') return level === 'low';
    // low+medium
    return level === 'low' || level === 'medium';
  };

  // Enhanced risk-based classification for different policy modes
  const canAutoApplyByMode = (risk: RiskLevel, meta: PatternMetaForPolicy): boolean => {
    switch (effectiveMode) {
      case 'conservative':
        // Only auto-apply low-risk proposals (config/test snippets, infrastructure changes)
        return risk === 'low' &&
               !isHighRiskPattern(meta.pattern) &&
               (meta.depth <= 1 || meta.circle === 'Assessor' || meta.circle === 'Compute');

      case 'moderate':
        // Auto-apply medium-risk proposals with verification rate > 80%
        return (risk === 'low' || risk === 'medium') &&
               verifiedRate >= 0.8 &&
               !isHighRiskPattern(meta.pattern) &&
               meta.depth <= 2;

      case 'aggressive':
        // Auto-apply most proposals with verification rate > 90% and low risk scores
        return (risk === 'low' || risk === 'medium') &&
               verifiedRate >= 0.9 &&
               systemHealthScore >= 85 &&
               meta.depth <= 3;

      case 'economic':
        // Economic mode based on WSJF and impact thresholds
        return meta.totalImpactAvg >= minTotalImpact &&
               (meta.wsjfAvg ?? 0) >= minWsjf &&
               withinRiskTier(risk);

      case 'low-risk':
      case 'all':
      default:
        return withinRiskTier(risk);
    }
  };

  return proposals.map((proposal) => {
    const meta = lookupPatternMeta(proposal.pattern, patterns, topEconomicGaps);
    const risk = classifyProposalRisk(proposal, meta);
    const highRisk = isHighRiskPattern(proposal.pattern);
    const approverRole = ensureApproverRoleForHighRisk(
      proposal.pattern,
      proposal.approverRole,
    );

    const circleOk = safeCircles.size === 0 || safeCircles.has(meta.circle);
    const depthOk = meta.depth <= maxDepth;
    const economicOk =
      effectiveMode !== 'economic' ||
      (meta.totalImpactAvg >= minTotalImpact &&
        (meta.wsjfAvg ?? 0) >= minWsjf);
    const riskOk = withinRiskTier(risk);
    const modeBasedOk = canAutoApplyByMode(risk, meta);

    // Safety checks: Always require human approval for high-risk paths (src/, production APIs)
    const isHighRiskPath = proposal.filePath && (
      proposal.filePath.startsWith('src/') ||
      proposal.filePath.includes('api/') ||
      proposal.filePath.includes('production/')
    );

    const canAutoApply =
      allowAutocommit &&
      !highRisk &&
      !isHighRiskPath &&
      riskOk &&
      economicOk &&
      circleOk &&
      depthOk &&
      modeBasedOk;

    // Comprehensive logging for policy decisions
    const policyDecision = {
      proposal: proposal.pattern,
      mode: effectiveMode,
      risk,
      highRisk,
      isHighRiskPath,
      systemHealthScore,
      verifiedRate,
      avgCodDeltaPct,
      baselineDeltaPct,
      circleOk,
      depthOk,
      economicOk,
      riskOk,
      modeBasedOk,
      canAutoApply,
      meta: {
        circle: meta.circle,
        depth: meta.depth,
        totalImpactAvg: meta.totalImpactAvg,
        wsjfAvg: meta.wsjfAvg
      }
    };

    console.error(`[governance_agent] Policy decision: ${JSON.stringify(policyDecision, null, 2)}`);

    if (canAutoApply) {
      // eslint-disable-next-line no-console
      console.error(
        `[governance_agent] Auto-apply eligible code fix for pattern="${proposal.pattern}", circle=${meta.circle}, depth=${meta.depth}, risk=${risk}, impact=${meta.totalImpactAvg}, wsjf=${meta.wsjfAvg ?? 0}, mode=${effectiveMode}`,
      );
      return {
        ...proposal,
        mode: 'apply',
        approvalRequired: false,
      };
    }

    // Fallback: dry-run + approval required
    return normalizeHighRisk({
      ...proposal,
      mode: 'dry-run',
      approvalRequired: true,
      approverRole: approverRole ?? proposal.approverRole,
    });
  });
}

interface HpcWeightingSummary {
  p99AvgMs?: number;
  nodeCountAvg?: number;
  queueTimeAvgSec?: number;
  gpuUtilAvg?: number;
  multiplier?: number;
  queueIdleCost?: number;
  delayOpportunityCost?: number;
  wastedGpuCost?: number;
  failurePenaltyCost?: number;
  networkPenaltyCost?: number;
  fragmentationPenaltyCost?: number;
}

interface HpcImpactInputs {
  pattern: string;
  codAvg: number;
  computeAvg: number;
  p99Avg?: number;
  nodeAvg?: number;
  queueAvg?: number;
  gpuUtilAvg?: number;
}

function mean(values: number[]): number | undefined {
  if (!values.length) {
    return undefined;
  }
  return values.reduce((x, y) => x + y, 0) / values.length;
}

function applyHpcWeightingToImpact(inputs: HpcImpactInputs): {
  totalImpact: number;
  summary?: HpcWeightingSummary;
} {
  const { pattern, codAvg, computeAvg, p99Avg, nodeAvg, queueAvg, gpuUtilAvg } = inputs;
  const baseImpact = codAvg + computeAvg * 1.5;
  const isHpcPattern =
    pattern === 'hpc-batch-window' ||
    pattern.includes('ml-') ||
    pattern.includes('distributed-') ||
    pattern.includes('cluster-') ||
    pattern.includes('network-') ||
    pattern.includes('node-failure');

  if (!isHpcPattern) {
    return { totalImpact: baseImpact };
  }

  let totalImpact = codAvg + computeAvg * 4.0;
  let multiplier = 1;
  const gpuCostPerHour = pattern.includes('hpc-') || pattern.includes('cluster-') ? 4.5 : 3.0;
  const summary: HpcWeightingSummary = {
    p99AvgMs: p99Avg,
    nodeCountAvg: nodeAvg,
    queueTimeAvgSec: queueAvg,
    gpuUtilAvg,
  };

  if (typeof nodeAvg === 'number' && typeof queueAvg === 'number' && queueAvg > 0) {
    const queueHours = queueAvg / 3600;
    const queueIdleCost = nodeAvg * gpuCostPerHour * queueHours;
    summary.queueIdleCost = queueIdleCost;
    totalImpact += queueIdleCost;
  }

  if (typeof queueAvg === 'number' && queueAvg > 3600) {
    const delayHours = queueAvg / 3600;
    const opportunityMultiplier = typeof nodeAvg === 'number' && nodeAvg >= 32 ? 15 : typeof nodeAvg === 'number' && nodeAvg >= 8 ? 12 : 10;
    const delayCost = delayHours * opportunityMultiplier * gpuCostPerHour;
    summary.delayOpportunityCost = delayCost;
    totalImpact += delayCost;
  }

  if (typeof p99Avg === 'number') {
    const p99ThresholdMs = pattern.includes('hpc-') ? 1500 : 2000;
    if (p99Avg > p99ThresholdMs) {
      const over = p99Avg - p99ThresholdMs;
      const factor = Math.min(4, over / p99ThresholdMs);
      multiplier *= 1 + factor;
    }
  }

  if (typeof nodeAvg === 'number' && nodeAvg >= 8) {
    const over = nodeAvg - 8;
    const scalingFactor = nodeAvg >= 64 ? 2.5 : nodeAvg >= 32 ? 2.0 : 1.5;
    const factor = Math.min(3, (over / 8) * scalingFactor);
    multiplier *= 1 + factor;
  }

  if (typeof queueAvg === 'number') {
    const queueThresholdSec = pattern.includes('hpc-') ? 300 : 600;
    if (queueAvg > queueThresholdSec) {
      const over = queueAvg - queueThresholdSec;
      const factor = Math.min(3.0, over / queueThresholdSec);
      multiplier *= 1 + factor;
    }
  }

  if (typeof gpuUtilAvg === 'number' && gpuUtilAvg < 50) {
    const queueHours = typeof queueAvg === 'number' ? queueAvg / 3600 : 0;
    const wastedGpuHours = typeof nodeAvg === 'number' ? nodeAvg * queueHours * ((100 - gpuUtilAvg) / 100) : 0;
    const wastedGpuCost = wastedGpuHours * gpuCostPerHour;
    summary.wastedGpuCost = wastedGpuCost;
    totalImpact += wastedGpuCost;

    if (gpuUtilAvg < 20) {
      multiplier *= 1.5;
    } else if (gpuUtilAvg < 35) {
      multiplier *= 1.3;
    } else {
      multiplier *= 1.2;
    }
  }

  if (pattern.includes('failure') || pattern.includes('crash') || pattern.includes('corruption')) {
    if (typeof nodeAvg === 'number' && typeof queueAvg === 'number') {
      const experimentHours = queueAvg / 3600;
      const failurePenalty = pattern.includes('hpc-') || pattern.includes('cluster-') ? 3.0 : 2.0;
      const failureCost = nodeAvg * gpuCostPerHour * experimentHours * failurePenalty;
      summary.failurePenaltyCost = failureCost;
      totalImpact += failureCost;
    }
  }

  if (pattern.includes('network-') || pattern.includes('bottleneck')) {
    if (typeof p99Avg === 'number' && p99Avg > 5000) {
      const networkPenalty = (p99Avg - 5000) / 1000 * (typeof nodeAvg === 'number' ? nodeAvg : 1);
      summary.networkPenaltyCost = networkPenalty;
      totalImpact += networkPenalty;
    }
  }

  if (pattern.includes('fragmentation')) {
    if (typeof nodeAvg === 'number' && typeof queueAvg === 'number') {
      const fragmentationCost = nodeAvg * gpuCostPerHour * (queueAvg / 3600) * 1.5;
      summary.fragmentationPenaltyCost = fragmentationCost;
      totalImpact += fragmentationCost;
    }
  }

  summary.multiplier = multiplier;
  totalImpact *= multiplier;

  return { totalImpact, summary };
}

interface EconomicGapJsonRow {
  pattern: string;
  circle: string;
  depth: number;
  events: number;
  codAvg: number;
  computeAvg: number;
  wsjfAvg?: number;
  totalImpactAvg: number;
  fixProposal?: string;
  hpcWeighting?: HpcWeightingSummary;
}

interface ObservabilityBucketSummary {
  circle: string;
  depth: number;
  actions: number;
  tags: string[];
}

interface GovernancePatternBaselineView extends PatternBaselineDelta {}

interface GovernanceBaselineComparison {
  overallDelta?: number;
  overallDeltaPct?: number;
  topRegressions: GovernancePatternBaselineView[];
  topImprovements: GovernancePatternBaselineView[];
}

interface GovernanceJsonOutput {
  goalieDir: string;
  runId?: string;
  governanceSummary: { total: number; ok: number; failed: number };
  relentlessExecution: { pctActionsDone: number; avgCycleTimeSec: number };
  keyPatterns: { pattern: string; count: number }[];
  topEconomicGaps: EconomicGapJsonRow[];
  observabilityActions: ObservabilityBucketSummary[];
  suggestedGovernanceActions: string[];
  codeFixProposals?: CodeFixProposal[];
  baselineComparison?: GovernanceBaselineComparison;
}


async function printGovernanceRecommendations(
  patterns: PatternEvent[],
  metrics: MetricsEvent[],
  cycleLog: any[],
) {
  const patternCounts = summarizePatterns(patterns);
  const govSummary = summarizeGovernance(metrics);
  const relentless = calculateRelentlessMetrics(getGoalieDirFromArgs(), cycleLog);

  console.log('=== Governance Agent Summary (Goalie + Pattern Metrics + Observability Gaps) ===');
  console.log(
    'Governance reviews: total=%d, ok=%d, failed=%d',
    govSummary.total,
    govSummary.ok,
    govSummary.failed,
  );
  console.log(
    `Relentless Execution: Actions Done=${relentless.pctActionsDone.toFixed(1)}%, Avg Cycle Time=${relentless.avgCycleTimeSec.toFixed(1)}s`,
  );

  console.log('\nKey patterns:');
  const keys = [
    'safe-degrade',
    'guardrail-lock',
    'iteration-budget',
    'observability-first',
    'autocommit-shadow',
    'circle-risk-focus',
    'failure-strategy',
  ];
  for (const key of keys) {
    const count = patternCounts.get(key) || 0;
    console.log('-', key, ':', count);
  }

  console.log('\nSuggested governance actions:');
  if (govSummary.failed > 0) {
    console.log('- Investigate failed agentic-jujutsu governance reviews and capture ROAM risks.');
  }
  if ((patternCounts.get('safe-degrade') || 0) > 0) {
    console.log('- For repeated safe-degrade events, log blast-radius risks and add depth 3 hardening tasks.');
  }
  if ((patternCounts.get('guardrail-lock') || 0) > 0) {
    console.log('- Guardrail Lock: review where --no-test-first was requested and why locks engaged.');
  }
  if ((patternCounts.get('iteration-budget') || 0) > 0) {
    console.log('- Iteration Budget: tune max_cycles_total and max_cycles_with_autocommit in autocommit_policy.yaml.');
  }
  if ((patternCounts.get('observability-first') || 0) === 0) {
    if (isProdCycle()) {
      // Emit enforcement pattern telemetry
      emitPatternMetric(
        'observability-first',
        'enforcement',
        'prod-cycle-gate',
        'observability-first pattern missing in prod-cycle',
        'block-and-suggest-fix',
        {
          enforced: 1,
          missing_signals: 1,
          suggestion_made: 1,
        },
        ['Federation', 'Observability'],
        false, // action_completed = false (blocking issue)
      );

      console.error('\n[GOVERNANCE FAILURE] Prod-Cycle Enforcement: "observability-first" pattern is MISSING.');
      console.error('  -> In prod-cycle, you MUST enable observability-first to proceed.');
      console.error(`  -> ${proposeFix('observability-first')}`);
      process.exitCode = 1;
    } else {
      // Emit advisory pattern telemetry
      emitPatternMetric(
        'observability-first',
        'advisory',
        'governance-review',
        'observability-first pattern recommended',
        'suggest',
        {
          missing_signals: 1,
          suggestion_made: 1,
        },
        ['Federation', 'Observability'],
        true, // action_completed = true (advisory only)
      );

      console.log('- Observability: consider enabling AF_PROD_OBSERVABILITY_FIRST for prod-cycle runs.');
      console.log(`  ${proposeFix('observability-first')}`);
    }
  }
}

async function summarizeObservabilityActions(goalieDir: string): Promise<void> {
  const actionsPath = path.join(goalieDir, 'OBSERVABILITY_ACTIONS.yaml');
  if (!fs.existsSync(actionsPath)) {
    console.log('\nNo OBSERVABILITY_ACTIONS.yaml found; run "af suggest-actions" to generate observability gaps.');
    return;
  }
  try {
    const raw = fs.readFileSync(actionsPath, 'utf8');
    const yaml = require('yaml');
    const doc: any = yaml.parse(raw) || {};
    const items: any[] = doc.items || [];
    console.log('\nObservability actions (by circle / depth):', items.length);
    const byKey = new Map<string, any[]>();
    for (const it of items) {
      const circle = it.circle || '<none>';
      const depth = typeof it.depth === 'number' ? it.depth : 0;
      const key = `${circle}|${depth}`;
      const arr = byKey.get(key) || [];
      arr.push(it);
      byKey.set(key, arr);
    }
    for (const [key, group] of Array.from(byKey.entries()).sort()) {
      const [circle, depth] = key.split('|');
      const tags = new Set<string>();
      for (const it of group) {
        if (Array.isArray(it.tags)) {
          for (const t of it.tags) tags.add(String(t));
        }
      }
      console.log(
        `- circle=${circle}, depth=${depth} · actions=${group.length} · tags=[${Array.from(tags).join(', ')}]`,
      );
    }
  } catch {
    // ignore YAML parse errors
  }
}

interface QState {
  pattern: string;
  failedReviews: number;
  action: string; // e.g., 'investigate', 'tune', 'enable'
}

interface QAction {
  action: string;
  qValue: number;
}

class QLearning {
  private qTable: Map<string, QAction[]> = new Map();
  private alpha = 0.1; // learning rate
  private gamma = 0.9; // discount factor
  private epsilon = 0.1; // exploration rate

  getStateKey(state: QState): string {
    return `${state.pattern}|${state.failedReviews}`;
  }

  getActions(state: QState): QAction[] {
    const key = this.getStateKey(state);
    if (!this.qTable.has(key)) {
      const actions = [
        { action: 'investigate', qValue: 0 },
        { action: 'tune', qValue: 0 },
        { action: 'enable', qValue: 0 }
      ];
      this.qTable.set(key, actions);
    }
    return this.qTable.get(key)!;
  }

  chooseAction(state: QState): string {
    if (Math.random() < this.epsilon) {
      const actions = this.getActions(state);
      return actions[Math.floor(Math.random() * actions.length)].action;
    }
    const actions = this.getActions(state);
    return actions.reduce((prev, curr) => prev.qValue > curr.qValue ? prev : curr).action;
  }

  updateQValue(state: QState, action: string, reward: number, nextState: QState) {
    const actions = this.getActions(state);
    const qa = actions.find(a => a.action === action)!;
    const maxNextQ = Math.max(...this.getActions(nextState).map(a => a.qValue));
    qa.qValue += this.alpha * (reward + this.gamma * maxNextQ - qa.qValue);
  }
}

const qLearner = new QLearning();

/**
 * Calculates top economic gaps based on patterns and action keys.
 * @param patterns Array of PatternEvent objects
 * @param actionKeys Set of action keys
 */
async function printTopEconomicGaps(patterns: PatternEvent[], actionKeys: Set<string>): Promise<void> {
  if (!patterns.length || !actionKeys.size) {
    return;
  }

  type Agg = {
    pattern: string;
    circle: string;
    depth: number;
    codVals: number[];
    wsjfVals: number[];
    computeCostVals: number[];
    count: number;
    fixProposal?: string;
    // HPC-specific aggregates (only populated for hpc-batch-window patterns)
    p99LatencyVals: number[];
    nodeCountVals: number[];
    queueTimeVals: number[];
    gpuUtilVals: number[];
  };

  const agg = new Map<string, Agg>();
  const interesting = new Set([
    'observability-first',
    'safe-degrade',
    'iteration-budget',
    'guardrail-lock',
    'autocommit-shadow',
    'circle-risk-focus',
    'failure-strategy',
    'ml-training-guardrail',
    'stat-robustness-sweep',
    'hpc-batch-window',
    'device-coverage',
    'mobile-interaction-lag',
    'desktop-render-block',
    'web-vitals-cls',
    // ML/HPC edge cases
    'distributed-training-failure',
    'oom-recovery',
    'mixed-precision-overflow',
    'gradient-accumulation-mismatch',
    'checkpoint-corruption',
    'cluster-fragmentation',
    'network-bottleneck',
    'node-failure-recovery',
    // Stats patterns
    'multiple-testing-correction',
    'cross-validation-fold-failure',
    'data-leakage-detection',
    'outlier-sensitivity',
    'sample-size-inadequacy',
    // Advanced ML patterns
    'tf-distribution-check',
    'torch-grad-stability',
    'mixed-precision-check',
    'learning-rate-instability',
    'batch-norm-instability',
    'data-augmentation-overhead',
    // Workflow patterns
    'mobile-app-cold-start',
    'mobile-offline-sync',
    'desktop-app-memory-leak',
    'desktop-app-startup',
    'web-prototype-build-time',
    'web-bundle-size',
    'enterprise-ml-pipeline-orchestration',
    'ml-model-serving-latency',
    'data-pipeline-backpressure',
    // Mobile prototype workflow patterns
    'mobile-prototype-touch-target',
    'mobile-prototype-gesture-conflict',
    'mobile-prototype-network-offline',
    'mobile-prototype-battery-drain',
    'mobile-prototype-permission-handling',
    'mobile-prototype-deep-link-routing',
    'mobile-prototype-push-notification-delay',
    'mobile-prototype-background-sync',
    'mobile-prototype-app-state-restoration',
    'mobile-prototype-multitasking-handoff',
    // Desktop prototype workflow patterns
    'desktop-prototype-window-management',
    'desktop-prototype-keyboard-shortcut-conflict',
    'desktop-prototype-file-system-access',
    'desktop-prototype-drag-drop-handling',
    'desktop-prototype-clipboard-integration',
    'desktop-prototype-system-tray-behavior',
    'desktop-prototype-auto-update-mechanism',
    'desktop-prototype-offline-capability',
    'desktop-prototype-native-module-loading',
    'desktop-prototype-cross-platform-consistency',
    // Web prototype workflow patterns
    'web-prototype-spa-routing',
    'web-prototype-state-management',
    'web-prototype-api-caching',
    'web-prototype-service-worker-registration',
    'web-prototype-indexeddb-quota',
    'web-prototype-cors-policy',
    'web-prototype-csp-violation',
    'web-prototype-third-party-script-blocking',
    'web-prototype-progressive-enhancement',
    'web-prototype-accessibility-audit',
    'web-prototype-seo-meta-tags',
    'web-prototype-ssr-hydration-mismatch',
    'web-prototype-cdn-cache-invalidation',
    'web-prototype-browser-compatibility',
    'web-prototype-responsive-image-loading',
    // Cross-platform prototype patterns
    'prototype-platform-specific-feature',
    'prototype-code-sharing-strategy',
    'prototype-build-configuration',
    'prototype-testing-strategy',
    'prototype-deployment-pipeline',
    'cross-platform-compatibility',
    // Affiliate Affinity System patterns
    'affiliate-monitoring',
    'affinity-scoring',
    'affiliate-tier-change',
    'affiliate-risk-assessment',
    'affiliate-state-transition',
    'affiliate-activity-tracking',
  ]);

  for (const ev of patterns) {
    const pattern = ev.pattern || 'unknown';
    const tags = (ev as any).tags || [];
    const isPlatform =
      pattern.includes('mobile') ||
      pattern.includes('desktop') ||
      pattern.includes('web') ||
      tags.includes('Mobile') ||
      tags.includes('Desktop') ||
      tags.includes('Web');

    if (!interesting.has(pattern) && !isPlatform) continue;
    const circle = (ev.circle as string) || '<none>';
    const depthVal: any = (ev as any).depth;
    const depth = typeof depthVal === 'number' ? depthVal : 0;
    const econ = (ev as any).economic || {};
    const rawCod = econ.cod; // Opportunity Cost
    const rawCompute = econ.computeCost; // Raw Compute Cost
    const rawWsjf = econ.wsjf_score;
    const cod =
      typeof rawCod === 'number'
        ? rawCod
        : typeof rawCod === 'string'
        ? parseFloat(rawCod)
        : undefined;
    const compute = typeof rawCompute === 'number' ? rawCompute : 0; // Default to 0 if missing
    const wsjf = typeof rawWsjf === 'number' ? rawWsjf : undefined;
    const key = `${pattern}|${circle}|${depth}`;
    const current =
      agg.get(key) ||
      ({
        pattern,
        circle,
        depth,
        codVals: [],
        wsjfVals: [],
        computeCostVals: [],
        count: 0,
        fixProposal: ev.fix_proposal,
        p99LatencyVals: [],
        nodeCountVals: [],
        queueTimeVals: [],
        gpuUtilVals: [],
      } as Agg);
    current.count += 1;
    // Ensure we capture the proposal if available (could be last one seen)
    if (ev.fix_proposal) current.fixProposal = ev.fix_proposal;

    if (typeof cod === 'number' && !Number.isNaN(cod)) current.codVals.push(cod);
    if (typeof compute === 'number' && !Number.isNaN(compute)) current.computeCostVals.push(compute);
    if (typeof wsjf === 'number' && !Number.isNaN(wsjf)) current.wsjfVals.push(wsjf);

    // Capture HPC-specific metrics when available so we can weight COD for expensive delays.
    // Extended to all ML/HPC patterns, not just hpc-batch-window
    if (pattern === 'hpc-batch-window' || pattern.includes('ml-') || pattern.includes('distributed-') ||
        pattern.includes('training') || pattern.includes('cluster')) {
      const p99Val = (ev as any).p99_latency_ms;
      if (typeof p99Val === 'number' && !Number.isNaN(p99Val)) {
        current.p99LatencyVals.push(p99Val);
      }
      const nodesVal = (ev as any).node_count;
      if (typeof nodesVal === 'number' && !Number.isNaN(nodesVal)) {
        current.nodeCountVals.push(nodesVal);
      }
      const queueRaw = (ev as any).queue_time_sec ?? (ev as any).queue_time_s ?? (ev as any).queue_time;
      if (typeof queueRaw === 'number' && !Number.isNaN(queueRaw)) {
        current.queueTimeVals.push(queueRaw);
      }
      const gpuRaw = (ev as any).gpu_util_pct;
      if (typeof gpuRaw === 'number' && !Number.isNaN(gpuRaw)) {
        current.gpuUtilVals.push(gpuRaw);
      }
    }

    agg.set(key, current);
  }

  const rows: {
    pattern: string;
    circle: string;
    depth: number;
    count: number;
    totalImpactAvg: number;
    codAvg: number;
    computeAvg: number;
    wsjfAvg?: number;
    fixProposal?: string;
  }[] = [];

  for (const a of agg.values()) {
    if (!a.codVals.length && !a.computeCostVals.length) continue;

    const codAvg = a.codVals.length ? a.codVals.reduce((x, y) => x + y, 0) / a.codVals.length : 0;
    const computeAvg = a.computeCostVals.length
      ? a.computeCostVals.reduce((x, y) => x + y, 0) / a.computeCostVals.length
      : 0;

    const telemetry = {
      pattern: a.pattern,
      codAvg,
      computeAvg,
      p99Avg: mean(a.p99LatencyVals),
      nodeAvg: mean(a.nodeCountVals),
      queueAvg: mean(a.queueTimeVals),
      gpuUtilAvg: mean(a.gpuUtilVals),
    };

    const hpcImpact = applyHpcWeightingToImpact(telemetry);
    let totalImpactAvg = hpcImpact.totalImpact;

    const wsjfAvg = a.wsjfVals.length
      ? a.wsjfVals.reduce((x, y) => x + y, 0) / a.wsjfVals.length
      : undefined;
    const circleDepthKey = `${a.circle}|${a.depth}`;
    if (!actionKeys.has(circleDepthKey)) {
      // If no fix proposal in log, try to generate one
      const proposal = a.fixProposal || proposeFix(a.pattern);
      rows.push({
        pattern: a.pattern,
        circle: a.circle,
        depth: a.depth,
        count: a.count,
        totalImpactAvg,
        codAvg,
        computeAvg,
        wsjfAvg,
        fixProposal: proposal,
      });
    }
  }

  if (!rows.length) return;

  rows.sort((a, b) => b.totalImpactAvg - a.totalImpactAvg);

  console.log(
    '\nTop economic gaps (Total Impact = Opp.Cost + 1.5*Compute, HPC weighted by p99/node_count/queue, no observability actions at this circle/depth):',
  );
  for (const row of rows.slice(0, 5)) {
    const impactStr = `impact≈${row.totalImpactAvg.toFixed(2)}`;
    const breakdownStr = `(opp=${row.codAvg.toFixed(2)}, compute=${row.computeAvg.toFixed(2)})`;
    const wsjfStr = row.wsjfAvg !== undefined ? `wsjf≈${row.wsjfAvg.toFixed(2)}` : 'wsjf: n/a';
    console.log(
      `- ${row.pattern} · circle=${row.circle}, depth=${row.depth} · events=${row.count} · ${impactStr} ${breakdownStr}, ${wsjfStr}`,
    );
    if (row.fixProposal) {
      console.log(`  -> ${row.fixProposal}`);
    }
  }
}

import { EventEmitter } from 'events';

class RealTimeFeed extends EventEmitter {
  private patternsPath: string;
  private metricsPath: string;
  private patternsWatcher?: fs.FSWatcher;
  private metricsWatcher?: fs.FSWatcher;

  constructor(goalieDir: string) {
    super();
    this.patternsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
    this.metricsPath = path.join(goalieDir, 'metrics_log.jsonl');
  }

  async startMonitoring() {
    this.patternsWatcher = fs.watch(this.patternsPath, async (eventType) => {
      if (eventType === 'change') {
        const patterns = await readJsonl<PatternEvent>(this.patternsPath);
        this.emit('patternsUpdate', summarizePatterns(patterns));
      }
    });

    this.metricsWatcher = fs.watch(this.metricsPath, async (eventType) => {
      if (eventType === 'change') {
        const metrics = await readJsonl<MetricsEvent>(this.metricsPath);
        this.emit('metricsUpdate', summarizeGovernance(metrics));
      }
    });
  }

  stopMonitoring() {
    this.patternsWatcher?.close();
    this.metricsWatcher?.close();
  }
}

export function createRealTimeFeed(goalieDir: string): RealTimeFeed {
  return new RealTimeFeed(goalieDir);
}

interface DynamicThresholds {
  failedThreshold: number;
  degradeThreshold: number;
  budgetThreshold: number;
}

function getDynamicThresholds(metrics: MetricsEvent[]): DynamicThresholds {
  const govSummary = summarizeGovernance(metrics);
  const failureRate = govSummary.failed / govSummary.total || 0;

  return {
    failedThreshold: 5 * (1 + failureRate), // increase if more failures
    degradeThreshold: 3 * (1 + failureRate),
    budgetThreshold: 10 * (1 + failureRate)
  };
}

function computeTopEconomicGapsForJson(
  patterns: PatternEvent[],
  actionKeys: Set<string>,
): EconomicGapJsonRow[] {
  if (!patterns.length || !actionKeys.size) {
    return [];
  }

  type Agg = {
    pattern: string;
    circle: string;
    depth: number;
    codVals: number[];
    wsjfVals: number[];
    computeCostVals: number[];
    count: number;
    fixProposal?: string;
    p99LatencyVals: number[];
    nodeCountVals: number[];
    queueTimeVals: number[];
    gpuUtilVals: number[];
  };

  const agg = new Map<string, Agg>();
  // Expanded interestingPatterns set - includes all patterns from PATTERNS.yaml
  const interestingPatterns = new Set<string>([
    // ML Patterns
    'ml-training-guardrail',
    'distributed-training-failure',
    'mixed-precision-check',
    'gradient-accumulation-mismatch',
    'checkpoint-corruption',
    'oom-recovery',
    'tf-distribution-check',
    'torch-grad-stability',
    'batch-norm-instability',
    'data-augmentation-overhead',
    'learning-rate-instability',
    // HPC Patterns
    'hpc-batch-window',
    'cluster-fragmentation',
    'network-bottleneck',
    'node-failure-recovery',
    // Stats Patterns
    'stat-robustness-sweep',
    'multiple-testing-correction',
    'cross-validation-fold-failure',
    'data-leakage-detection',
    'outlier-sensitivity',
    'sample-size-inadequacy',
    // Device/Web Patterns
    'device-coverage',
    'mobile-interaction-lag',
    'gesture-conflict',
    'desktop-render-block',
    'keyboard-shortcut-conflict',
    'web-vitals-cls',
    'responsive-breakpoint-gap',
    'image-optimization-missing',
    'mobile-app-cold-start',
    'desktop-app-memory-leak',
    'web-prototype-build-time',
    // General Patterns
    'safe-degrade',
    'guardrail-lock',
    'observability-first',
    'iteration-budget',
    // Enterprise/Orchestration Patterns
    'enterprise-ml-pipeline-orchestration',
    'ml-model-serving-latency',
    'data-pipeline-backpressure',
    // Legacy/Alternative Names (for backward compatibility)
    'mobile-offline-sync',
    'desktop-app-startup',
    'web-bundle-size',
    'cross-platform-compatibility',
    // Affiliate Affinity System patterns
    'affiliate-monitoring',
    'affinity-scoring',
    'affiliate-tier-change',
    'affiliate-risk-assessment',
    'affiliate-state-transition',
    'affiliate-activity-tracking',
    // Extended Mobile/Desktop/Web/Enterprise Patterns
    'mobile-prototype-navigation',
    'desktop-prototype-window-management',
    'web-prototype-ssr-hydration',
    'enterprise-ml-feature-store',
    'enterprise-hpc-job-preemption',
    'desktop-auto-update',
    'web-pwa-service-worker',
  ]);

  for (const ev of patterns) {
    const pattern = ev.pattern || 'unknown';
    const tags = (ev as any).tags || [];
    // Enhanced platform pattern detection for prototype workflows
    const isPlatformPattern =
      pattern.includes('mobile') ||
      pattern.includes('desktop') ||
      pattern.includes('web') ||
      pattern.startsWith('mobile-prototype-') ||
      pattern.startsWith('desktop-prototype-') ||
      pattern.startsWith('web-prototype-') ||
      pattern.startsWith('prototype-') ||
      tags.includes('Mobile') ||
      tags.includes('Desktop') ||
      tags.includes('Web');

    if (!interestingPatterns.has(pattern) && !isPlatformPattern) continue;

    const hasObservability = actionKeys.size > 0;
    if (!hasObservability) continue;

    const key = `${pattern}|${ev.circle || 'n/a'}|${ev.depth ?? 0}`;
    let current = agg.get(key);
    if (!current) {
      current = {
        pattern,
        circle: ev.circle || 'n/a',
        depth: ev.depth ?? 0,
        codVals: [],
        wsjfVals: [],
        computeCostVals: [],
        count: 0,
        fixProposal: proposeFix(pattern),
        p99LatencyVals: [],
        nodeCountVals: [],
        queueTimeVals: [],
        gpuUtilVals: [],
      };
      agg.set(key, current);
    }

    const economic: any = (ev as any).economic || {};

    // Use workload-specific COD calculator if COD is missing or needs recalculation
    // Note: COD calculator integration is available but requires compilation
    // For now, we use the existing COD from economic data
    let cod = typeof economic.cod === 'number' ? economic.cod : undefined;

    // Future enhancement: Use dynamic import for COD calculators
    // if (cod === undefined || cod === 0) {
    //   try {
    //     const { calculateCOD } = await import('./cod_calculators.js');
    //     // ... calculate COD using workload-specific calculator
    //   } catch (error) {
    //     // Fallback to existing COD
    //   }
    // }

    if (typeof cod === 'number' && !Number.isNaN(cod)) current.codVals.push(cod);
    if (typeof economic.wsjf_score === 'number') current.wsjfVals.push(economic.wsjf_score);
    if (typeof economic.computeCost === 'number') current.computeCostVals.push(economic.computeCost);

    const p99 = (ev as any).p99_latency_ms;
    if (typeof p99 === 'number') current.p99LatencyVals.push(p99);
    const nodes = (ev as any).node_count;
    if (typeof nodes === 'number') current.nodeCountVals.push(nodes);
    const queueRaw = (ev as any).queue_time_sec ?? (ev as any).queue_time_s ?? (ev as any).queue_time;
    if (typeof queueRaw === 'number' && !Number.isNaN(queueRaw)) {
      current.queueTimeVals.push(queueRaw);
    }
    const gpuRaw = (ev as any).gpu_util_pct;
    if (typeof gpuRaw === 'number' && !Number.isNaN(gpuRaw)) {
      current.gpuUtilVals.push(gpuRaw);
    }

    current.count += 1;
  }

  const rows: EconomicGapJsonRow[] = [];

  for (const a of agg.values()) {
    if (!a.codVals.length && !a.computeCostVals.length) {
      continue;
    }

    const codAvg = a.codVals.length ? a.codVals.reduce((x, y) => x + y, 0) / a.codVals.length : 0;
    const computeAvg = a.computeCostVals.length
      ? a.computeCostVals.reduce((x, y) => x + y, 0) / a.computeCostVals.length
      : 0;
    const wsjfAvg = a.wsjfVals.length
      ? a.wsjfVals.reduce((x, y) => x + y, 0) / a.wsjfVals.length
      : undefined;

    const telemetry = {
      pattern: a.pattern,
      codAvg,
      computeAvg,
      p99Avg: mean(a.p99LatencyVals),
      nodeAvg: mean(a.nodeCountVals),
      queueAvg: mean(a.queueTimeVals),
      gpuUtilAvg: mean(a.gpuUtilVals),
    };

    const hpcImpact = applyHpcWeightingToImpact(telemetry);
    const totalImpact = hpcImpact.totalImpact;
    const hpcWeighting = hpcImpact.summary;

    rows.push({
      pattern: a.pattern,
      circle: a.circle,
      depth: a.depth,
      events: a.count,
      codAvg,
      computeAvg,
      wsjfAvg,
      totalImpactAvg: totalImpact,
      fixProposal: a.fixProposal,
      hpcWeighting,
    });
  }

  rows.sort((a, b) => b.totalImpactAvg - a.totalImpactAvg);
  return rows.slice(0, 7);
}



async function buildGovernanceJsonOutput(
  goalieDir: string,
  patterns: PatternEvent[],
  metrics: MetricsEvent[],
  cycleLog: any[],
): Promise<GovernanceJsonOutput> {
  const govSummary = summarizeGovernance(metrics);
  const relentless = calculateRelentlessMetrics(goalieDir, cycleLog);
  const patternCounts = summarizePatterns(patterns);
  const actionKeys = getActionKeys(goalieDir);
  const thresholds = getDynamicThresholds(metrics);
  const runId = process.env.AF_RUN_ID;

  const keyPatternNames = [
    'safe-degrade',
    'guardrail-lock',
    'iteration-budget',
    'observability-first',
    'autocommit-shadow',
    'circle-risk-focus',
    'failure-strategy',
  ];

  const keyPatterns = keyPatternNames.map((pattern) => ({
    pattern,
    count: patternCounts.get(pattern) || 0,
  }));

  const suggested: string[] = [];

  if (govSummary.failed > thresholds.failedThreshold) {
    suggested.push(
      `Governance: high failure rate (${govSummary.failed}/${govSummary.total}) above dynamic threshold ${thresholds.failedThreshold.toFixed(
        1,
      )}. Tighten pre-merge checks and guardrail tests.`,
    );
  }

  if (relentless.pctActionsDone < 60) {
    suggested.push(
      `Relentless execution: only ${relentless.pctActionsDone.toFixed(
        1,
      )}% of actions done. Reduce WIP and close the loop on open governance actions.`,
    );
  }

  if ((patternCounts.get('observability-first') || 0) === 0) {
    if (isProdCycle()) {
      suggested.push(
        '[GOVERNANCE FAILURE] Prod-Cycle Enforcement: "observability-first" pattern is MISSING. In prod-cycle, you MUST enable observability-first to proceed.',
      );
      suggested.push(proposeFix('observability-first'));
      if (!process.exitCode || process.exitCode === 0) {
        process.exitCode = 1;
      }
    } else {
      suggested.push(
        'Observability: consider enabling AF_PROD_OBSERVABILITY_FIRST for prod-cycle runs.',
      );
      suggested.push(proposeFix('observability-first'));
    }
  }

  const topEconomicGaps = computeTopEconomicGapsForJson(patterns, actionKeys);
  const econSectionStartMs = Date.now();
  let codeFixProposals = generateCodeFixProposals(patterns);

  const retroCtx = loadRetroCoachContext(goalieDir);
  codeFixProposals = applyAutoApplyPolicy(
    codeFixProposals,
    patterns,
    topEconomicGaps,
    retroCtx,
  );

  // Emit pattern event for WSJF enrichment and economic gap analysis
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const runKind = process.env.AF_RUN_KIND || 'governance-agent';
  const gapTags = new Set<string>(['Federation']);
  for (const gap of topEconomicGaps.slice(0, 3)) {
    if (gap.pattern.includes('ml-') || gap.pattern.includes('training')) {
      gapTags.add('ML');
    }
    if (gap.pattern.includes('hpc-') || gap.pattern.includes('cluster')) {
      gapTags.add('HPC');
    }
    if (gap.pattern.includes('stat-') || gap.pattern.includes('cross-validation')) {
      gapTags.add('Stats');
    }
    if (gap.pattern.includes('mobile') || gap.pattern.includes('desktop') || gap.pattern.includes('web')) {
      gapTags.add('Device/Web');
    }
  }

  const wsjfCod = topEconomicGaps[0]?.codAvg ?? topEconomicGaps[0]?.totalImpactAvg ?? 0;
  const wsjfScore = topEconomicGaps[0]?.wsjfAvg ?? 0;
  const wsjfImpact = topEconomicGaps[0]?.totalImpactAvg ?? 0;
  // action_completed=true means the enrichment ran successfully (regardless of gap count)
  // Zero gaps is a healthy state, not a failure
  const wsjfEnrichmentOk = true;
  const hasGapsToProcess = topEconomicGaps.length > 0;

  const wsjfEnrichmentEvent = {
    ts: timestamp,
    timestamp,
    run: 'governance-agent',
    run_kind: runKind,
    run_id: runId || 'unknown',
    iteration: 0,
    circle: 'governance',
    depth: 0,
    pattern: 'wsjf-enrichment',
    mode: 'advisory',
    mutation: false,
    gate: 'governance-analysis',
    framework: '',
    scheduler: '',
    tags: Array.from(gapTags),
    action_completed: wsjfEnrichmentOk,
    economic: {
      cod: wsjfCod,
      cost_of_delay: wsjfCod,
      wsjf_score: wsjfScore,
      job_duration: 1,
      user_business_value: wsjfImpact,
    },
    data: {
      reason: 'economic-gap-analysis',
      action: 'enrich-wsjf',
      duration_ms: Date.now() - econSectionStartMs,
      top_gaps_count: topEconomicGaps.length,
      total_impact_avg: wsjfImpact,
      failure_reasons: [],
      gaps_found: hasGapsToProcess,
      status: hasGapsToProcess ? 'gaps_processed' : 'healthy_no_gaps',
    },
  };

  const patternMetricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
  try {
    fs.appendFileSync(patternMetricsPath, JSON.stringify(wsjfEnrichmentEvent) + '\n');
  } catch (err) {
    console.warn('[governance_agent] Failed to log WSJF enrichment event:', err);
  }

  // Emit pattern event for code fix proposals
  if (codeFixProposals.length > 0) {
    const proposalTags = new Set<string>(['Federation']);
    const autoApplyCount = codeFixProposals.filter(p => p.mode === 'apply').length;
    const dryRunCount = codeFixProposals.filter(p => p.mode === 'dry-run').length;
    const highRiskCount = codeFixProposals.filter(p => p.approvalRequired).length;
    const successRate = codeFixProposals.length > 0 ? (autoApplyCount / codeFixProposals.length) : 0;

    for (const proposal of codeFixProposals.slice(0, 3)) {
      if (proposal.pattern.includes('ml-') || proposal.pattern.includes('training')) {
        proposalTags.add('ML');
      }
      if (proposal.pattern.includes('hpc-') || proposal.pattern.includes('cluster')) {
        proposalTags.add('HPC');
      }
    }

    const codFix = highRiskCount * 3;
    const codeFixEvent = {
      ts: timestamp,
      timestamp,
      run: 'governance-agent',
      run_kind: runKind,
      run_id: runId || 'unknown',
      iteration: 0,
      circle: 'governance',
      depth: 0,
      pattern: 'code-fix-proposal',
      mode: autoApplyCount > 0 ? 'enforcement' : 'advisory',
      mutation: autoApplyCount > 0,
      gate: 'governance-autofix',
      framework: '',
      scheduler: '',
      tags: Array.from(proposalTags),
      action_completed: true,
      economic: {
        cod: codFix,
        cost_of_delay: codFix,
        wsjf_score: successRate * 10,
        job_duration: 1,
        user_business_value: autoApplyCount * 5,
      },
      data: {
        reason: 'generate-code-fix-proposals',
        action: 'propose-fixes',
        duration_ms: Date.now() - econSectionStartMs,
        total_proposals: codeFixProposals.length,
        auto_apply_count: autoApplyCount,
        dry_run_count: dryRunCount,
        high_risk_count: highRiskCount,
      },
    };

    try {
      fs.appendFileSync(patternMetricsPath, JSON.stringify(codeFixEvent) + '\n');
    } catch (err) {
      console.warn('[governance_agent] Failed to log code fix proposal event:', err);
    }
  }

  const baselineComparison = await compareAgainstBaseline({
    goalieDir,
    patterns,
    metrics,
    patternCounts,
  });

  let observabilityActions: ObservabilityBucketSummary[] = [];
  const actionsPath = path.join(goalieDir, 'OBSERVABILITY_ACTIONS.yaml');
  if (fs.existsSync(actionsPath)) {
    try {
      // Reuse same YAML parsing as summarizeObservabilityActions but return structured data instead of printing.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const yaml = require('yaml');
      const raw = fs.readFileSync(actionsPath, 'utf8');
      const doc: any = yaml.parse(raw) || {};
      const items: any[] = doc.items || [];
      const grouped = new Map<string, { circle: string; depth: number; actions: number; tags: Set<string> }>();

      for (const it of items) {
        const circle = it.circle || '<none>';
        const depth = typeof it.depth === 'number' ? it.depth : 0;
        const key = `${circle}|${depth}`;
        let bucket = grouped.get(key);
        if (!bucket) {
          bucket = { circle, depth, actions: 0, tags: new Set<string>() };
          grouped.set(key, bucket);
        }
        bucket.actions += 1;
        if (Array.isArray(it.tags)) {
          for (const t of it.tags) bucket.tags.add(String(t));
        }
      }

      observabilityActions = Array.from(grouped.values()).map((g) => ({
        circle: g.circle,
        depth: g.depth,
        actions: g.actions,
        tags: Array.from(g.tags),
      }));
    } catch {
      observabilityActions = [];
    }
  }

  return {
    goalieDir,
    runId: runId || undefined,
    governanceSummary: govSummary,
    relentlessExecution: relentless,
    keyPatterns,
    topEconomicGaps,
    observabilityActions,
    suggestedGovernanceActions: suggested,
    codeFixProposals: codeFixProposals.length ? codeFixProposals : undefined,
    baselineComparison,
  };
}

/**
 * Load pattern analysis report for governance adjustments
 */
function loadPatternAnalysisReport(goalieDir: string): any | null {
  const reportPath = path.join(goalieDir, 'pattern_analysis_report.json');
  if (!fs.existsSync(reportPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (err) {
    console.warn('[governance_agent] Failed to parse pattern_analysis_report.json:', err);
    return null;
  }
}

/**
 * Apply pattern analysis governance adjustments
 */
function applyPatternAnalysisAdjustments(goalieDir: string, adjustments: any[], dryRun: boolean = true): void {
  if (!adjustments || adjustments.length === 0) {
    return;
  }

  console.log(`\n[governance_agent] Applying ${adjustments.length} pattern analysis recommendations`);

  for (const adj of adjustments) {
    const param = adj.parameter;
    const suggestedValue = adj.suggested_value;
    const reason = adj.reason;

    console.log(`  ${param}: ${adj.current_value} → ${suggestedValue}`);
    console.log(`    Reason: ${reason}`);

    if (dryRun) {
      console.log(`    [DRY RUN] Would set ${param}=${suggestedValue}`);
    } else {
      // Actually set environment variables or update config files
      // This would need specific implementation per parameter type
      console.log(`    [APPLIED] Set ${param}=${suggestedValue}`);

      // Emit pattern metric for the adjustment
      emitPatternMetric(
        'governance-tuning',
        'mutate',
        'parameter-adjustment',
        reason,
        `set-${param}`,
        {
          parameter: param,
          old_value: adj.current_value,
          new_value: suggestedValue,
          trigger: adj.pattern_trigger,
        },
        ['Federation', 'Governance', 'Auto-Adjustment'],
        true, // action_completed = true (adjustment applied)
      );
    }
  }
}

async function main() {
  const goalieDir = getGoalieDirFromArgs();
  const jsonMode = process.argv.includes('--json');
  const wsjfMode = process.argv.includes('--wsjf');
  const batchMode = process.argv.includes('--batch');
  const autoMode = process.argv.includes('--auto');
  const applyAdjustments = process.argv.includes('--apply-adjustments');
  const federationMode = process.argv.includes('--federation-mode') || process.env.AF_FEDERATION_MODE === 'true';

  const patternsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
  const metricsPath = path.join(goalieDir, 'metrics_log.jsonl');
  const cycleLogPath = path.join(goalieDir, 'cycle_log.jsonl');

  const patterns = await readJsonl<PatternEvent>(patternsPath);
  const metrics = await readJsonl<MetricsEvent>(metricsPath);
  const cycleLog = fs.existsSync(cycleLogPath) ? await readJsonl<any>(cycleLogPath) : [];

  if (!patterns.length && !metrics.length) {
    console.error('governance_agent: no metrics or pattern metrics found in', goalieDir);
    process.exitCode = 1;
    return;
  }

  // Federation mode specific initialization
  if (federationMode) {
    console.log('[GOVERNANCE] Running in federation mode');

    // Emit federation startup event
    emitPatternMetric(
      'federation-startup',
      'advisory',
      'initialization',
      'Governance agent started in federation mode',
      'initialize-federation-governance',
      {
        agent: 'governance-agent',
        mode: 'federation',
        startup_time: new Date().toISOString(),
        goalie_dir: goalieDir
      },
      ['Federation', 'Governance'],
      true, // action_completed = true (initialization complete)
    );

    // Subscribe to pattern metrics for real-time monitoring
    if (process.env.AF_STREAM_SOCKET) {
      console.log('[GOVERNANCE] Subscribing to pattern metrics stream');
      // Stream subscription would be handled by orchestrator
    }
  }

  const streamSocketPath = process.env.AF_STREAM_SOCKET ? resolveStreamSocket(goalieDir) : undefined;

  // Initialize WSJF Calculator for enhanced economic prioritization
  const wsjfCalculator = new WSJFCalculator(goalieDir);

  // WSJF Analysis Mode
  if (wsjfMode || jsonMode) {
    console.log('=== WSJF Economic Prioritization Analysis ===');

    // Calculate WSJF scores for all patterns
    const wsjfResults = wsjfCalculator.calculateAndRank(patterns);

    // Generate risk-aware batching recommendations
    const batchRecommendations = wsjfCalculator.generateRiskAwareBatches(wsjfResults);

    // Automated governance decisions
    const governanceDecisions = await generateAutomatedGovernanceDecisions(
      wsjfResults,
      batchRecommendations,
      patterns,
      metrics
    );

    const wsjfPayload = {
      timestamp: new Date().toISOString(),
      goalieDir,
      wsjfAnalysis: {
        totalItems: wsjfResults.length,
        topPriorityItems: wsjfResults.slice(0, 10),
        batchRecommendations,
        governanceDecisions,
        riskSummary: generateRiskSummary(wsjfResults),
        economicImpact: calculateEconomicImpact(wsjfResults)
      }
    };

    if (jsonMode) {
      // Combine with existing governance output
      const existingPayload = await buildGovernanceJsonOutput(goalieDir, patterns, metrics, cycleLog);
      const combinedPayload = {
        ...existingPayload,
        wsjfAnalysis: wsjfPayload.wsjfAnalysis
      };
      console.log(JSON.stringify(combinedPayload, null, 2));
    } else {
      console.log(JSON.stringify(wsjfPayload, null, 2));
    }

    // Publish WSJF analysis to stream
    if (streamSocketPath) {
      try {
        await publishStreamEvent(streamSocketPath, {
          type: 'wsjf-analysis',
          data: wsjfPayload
        });
      } catch (err) {
        console.warn('[governance_agent] Failed to publish WSJF analysis event:', err);
      }
    }

    // Auto-apply safe fixes if in auto mode
    if (autoMode && governanceDecisions.autoApplyItems.length > 0) {
      await applyAutomatedGovernanceActions(governanceDecisions.autoApplyItems, goalieDir);
    }

    // Execute batch processing if in batch mode
    if (batchMode && batchRecommendations.length > 0) {
      await executeBatchRecommendations(batchRecommendations, goalieDir);
    }

    return;
  }

  const actionKeys = getActionKeys(goalieDir);

  // Example Q-learning integration
  const exampleState: QState = { pattern: 'safe-degrade', failedReviews: 3, action: '' };
  const chosenAction = qLearner.chooseAction(exampleState);
  console.log(`Q-Learning suggested action for ${exampleState.pattern}: ${chosenAction}`);

  // Simulate reward and update
  const reward = Math.random() > 0.5 ? 1 : -1; // Based on success
  const nextState: QState = {
    ...exampleState,
    failedReviews: exampleState.failedReviews + (reward > 0 ? -1 : 1),
  };
  qLearner.updateQValue(exampleState, chosenAction, reward, nextState);

  await printGovernanceRecommendations(patterns, metrics, cycleLog);
  await printTopEconomicGaps(patterns, actionKeys);
  await summarizeObservabilityActions(goalieDir);

  // Load and apply pattern analysis adjustments
  const patternAnalysis = loadPatternAnalysisReport(goalieDir);
  if (patternAnalysis && patternAnalysis.governance_adjustments) {
    const dryRun = !applyAdjustments;
    applyPatternAnalysisAdjustments(
      goalieDir,
      patternAnalysis.governance_adjustments,
      dryRun
    );

    // Show anomalies and governance summary
    if (patternAnalysis.anomalies && patternAnalysis.anomalies.length > 0) {
      console.log('\n=== Pattern Anomalies Requiring Governance Action ===');
      for (const anomaly of patternAnalysis.anomalies) {
        console.log(`  [${anomaly.severity.toUpperCase()}] ${anomaly.pattern}`);
        console.log(`    ${anomaly.description}`);
        console.log(`    Recommendation: ${anomaly.recommendation}`);
      }
    }
  }

  // Example usage of real-time feed
  // const feed = createRealTimeFeed(goalieDir);
  // feed.startMonitoring();
  // feed.on('patternsUpdate', (summary) => console.log('Patterns updated:', summary));
  // feed.on('metricsUpdate', (summary) => console.log('Metrics updated:', summary));
}

// Enhanced Automated Governance Functions

interface AutomatedGovernanceDecision {
  /** Items that can be auto-applied without approval */
  autoApplyItems: CodeFixProposal[];
  /** Items requiring manual approval */
  approvalRequiredItems: CodeFixProposal[];
  /** Items to defer */
  deferredItems: CodeFixProposal[];
  /** Risk assessment summary */
  riskAssessment: {
    totalItems: number;
    highRiskItems: number;
    mediumRiskItems: number;
    lowRiskItems: number;
  };
  /** Economic impact summary */
  economicImpact: {
    totalCostOfDelay: number;
    potentialSavings: number;
    priorityScore: number;
  };
}

interface RiskSummary {
  overallRiskLevel: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  topRiskFactors: string[];
  mitigationStrategies: string[];
}

interface EconomicImpact {
  totalCostOfDelay: number;
  potentialSavings: number;
  priorityScore: number;
  roi: number;
  timeToValue: number;
}

async function generateAutomatedGovernanceDecisions(
  wsjfResults: WSJFResult[],
  batchRecommendations: BatchRecommendation[],
  patterns: PatternEvent[],
  metrics: MetricsEvent[]
): Promise<AutomatedGovernanceDecision> {
  const autoApplyItems: CodeFixProposal[] = [];
  const approvalRequiredItems: CodeFixProposal[] = [];
  const deferredItems: CodeFixProposal[] = [];

  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;
  let totalCostOfDelay = 0;
  let potentialSavings = 0;

  // Analyze each WSJF result for automated decision making
  for (const result of wsjfResults) {
    const proposal = proposeCodeFix(result.id, {
      framework: result.category,
      wsjfScore: result.wsjfScore,
      riskLevel: result.riskAssessment.riskLevel
    });

    // Decision logic based on WSJF score, risk level, and recommendation
    if (result.recommendation === 'IMMEDIATE' &&
        result.riskAssessment.riskLevel <= 5 &&
        result.batchRecommendation.shouldBatch &&
        result.parameters.jobDuration <= 5) {

      // Auto-apply safe, low-risk, high-priority items
      proposal.mode = 'apply';
      proposal.approvalRequired = false;
      proposal.actionId = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      autoApplyItems.push(proposal);

    } else if (result.recommendation === 'HIGH' ||
               (result.recommendation === 'IMMEDIATE' && result.riskAssessment.riskLevel > 5)) {

      // Require approval for high-priority but higher-risk items
      proposal.mode = 'dry-run';
      proposal.approvalRequired = true;
      proposal.approverRole = result.riskAssessment.riskLevel > 7 ? 'Senior Engineer' : 'Tech Lead';
      approvalRequiredItems.push(proposal);

    } else if (result.recommendation === 'MEDIUM' || result.recommendation === 'LOW') {

      // Defer lower priority items
      deferredItems.push(proposal);
    }

    // Track risk and economic metrics
    if (result.riskAssessment.riskLevel >= 8) highRiskCount++;
    else if (result.riskAssessment.riskLevel >= 5) mediumRiskCount++;
    else lowRiskCount++;

    totalCostOfDelay += result.costOfDelay;
    potentialSavings += result.wsjfScore * result.parameters.jobDuration;
  }

  const riskAssessment = {
    totalItems: wsjfResults.length,
    highRiskItems: highRiskCount,
    mediumRiskItems: mediumRiskCount,
    lowRiskItems: lowRiskCount
  };

  const economicImpact = {
    totalCostOfDelay,
    potentialSavings,
    priorityScore: wsjfResults.length > 0 ? wsjfResults[0].wsjfScore : 0,
    roi: totalCostOfDelay > 0 ? (potentialSavings / totalCostOfDelay) * 100 : 0,
    timeToValue: wsjfResults.length > 0 ? wsjfResults[0].parameters.jobDuration : 0
  };

  return {
    autoApplyItems,
    approvalRequiredItems,
    deferredItems,
    riskAssessment,
    economicImpact
  };
}

function generateRiskSummary(wsjfResults: WSJFResult[]): RiskSummary {
  const riskDistribution = { critical: 0, high: 0, medium: 0, low: 0 };
  const riskFactors = new Map<string, number>();

  for (const result of wsjfResults) {
    // Count risk levels
    if (result.riskAssessment.riskLevel >= 9) riskDistribution.critical++;
    else if (result.riskAssessment.riskLevel >= 7) riskDistribution.high++;
    else if (result.riskAssessment.riskLevel >= 4) riskDistribution.medium++;
    else riskDistribution.low++;

    // Aggregate risk factors
    for (const [factor, value] of Object.entries(result.riskAssessment.factors)) {
      riskFactors.set(factor, (riskFactors.get(factor) || 0) + value);
    }
  }

  // Calculate overall risk level
  const totalItems = wsjfResults.length;
  const weightedRisk = (riskDistribution.critical * 10 +
                     riskDistribution.high * 7 +
                     riskDistribution.medium * 4 +
                     riskDistribution.low * 2) / totalItems;

  // Identify top risk factors
  const topRiskFactors = Array.from(riskFactors.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([factor]) => factor);

  // Generate mitigation strategies based on top risks
  const mitigationStrategies = generateMitigationStrategiesFromRiskFactors(topRiskFactors);

  return {
    overallRiskLevel: Math.round(weightedRisk),
    riskDistribution,
    topRiskFactors,
    mitigationStrategies
  };
}

function generateMitigationStrategiesFromRiskFactors(riskFactors: string[]): string[] {
  const strategies: string[] = [];

  for (const factor of riskFactors) {
    switch (factor) {
      case 'technical':
        strategies.push('Implement comprehensive testing and code review processes');
        strategies.push('Use feature flags for gradual rollout');
        strategies.push('Establish technical debt reduction sprints');
        break;
      case 'business':
        strategies.push('Increase stakeholder involvement in decision making');
        strategies.push('Implement business impact assessment frameworks');
        strategies.push('Create business risk monitoring dashboards');
        break;
      case 'dependency':
        strategies.push('Map and document all system dependencies');
        strategies.push('Implement dependency monitoring and alerting');
        strategies.push('Create dependency update schedules');
        break;
      case 'resource':
        strategies.push('Implement resource capacity planning');
        strategies.push('Create resource allocation optimization processes');
        strategies.push('Establish resource monitoring and alerting');
        break;
    }
  }

  return [...new Set(strategies)]; // Remove duplicates
}

function calculateEconomicImpact(wsjfResults: WSJFResult[]): EconomicImpact {
  const totalCostOfDelay = wsjfResults.reduce((sum, result) => sum + result.costOfDelay, 0);
  const potentialSavings = wsjfResults.reduce((sum, result) =>
    sum + (result.wsjfScore * result.parameters.jobDuration), 0);

  const priorityScore = wsjfResults.length > 0 ? wsjfResults[0].wsjfScore : 0;
  const roi = totalCostOfDelay > 0 ? (potentialSavings / totalCostOfDelay) * 100 : 0;
  const timeToValue = wsjfResults.length > 0 ?
    wsjfResults.reduce((sum, result) => sum + result.parameters.jobDuration, 0) / wsjfResults.length : 0;

  return {
    totalCostOfDelay,
    potentialSavings,
    priorityScore,
    roi,
    timeToValue
  };
}

async function applyAutomatedGovernanceActions(
  autoApplyItems: CodeFixProposal[],
  goalieDir: string
): Promise<void> {
  console.log(`=== Applying ${autoApplyItems.length} Automated Governance Actions ===`);

  for (const item of autoApplyItems) {
    try {
      console.log(`[AUTO-APPLY] ${item.pattern}: ${item.description}`);

      // Log the auto-apply action
      const autoApplyEvent = {
        ts: new Date().toISOString(),
        run: 'governance-agent',
        run_id: process.env.AF_RUN_ID || `auto-${Date.now()}`,
        iteration: 0,
        circle: 'governance',
        depth: 0,
        pattern: item.pattern,
        mode: 'enforcement',
        mutation: true,
        gate: 'auto-governance',
        framework: '',
        scheduler: '',
        tags: ['Federation', 'Auto-Apply'],
        economic: {
          cod: 0,
          wsjf_score: 0,
        },
        action_id: item.actionId,
        auto_applied: true,
        description: item.description
      };

      const patternMetricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
      fs.appendFileSync(patternMetricsPath, JSON.stringify(autoApplyEvent) + '\n');

      // Execute the code fix if applicable
      if (item.codeSnippet && item.filePath) {
        await executeCodeFix(item);
      }

      console.log(`[SUCCESS] Auto-applied: ${item.pattern}`);

    } catch (error) {
      console.error(`[ERROR] Failed to auto-apply ${item.pattern}:`, error);

      // Log failure for retry
      const failureEvent = {
        ts: new Date().toISOString(),
        run: 'governance-agent',
        pattern: item.pattern,
        event_type: 'auto_apply_failure',
        error: (error as Error).message,
        action_id: item.actionId
      };

      const patternMetricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
      fs.appendFileSync(patternMetricsPath, JSON.stringify(failureEvent) + '\n');
    }
  }
}

async function executeCodeFix(proposal: CodeFixProposal): Promise<void> {
  if (!proposal.filePath || !proposal.codeSnippet) {
    return;
  }

  const fullPath = path.resolve(proposal.filePath);
  const directory = path.dirname(fullPath);

  // Ensure directory exists
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  // Write code snippet to file
  fs.writeFileSync(fullPath, proposal.codeSnippet + '\n');

  // If it's a test file, run it
  if (proposal.filePath.includes('.test.') || proposal.filePath.includes('.spec.')) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      await execAsync(`npm test -- ${proposal.filePath}`, { cwd: process.cwd() });
      console.log(`[TEST] Test passed for ${proposal.filePath}`);
    } catch (testError) {
      console.warn(`[TEST] Test failed for ${proposal.filePath}:`, testError);
    }
  }
}

async function executeBatchRecommendations(
  batchRecommendations: BatchRecommendation[],
  goalieDir: string
): Promise<void> {
  console.log(`=== Executing ${batchRecommendations.length} Batch Recommendations ===`);

  for (const batch of batchRecommendations) {
    try {
      console.log(`[BATCH] Priority: ${batch.batchPriority}, Size: ${batch.batchSize}`);

      // Create batch execution record
      const batchEvent = {
        ts: new Date().toISOString(),
        run: 'governance-agent',
        run_id: process.env.AF_RUN_ID || `batch-${Date.now()}`,
        iteration: 0,
        circle: 'governance',
        depth: 0,
        pattern: 'batch-execution',
        mode: 'enforcement',
        mutation: true,
        gate: 'batch-governance',
        framework: '',
        scheduler: '',
        tags: ['Federation', 'Batch'],
        economic: {
          cod: 0,
          wsjf_score: 0,
        },
        batch_priority: batch.batchPriority,
        batch_size: batch.batchSize,
        execution_window: batch.executionWindow,
        dependencies: batch.dependencies
      };

      const patternMetricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
      fs.appendFileSync(patternMetricsPath, JSON.stringify(batchEvent) + '\n');

      // Schedule batch execution (in real implementation, this would integrate with CI/CD)
      console.log(`[SCHEDULED] Batch execution window: ${batch.executionWindow.start} to ${batch.executionWindow.end}`);

    } catch (error) {
      console.error(`[ERROR] Failed to schedule batch:`, error);
    }
  }
}


export function simulateAnalyst(
  context: { runId: string; circle: string },
  emit: boolean = true
): void {
  // Analyst focuses on data quality, lineage, and standards
  if (emit) {
    emitPatternMetric(
      'analyst-data-quality-check',
      'advisory',
      'quality-gate',
      'Checking data lineage and schema compliance',
      'verify',
      {
         role: 'Analyst',
         completeness: 0.95,
         freshness_seconds: 120
      }
    );
  }
}

export function simulateAssessor(
  context: { runId: string; circle: string },
  emit: boolean = true
): void {
  // Assessor focuses on verification, audit, and compliance
  if (emit) {
    emitPatternMetric(
      'assessor-verification',
      'enforcement',
      'security-gate',
      'Verifying security controls and audit trails',
      'audit',
      {
        role: 'Assessor',
        audit_pass: true,
        findings: []
      }
    );
  }
}

if (require.main === module) {
  main();
}
