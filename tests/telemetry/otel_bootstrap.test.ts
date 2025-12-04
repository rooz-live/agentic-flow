describe('OTLP/OTel bootstrap', () => {
  it('does not throw when AF_OTEL_ENABLED=1 but OTel deps are missing', async () => {
    process.env.AF_OTEL_ENABLED = '1';
    const { startTelemetry, stopTelemetry } = await import('../../src/telemetry/bootstrap');
    expect(async () => { startTelemetry(); }).not.toThrow();
    // give the async otel start task a tick
    await new Promise(r => setTimeout(r, 10));
    expect(() => stopTelemetry()).not.toThrow();
    delete process.env.AF_OTEL_ENABLED;
  });
});
