export type OffhostSyslogProviderId = 'hivelocity';

export interface ProviderCandidate {
  providerId: OffhostSyslogProviderId;
  region: string;
  monthlyUsd: number;
  vcpu: number;
  ramGb: number;
  diskGb: number;
  jobSize: number;
}

export interface WSJFInputs {
  userBusinessValue: number;
  timeCriticality: number;
  riskOpportunity: number;
}

export interface ProviderSelectionConstraints {
  maxMonthlyUsd: number;
  minVcpu: number;
  minRamGb: number;
  minDiskGb: number;
  region?: string;
  forcedProvider?: OffhostSyslogProviderId;
  wsjfInputs: WSJFInputs;
}

export interface ProviderSelectionResult {
  candidate: ProviderCandidate;
  wsjfScore: number;
  costOfDelay: number;
}

function parseProviderId(v?: string): OffhostSyslogProviderId | undefined {
  if (!v) return undefined;
  const norm = v.trim().toLowerCase();
  if (norm === 'hivelocity') return 'hivelocity';
  return undefined;
}

export function getOffhostSyslogCandidates(): ProviderCandidate[] {
  return [
    {
      providerId: 'hivelocity',
      region: 'nyc1',
      monthlyUsd: 8,
      vcpu: 1,
      ramGb: 2,
      diskGb: 50,
      jobSize: 3,
    },
    {
      providerId: 'hivelocity',
      region: 'sfo1',
      monthlyUsd: 9,
      vcpu: 1,
      ramGb: 2,
      diskGb: 50,
      jobSize: 4,
    },
    {
      providerId: 'hivelocity',
      region: 'lax1',
      monthlyUsd: 7,
      vcpu: 1,
      ramGb: 2,
      diskGb: 50,
      jobSize: 3,
    },
    {
      providerId: 'hivelocity',
      region: 'dal1',
      monthlyUsd: 6,
      vcpu: 1,
      ramGb: 2,
      diskGb: 50,
      jobSize: 2,
    },
  ];
}

function computeWsjfScore(candidate: ProviderCandidate, inputs: WSJFInputs): { wsjfScore: number; costOfDelay: number } {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const costOfDelay = inputs.userBusinessValue * inputs.timeCriticality * inputs.riskOpportunity;
  const wsjfScore = candidate.jobSize > 0 ? costOfDelay / candidate.jobSize : 0;
  return { wsjfScore, costOfDelay };
}

export function loadProviderSelectionConstraintsFromEnv(): ProviderSelectionConstraints {
  const maxMonthlyUsd = Number(process.env.AF_TELEMETRY_SINK_MAX_MONTHLY_USD) || 10;
  const region = process.env.AF_TELEMETRY_SINK_REGION || 'nyc1';
  const forcedProvider = parseProviderId(process.env.AF_TELEMETRY_SINK_PROVIDER);

  return {
    maxMonthlyUsd,
    minVcpu: 1,
    minRamGb: 1,
    minDiskGb: 25,
    region,
    forcedProvider,
    wsjfInputs: {
      userBusinessValue: 5,
      timeCriticality: 8,
      riskOpportunity: 5,
    },
  };
}

export function selectOffhostSyslogProvider(
  partial?: Partial<ProviderSelectionConstraints>,
): ProviderSelectionResult | null {
  const base = loadProviderSelectionConstraintsFromEnv();
  const constraints: ProviderSelectionConstraints = {
    ...base,
    ...partial,
    wsjfInputs: {
      ...base.wsjfInputs,
      ...(partial?.wsjfInputs ?? {}),
    },
  };

  const eligible = getOffhostSyslogCandidates().filter((c) => {
    if (constraints.forcedProvider && c.providerId !== constraints.forcedProvider) return false;
    if (constraints.region && c.region !== constraints.region) return false;
    if (c.monthlyUsd > constraints.maxMonthlyUsd) return false;
    if (c.vcpu < constraints.minVcpu) return false;
    if (c.ramGb < constraints.minRamGb) return false;
    if (c.diskGb < constraints.minDiskGb) return false;
    return true;
  });

  if (!eligible.length) return null;

  let best: ProviderSelectionResult | null = null;
  for (const candidate of eligible) {
    const { wsjfScore, costOfDelay } = computeWsjfScore(candidate, constraints.wsjfInputs);

    if (!best) {
      best = { candidate, wsjfScore, costOfDelay };
      continue;
    }

    if (wsjfScore > best.wsjfScore) {
      best = { candidate, wsjfScore, costOfDelay };
      continue;
    }

    if (wsjfScore === best.wsjfScore && candidate.monthlyUsd < best.candidate.monthlyUsd) {
      best = { candidate, wsjfScore, costOfDelay };
    }
  }

  return best;
}
