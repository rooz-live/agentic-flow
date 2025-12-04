import { EventEmitter } from 'events';
import { JsonlEventSink } from '../notifications/telemetry_sinks';
import { NoopMetrics } from '../notifications/metrics';
import { PromMetrics } from '../notifications/prom_metrics';
let runtime;
export function startTelemetry(options) {
    if (runtime)
        return runtime;
    const bus = new EventEmitter();
    const metrics = (options?.useProm !== false) ? new PromMetrics() : new NoopMetrics();
    // Environment-driven overrides
    const envPath = process.env.GOALIE_METRICS_PATH;
    const envFlush = process.env.GOALIE_METRICS_FLUSH_MS ? parseInt(process.env.GOALIE_METRICS_FLUSH_MS, 10) : undefined;
    const envBatch = process.env.GOALIE_METRICS_BATCH ? parseInt(process.env.GOALIE_METRICS_BATCH, 10) : undefined;
    const envMax = process.env.GOALIE_METRICS_MAX_PER_MIN ? parseInt(process.env.GOALIE_METRICS_MAX_PER_MIN, 10) : undefined;
    const envSubs = process.env.GOALIE_METRICS_SUBSCRIBE ? process.env.GOALIE_METRICS_SUBSCRIBE.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const sink = new JsonlEventSink(bus, {
        filePath: options?.filePath || envPath || '.goalie/metrics_log.jsonl',
        flushIntervalMs: options?.flushIntervalMs ?? envFlush ?? 1000,
        batchSize: options?.batchSize ?? envBatch ?? 100,
        maxPerMinute: options?.maxPerMinute ?? envMax ?? 240, // tuned for moderate throughput
        subscribeTo: options?.subscribeTo ?? envSubs ?? [
            'notifier.init',
            'cleanup.started',
            'cleanup.cycle.completed',
            'cleanup.error',
            'notifier.destroyed'
        ]
    });
    sink.start();
    // Optionally start OpenTelemetry SDK for OTLP export
    let otelStop;
    (async () => {
        try {
            const { startOtel, stopOtel } = await import('./otel');
            const rt = await startOtel();
            if (rt.started) {
                otelStop = rt.stop;
            }
        }
        catch { }
    })();
    const stop = async () => {
        try {
            sink.stop();
        }
        catch { }
        if (otelStop) {
            try {
                await otelStop();
            }
            catch { }
        }
    };
    // Best effort cleanup on process exit if caller forgets
    const onExit = () => { stop().catch(() => { }); };
    process.once('exit', onExit);
    runtime = { bus, metrics, sink, stop: () => stop() };
    return runtime;
}
export function getTelemetry() {
    return runtime;
}
export function stopTelemetry() {
    if (runtime) {
        try {
            runtime.stop();
        }
        catch { }
        runtime = undefined;
    }
}
//# sourceMappingURL=bootstrap.js.map