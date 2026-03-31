import { EventEmitter } from 'events';
import { type OffhostSyslogProviderId } from './providerSelection';
export type DriftMonitorStatus = 'ok' | 'fail';
export interface DriftMonitorEvent {
    ts: string;
    source: string;
    check: string;
    provider: OffhostSyslogProviderId;
    target: string;
    status: DriftMonitorStatus;
    latency_ms?: number;
    error?: string;
    meta?: Record<string, unknown>;
}
export interface DriftCheckDefinition {
    id: string;
    provider: OffhostSyslogProviderId;
    targetHost: string;
    targetPort?: number;
    timeoutMs?: number;
    type: 'dns' | 'tcp';
    meta?: Record<string, unknown>;
}
export interface DriftCheckResult {
    check: DriftCheckDefinition;
    status: DriftMonitorStatus;
    latencyMs?: number;
    error?: string;
}
export type SpawnFn = (command: string, args?: ReadonlyArray<string>, options?: Record<string, unknown>) => EventEmitter;
export declare function probeDnsLookup(hostname: string, timeoutMs?: number): Promise<{
    ok: boolean;
    error?: string;
}>;
export declare function probeTcpConnect(options: {
    host: string;
    port: number;
    timeoutMs?: number;
}): Promise<{
    ok: boolean;
    latencyMs?: number;
    error?: string;
}>;
export declare function emitDriftEventToSyslog(event: DriftMonitorEvent, options?: {
    tag?: string;
    facility?: string;
    spawnFn?: SpawnFn;
}): Promise<{
    ok: boolean;
    error?: string;
}>;
export declare function buildDefaultDriftChecksFromEnv(): DriftCheckDefinition[];
export declare function runDriftChecks(checks?: DriftCheckDefinition[], options?: {
    sourceHost?: string;
    emit?: (event: DriftMonitorEvent) => Promise<{
        ok: boolean;
        error?: string;
    }>;
}): Promise<{
    results: DriftCheckResult[];
    emitted: Array<{
        event: DriftMonitorEvent;
        ok: boolean;
        error?: string;
    }>;
}>;
export declare function runDriftMonitorCli(argv?: string[]): Promise<number>;
//# sourceMappingURL=driftMonitor.d.ts.map