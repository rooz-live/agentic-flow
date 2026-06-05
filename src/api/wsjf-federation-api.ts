/**
 * WSJF Federation API
 *
 * Express router providing cross-team WSJF data federation endpoints.
 * All routes enforce RBAC and tenant isolation.
 *
 * Routes:
 *   GET  /api/wsjf/:teamId             — fetch team backlog
 *   POST /api/wsjf/sync                — merge / upsert items from another team
 *   GET  /api/wsjf/pi/:piId            — fetch PI snapshot list
 *   POST /api/wsjf/pi/:piId/snapshot   — create new PI snapshot
 *   GET  /api/wsjf/pi/:piId/diff       — diff two snapshot versions
 *   GET  /api/wsjf/pi/:piId/export     — export snapshot as JSON or YAML
 */

import type { Request, Response, NextFunction } from 'express';
import type {
  FederatedWSJFItem,
  PIConfig,
  TeamBacklog,
  WSJFPrincipal,
} from './wsjf-shared-types';
import { wsjfRbac, WSJFAuthorizationError, WSJFTenantMismatchError } from '../security/wsjf-rbac';
import { wsjfAuditLog } from '../security/wsjf-audit-log';
import { piSyncManager } from '../analytics/wsjf-pi-sync';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory team backlog store (swap for DB in production)
// ─────────────────────────────────────────────────────────────────────────────

const teamBacklogs = new Map<string, TeamBacklog>(); // key: `${tenantId}:${teamId}`

function backlogKey(tenantId: string, teamId: string): string {
  return `${tenantId}:${teamId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Principal extraction (expects x-wsjf-user-id, x-wsjf-tenant-id, x-wsjf-role headers)
// ─────────────────────────────────────────────────────────────────────────────

function extractPrincipal(req: Request): WSJFPrincipal {
  const userId   = String(req.headers['x-wsjf-user-id']   ?? 'anonymous');
  const tenantId = String(req.headers['x-wsjf-tenant-id'] ?? '');
  const role     = String(req.headers['x-wsjf-role']      ?? 'viewer');

  if (!['viewer', 'scorer', 'admin'].includes(role)) {
    throw new WSJFAuthorizationError(
      { userId, tenantId, role: 'viewer' },
      'read:backlog',
    );
  }

  return { userId, tenantId, role: role as WSJFPrincipal['role'] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Error handler
// ─────────────────────────────────────────────────────────────────────────────

function handleError(err: unknown, res: Response): void {
  if (err instanceof WSJFAuthorizationError) {
    res.status(403).json({ error: 'Forbidden', message: err.message });
    return;
  }
  if (err instanceof WSJFTenantMismatchError) {
    res.status(403).json({ error: 'TenantMismatch', message: err.message });
    return;
  }
  if (err instanceof Error) {
    res.status(400).json({ error: 'BadRequest', message: err.message });
    return;
  }
  res.status(500).json({ error: 'InternalServerError' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handlers (exported for unit testing without Express bootstrap)
// ─────────────────────────────────────────────────────────────────────────────

export function getTeamBacklog(req: Request, res: Response): void {
  try {
    const principal = extractPrincipal(req);
    const { teamId } = req.params;

    wsjfRbac.assertTenantAction(principal, principal.tenantId, 'read:backlog', teamId);

    const key     = backlogKey(principal.tenantId, teamId);
    const backlog = teamBacklogs.get(key) ?? {
      teamId,
      tenantId: principal.tenantId,
      items: [],
      lastSyncedAt: new Date().toISOString(),
      syncVersion: 0,
    };

    res.json(backlog);
  } catch (err) {
    handleError(err, res);
  }
}

export function syncTeamItems(req: Request, res: Response): void {
  try {
    const principal = extractPrincipal(req);
    wsjfRbac.assertTenantAction(principal, principal.tenantId, 'write:item');

    const { teamId, items } = req.body as { teamId: string; items: FederatedWSJFItem[] };
    if (!teamId || !Array.isArray(items)) {
      res.status(400).json({ error: 'BadRequest', message: 'teamId and items[] required' });
      return;
    }

    const key      = backlogKey(principal.tenantId, teamId);
    const existing = teamBacklogs.get(key);
    const existingItems = existing?.items ?? [];

    // Upsert: replace matching IDs, append new ones
    const idSet = new Map(items.map(i => [i.id, i]));
    const merged = existingItems
      .map(i => idSet.has(i.id) ? idSet.get(i.id)! : i)
      .concat(items.filter(i => !existingItems.find(e => e.id === i.id)));

    const updated: TeamBacklog = {
      teamId,
      tenantId: principal.tenantId,
      items: merged,
      lastSyncedAt: new Date().toISOString(),
      syncVersion: (existing?.syncVersion ?? 0) + 1,
    };

    teamBacklogs.set(key, updated);

    wsjfAuditLog.append({
      eventType: 'pi.sync',
      tenantId: principal.tenantId,
      userId: principal.userId,
      payload: { teamId, itemCount: items.length, syncVersion: updated.syncVersion },
    });

    res.json({ syncVersion: updated.syncVersion, itemCount: merged.length });
  } catch (err) {
    handleError(err, res);
  }
}

export function getPISnapshots(req: Request, res: Response): void {
  try {
    const principal = extractPrincipal(req);
    const { piId }  = req.params;

    const snaps = piSyncManager.getSnapshots(piId, principal);
    res.json(snaps.map(s => ({
      piId: s.piConfig.id,
      version: s.snapshotVersion,
      snapshotAt: s.snapshotAt,
      itemCount: s.items.length,
      checksum: s.checksum,
    })));
  } catch (err) {
    handleError(err, res);
  }
}

export function createPISnapshot(req: Request, res: Response): void {
  try {
    const principal        = extractPrincipal(req);
    const { piId }         = req.params;
    const { piConfig, items } = req.body as { piConfig: PIConfig; items: FederatedWSJFItem[] };

    if (!piConfig || !Array.isArray(items)) {
      res.status(400).json({ error: 'BadRequest', message: 'piConfig and items[] required' });
      return;
    }
    if (piConfig.id !== piId) {
      res.status(400).json({ error: 'BadRequest', message: 'piConfig.id must match :piId' });
      return;
    }

    const snap = piSyncManager.snapshotPI(piConfig, items, principal);
    res.status(201).json({
      piId,
      version: snap.snapshotVersion,
      snapshotAt: snap.snapshotAt,
      checksum: snap.checksum,
    });
  } catch (err) {
    handleError(err, res);
  }
}

export function getPIDiff(req: Request, res: Response): void {
  try {
    const principal = extractPrincipal(req);
    const { piId }  = req.params;
    const from = parseInt(String(req.query['from'] ?? ''), 10);
    const to   = parseInt(String(req.query['to']   ?? ''), 10);

    if (isNaN(from) || isNaN(to)) {
      res.status(400).json({ error: 'BadRequest', message: 'from and to version params required' });
      return;
    }

    const diff = piSyncManager.diffPI(piId, from, to, principal);
    res.json(diff);
  } catch (err) {
    handleError(err, res);
  }
}

export function exportPISnapshot(req: Request, res: Response): void {
  try {
    const principal = extractPrincipal(req);
    const { piId }  = req.params;
    const version   = parseInt(String(req.query['version'] ?? ''), 10);
    const format    = String(req.query['format'] ?? 'json');

    if (isNaN(version)) {
      res.status(400).json({ error: 'BadRequest', message: 'version param required' });
      return;
    }

    if (format === 'yaml') {
      const yaml = piSyncManager.exportYAML(piId, version, principal);
      res.set('Content-Type', 'text/yaml').send(yaml);
    } else {
      const json = piSyncManager.exportJSON(piId, version, principal);
      res.set('Content-Type', 'application/json').send(json);
    }
  } catch (err) {
    handleError(err, res);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Router factory (call this to mount onto an Express app)
// ─────────────────────────────────────────────────────────────────────────────

export function createWSJFFederationRouter() {
  // Lazy import Express to avoid hard dependency at module load time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Router } = require('express') as typeof import('express');
  const router = Router();

  router.get('/:teamId',               (req: Request, res: Response, _next: NextFunction) => getTeamBacklog(req, res));
  router.post('/sync',                 (req: Request, res: Response, _next: NextFunction) => syncTeamItems(req, res));
  router.get('/pi/:piId',              (req: Request, res: Response, _next: NextFunction) => getPISnapshots(req, res));
  router.post('/pi/:piId/snapshot',    (req: Request, res: Response, _next: NextFunction) => createPISnapshot(req, res));
  router.get('/pi/:piId/diff',         (req: Request, res: Response, _next: NextFunction) => getPIDiff(req, res));
  router.get('/pi/:piId/export',       (req: Request, res: Response, _next: NextFunction) => exportPISnapshot(req, res));

  return router;
}
