export interface BaseGoalieVsixMessage {
  source: 'goalie-vsix';
  version: 1;
  opId?: string;
  timestamp?: string;
}

export interface WebviewOpenMessage extends BaseGoalieVsixMessage {
  type: 'webview';
  action: 'open';
  title: string;
  htmlPath: string;
}

export interface CommandStatusMessage extends BaseGoalieVsixMessage {
  type: 'command-status';
  command: string;
  phase: 'start' | 'success' | 'error';
  args?: Record<string, unknown>;
  exitCode?: number;
  errorMessage?: string;
}

export interface DtDashboardSummaryReadyMessage extends BaseGoalieVsixMessage {
  type: 'dt-dashboard-summary';
  summaryPath: string;
}

export type GoalieVsixMessage =
  | WebviewOpenMessage
  | CommandStatusMessage
  | DtDashboardSummaryReadyMessage;

export interface QuantileStats {
  min?: number;
  p25?: number;
  median?: number;
  p75?: number;
  p90?: number;
  max?: number;
}

export interface PerCircleStats {
  [circle: string]: QuantileStats;
}

export interface ConfigImpactEntry {
  pass_count?: number;
  fail_count?: number;
  pass_rate?: number; // 0–1
  failure_reasons?: Record<string, number>;
}

export interface DtEvaluationSummary {
  total_evaluations: number;
  date_range?: { start?: string; end?: string };
  top1_accuracy?: QuantileStats;
  top3_accuracy?: QuantileStats;
  cont_mae?: QuantileStats;
  per_circle_median_top1?: Record<string, number>;
  per_circle_stats?: PerCircleStats;
  pass_rate?: { staging?: number; production?: number };
  config_impact?: Record<string, ConfigImpactEntry>;
  dry_run_config?: string | null;
  // Allow extra fields without type errors.
  [key: string]: unknown;
}
