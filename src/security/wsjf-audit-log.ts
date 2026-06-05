/**
 * WSJF Audit Log
 *
 * Append-only audit trail persisted to .goalie/wsjf-audit.jsonl.
 * Each event is a newline-delimited JSON object (NDJSON).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { AuditEvent } from '../api/wsjf-shared-types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_AUDIT_PATH = path.resolve(
  process.env.WSJF_AUDIT_PATH ??
  path.join(process.cwd(), '.goalie', 'wsjf-audit.jsonl'),
);

// ─────────────────────────────────────────────────────────────────────────────
// Audit log writer
// ─────────────────────────────────────────────────────────────────────────────

export class WSJFAuditLog {
  private readonly auditPath: string;

  constructor(auditPath: string = DEFAULT_AUDIT_PATH) {
    this.auditPath = auditPath;
    this.ensureDirectory();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Append one audit event to the log file.
   * Synchronous to guarantee ordering; file is never truncated.
   */
  append(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): AuditEvent {
    const full: AuditEvent = {
      ...event,
      eventId: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    const line = JSON.stringify(full) + '\n';
    fs.appendFileSync(this.auditPath, line, { encoding: 'utf8', flag: 'a' });

    return full;
  }

  /**
   * Read all audit events for a given tenant (full scan — use sparingly).
   */
  readByTenant(tenantId: string): AuditEvent[] {
    return this.readAll().filter(e => e.tenantId === tenantId);
  }

  /**
   * Read all audit events for a given item.
   */
  readByItem(itemId: string): AuditEvent[] {
    return this.readAll().filter(e => e.itemId === itemId);
  }

  /**
   * Read all audit events for a given PI.
   */
  readByPI(piId: string): AuditEvent[] {
    return this.readAll().filter(e => e.piId === piId);
  }

  /**
   * Read all events within a time range.
   */
  readByRange(from: Date, to: Date): AuditEvent[] {
    return this.readAll().filter(e => {
      const ts = new Date(e.timestamp);
      return ts >= from && ts <= to;
    });
  }

  /**
   * Return the total number of logged events.
   */
  count(): number {
    return this.readAll().length;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private readAll(): AuditEvent[] {
    if (!fs.existsSync(this.auditPath)) return [];

    const raw = fs.readFileSync(this.auditPath, 'utf8');
    const events: AuditEvent[] = [];

    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        events.push(JSON.parse(trimmed) as AuditEvent);
      } catch {
        // Skip malformed lines — log is append-only, never repair
      }
    }

    return events;
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.auditPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private generateId(): string {
    return crypto.randomUUID();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience factory
// ─────────────────────────────────────────────────────────────────────────────

export const wsjfAuditLog = new WSJFAuditLog();

// ─────────────────────────────────────────────────────────────────────────────
// Typed helper builders
// ─────────────────────────────────────────────────────────────────────────────

export function auditItemScored(
  log: WSJFAuditLog,
  tenantId: string,
  userId: string,
  itemId: string,
  payload: Record<string, unknown>,
): AuditEvent {
  return log.append({ eventType: 'item.scored', tenantId, userId, itemId, payload });
}

export function auditPISnapshot(
  log: WSJFAuditLog,
  tenantId: string,
  userId: string,
  piId: string,
  payload: Record<string, unknown>,
): AuditEvent {
  return log.append({ eventType: 'pi.snapshot', tenantId, userId, piId, payload });
}

export function auditWeightsChanged(
  log: WSJFAuditLog,
  tenantId: string,
  userId: string,
  payload: Record<string, unknown>,
): AuditEvent {
  return log.append({ eventType: 'weights.changed', tenantId, userId, payload });
}
