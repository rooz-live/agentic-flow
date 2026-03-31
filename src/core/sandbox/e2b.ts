export interface E2BSandboxLimits {
  maxAgentsPerSandbox: number;
}

export interface E2BConfig {
  apiKey: string;
  limits: E2BSandboxLimits;
}

export class MissingE2BApiKeyError extends Error {
  override name = 'MissingE2BApiKeyError';
}

export function getE2BConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  limits: Partial<E2BSandboxLimits> = {},
): E2BConfig {
  const apiKey = (env.E2B_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new MissingE2BApiKeyError('E2B_API_KEY is required for sandbox execution');
  }

  const maxAgentsPerSandbox =
    typeof limits.maxAgentsPerSandbox === 'number'
      ? limits.maxAgentsPerSandbox
      : 10;

  if (!Number.isFinite(maxAgentsPerSandbox) || maxAgentsPerSandbox <= 0) {
    throw new Error(`maxAgentsPerSandbox must be > 0 (got ${maxAgentsPerSandbox})`);
  }

  return {
    apiKey,
    limits: {
      maxAgentsPerSandbox: Math.floor(maxAgentsPerSandbox),
    },
  };
}

export interface E2BProvisioningPlan {
  requestedAgents: number;
  maxAgentsPerSandbox: number;
  sandboxes: number;
  distribution: number[];
}

export function planE2BProvisioning(
  requestedAgents: number,
  maxAgentsPerSandbox: number,
): E2BProvisioningPlan {
  if (!Number.isFinite(requestedAgents) || requestedAgents <= 0) {
    throw new Error(`requestedAgents must be > 0 (got ${requestedAgents})`);
  }
  if (!Number.isFinite(maxAgentsPerSandbox) || maxAgentsPerSandbox <= 0) {
    throw new Error(`maxAgentsPerSandbox must be > 0 (got ${maxAgentsPerSandbox})`);
  }

  const total = Math.ceil(requestedAgents);
  const per = Math.floor(maxAgentsPerSandbox);

  const distribution: number[] = [];
  let remaining = total;
  while (remaining > 0) {
    const chunk = Math.min(per, remaining);
    distribution.push(chunk);
    remaining -= chunk;
  }

  return {
    requestedAgents: total,
    maxAgentsPerSandbox: per,
    sandboxes: distribution.length,
    distribution,
  };
}

export interface SandboxHandle {
  id: string;
  dispose(): Promise<void>;
}

export interface SandboxProvider {
  createSandbox(): Promise<SandboxHandle>;
}

export class E2BSandboxProvider implements SandboxProvider {
  constructor(private readonly config: E2BConfig) {}

  async createSandbox(): Promise<SandboxHandle> {
    void this.config;
    throw new Error(
      'E2B sandbox creation is not implemented in this repo yet. This is an integration seam only.',
    );
  }
}
