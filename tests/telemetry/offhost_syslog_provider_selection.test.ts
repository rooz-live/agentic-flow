import {
  getOffhostSyslogCandidates,
  selectOffhostSyslogProvider,
} from '@/telemetry/offhost-syslog/providerSelection';

describe('offhost syslog provider selection', () => {
  test('has candidates', () => {
    const c = getOffhostSyslogCandidates();
    expect(c.length).toBeGreaterThan(0);
  });

  test('selects aws lightsail by default', () => {
    const r = selectOffhostSyslogProvider({
      maxMonthlyUsd: 10,
      minVcpu: 1,
      minRamGb: 1,
      minDiskGb: 25,
    });

    expect(r).not.toBeNull();
    expect(r?.candidate.providerId).toBe('aws_lightsail');
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

  test('chooses hivelocity when aws candidates cannot meet constraints', () => {
    const r = selectOffhostSyslogProvider({
      maxMonthlyUsd: 9,
      minVcpu: 1,
      minRamGb: 2,
      minDiskGb: 25,
    });

    expect(r).not.toBeNull();
    expect(r?.candidate.providerId).toBe('hivelocity');
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

  test('score ordering prefers lower job size when cod inputs are equal', () => {
    const aws = selectOffhostSyslogProvider({
      forcedProvider: 'aws_lightsail',
      maxMonthlyUsd: 10,
      minVcpu: 1,
      minRamGb: 1,
      minDiskGb: 1,
      wsjfInputs: {
        userBusinessValue: 5,
        timeCriticality: 8,
        riskOpportunity: 5,
      },
    });

    const hv = selectOffhostSyslogProvider({
      forcedProvider: 'hivelocity',
      maxMonthlyUsd: 10,
      minVcpu: 1,
      minRamGb: 1,
      minDiskGb: 1,
      wsjfInputs: {
        userBusinessValue: 5,
        timeCriticality: 8,
        riskOpportunity: 5,
      },
    });

    expect(aws).not.toBeNull();
    expect(hv).not.toBeNull();
    expect((aws?.wsjfScore ?? 0) > (hv?.wsjfScore ?? 0)).toBe(true);
    expect(aws?.wsjfScore).toBeCloseTo(200, 5);
    expect(hv?.wsjfScore).toBeCloseTo(200 / 3, 5);
  });
});
