export type OffhostSyslogProviderId = 'aws_lightsail' | 'hivelocity';
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
export declare function getOffhostSyslogCandidates(): ProviderCandidate[];
export declare function loadProviderSelectionConstraintsFromEnv(): ProviderSelectionConstraints;
export declare function selectOffhostSyslogProvider(partial?: Partial<ProviderSelectionConstraints>): ProviderSelectionResult | null;
//# sourceMappingURL=providerSelection.d.ts.map