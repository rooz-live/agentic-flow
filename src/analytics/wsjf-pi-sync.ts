/**
 * WSJF PI Sync Manager
 *
 * Handles Program Increment lifecycle: snapshot creation, version diffing,
 * and export to JSON/YAML. Integrates with audit log and RBAC.
 */

import * as crypto from 'crypto';
import type {
  FederatedWSJFItem,
  PIConfig,
  PISnapshot,
  PIDiff,
  WSJFPrincipal,
} from '../api/wsjf-shared-types';
import { wsjfRbac } from '../security/wsjf-rbac';
import { wsjfAuditLog } from '../security/wsjf-audit-log';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store (replace with DB adapter in production)
// ─────────────────────────────────────────────────────────────────────────────

const snapshots = new Map<string, PISnapshot[]>();  // piId → ordered snapshots

// ─────────────────────────────────────────────────────────────────────────────
// PI Sync Manager
// ─────────────────────────────────────────────────────────────────────────────

export class PISyncManager {
  // ── Snapshot ────────────────────────────────────────────────────────────────

  /**
   * Create an immutable snapshot of the current PI backlog state.
   * Each call increments the snapshot version.
   */
  snapshotPI(
    piConfig: PIConfig,
    items: FederatedWSJFItem[],
    principal: WSJFPrincipal,
  ): PISnapshot {
    wsjfRbac.assertTenantAction(principal, piConfig.tenantId, 'export:pi', piConfig.id);

    const existing = snapshots.get(piConfig.id) ?? [];
    const version  = existing.length + 1;

    const snapshot: PISnapshot = {
      piConfig,
      items: this.cloneItems(items),
      snapshotAt: new Date().toISOString(),
      snapshotVersion: version,
      checksum: this.computeChecksum(items),
    };

    snapshots.set(piConfig.id, [...existing, snapshot]);

    wsjfAuditLog.append({
      eventType: 'pi.snapshot',
      tenantId: piConfig.tenantId,
      userId: principal.userId,
      piId: piConfig.id,
      payload: { version, itemCount: items.length, checksum: snapshot.checksum },
    });

    return snapshot;
  }

  /**
   * Retrieve all snapshots for a PI, optionally filtered by version.
   */
  getSnapshots(piId: string, principal: WSJFPrincipal): PISnapshot[] {
    const all = snapshots.get(piId) ?? [];
    if (all.length === 0) return [];

    wsjfRbac.assertTenantAction(
      principal,
      all[0].piConfig.tenantId,
      'read:backlog',
      piId,
    );

    return all;
  }

  /**
   * Get a specific snapshot by version (1-indexed).
   */
  getSnapshot(
    piId: string,
    version: number,
    principal: WSJFPrincipal,
  ): PISnapshot | undefined {
    const all = this.getSnapshots(piId, principal);
    return all.find(s => s.snapshotVersion === version);
  }

  // ── Diff ────────────────────────────────────────────────────────────────────

  /**
   * Compute a structured diff between two snapshot versions.
   */
  diffPI(
    piId: string,
    fromVersion: number,
    toVersion: number,
    principal: WSJFPrincipal,
  ): PIDiff {
    const from = this.getSnapshot(piId, fromVersion, principal);
    const to   = this.getSnapshot(piId, toVersion, principal);

    if (!from) throw new Error(`Snapshot v${fromVersion} not found for PI '${piId}'`);
    if (!to)   throw new Error(`Snapshot v${toVersion} not found for PI '${piId}'`);

    const fromMap = new Map(from.items.map(i => [i.id, i]));
    const toMap   = new Map(to.items.map(i => [i.id, i]));

    const added: FederatedWSJFItem[] = [];
    const removed: string[] = [];
    const changed: PIDiff['changed'] = [];

    for (const [id, item] of toMap) {
      if (!fromMap.has(id)) {
        added.push(item);
      } else {
        const before = fromMap.get(id)!;
        const delta  = item.wsjf.score - before.wsjf.score;
        if (Math.abs(delta) > 1e-9) {
          changed.push({ id, before: before.wsjf, after: item.wsjf, delta });
        }
      }
    }

    for (const id of fromMap.keys()) {
      if (!toMap.has(id)) removed.push(id);
    }

    return {
      piId,
      fromVersion,
      toVersion,
      added,
      removed,
      changed,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  /**
   * Export a snapshot as a JSON string.
   */
  exportJSON(
    piId: string,
    version: number,
    principal: WSJFPrincipal,
  ): string {
    wsjfRbac.assertTenantAction(principal, principal.tenantId, 'export:pi', piId);
    const snapshot = this.getSnapshot(piId, version, principal);
    if (!snapshot) throw new Error(`Snapshot v${version} not found for PI '${piId}'`);
    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * Export a snapshot as a minimal YAML string (no external dependency).
   */
  exportYAML(
    piId: string,
    version: number,
    principal: WSJFPrincipal,
  ): string {
    wsjfRbac.assertTenantAction(principal, principal.tenantId, 'export:pi', piId);
    const snapshot = this.getSnapshot(piId, version, principal);
    if (!snapshot) throw new Error(`Snapshot v${version} not found for PI '${piId}'`);
    return this.toYAML(snapshot as unknown as Record<string, unknown>);
  }

  /**
   * Verify snapshot integrity via checksum.
   */
  verifyChecksum(snapshot: PISnapshot): boolean {
    const expected = this.computeChecksum(snapshot.items);
    return expected === snapshot.checksum;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private computeChecksum(items: FederatedWSJFItem[]): string {
    const sorted = [...items]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(i => `${i.id}:${i.wsjf.score.toFixed(6)}`)
      .join('|');
    return crypto.createHash('sha256').update(sorted).digest('hex');
  }

  private cloneItems(items: FederatedWSJFItem[]): FederatedWSJFItem[] {
    return items.map(i => ({ ...i, wsjf: { ...i.wsjf } }));
  }

  /** Minimal recursive YAML serializer (avoids adding yaml dependency). */
  private toYAML(obj: unknown, indent = 0): string {
    const pad = '  '.repeat(indent);
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'string')  return `"${obj.replace(/"/g, '\\"')}"`;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj.map(v => `${pad}- ${this.toYAML(v, indent + 1)}`).join('\n');
    }
    if (typeof obj === 'object') {
      const rec = obj as Record<string, unknown>;
      return Object.entries(rec)
        .map(([k, v]) => {
          const valStr = this.toYAML(v, indent + 1);
          const multiline = valStr.includes('\n');
          return multiline
            ? `${pad}${k}:\n${valStr}`
            : `${pad}${k}: ${valStr}`;
        })
        .join('\n');
    }
    return String(obj);
  }
}

export const piSyncManager = new PISyncManager();
