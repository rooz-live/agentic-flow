/* OpenTelemetry SDK bootstrap with OTLP HTTP exporters.
 * This is safe to import unconditionally; it no-ops when OTel deps are missing
 * or AF_OTEL_ENABLED is not truthy.
 */
function parseBool(v) {
    return v === '1' || v === 'true' || v === 'TRUE';
}
function parseHeaders(h) {
    if (!h)
        return undefined;
    const o = {};
    for (const part of h.split(',')) {
        const [k, ...rest] = part.split('=');
        if (!k || rest.length === 0)
            continue;
        o[k.trim()] = rest.join('=').trim();
    }
    return o;
}
let runtime;
export async function startOtel() {
    if (runtime)
        return runtime;
    if (!parseBool(process.env.AF_OTEL_ENABLED) && !process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
        runtime = { started: false, stop: async () => { } };
        return runtime;
    }
    try {
        // Lazy require to avoid hard dependency in environments without OTel libs
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { NodeSDK } = require('@opentelemetry/sdk-node');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Resource } = require('@opentelemetry/resources');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
        const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
        const headers = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);
        const serviceName = process.env.OTEL_SERVICE_NAME || 'agentic-flow';
        const resourceAttrs = {
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        };
        // Support OTEL_RESOURCE_ATTRIBUTES="k=v,k2=v2"
        const extra = parseHeaders(process.env.OTEL_RESOURCE_ATTRIBUTES);
        if (extra)
            Object.assign(resourceAttrs, extra);
        const traceExporter = parseBool(process.env.AF_OTEL_TRACES ?? '1')
            ? new OTLPTraceExporter({ url: `${endpoint}/v1/traces`, headers })
            : undefined;
        const metricExporter = parseBool(process.env.AF_OTEL_METRICS ?? '1')
            ? new OTLPMetricExporter({ url: `${endpoint}/v1/metrics`, headers })
            : undefined;
        const readers = metricExporter
            ? [new PeriodicExportingMetricReader({ exporter: metricExporter, exportIntervalMillis: Number(process.env.AF_OTEL_METRICS_INTERVAL_MS) || 60000 })]
            : [];
        const sdk = new NodeSDK({
            resource: new Resource(resourceAttrs),
            traceExporter,
            metricReader: readers.length ? readers[0] : undefined,
        });
        await sdk.start();
        runtime = { sdk, started: true, stop: async () => { try {
                await sdk.shutdown();
            }
            catch { } } };
        return runtime;
    }
    catch {
        // OTel deps not installed; remain inert
        runtime = { started: false, stop: async () => { } };
        return runtime;
    }
}
export async function stopOtel() {
    if (runtime?.started) {
        try {
            await runtime.stop();
        }
        catch { }
    }
    runtime = undefined;
}
export function getOtelStatus() {
    const enabled = parseBool(process.env.AF_OTEL_ENABLED) || !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    return {
        enabled,
        started: runtime?.started ?? false,
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        traces: parseBool(process.env.AF_OTEL_TRACES ?? '1'),
        metrics: parseBool(process.env.AF_OTEL_METRICS ?? '1'),
        serviceName: process.env.OTEL_SERVICE_NAME || 'agentic-flow',
    };
}
//# sourceMappingURL=otel.js.map