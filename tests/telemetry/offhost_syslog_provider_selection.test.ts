import {
  getOffhostSyslogCandidates,
  selectOffhostSyslogProvider,
} from '@/telemetry/offhost-syslog/providerSelection';

describe('offhost syslog provider selection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('has candidates', () => {
    const c = getOffhostSyslogCandidates();
    expect(c.length).toBeGreaterThan(0);
  });

  test('selects hivelocity by default', () => {
    const r = selectOffhostSyslogProvider({
      maxMonthlyUsd: 10,
      minVcpu: 1,
      minRamGb: 1,
      minDiskGb: 25,
    });

    expect(r).not.toBeNull();
    expect(r?.candidate.providerId).toBe('hivelocity');
  });

  test('returns null when budget is too low', () => {
    const r = selectOffhostSyslogProvider({
      maxMonthlyUsd: 4,
      minVcpu: 1,
      minRamGb: 1,
      minDiskGb: 1,
    });

    expect(r).toBeNull();
  });

  test('respects forced provider', () => {
    const r = selectOffhostSyslogProvider({
      forcedProvider: 'hivelocity',
      maxMonthlyUsd: 10,
      minVcpu: 1,
      minRamGb: 1,
      minDiskGb: 1,
    });

    expect(r).not.toBeNull();
    expect(r?.candidate.providerId).toBe('hivelocity');
  });

  test('respects env forced provider and other provider values', () => {
    process.env.AF_TELEMETRY_SINK_PROVIDER = 'hivelocity';
    const r1 = selectOffhostSyslogProvider();
    expect(r1?.candidate.providerId).toBe('hivelocity');

    process.env.AF_TELEMETRY_SINK_PROVIDER = 'invalid_provider';
    const r2 = selectOffhostSyslogProvider();
    expect(r2?.candidate.providerId).toBe('hivelocity');
  });

  test('selects candidate based on WSJF score and monthlyUsd when region is not constrained', () => {
    // If region is undefined, all candidates are eligible
    const r = selectOffhostSyslogProvider({
      region: undefined,
      maxMonthlyUsd: 15,
      minVcpu: 1,
      minRamGb: 1,
      minDiskGb: 25,
    });

    // Best candidate should be dal1 because it has jobSize: 2 (Score 100)
    expect(r).not.toBeNull();
    expect(r?.candidate.region).toBe('dal1');
    expect(r?.candidate.monthlyUsd).toBe(6);
  });
});

