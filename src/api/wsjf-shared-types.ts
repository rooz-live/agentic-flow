/**
 * WSJF Enterprise Shared Types
 *
 * Canonical interfaces shared across PI Sync, Federation API,
 * Multi-Tenant, Analytics, ML Optimization, and Reporting layers.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core scoring primitives
// ─────────────────────────────────────────────────────────────────────────────

export interface WSJFComponents {
  userBusinessValue: number;   // 1–20
  timeCriticality: number;     // 1–20
  riskReduction: number;       // 1–20
  jobSize: number;             // 1–20 (denominator)
}

export interface WSJFScore extends WSJFComponents {
  costOfDelay: number;
  score: number;
  confidence: number;          // 0–1
  weightProfile?: WeightProfile;
}

export type WeightProfile =
  | 'balanced'
  | 'time-critical'
  | 'value-driven'
  | 'risk-averse'
  | 'innovation';

export interface WeightCoefficients {
  w1: number;   // BV weight
  w2: number;   // TC weight
  w3: number;   // RROE weight
}

export const DEFAULT_WEIGHTS: WeightCoefficients = { w1: 1.0, w2: 1.0, w3: 1.0 };

export const WEIGHT_PROFILES: Record<WeightProfile, WeightCoefficients> = {
  'balanced':     { w1: 1.0, w2: 1.0, w3: 1.0 },
  'time-critical':{ w1: 0.8, w2: 1.5, w3: 0.8 },
  'value-driven': { w1: 1.5, w2: 0.8, w3: 0.8 },
  'risk-averse':  { w1: 0.8, w2: 0.8, w3: 1.5 },
  'innovation':   { w1: 1.2, w2: 0.6, w3: 1.2 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Backlog items
// ─────────────────────────────────────────────────────────────────────────────

export type ItemType = 'feature' | 'bug' | 'tech-debt' | 'spike' | 'enabler';
export type ItemStatus = 'new' | 'in_progress' | 'done' | 'deferred' | 'blocked';

export interface FederatedWSJFItem {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  status: ItemStatus;
  teamId: string;
  tenantId: string;
  piId?: string;                   // Program Increment association
  wsjf: WSJFScore;
  tags?: string[];
  dependencies?: string[];         // IDs of blocking items
  createdAt: string;               // ISO 8601
  updatedAt: string;
  completedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Team backlog
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamBacklog {
  teamId: string;
  tenantId: string;
  items: FederatedWSJFItem[];
  lastSyncedAt: string;
  syncVersion: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Program Increment (PI)
// ─────────────────────────────────────────────────────────────────────────────

export interface PIConfig {
  id: string;                      // e.g. "PI-2026-Q2"
  name: string;
  startDate: string;               // ISO 8601
  endDate: string;
  teamIds: string[];
  tenantId: string;
  weightProfile: WeightProfile;
  weights: WeightCoefficients;
}

export interface PISnapshot {
  piConfig: PIConfig;
  items: FederatedWSJFItem[];
  snapshotAt: string;
  snapshotVersion: number;
  checksum: string;                // HMAC-SHA256 of sorted item IDs + scores
}

export interface PIDiff {
  piId: string;
  fromVersion: number;
  toVersion: number;
  added: FederatedWSJFItem[];
  removed: string[];               // item IDs
  changed: Array<{
    id: string;
    before: WSJFScore;
    after: WSJFScore;
    delta: number;                 // score change
  }>;
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-tenant
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantConfig {
  tenantId: string;
  name: string;
  maxItems: number;
  maxTeams: number;
  weightProfile: WeightProfile;
  customWeights?: WeightCoefficients;
  allowedRoles: WSJFRole[];
  createdAt: string;
}

export interface TenantQuota {
  tenantId: string;
  itemCount: number;
  teamCount: number;
  piCount: number;
  maxItems: number;
  maxTeams: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC
// ─────────────────────────────────────────────────────────────────────────────

export type WSJFRole = 'viewer' | 'scorer' | 'admin';

export type WSJFAction =
  | 'read:backlog'
  | 'write:score'
  | 'write:item'
  | 'delete:item'
  | 'admin:weights'
  | 'admin:tenant'
  | 'read:audit'
  | 'export:pi';

export interface WSJFPrincipal {
  userId: string;
  tenantId: string;
  role: WSJFRole;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────────────────────────────────────

export type AuditEventType =
  | 'item.created'
  | 'item.scored'
  | 'item.updated'
  | 'item.deleted'
  | 'pi.snapshot'
  | 'pi.sync'
  | 'weights.changed'
  | 'tenant.created'
  | 'tenant.quota_exceeded';

export interface AuditEvent {
  eventId: string;
  eventType: AuditEventType;
  tenantId: string;
  userId: string;
  itemId?: string;
  piId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics & trends
// ─────────────────────────────────────────────────────────────────────────────

export interface TrendDataPoint {
  date: string;                    // ISO 8601 date
  avgScore: number;
  avgCod: number;
  itemCount: number;
  completedCount: number;
  velocityPoints: number;
}

export interface TrendAnalysis {
  teamId: string;
  tenantId: string;
  period: { from: string; to: string };
  dataPoints: TrendDataPoint[];
  slope: number;                   // linear regression slope
  anomalies: Array<{ date: string; score: number; zScore: number }>;
  velocityBaseline: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ML optimization
// ─────────────────────────────────────────────────────────────────────────────

export interface MLWeightModel {
  tenantId: string;
  weights: WeightCoefficients;
  confidence: number;
  trainingExamples: number;
  lastTrainedAt: string;
  modelVersion: string;
}

export interface MLPrediction {
  suggestedWeights: WeightCoefficients;
  confidence: number;
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Executive reporting
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecReportConfig {
  piId: string;
  tenantId: string;
  topN: number;
  includeRiskHeatmap: boolean;
  includeVelocityTrend: boolean;
  format: 'markdown' | 'json' | 'html';
}

export interface ExecReport {
  piId: string;
  tenantId: string;
  generatedAt: string;
  topItems: FederatedWSJFItem[];
  velocityTrend?: TrendAnalysis;
  riskDistribution: Record<string, number>;   // risk level → item count
  completionRate: number;                      // 0–1
  avgWsjfScore: number;
  content: string;                             // rendered output
}
