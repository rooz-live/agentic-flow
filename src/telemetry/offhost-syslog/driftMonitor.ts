import { spawn } from 'child_process';
import { lookup } from 'dns/promises';
import { EventEmitter } from 'events';
import * as net from 'net';
import * as os from 'os';

import {
  type OffhostSyslogProviderId,
  selectOffhostSyslogProvider,
} from './providerSelection';

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

export type SpawnFn = (
  command: string,
  args?: ReadonlyArray<string>,
  options?: Record<string, unknown>,
) => EventEmitter;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function probeDnsLookup(hostname: string, timeoutMs: number = 2000): Promise<{ ok: boolean; error?: string }> {
  try {
    await withTimeout(lookup(hostname), timeoutMs, `dns lookup timeout after ${timeoutMs}ms`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function probeTcpConnect(options: {
  host: string;
  port: number;
  timeoutMs?: number;
}): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const timeoutMs = options.timeoutMs ?? 2000;

  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;

    const finish = (payload: { ok: boolean; latencyMs?: number; error?: string }) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    const socket = net.createConnection({ host: options.host, port: options.port });

    const timer = setTimeout(() => {
      try {
        socket.destroy(new Error(`tcp connect timeout after ${timeoutMs}ms`));
      } catch {
        finish({ ok: false, error: `tcp connect timeout after ${timeoutMs}ms` });
      }
    }, timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timer);
      const latencyMs = Date.now() - start;
      try {
        socket.end();
      } catch {}
      finish({ ok: true, latencyMs });
    });

    socket.once('error', (err) => {
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {}
      finish({ ok: false, error: err instanceof Error ? err.message : String(err) });
    });

    socket.once('close', () => {
      clearTimeout(timer);
    });
  });
}

export async function emitDriftEventToSyslog(
  event: DriftMonitorEvent,
  options?: {
    tag?: string;
    facility?: string;
    spawnFn?: SpawnFn;
  },
): Promise<{ ok: boolean; error?: string }> {
  const tag = options?.tag ?? process.env.AF_DRIFT_SYSLOG_TAG ?? 'drift-monitor';
  const facility = options?.facility ?? process.env.AF_DRIFT_SYSLOG_FACILITY ?? 'local5';

  const severity = event.status === 'ok' ? 'info' : 'err';
  const payload = JSON.stringify(event);

  const spawnFn: SpawnFn = options?.spawnFn ?? ((cmd, args) => spawn(cmd, args as string[]));

  try {
    const child = spawnFn('logger', ['-t', tag, '-p', `${facility}.${severity}`, '--', payload]);

    await new Promise<void>((resolve, reject) => {
      child.once('error', (err) => {
        reject(err);
      });
      child.once('close', () => {
        resolve();
      });
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function buildDefaultDriftChecksFromEnv(): DriftCheckDefinition[] {
  const selected = selectOffhostSyslogProvider();
  const provider: OffhostSyslogProviderId = selected?.candidate.providerId ?? 'aws_lightsail';

  const syslogHost = process.env.AF_TELEMETRY_SYSLOG_SINK_HOST ?? 'syslog-sink-prod-aws-us-east-1-01.interface.tag.ooo';
  const syslogPort = Number(process.env.AF_TELEMETRY_SYSLOG_SINK_PORT) || 6514;

  const checks: DriftCheckDefinition[] = [
    {
      id: 'syslog_sink_dns',
      provider,
      type: 'dns',
      targetHost: syslogHost,
      timeoutMs: 2000,
      meta: { kind: 'offhost_syslog_sink' },
    },
    {
      id: 'syslog_sink_tcp',
      provider,
      type: 'tcp',
      targetHost: syslogHost,
      targetPort: syslogPort,
      timeoutMs: 2000,
      meta: { kind: 'offhost_syslog_sink', port: syslogPort },
    },
  ];

  const hvHost = process.env.AF_HIVELOCITY_DRIFT_HOST;
  if (hvHost) {
    const hvPort = Number(process.env.AF_HIVELOCITY_DRIFT_PORT) || 22;
    checks.push({
      id: 'hivelocity_tcp',
      provider: 'hivelocity',
      type: 'tcp',
      targetHost: hvHost,
      targetPort: hvPort,
      timeoutMs: 2000,
      meta: { kind: 'hivelocity', port: hvPort },
    });
  }

  return checks;
}

export async function runDriftChecks(
  checks?: DriftCheckDefinition[],
  options?: {
    sourceHost?: string;
    emit?: (event: DriftMonitorEvent) => Promise<{ ok: boolean; error?: string }>;
  },
): Promise<{
  results: DriftCheckResult[];
  emitted: Array<{ event: DriftMonitorEvent; ok: boolean; error?: string }>;
}> {
  const sourceHost = options?.sourceHost ?? os.hostname();
  const emit = options?.emit ?? ((event: DriftMonitorEvent) => emitDriftEventToSyslog(event));

  const effectiveChecks = checks ?? buildDefaultDriftChecksFromEnv();

  const results: DriftCheckResult[] = [];
  const emitted: Array<{ event: DriftMonitorEvent; ok: boolean; error?: string }> = [];

  for (const check of effectiveChecks) {
    const target = check.type === 'tcp'
      ? `${check.targetHost}:${check.targetPort ?? 0}`
      : check.targetHost;

    if (check.type === 'dns') {
      const dnsRes = await probeDnsLookup(check.targetHost, check.timeoutMs ?? 2000);
      const status: DriftMonitorStatus = dnsRes.ok ? 'ok' : 'fail';

      const event: DriftMonitorEvent = {
        ts: new Date().toISOString(),
        source: sourceHost,
        check: check.id,
        provider: check.provider,
        target,
        status,
        error: dnsRes.ok ? undefined : dnsRes.error,
        meta: check.meta,
      };

      results.push({ check, status, error: dnsRes.error });
      const emitRes = await emit(event);
      emitted.push({ event, ok: emitRes.ok, error: emitRes.error });
      continue;
    }

    const port = check.targetPort ?? 0;
    const tcpRes = await probeTcpConnect({ host: check.targetHost, port, timeoutMs: check.timeoutMs });
    const status: DriftMonitorStatus = tcpRes.ok ? 'ok' : 'fail';

    const event: DriftMonitorEvent = {
      ts: new Date().toISOString(),
      source: sourceHost,
      check: check.id,
      provider: check.provider,
      target,
      status,
      latency_ms: tcpRes.latencyMs,
      error: tcpRes.ok ? undefined : tcpRes.error,
      meta: check.meta,
    };

    results.push({ check, status, latencyMs: tcpRes.latencyMs, error: tcpRes.error });
    const emitRes = await emit(event);
    emitted.push({ event, ok: emitRes.ok, error: emitRes.error });
  }

  return { results, emitted };
}

export async function runDriftMonitorCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  let noEmit = false;
  let skipNetwork = false;
  let sourceHost: string | undefined;
  let jsonSummary = false;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--no-emit') {
      noEmit = true;
      continue;
    }
    if (a === '--skip-network') {
      skipNetwork = true;
      continue;
    }
    if (a === '--json') {
      jsonSummary = true;
      continue;
    }
    if (a === '--source-host') {
      const v = argv[i + 1];
      if (v) {
        sourceHost = v;
        i += 1;
      }
      continue;
    }
  }

  if (skipNetwork) {
    const checks = buildDefaultDriftChecksFromEnv();
    if (jsonSummary) {
      console.log(JSON.stringify({ checks }, null, 2));
    } else {
      console.log(JSON.stringify({ checks }));
    }
    return 0;
  }

  const emit = noEmit
    ? async (event: DriftMonitorEvent) => {
        console.log(JSON.stringify(event));
        return { ok: true };
      }
    : undefined;

  const { results, emitted } = await runDriftChecks(undefined, {
    sourceHost,
    emit,
  });

  const anyCheckFail = results.some((r) => r.status === 'fail');
  const anyEmitFail = emitted.some((e) => !e.ok);

  const summary = {
    ok: !anyCheckFail && !anyEmitFail,
    check_failures: results.filter((r) => r.status === 'fail').length,
    emit_failures: emitted.filter((e) => !e.ok).length,
  };

  if (jsonSummary) {
    console.log(JSON.stringify({ summary, results, emitted }, null, 2));
  } else {
    console.log(JSON.stringify({ summary }));
  }

  if (anyCheckFail) return 2;
  if (anyEmitFail) return 3;
  return 0;
}

declare const require: any;
if (typeof require !== 'undefined' && require.main === module) {
  runDriftMonitorCli()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}
