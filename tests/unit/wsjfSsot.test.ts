import { buildSsotSnapshotFromObjects, computeWsjfScore } from '../../src/core/wsjf/ssot';

describe('wsjf ssot', () => {
  test('computeWsjfScore uses standard CoD / jobSize', () => {
    expect(
      computeWsjfScore({ userBusinessValue: 5, timeCriticality: 5, riskReduction: 10, jobSize: 4 }),
    ).toBe(5);
  });

  test('buildSsotSnapshotFromObjects extracts items from kanban+roam objects', () => {
    const kanban = {
      columns: {
        NOW: {
          items: [{ id: 'K-1', title: 'Do thing', wsjf_score: 10, status: 'NOW' }],
        },
      },
    };

    const roam = {
      items: [{ id: 'R-1', title: 'Risk thing', wsjf_score: 9.5, status: 'owned' }],
    };

    const snap = buildSsotSnapshotFromObjects({ kanban, roam });
    expect(snap.items.map((i) => i.id)).toEqual(['K-1', 'R-1']);
  });
});
