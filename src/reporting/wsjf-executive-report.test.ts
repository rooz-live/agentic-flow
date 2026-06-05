/**
 * WSJF Executive Report Tests
 */

import { describe, it, expect } from '@jest/globals';
import { ExecReportGenerator } from './wsjf-executive-report';
import type { ExecReportConfig, FederatedWSJFItem } from '../api/wsjf-shared-types';

function makeItem(id: string, score: number, status: FederatedWSJFItem['status'] = 'new'): FederatedWSJFItem {
  return {
    id,
    title: `Item ${id}`,
    description: '',
    type: 'feature',
    status,
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

const config: ExecReportConfig = {
  piId: 'PI-2026-Q2',
  tenantId: 't1',
  topN: 3,
  includeRiskHeatmap: true,
  includeVelocityTrend: false,
  format: 'json',
};

const gen = new ExecReportGenerator();

describe('ExecReportGenerator — topN', () => {
  it('returns top N items sorted by score desc', () => {
    const items = [
      makeItem('a', 2.0),
      makeItem('b', 9.0),
      makeItem('c', 5.0),
      makeItem('d', 7.0),
    ];
    const report = gen.generate({ ...config, topN: 2 }, items);
    expect(report.topItems).toHaveLength(2);
    expect(report.topItems[0].id).toBe('b');
    expect(report.topItems[1].id).toBe('d');
  });
});

describe('ExecReportGenerator — completionRate', () => {
  it('is 0 for all-new items', () => {
    const items = [makeItem('a', 5.0, 'new'), makeItem('b', 3.0, 'new')];
    const report = gen.generate(config, items);
    expect(report.completionRate).toBe(0);
  });

  it('is 1 for all-done items', () => {
    const items = [makeItem('a', 5.0, 'done'), makeItem('b', 3.0, 'done')];
    const report = gen.generate(config, items);
    expect(report.completionRate).toBe(1);
  });

  it('is 0.5 for half done', () => {
    const items = [makeItem('a', 5.0, 'done'), makeItem('b', 3.0, 'new')];
    const report = gen.generate(config, items);
    expect(report.completionRate).toBe(0.5);
  });
});

describe('ExecReportGenerator — generateMarkdown', () => {
  it('contains PI id in header', () => {
    const items = [makeItem('a', 5.0)];
    const report = gen.generate({ ...config, format: 'markdown' }, items);
    expect(report.content).toContain('PI-2026-Q2');
  });

  it('contains table header', () => {
    const items = [makeItem('a', 5.0)];
    const report = gen.generate({ ...config, format: 'markdown' }, items);
    expect(report.content).toContain('| # |');
  });
});

describe('ExecReportGenerator — generateHTML', () => {
  it('returns valid HTML with DOCTYPE', () => {
    const items = [makeItem('a', 5.0)];
    const report = gen.generate({ ...config, format: 'html' }, items);
    expect(report.content).toContain('<!DOCTYPE html>');
    expect(report.content).toContain('PI-2026-Q2');
  });

  it('escapes HTML special chars in title', () => {
    const item = makeItem('<script>', 5.0);
    item.title = '<script>alert(1)</script>';
    const report = gen.generate({ ...config, format: 'html', topN: 1 }, [item]);
    expect(report.content).not.toContain('<script>alert');
    expect(report.content).toContain('&lt;script&gt;');
  });
});

describe('ExecReportGenerator — generateJSON', () => {
  it('returns parseable JSON with correct PI id', () => {
    const items = [makeItem('a', 5.0)];
    const report = gen.generate(config, items);
    const parsed = JSON.parse(report.content) as { piId: string };
    expect(parsed.piId).toBe('PI-2026-Q2');
  });
});

describe('ExecReportGenerator — avgWsjfScore', () => {
  it('correctly averages scores', () => {
    const items = [makeItem('a', 4.0), makeItem('b', 8.0)];
    const report = gen.generate(config, items);
    expect(report.avgWsjfScore).toBeCloseTo(6.0);
  });
});
