import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'yaml';

export type GapSessionStats = {
  expands?: number;
  quickFixes?: number;
};

export interface GoalieGapContext {
  pattern: string;
  circle: string;
  depth: number;
  codAvg?: number;
  workloads: string[];
  isGap: boolean;
}

export class GoalieGapItem extends vscode.TreeItem {
  constructor(label: string, public readonly gapContext: GoalieGapContext) {
    super(label, vscode.TreeItemCollapsibleState.None);
  }
}

export class GoalieGapsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private currentLens: 'ALL' | 'ML' | 'HPC' | 'STATS_DEVICE' = 'ALL';

  constructor(
    private readonly workspaceRoot: string | undefined,
    private readonly logger: vscode.OutputChannel,
    private readonly sessionStats?: Map<string, GapSessionStats>
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setLens(lens: 'ALL' | 'ML' | 'HPC' | 'STATS_DEVICE'): void {
    this.currentLens = lens;
    this.refresh();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  private getGoalieDir(): string | undefined {
    const config = vscode.workspace.getConfiguration('goalie');
    const customPath = config.get<string>('directoryPath');
    if (customPath) {
      return customPath;
    }
    if (this.workspaceRoot) {
      return path.join(this.workspaceRoot, '.goalie');
    }
    return undefined;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    const goalieDir = this.getGoalieDir();
    this.logger.appendLine(`[Gaps] getChildren. Element: ${element?.label ?? 'Root'}. Goalie Dir: ${goalieDir}`);

    if (element || !goalieDir) {
      return [];
    }
    const actionsPath = path.join(goalieDir, 'OBSERVABILITY_ACTIONS.yaml');
    const patternPath = path.join(goalieDir, 'pattern_metrics.jsonl');

    this.logger.appendLine(`[Gaps] Paths - Actions: ${actionsPath}, Patterns: ${patternPath}`);

    const items: vscode.TreeItem[] = [];

    const actionKeys = new Set<string>();
    if (fs.existsSync(actionsPath)) {
      this.logger.appendLine(`[Gaps] Found actions file.`);
      try {
        const raw = fs.readFileSync(actionsPath, 'utf8');
        const doc: any = yaml.parse(raw) || {};
        const actions: any[] = doc.items || [];
        this.logger.appendLine(`[Gaps] Parsed ${actions.length} actions.`);
        const byKey = new Map<string, any[]>();
        for (const it of actions) {
          const circle = it.circle || '<none>';
          const depth = typeof it.depth === 'number' ? it.depth : 0;
          const key = `${circle}|${depth}`;
          const arr = byKey.get(key) || [];
          arr.push(it);
          byKey.set(key, arr);
          actionKeys.add(key);
        }
        for (const [key, group] of Array.from(byKey.entries()).sort()) {
          const [circle, depth] = key.split('|');
          const label = `circle=${circle}, depth=${depth} · actions=${group.length}`;
          const node = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
          node.tooltip = `Observability gap actions for circle=${circle}, depth=${depth}`;
          const children = group.map(it => {
            const title = it.title || it.id || '<untitled>';
            const tags = Array.isArray(it.tags) ? it.tags.join(', ') : '';
            const child = new vscode.TreeItem(title, vscode.TreeItemCollapsibleState.None);
            child.tooltip = `${title}${tags ? `\nTags: ${tags}` : ''}`;
            return child;
          });
          (node as any).__children = children;
          items.push(node);
        }
      } catch (e) {
        this.logger.appendLine(`[Gaps] Error parsing actions: ${e}`);
      }
    } else {
      this.logger.appendLine(`[Gaps] Actions file NOT found.`);
    }

    if (fs.existsSync(patternPath)) {
      this.logger.appendLine(`[Gaps] Found patterns file.`);
      try {
        const lines = fs.readFileSync(patternPath, 'utf8').split(/\r?\n/).filter(Boolean);
        this.logger.appendLine(`[Gaps] Read ${lines.length} lines from patterns file.`);
        type Agg = {
          count: number;
          codVals: number[];
          wsjfVals: number[];
          tags: Set<string>;
          clusterLike?: boolean;
          workstationLike?: boolean;
          tfLike?: boolean;
          torchLike?: boolean;
        };
        const agg = new Map<string, Agg>();

        const envHintsConfig: any = { framework: {}, scheduler: {} };
        const envHintsPath = path.join(goalieDir, 'ENV_HINTS.yaml');
        if (fs.existsSync(envHintsPath)) {
          try {
            const rawEnv = fs.readFileSync(envHintsPath, 'utf8');
            const docEnv: any = yaml.parse(rawEnv) || {};
            if (docEnv.framework && typeof docEnv.framework === 'object') {
              envHintsConfig.framework = docEnv.framework;
            }
            if (docEnv.scheduler && typeof docEnv.scheduler === 'object') {
              envHintsConfig.scheduler = docEnv.scheduler;
            }
          } catch (e) {
            this.logger.appendLine(`[Gaps] Error parsing ENV_HINTS.yaml: ${e}`);
          }
        }

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
          // ML / HPC / Stats patterns from enhanced pattern_metrics
          'distributed-training-failure',
          'oom-recovery',
          'mixed-precision-overflow',
          'gradient-accumulation-mismatch',
          'checkpoint-corruption',
          'cluster-fragmentation',
          'network-bottleneck',
          'node-failure-recovery',
          'multiple-testing-correction',
          'cross-validation-fold-failure',
          'data-leakage-detection',
          'outlier-sensitivity',
          'sample-size-inadequacy',
          'tf-distribution-check',
          'torch-grad-stability',
          'mixed-precision-check',
          'learning-rate-instability',
          'batch-norm-instability',
          'data-augmentation-overhead',
          'mobile-app-cold-start',
          'desktop-app-memory-leak',
          'web-prototype-build-time',
          'enterprise-ml-pipeline-orchestration',
          'ml-model-serving-latency',
          'data-pipeline-backpressure',
          'web-vitals-cls',
          'mobile-interaction-lag',
          'responsive-breakpoint-gap',
          'image-optimization-missing',
          'desktop-render-block',
          'keyboard-shortcut-conflict',
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
        ]);
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            const pattern = obj.pattern || 'unknown';
            if (!interesting.has(pattern)) continue;
            const circle = obj.circle || '<none>';
            const depth = typeof obj.depth === 'number' ? obj.depth : 0;
            const econ = obj.economic || {};
            const cod = typeof econ.cod === 'number' ? econ.cod : undefined;
            const wsjf = typeof econ.wsjf_score === 'number' ? econ.wsjf_score : undefined;
            const key = `${pattern}|${circle}|${depth}`;
            const cur = agg.get(key) || { count: 0, codVals: [], wsjfVals: [], tags: new Set<string>(), clusterLike: false, workstationLike: false, tfLike: false, torchLike: false };
            cur.count += 1;
            if (cod !== undefined) cur.codVals.push(cod);
            if (wsjf !== undefined) cur.wsjfVals.push(wsjf);

            const tagsArrRaw = Array.isArray(obj.tags) ? obj.tags.map((t: any) => String(t)) : [];
            for (const t of tagsArrRaw) {
              cur.tags.add(t);
            }

            const framework = typeof obj.framework === 'string' ? obj.framework.toLowerCase() : '';
            const scheduler = typeof obj.scheduler === 'string' ? obj.scheduler.toLowerCase() : '';
            const mergeConfigEntry = (entry: any) => {
              if (!entry || typeof entry !== 'object') return;
              if (entry.clusterLike) cur.clusterLike = true;
              if (entry.workstationLike) cur.workstationLike = true;
              if (entry.tfLike) cur.tfLike = true;
              if (entry.torchLike) cur.torchLike = true;
            };
            if (framework && envHintsConfig.framework && envHintsConfig.framework[framework]) {
              mergeConfigEntry(envHintsConfig.framework[framework]);
            }
            if (scheduler && envHintsConfig.scheduler && envHintsConfig.scheduler[scheduler]) {
              mergeConfigEntry(envHintsConfig.scheduler[scheduler]);
            }

            const host = typeof obj.host === 'string' ? obj.host.toLowerCase() : '';
            const reason = typeof obj.reason === 'string' ? obj.reason.toLowerCase() : '';
            const tagsArr = tagsArrRaw.map((t: string) => t.toLowerCase());
            const combined = [pattern.toLowerCase(), host, reason, ...tagsArr].join(' ');
            const clusterLike = /slurm|lsf|pbs|torque|scheduler|cluster/.test(combined);
            const workstationLike = /workstation|desktop|laptop|macbook|mbp/.test(combined);
            const tfLike = /tensorflow|\btf\b/.test(combined);
            const torchLike = /pytorch|torch/.test(combined);
            if (clusterLike) cur.clusterLike = true;
            if (workstationLike) cur.workstationLike = true;
            if (tfLike) cur.tfLike = true;
            if (torchLike) cur.torchLike = true;

            agg.set(key, cur);
          } catch (e) {
            this.logger.appendLine(`[Gaps] Error parsing pattern line: ${e}`);
          }
        }

        function workloadTags(pattern: string, extraTags: Set<string>): string[] {
          const tags: string[] = [];
          const extras = Array.from(extraTags);
          const extrasLower = extras.map((t) => t.toLowerCase());

          // Check for explicit bracketed tags
          if (extras.some((t) => t.includes('[ML]'))) tags.push('ML');
          if (extras.some((t) => t.includes('[HPC]'))) tags.push('HPC');
          if (extras.some((t) => t.includes('[Stats]'))) tags.push('Stats');

          // Check for plain workload labels
          if (extrasLower.includes('ml')) tags.push('ML');
          if (extrasLower.includes('hpc')) tags.push('HPC');
          if (extrasLower.includes('stats')) tags.push('Stats');
          if (
            extrasLower.includes('device/web') ||
            extrasLower.includes('device') ||
            extrasLower.includes('web')
          ) {
            tags.push('Device/Web');
          }

          // Check for heuristic keywords in pattern + tags
          const combinedLower = [pattern, ...extrasLower].join(' ').toLowerCase();
          if (
            combinedLower.includes('mobile') ||
            combinedLower.includes('desktop') ||
            combinedLower.includes('web')
          ) {
            tags.push('Device/Web');
          }

          // Pattern-specific workload mapping (keep in sync with retro_coach)
          if (pattern === 'ml-training-guardrail') tags.push('ML');
          if (pattern === 'stat-robustness-sweep') tags.push('ML', 'Stats');
          if (pattern === 'hpc-batch-window') tags.push('HPC');
          if (pattern === 'safe-degrade') tags.push('HPC');
          if (pattern === 'device-coverage') tags.push('Device/Web');
          if (pattern === 'failure-strategy') tags.push('Stats', 'Device/Web');

          const mlFailurePatterns = [
            'distributed-training-failure',
            'oom-recovery',
            'mixed-precision-overflow',
            'gradient-accumulation-mismatch',
            'checkpoint-corruption',
            'tf-distribution-check',
            'torch-grad-stability',
            'mixed-precision-check',
            'learning-rate-instability',
            'batch-norm-instability',
            'data-augmentation-overhead',
            'cross-validation-fold-failure',
            'data-leakage-detection',
          ];
          if (mlFailurePatterns.includes(pattern)) tags.push('ML');

          const hpcPatterns = [
            'hpc-batch-window',
            'cluster-fragmentation',
            'network-bottleneck',
            'node-failure-recovery',
            'enterprise-ml-pipeline-orchestration',
            'ml-model-serving-latency',
            'data-pipeline-backpressure',
          ];
          if (hpcPatterns.includes(pattern)) tags.push('HPC');

          const statsPatterns = [
            'multiple-testing-correction',
            'cross-validation-fold-failure',
            'data-leakage-detection',
            'outlier-sensitivity',
            'sample-size-inadequacy',
          ];
          if (statsPatterns.includes(pattern)) tags.push('Stats');

          const deviceWebPatterns = [
            'device-coverage',
            'mobile-interaction-lag',
            'desktop-render-block',
            'web-vitals-cls',
            'responsive-breakpoint-gap',
            'image-optimization-missing',
            'keyboard-shortcut-conflict',
            'mobile-app-cold-start',
            'desktop-app-memory-leak',
            'web-prototype-build-time',
          ];
          if (deviceWebPatterns.includes(pattern)) tags.push('Device/Web');

          return Array.from(new Set(tags));
        }

        type WorkloadEnvHints = {
          clusterLike?: boolean;
          workstationLike?: boolean;
          tfLike?: boolean;
          torchLike?: boolean;
        };

        function workloadMicrocopy(tags: string[], env?: WorkloadEnvHints): string | undefined {
          if (tags.includes('ML')) {
            const tfLike = !!env?.tfLike;
            const torchLike = !!env?.torchLike;
            if (tfLike && !torchLike) {
              return 'ML lens (TensorFlow-dominant): focus on TF input/graph/distribution issues, TPU/GPU saturation, and skew between training and serving graphs.';
            }
            if (torchLike && !tfLike) {
              return 'ML lens (PyTorch-dominant): focus on DataLoader throughput, GPU utilization, gradient stability, and mixed-precision/AMP edge cases.';
            }
            if (tfLike && torchLike) {
              return 'ML lens: mixed TensorFlow/PyTorch environment: keep an eye on input pipelines, GPU utilization, and consistency between TF and PyTorch training/eval paths.';
            }
            return 'ML lens: TensorFlow and PyTorch enterprise guardrails: TensorFlow input/graph/distribution issues; PyTorch DataLoader/GPU utilization/gradient stability; plus loss spikes, drift, OOM, and mis-logged runs.';
          }
          if (tags.includes('HPC')) {
            const clusterLike = !!env?.clusterLike;
            const workstationLike = !!env?.workstationLike;
            if (clusterLike && !workstationLike) {
              return 'HPC lens (cluster): SLURM/LSF-style schedulers, queue times, batch windows, and multi-node safe-degrade when jobs get pre-empted or rescheduled.';
            }
            if (workstationLike && !clusterLike) {
              return 'HPC lens (workstation): single-node saturation, NUMA and memory pressure, and keeping interactive workloads responsive while long-running jobs execute.';
            }
            if (clusterLike && workstationLike) {
              return 'HPC lens: mixed cluster + workstation workflows; keep telemetry separate for batch queues vs interactive nodes and align safe-degrade across both.';
            }
            return 'HPC lens: cluster vs workstation workflows: scheduler queues and batch windows on clusters (e.g., SLURM/LSF) vs workstation saturation, NUMA effects, and safe-degrade under sustained CPU/GPU/memory load.';
          }
          if (tags.includes('Stats')) {
            return 'Stats lens: robustness sweeps, sample size and power, multiple-testing control, and keeping p-hacking and overfitting risk low.';
          }
          if (tags.includes('Device/Web')) {
            // Enhanced Device/Web microcopy with prototype workflow guidance
            return 'Device/Web lens: cross-device/browser coverage, mobile vs desktop regressions, and graceful failure strategies across web, desktop and native surfaces. Includes mobile prototype workflows (touch targets, gestures, offline, permissions), desktop prototype workflows (window management, shortcuts, file system), web prototype workflows (SPA routing, service workers, accessibility, SEO), and cross-platform prototype patterns (platform detection, code sharing, build configs).';
          }
          return undefined;
        }

        type BaselineStatus = 'NONE' | 'REGRESSION' | 'IMPROVED' | 'NEUTRAL';

        let baselineStatus: BaselineStatus = 'NONE';
        if (goalieDir) {
          const repoRoot = path.resolve(goalieDir, '..');
          const baselinePath = path.join(repoRoot, 'metrics', 'baseline.json');
          const metricsPath = path.join(goalieDir, 'metrics_log.jsonl');

          let baselineScore: number | undefined;
          let currentScore: number | undefined;

          if (fs.existsSync(baselinePath)) {
            try {
              const obj: any = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
              if (typeof obj.average_score === 'number') baselineScore = obj.average_score;
            } catch {
              // ignore
            }
          }

          if (fs.existsSync(metricsPath)) {
            const lines = fs.readFileSync(metricsPath, 'utf8').split(/\r?\n/).filter(Boolean);
            for (const line of lines) {
              try {
                const obj: any = JSON.parse(line);
                if (typeof obj.average_score === 'number') {
                  currentScore = obj.average_score;
                } else if (obj.calibration_summary && typeof obj.calibration_summary === 'object') {
                  const cs = obj.calibration_summary;
                  if (typeof cs.average_score === 'number') currentScore = cs.average_score;
                }
              } catch {
                // ignore malformed
              }
            }
          }

          if (baselineScore !== undefined && currentScore !== undefined) {
            const deltaPct = ((currentScore - baselineScore) / baselineScore) * 100;
            if (deltaPct < -10) baselineStatus = 'REGRESSION';
            else if (deltaPct > 5) baselineStatus = 'IMPROVED';
            else baselineStatus = 'NEUTRAL';
          }
        }

        type Row = {
          key: string;
          label: string;
          tooltip: string;
          codAvg?: number;
          isGap: boolean;
          workloads: string[];
          pattern: string;
          circle: string;
          depth: number;
        };
        const rows: Row[] = [];

        for (const [key, a] of Array.from(agg.entries())) {
          const [pattern, circle, depth] = key.split('|');
          const codAvg = a.codVals.length ? a.codVals.reduce((x, y) => x + y, 0) / a.codVals.length : undefined;
          const wsjfAvg = a.wsjfVals.length ? a.wsjfVals.reduce((x, y) => x + y, 0) / a.wsjfVals.length : undefined;
          const codStr = codAvg !== undefined ? `cod≈${codAvg.toFixed(2)}` : 'cod: n/a';
          const wsjfStr = wsjfAvg !== undefined ? `wsjf≈${wsjfAvg.toFixed(2)}` : 'wsjf: n/a';
          const workload = workloadTags(pattern, a.tags);
          const tags: string[] = [];
          tags.push(...workload);
          const circleDepthKey = `${circle}|${depth}`;
          const isGap = !!actionKeys.size && !actionKeys.has(circleDepthKey) && codAvg !== undefined;
          if (isGap) tags.push('GAP');
          const tagStr = tags.length ? ` [${tags.join(', ')}]` : '';
          const label = `${pattern} · circle=${circle}, depth=${depth} · events=${a.count}${tagStr}`;
          const env: WorkloadEnvHints = {
            clusterLike: a.clusterLike,
            workstationLike: a.workstationLike,
            tfLike: a.tfLike,
            torchLike: a.torchLike,
          };
          const microcopy = workloadMicrocopy(workload, env);
          const tooltipBase = `${codStr} · ${wsjfStr}`;
          let tooltip = microcopy && microcopy.length > 0 ? `${tooltipBase}\n${microcopy}` : tooltipBase;
          const sessionStats = this.sessionStats?.get(key);
          if (sessionStats && ((sessionStats.expands ?? 0) > 0 || (sessionStats.quickFixes ?? 0) > 0)) {
            tooltip += `\n\nSession interactions: expands=${sessionStats.expands ?? 0}, quick-fixes=${sessionStats.quickFixes ?? 0}`;
          }
          rows.push({ key, label, tooltip, codAvg, isGap, workloads: workload, pattern, circle, depth: Number(depth) });
        }

        const lens = this.currentLens;
        function matchesLens(workloads: string[]): boolean {
          if (lens === 'ALL') return true;
          if (lens === 'ML') return workloads.includes('ML');
          if (lens === 'HPC') return workloads.includes('HPC');
          if (lens === 'STATS_DEVICE') {
            return workloads.includes('Stats') || workloads.includes('Device/Web');
          }
          return true;
        }

        const filteredRows = rows.filter(row => matchesLens(row.workloads));

        filteredRows.sort((a, b) => {
          if (a.isGap !== b.isGap) return a.isGap ? -1 : 1;
          const ac = a.codAvg ?? 0;
          const bc = b.codAvg ?? 0;
          if (ac !== bc) return bc - ac;
          return a.label.localeCompare(b.label);
        });

        for (const row of filteredRows) {
          // Enhanced label with severity indicators and framework badges
          let displayLabel = row.label;
          const severityBadges: string[] = [];
          
          // Add severity indicators based on COD
          if (row.codAvg !== undefined) {
            if (row.codAvg > 10000) {
              severityBadges.push('🔴 CRITICAL');
            } else if (row.codAvg > 5000) {
              severityBadges.push('🟠 HIGH');
            } else if (row.codAvg > 1000) {
              severityBadges.push('🟡 MEDIUM');
            }
          }

          // Add framework badges for ML patterns
          if (row.workloads.includes('ML')) {
            const patternLower = row.key.split('|')[0].toLowerCase();
            if (patternLower.includes('tf-') || patternLower.includes('tensorflow')) {
              severityBadges.push('TF');
            } else if (patternLower.includes('torch') || patternLower.includes('pytorch')) {
              severityBadges.push('PyTorch');
            }
          }

          // Add HPC cluster indicators
          if (row.workloads.includes('HPC')) {
            const patternLower = row.key.split('|')[0].toLowerCase();
            if (patternLower.includes('cluster') || patternLower.includes('distributed')) {
              severityBadges.push('🌐 Cluster');
            }
          }

          // Add device/web indicators
          if (row.workloads.includes('Device/Web')) {
            const patternLower = row.key.split('|')[0].toLowerCase();
            if (patternLower.includes('mobile')) {
              severityBadges.push('📱 Mobile');
            } else if (patternLower.includes('desktop')) {
              severityBadges.push('🖥️ Desktop');
            } else if (patternLower.includes('web')) {
              severityBadges.push('🌐 Web');
            }
          }

          if (severityBadges.length > 0) {
            displayLabel = `[${severityBadges.join(' | ')}] ${displayLabel}`;
          }

          const gapContext: GoalieGapContext = {
            pattern: row.pattern,
            circle: row.circle,
            depth: row.depth,
            codAvg: row.codAvg,
            workloads: row.workloads,
            isGap: row.isGap,
          };
          const node = new GoalieGapItem(displayLabel, gapContext);
          node.command = {
            command: 'goalieDashboard.showQuickFixesForGap',
            title: 'Show Quick Fixes',
            arguments: [node],
          };

          // Enhanced tooltip with detailed context
          let tooltip = row.tooltip;
          
          // Add baseline regression warning
          if (baselineStatus === 'REGRESSION' && row.isGap) {
            tooltip = `${row.tooltip}\n\n⚠️ BASELINE REGRESSION: Current average score is more than 10% below baseline. Treat this gap as regression-critical.`;
            node.label = `[REGRESSION] ${displayLabel}`;
            node.iconPath = new vscode.ThemeIcon('alert');
          }

          // Add framework-specific guidance for ML patterns
          if (row.workloads.includes('ML')) {
            const patternLower = row.key.split('|')[0].toLowerCase();
            if (patternLower.includes('tf-') || patternLower.includes('tensorflow')) {
              tooltip += `\n\n🔧 TensorFlow Focus: Check input pipelines, graph optimization, TPU/GPU utilization, and distribution strategy.`;
            } else if (patternLower.includes('torch') || patternLower.includes('pytorch')) {
              tooltip += `\n\n🔧 PyTorch Focus: Check DataLoader throughput, GPU utilization, gradient stability, and mixed-precision (AMP) settings.`;
            }
          }

          // Add HPC-specific guidance
          if (row.workloads.includes('HPC')) {
            tooltip += `\n\n⚡ HPC Focus: Monitor queue times, cluster fragmentation, network bottlenecks, and node failures. Consider SLURM/K8s optimization.`;
          }

          // Add Stats-specific guidance
          if (row.workloads.includes('Stats')) {
            tooltip += `\n\n📊 Stats Focus: Verify robustness sweeps, sample size adequacy, multiple-testing corrections, and data leakage detection.`;
          }

          // Add Device/Web-specific guidance
          if (row.workloads.includes('Device/Web')) {
            tooltip += `\n\n📱 Device/Web Focus: Check cross-device coverage, mobile/desktop regressions, web vitals (LCP, FID, CLS), and graceful degradation.`;
          }

          // Add actionable next steps for gaps
          if (row.isGap) {
            tooltip += `\n\n💡 Action Required: This gap has no observability actions. Run "Goalie: Run Governance Audit" to generate fix proposals.`;
          }

          node.tooltip = tooltip;

          // Enhanced icon system with context-aware icons
          if (!node.iconPath) {
            // Priority: Critical patterns first
            if (row.label.includes('guardrail-lock')) {
              node.iconPath = new vscode.ThemeIcon('lock', new vscode.ThemeColor('errorForeground'));
            } else if (row.label.includes('safe-degrade')) {
              node.iconPath = new vscode.ThemeIcon('shield', new vscode.ThemeColor('warningForeground'));
            } else if (row.workloads.includes('ML')) {
              // ML patterns with framework distinction
              const patternLower = row.key.split('|')[0].toLowerCase();
              if (patternLower.includes('tf-') || patternLower.includes('tensorflow')) {
                node.iconPath = new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.blue'));
              } else if (patternLower.includes('torch') || patternLower.includes('pytorch')) {
                node.iconPath = new vscode.ThemeIcon('flame', new vscode.ThemeColor('charts.orange'));
              } else {
                node.iconPath = new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.blue'));
              }
            } else if (row.workloads.includes('HPC')) {
              node.iconPath = new vscode.ThemeIcon('server-process', new vscode.ThemeColor('charts.red'));
            } else if (row.workloads.includes('Stats')) {
              node.iconPath = new vscode.ThemeIcon('graph', new vscode.ThemeColor('charts.green'));
            } else if (row.workloads.includes('Device/Web')) {
              const patternLower = row.key.split('|')[0].toLowerCase();
              if (patternLower.includes('mobile')) {
                node.iconPath = new vscode.ThemeIcon('device-mobile', new vscode.ThemeColor('charts.purple'));
              } else if (patternLower.includes('desktop')) {
                node.iconPath = new vscode.ThemeIcon('desktop-download', new vscode.ThemeColor('charts.purple'));
              } else if (patternLower.includes('web')) {
                node.iconPath = new vscode.ThemeIcon('globe', new vscode.ThemeColor('charts.purple'));
              } else {
                node.iconPath = new vscode.ThemeIcon('device-mobile', new vscode.ThemeColor('charts.purple'));
              }
            } else if (row.label.includes('GAP')) {
              node.iconPath = new vscode.ThemeIcon('alert', new vscode.ThemeColor('errorForeground'));
            }
          }

          // Add context value for context menu actions
          let contextValue = 'goalieGap';
          if (row.isGap) {
            contextValue += '.gap';
          }
          if (row.workloads.includes('ML')) {
            contextValue += '.ml';
          }
          if (row.workloads.includes('HPC')) {
            contextValue += '.hpc';
          }
          if (row.workloads.includes('Stats')) {
            contextValue += '.stats';
          }
          if (row.workloads.includes('Device/Web')) {
            contextValue += '.device';
          }
          node.contextValue = contextValue;

          items.push(node);
        }
      } catch (e) {
        this.logger.appendLine(`[Gaps] Error processing patterns: ${e}`);
      }
    } else {
      this.logger.appendLine(`[Gaps] Patterns file NOT found.`);
    }

    this.logger.appendLine(`[Gaps] Returning ${items.length} items.`);
    return items;
  }
}
