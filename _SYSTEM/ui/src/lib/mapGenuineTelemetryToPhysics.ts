import type { TelemetryData } from "./physicsTypes";

type MetricsBlock = {
  metrics?: {
    timestamp?: string;
    latency_ms?: number;
    throughput_rps?: number;
    circuit_breaker_trips?: number;
    error_rate?: number;
    cpu_percent?: number;
    memory_mb?: number;
    active_agents?: number;
  };
  pewma?: {
    latency?: number;
    anomalyScore?: number;
    alpha?: number;
    routing?: string;
  };
  opex?: { allocated?: number; spent?: number };
  scenario?: string;
};

type MapekAnalyze = {
  kind?: string;
  ts?: string;
  scenario?: string;
  densityScore?: number;
  anomalyDetected?: boolean;
  pewmaLatency?: number;
};

type MapekPlan = {
  kind?: string;
  ts?: string;
  scenario?: string;
  wsjfPriority?: number;
  offload?: string;
  frugalMode?: boolean;
  selfEditRecommendation?: string | null;
};

type TestingOpexTelemetry = {
  kind?: string;
  generatedAt?: string;
  scenario?: string;
  nextStep?: "unleash" | "rehearse" | "release-only";
  result?: {
    authorized?: boolean;
    decision?: string;
    authorizationId?: string;
    reason?: string;
  };
  budget?: {
    utilizationPercent?: number;
    spentAmount?: number;
    allocatedAmount?: number;
  };
  summary?: { opex?: { total?: number; budget?: number } };
};

function extractFirstJsonObject(raw: string): unknown | null {
  const s = raw.trim();
  let depth = 0;
  let start = -1;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        const slice = s.slice(start, i + 1);
        try {
          return JSON.parse(slice) as unknown;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function parseNdjsonTail(raw: string): unknown[] {
  const out: unknown[] = [];
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t[0] !== "{") continue;
    try {
      out.push(JSON.parse(t) as unknown);
    } catch {
      /* skip garbage lines */
    }
  }
  return out;
}

function lastOfKind<T extends { kind?: string }>(
  events: unknown[],
  kind: string,
): T | null {
  let last: T | null = null;
  for (const e of events) {
    if (e && typeof e === "object" && (e as T).kind === kind) {
      last = e as T;
    }
  }
  return last;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function wsjfLanesFromNextStep(
  nextStep: TestingOpexTelemetry["nextStep"],
  scenario: string | undefined,
): TelemetryData["wsjfQueue"] {
  const sc = scenario ?? "unknown";
  if (nextStep === "unleash") {
    return {
      now: `Execute swarm increment (${sc}) — economic gate OPEN`,
      next: "Merge knowledge / CLT snapshot; refresh WSJF ledger",
      later: "Harden containment; schedule STX/OpenStack rehearsal",
    };
  }
  if (nextStep === "rehearse") {
    return {
      now: `Limited experiment batch (${sc}) — defer heavy spend`,
      next: "Re-run OPEX probe + PEWMA density; tighten scenario policy",
      later: "Canary only after governance + CI gates green",
    };
  }
  return {
    now: `Cage / release-only (${sc}) — no swarm expansion`,
    next: "Circle retro + ROAM review; fix breach root cause",
    later: "Manual finance approval before any actuator path",
  };
}

function mapMetricsBlock(
  m: MetricsBlock,
  lastAnalyze: MapekAnalyze | null,
  lastPlan: MapekPlan | null,
): TelemetryData {
  const metrics = m.metrics ?? {};
  const pewma = m.pewma ?? {};
  const opex = m.opex ?? {};

  const ts =
    typeof metrics.timestamp === "string"
      ? metrics.timestamp
      : typeof lastPlan?.ts === "string"
        ? lastPlan.ts
        : typeof lastAnalyze?.ts === "string"
          ? lastAnalyze.ts
          : new Date().toISOString();

  const cpu = typeof metrics.cpu_percent === "number" ? metrics.cpu_percent : 0;
  const memMb =
    typeof metrics.memory_mb === "number" ? metrics.memory_mb : 0;
  const agents =
    typeof metrics.active_agents === "number" ? metrics.active_agents : 0;
  const latency =
    typeof metrics.latency_ms === "number" ? metrics.latency_ms : 0;

  const density =
    lastAnalyze && typeof lastAnalyze.densityScore === "number"
      ? clamp01(lastAnalyze.densityScore)
      : typeof pewma.anomalyScore === "number"
        ? clamp01(pewma.anomalyScore)
        : typeof metrics.error_rate === "number"
          ? clamp01(metrics.error_rate * 5)
          : 0;

  const anomaly =
    Boolean(lastAnalyze?.anomalyDetected) ||
    (typeof metrics.error_rate === "number" && metrics.error_rate > 0.05);

  const wsjf =
    lastPlan && typeof lastPlan.wsjfPriority === "number"
      ? Number(lastPlan.wsjfPriority)
      : 0;

  const trips =
    typeof metrics.circuit_breaker_trips === "number"
      ? metrics.circuit_breaker_trips
      : 0;
  const tripped = trips >= 3 || density >= 0.95;

  const spent = typeof opex.spent === "number" ? opex.spent : 0;
  const alloc = typeof opex.allocated === "number" ? opex.allocated : 1;
  const util = clamp01(spent / Math.max(alloc, 1));

  const proposed =
    lastPlan?.selfEditRecommendation?.trim() ||
    (typeof m.scenario === "string"
      ? `MAPE-K plan for scenario ${m.scenario}`
      : "MAPE-K plan (no self-edit recommendation in tail)");

  const conf =
    1 -
    (typeof metrics.error_rate === "number" ? metrics.error_rate : 0) * 2;

  const scenario =
    typeof lastPlan?.scenario === "string"
      ? lastPlan.scenario
      : typeof lastAnalyze?.scenario === "string"
        ? lastAnalyze.scenario
        : typeof m.scenario === "string"
          ? m.scenario
          : "baseline";

  const nextStepGuess: TestingOpexTelemetry["nextStep"] =
    tripped || util > 0.9
      ? "release-only"
      : wsjf >= 8
        ? "rehearse"
        : "unleash";

  return {
    timestamp: ts,
    monitor: {
      cpu_utilization: cpu,
      memory_mapped_mb: memMb,
      active_agents: agents,
      api_latency_ms: latency,
    },
    analyze: {
      panic_matrix_distance: Math.max(density, util * 0.85),
      anomaly_detected: anomaly || util > 0.75,
    },
    plan: {
      proposed_action: proposed,
      wsjf_score: wsjf,
      confidence: clamp01(conf),
    },
    execute: {
      status: tripped ? "CIRCUIT_TRIPPED" : "IDLE",
      last_action_id:
        lastPlan?.ts?.replace(/[:.]/g, "") ?? `cb_${trips}_${Date.now()}`,
    },
    knowledge: {
      active_context_rings: Math.min(31, Math.round(agents + wsjf)),
    },
    wsjfQueue: wsjfLanesFromNextStep(nextStepGuess, scenario),
  };
}

function mapTestingOpex(t: TestingOpexTelemetry): TelemetryData {
  const util = clamp01(
    typeof t.budget?.utilizationPercent === "number"
      ? t.budget.utilizationPercent / 100
      : 0,
  );
  const scenario = typeof t.scenario === "string" ? t.scenario : "baseline";
  const authorized = Boolean(t.result?.authorized);
  const decision = String(t.result?.decision ?? "");

  const panic =
    scenario === "critical"
      ? Math.max(util, 0.92)
      : scenario === "severe"
        ? Math.max(util, 0.75)
        : scenario === "adverse"
          ? Math.max(util, 0.55)
          : util;

  const wsjf =
    scenario === "critical" ? 3 : scenario === "severe" ? 6 : scenario === "adverse" ? 8 : 10;

  const tripped =
    t.nextStep === "release-only" || decision === "block" || !authorized;

  return {
    timestamp:
      typeof t.generatedAt === "string"
        ? t.generatedAt
        : new Date().toISOString(),
    monitor: {
      cpu_utilization: 0,
      memory_mapped_mb: 0,
      active_agents: 0,
      api_latency_ms: 0,
    },
    analyze: {
      panic_matrix_distance: panic,
      anomaly_detected: !authorized || scenario !== "baseline",
    },
    plan: {
      proposed_action: `OpEx gate → ${t.nextStep ?? "unknown"} (${scenario})`,
      wsjf_score: wsjf,
      confidence: authorized ? 0.88 : 0.35,
    },
    execute: {
      status: tripped ? "CIRCUIT_TRIPPED" : authorized ? "EXECUTING" : "IDLE",
      last_action_id: String(t.result?.authorizationId ?? "opex_probe"),
    },
    knowledge: {
      active_context_rings: Math.min(
        31,
        Math.round(Number(t.summary?.opex?.total ?? 0) % 32),
      ),
    },
    wsjfQueue: wsjfLanesFromNextStep(t.nextStep, scenario),
  };
}

/**
 * Parse `.goalie/genuine_telemetry.json` body (possibly invalid JSON due to
 * concatenated objects + NDJSON tail) and map to dashboard physics view.
 */
export function mapGenuineTelemetryFile(raw: string): TelemetryData | null {
  if (!raw || !raw.trim()) return null;

  const first = extractFirstJsonObject(raw);
  const tail = parseNdjsonTail(raw);
  const allEvents = [...tail];
  if (first && typeof first === "object") {
    allEvents.unshift(first);
  }

  const testing = allEvents.find(
    (e) =>
      e &&
      typeof e === "object" &&
      (e as TestingOpexTelemetry).kind === "testing_opex_authorization",
  ) as TestingOpexTelemetry | undefined;

  if (testing) {
    const base = mapTestingOpex(testing);
    const lastAnalyze = lastOfKind<MapekAnalyze>(tail, "mapek_analyze");
    if (lastAnalyze && typeof lastAnalyze.densityScore === "number") {
      base.analyze.panic_matrix_distance = Math.max(
        base.analyze.panic_matrix_distance,
        clamp01(lastAnalyze.densityScore),
      );
      base.analyze.anomaly_detected =
        base.analyze.anomaly_detected || Boolean(lastAnalyze.anomalyDetected);
    }
    return base;
  }

  if (first && typeof first === "object" && "metrics" in (first as object)) {
    const lastAnalyze = lastOfKind<MapekAnalyze>(tail, "mapek_analyze");
    const lastPlan = lastOfKind<MapekPlan>(tail, "mapek_plan");
    return mapMetricsBlock(first as MetricsBlock, lastAnalyze, lastPlan);
  }

  const lastAnalyze = lastOfKind<MapekAnalyze>(tail, "mapek_analyze");
  const lastPlan = lastOfKind<MapekPlan>(tail, "mapek_plan");
  if (lastAnalyze || lastPlan) {
    return mapMetricsBlock({}, lastAnalyze, lastPlan);
  }

  return null;
}
