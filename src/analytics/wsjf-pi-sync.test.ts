/**
 * WSJF PI Sync Manager Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PISyncManager } from './wsjf-pi-sync';
import type {
  FederatedWSJFItem,
  PIConfig,
  WSJFPrincipal,
} from '../api/wsjf-shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeItem(id: string, score: number): FederatedWSJFItem {
  return {
    id,
    title: `Item ${id}`,
    description: 'test',
    type: 'feature',
    status: 'new',
    teamId: 'team-1',
    tenantId: 't1',
    piId: 'PI-2026-Q2',
    wsjf: {
      userBusinessValue: 8,
      timeCriticality: 6,
      riskReduction: 4,
      jobSize: 3,
      costOfDelay: 18,
      score,
      confidence: 0.8,
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

const piConfig: PIConfig = {
  id: 'PI-2026-Q2',
  name: 'Q2 2026',
  startDate: '2026-04-01T00:00:00Z',
  endDate:   '2026-06-30T00:00:00Z',
  teamIds: ['team-1'],
  tenantId: 't1',
  weightProfile: 'balanced',
  weights: { w1: 1, w2: 1, w3: 1 },
};

const admin: WSJFPrincipal = { userId: 'u-admin', tenantId: 't1', role: 'admin' };

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PISyncManager.snapshotPI', () => {
  let mgr: PISyncManager;

  beforeEach(() => {
    mgr = new PISyncManager();
  });

  it('creates snapshot with version 1 on first call', () => {
    const items = [makeItem('a', 6.0), makeItem('b', 4.0)];
    const snap  = mgr.snapshotPI(piConfig, items, admin);
    expect(snap.snapshotVersion).toBe(1);
    expect(snap.items).toHaveLength(2);
  });

  it('increments version on successive snapshots', () => {
    const items = [makeItem('a', 6.0)];
    mgr.snapshotPI(piConfig, items, admin);
    const snap2 = mgr.snapshotPI(piConfig, items, admin);
    expect(snap2.snapshotVersion).toBe(2);
  });

  it('checksum is deterministic for same items', () => {
    const items = [makeItem('a', 6.0), makeItem('b', 4.0)];
    const s1 = mgr.snapshotPI(piConfig, items, admin);

    const mgr2 = new PISyncManager();
    const s2 = mgr2.snapshotPI(piConfig, items, admin);

    expect(s1.checksum).toBe(s2.checksum);
  });

  it('verifyChecksum passes for fresh snapshot', () => {
    const items = [makeItem('a', 6.0)];
    const snap  = mgr.snapshotPI(piConfig, items, admin);
    expect(mgr.verifyChecksum(snap)).toBe(true);
  });
});

describe('PISyncManager.diffPI', () => {
  let mgr: PISyncManager;

  beforeEach(() => {
    mgr = new PISyncManager();
  });

  it('detects added items', () => {
    const v1Items = [makeItem('a', 6.0)];
    const v2Items = [makeItem('a', 6.0), makeItem('b', 3.0)];
    mgr.snapshotPI(piConfig, v1Items, admin);
    mgr.snapshotPI(piConfig, v2Items, admin);

    const diff = mgr.diffPI('PI-2026-Q2', 1, 2, admin);
    expect(diff.added.map(i => i.id)).toContain('b');
    expect(diff.removed).toHaveLength(0);
  });

  it('detects removed items', () => {
    const v1Items = [makeItem('a', 6.0), makeItem('b', 3.0)];
    const v2Items = [makeItem('a', 6.0)];
    mgr.snapshotPI(piConfig, v1Items, admin);
    mgr.snapshotPI(piConfig, v2Items, admin);

    const diff = mgr.diffPI('PI-2026-Q2', 1, 2, admin);
    expect(diff.removed).toContain('b');
    expect(diff.added).toHaveLength(0);
  });

  it('detects score changes', () => {
    const v1Items = [makeItem('a', 6.0)];
    const v2Items = [makeItem('a', 9.0)];
    mgr.snapshotPI(piConfig, v1Items, admin);
    mgr.snapshotPI(piConfig, v2Items, admin);

    const diff = mgr.diffPI('PI-2026-Q2', 1, 2, admin);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].delta).toBeCloseTo(3.0);
  });

  it('returns empty diff for identical snapshots', () => {
    const items = [makeItem('a', 6.0)];
    mgr.snapshotPI(piConfig, items, admin);
    mgr.snapshotPI(piConfig, items, admin);

    const diff = mgr.diffPI('PI-2026-Q2', 1, 2, admin);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });
});

describe('PISyncManager.exportJSON', () => {
  it('returns valid JSON string', () => {
    const mgr   = new PISyncManager();
    const items = [makeItem('a', 6.0)];
    mgr.snapshotPI(piConfig, items, admin);

    const json = mgr.exportJSON('PI-2026-Q2', 1, admin);
    const parsed = JSON.parse(json) as { snapshotVersion: number };
    expect(parsed.snapshotVersion).toBe(1);
  });
});

describe('PISyncManager.exportYAML', () => {
  it('returns a non-empty YAML string', () => {
    const mgr   = new PISyncManager();
    const items = [makeItem('a', 6.0)];
    mgr.snapshotPI(piConfig, items, admin);

    const yaml = mgr.exportYAML('PI-2026-Q2', 1, admin);
    expect(yaml).toContain('snapshotVersion');
    expect(yaml).toContain('PI-2026-Q2');
  });
});
