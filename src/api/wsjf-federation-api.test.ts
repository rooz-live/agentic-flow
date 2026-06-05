/**
 * WSJF Federation API Tests
 *
 * Tests the route handler functions directly (no Express bootstrap).
 */

import { describe, it, expect } from '@jest/globals';
import {
  getTeamBacklog,
  syncTeamItems,
  getPISnapshots,
  createPISnapshot,
} from './wsjf-federation-api';

// ─────────────────────────────────────────────────────────────────────────────
// Minimal mock Request / Response
// ─────────────────────────────────────────────────────────────────────────────

function makeReq(
  overrides: {
    params?: Record<string, string>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    body?: unknown;
  } = {},
) {
  return {
    params:  overrides.params  ?? {},
    query:   overrides.query   ?? {},
    headers: {
      'x-wsjf-user-id':   'u-test',
      'x-wsjf-tenant-id': 't1',
      'x-wsjf-role':      'admin',
      ...(overrides.headers ?? {}),
    },
    body: overrides.body ?? {},
  } as unknown as import('express').Request;
}

interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status(code: number): MockResponse;
  json(data: unknown): MockResponse;
  send(data: unknown): MockResponse;
  set(k: string, v: string): MockResponse;
}

function makeRes(): MockResponse {
  const r: MockResponse = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code: number) { r.statusCode = code; return r; },
    json(data: unknown) { r.body = data; return r; },
    send(data: unknown) { r.body = data; return r; },
    set(k: string, v: string) { r.headers[k] = v; return r; },
  };
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/wsjf/:teamId', () => {
  it('returns empty backlog for unknown team', () => {
    const req = makeReq({ params: { teamId: 'team-unknown' } });
    const res = makeRes();

    getTeamBacklog(req, res as unknown as import('express').Response);

    expect(res.statusCode).toBe(200);
    expect((res.body as { items: unknown[] }).items).toHaveLength(0);
  });

  it('returns 403 for viewer trying to read another tenant', () => {
    const req = makeReq({
      params:  { teamId: 'team-1' },
      headers: { 'x-wsjf-tenant-id': 't2', 'x-wsjf-role': 'viewer' },
    });
    const res = makeRes();

    getTeamBacklog(req, res as unknown as import('express').Response);

    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/wsjf/sync', () => {
  it('upserts items and returns syncVersion', () => {
    const item = {
      id: 'item-1',
      title: 'Test',
      description: '',
      type: 'feature',
      status: 'new',
      teamId: 'team-1',
      tenantId: 't1',
      wsjf: { userBusinessValue: 8, timeCriticality: 6, riskReduction: 4, jobSize: 3, costOfDelay: 18, score: 6, confidence: 0.8 },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const req = makeReq({ body: { teamId: 'team-1', items: [item] } });
    const res = makeRes();

    syncTeamItems(req, res as unknown as import('express').Response);

    expect(res.statusCode).toBe(200);
    const body = res.body as { syncVersion: number; itemCount: number };
    expect(body.syncVersion).toBe(1);
    expect(body.itemCount).toBe(1);
  });

  it('returns 400 when items is missing', () => {
    const req = makeReq({ body: { teamId: 'team-1' } });
    const res = makeRes();

    syncTeamItems(req, res as unknown as import('express').Response);

    expect(res.statusCode).toBe(400);
  });
});

describe('PI snapshot routes', () => {
  const piConfig = {
    id: 'PI-TEST',
    name: 'Test PI',
    startDate: '2026-04-01T00:00:00Z',
    endDate:   '2026-06-30T00:00:00Z',
    teamIds: ['team-1'],
    tenantId: 't1',
    weightProfile: 'balanced',
    weights: { w1: 1, w2: 1, w3: 1 },
  };

  it('creates a snapshot and then lists it', () => {
    const createReq = makeReq({
      params: { piId: 'PI-TEST' },
      body: { piConfig, items: [] },
    });
    const createRes = makeRes();
    createPISnapshot(createReq, createRes as unknown as import('express').Response);
    expect(createRes.statusCode).toBe(201);

    const listReq = makeReq({ params: { piId: 'PI-TEST' } });
    const listRes = makeRes();
    getPISnapshots(listReq, listRes as unknown as import('express').Response);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect((listRes.body as unknown[]).length).toBeGreaterThanOrEqual(1);
  });
});
