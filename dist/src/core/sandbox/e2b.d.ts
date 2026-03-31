export interface E2BSandboxLimits {
    maxAgentsPerSandbox: number;
}
export interface E2BConfig {
    apiKey: string;
    limits: E2BSandboxLimits;
}
export declare class MissingE2BApiKeyError extends Error {
    name: string;
}
export declare function getE2BConfigFromEnv(env?: NodeJS.ProcessEnv, limits?: Partial<E2BSandboxLimits>): E2BConfig;
export interface E2BProvisioningPlan {
    requestedAgents: number;
    maxAgentsPerSandbox: number;
    sandboxes: number;
    distribution: number[];
}
export declare function planE2BProvisioning(requestedAgents: number, maxAgentsPerSandbox: number): E2BProvisioningPlan;
export interface SandboxHandle {
    id: string;
    dispose(): Promise<void>;
}
export interface SandboxProvider {
    createSandbox(): Promise<SandboxHandle>;
}
export declare class E2BSandboxProvider implements SandboxProvider {
    private readonly config;
    constructor(config: E2BConfig);
    createSandbox(): Promise<SandboxHandle>;
}
//# sourceMappingURL=e2b.d.ts.map