export class MissingE2BApiKeyError extends Error {
    name = 'MissingE2BApiKeyError';
}
export function getE2BConfigFromEnv(env = process.env, limits = {}) {
    const apiKey = (env.E2B_API_KEY ?? '').trim();
    if (!apiKey) {
        throw new MissingE2BApiKeyError('E2B_API_KEY is required for sandbox execution');
    }
    const maxAgentsPerSandbox = typeof limits.maxAgentsPerSandbox === 'number'
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
export function planE2BProvisioning(requestedAgents, maxAgentsPerSandbox) {
    if (!Number.isFinite(requestedAgents) || requestedAgents <= 0) {
        throw new Error(`requestedAgents must be > 0 (got ${requestedAgents})`);
    }
    if (!Number.isFinite(maxAgentsPerSandbox) || maxAgentsPerSandbox <= 0) {
        throw new Error(`maxAgentsPerSandbox must be > 0 (got ${maxAgentsPerSandbox})`);
    }
    const total = Math.ceil(requestedAgents);
    const per = Math.floor(maxAgentsPerSandbox);
    const distribution = [];
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
export class E2BSandboxProvider {
    config;
    constructor(config) {
        this.config = config;
    }
    async createSandbox() {
        void this.config;
        throw new Error('E2B sandbox creation is not implemented in this repo yet. This is an integration seam only.');
    }
}
//# sourceMappingURL=e2b.js.map