export type RiskCategory = 'security' | 'performance' | 'compliance' | 'business-critical';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RiskProfile {
  category: RiskCategory;
  severity: RiskSeverity;
  complexity: number;
}

const BASELINE_AGENTS: Record<RiskSeverity, number> = {
  low: 1,
  medium: 3,
  high: 6,
  critical: 10,
};

export function normalizeRiskProfile(risk: RiskProfile): RiskProfile {
  const complexity = Number.isFinite(risk.complexity) ? risk.complexity : 1;
  return {
    ...risk,
    complexity: Math.max(1, Math.min(10, Math.round(complexity))),
  };
}

export function calculateAgentCount(risk: RiskProfile): number {
  const normalized = normalizeRiskProfile(risk);
  const agents = BASELINE_AGENTS[normalized.severity];
  const complexityMultiplier = Math.min(normalized.complexity / 5, 2);
  return Math.max(1, Math.ceil(agents * complexityMultiplier));
}

export type SwarmTopology = 'mesh' | 'hierarchical';

export function calculateTopology(risk: RiskProfile): SwarmTopology {
  const normalized = normalizeRiskProfile(risk);
  if (normalized.severity === 'critical' || normalized.severity === 'high') {
    return 'mesh';
  }
  if (normalized.complexity >= 8) {
    return 'mesh';
  }
  return 'hierarchical';
}

export function splitAgentCountAcrossSandboxes(
  agentCount: number,
  maxAgentsPerSandbox: number,
): number[] {
  if (!Number.isFinite(agentCount) || agentCount <= 0) {
    throw new Error(`agentCount must be > 0 (got ${agentCount})`);
  }
  if (!Number.isFinite(maxAgentsPerSandbox) || maxAgentsPerSandbox <= 0) {
    throw new Error(`maxAgentsPerSandbox must be > 0 (got ${maxAgentsPerSandbox})`);
  }

  const total = Math.ceil(agentCount);
  const per = Math.floor(maxAgentsPerSandbox);
  const out: number[] = [];

  let remaining = total;
  while (remaining > 0) {
    const chunk = Math.min(per, remaining);
    out.push(chunk);
    remaining -= chunk;
  }

  return out;
}
