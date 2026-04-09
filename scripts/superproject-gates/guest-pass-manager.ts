/**
 * Guest Pass Manager
 * Phase B: OAuth & Multi-Tenant Platform
 * 
 * Role-based guest access with admin controls
 * Roles: analyst, assessor, innovator, intuitive, orchestrator, seeker
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';

export type CircleRole = 
  | 'analyst'
  | 'assessor'
  | 'innovator'
  | 'intuitive'
  | 'orchestrator'
  | 'seeker';

export interface GuestPass {
  id: number;
  token: string;
  role: CircleRole;
  tenantId: string;
  expiresAt: number;
  createdBy?: string;
  createdAt: number;
  revokedAt?: number;
}

export interface GuestPassValidation {
  valid: boolean;
  pass?: GuestPass;
  error?: string;
}

export class GuestPassManager {
  private db: InstanceType<typeof Database> | null = null;

  constructor(private dbPath: string = './agentdb.db') {}

  /**
   * Initialize database and create guest_passes table
   */
  async initialize(db?: InstanceType<typeof Database>): Promise<void> {
    this.db = db || null;

    if (!this.db) {
      console.warn('No database provided, guest pass persistence disabled');
      return;
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS guest_passes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_by TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        revoked_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_guest_passes_token 
        ON guest_passes(token);
      CREATE INDEX IF NOT EXISTS idx_guest_passes_tenant 
        ON guest_passes(tenant_id, revoked_at);
      CREATE INDEX IF NOT EXISTS idx_guest_passes_expires 
        ON guest_passes(expires_at);
    `);
  }

  /**
   * Generate a new guest pass
   * @param role - Circle role for guest
   * @param durationSeconds - Pass validity duration (default: 24 hours)
   * @param tenantId - Tenant ID for isolation
   * @param createdBy - Admin user who created pass
   */
  async generateGuestPass(
    role: CircleRole,
    tenantId: string,
    durationSeconds: number = 24 * 60 * 60,
    createdBy?: string
  ): Promise<GuestPass> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.validateRole(role);

    const token = this.generateToken();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + durationSeconds;

    const result = this.db
      .prepare(`
        INSERT INTO guest_passes (token, role, tenant_id, expires_at, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(token, role, tenantId, expiresAt, createdBy || null, now);

    return {
      id: Number(result.lastInsertRowid),
      token,
      role,
      tenantId,
      expiresAt,
      createdBy,
      createdAt: now
    };
  }

  /**
   * Validate a guest pass token
   */
  async validateGuestPass(token: string): Promise<GuestPassValidation> {
    if (!this.db) {
      return { valid: false, error: 'Database not initialized' };
    }

    const row = this.db
      .prepare(`
        SELECT * FROM guest_passes WHERE token = ?
      `)
      .get(token) as any;

    if (!row) {
      return { valid: false, error: 'Invalid guest pass' };
    }

    // Check if revoked
    if (row.revoked_at) {
      return { valid: false, error: 'Guest pass revoked' };
    }

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (row.expires_at < now) {
      return { valid: false, error: 'Guest pass expired' };
    }

    const pass: GuestPass = {
      id: row.id,
      token: row.token,
      role: row.role as CircleRole,
      tenantId: row.tenant_id,
      expiresAt: row.expires_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      revokedAt: row.revoked_at
    };

    return { valid: true, pass };
  }

  /**
   * Revoke a guest pass
   */
  async revokeGuestPass(token: string): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const result = this.db
      .prepare(`
        UPDATE guest_passes 
        SET revoked_at = ? 
        WHERE token = ? AND revoked_at IS NULL
      `)
      .run(now, token);

    return (result.changes || 0) > 0;
  }

  /**
   * Revoke guest pass by ID
   */
  async revokeGuestPassById(passId: number): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const result = this.db
      .prepare(`
        UPDATE guest_passes 
        SET revoked_at = ? 
        WHERE id = ? AND revoked_at IS NULL
      `)
      .run(now, passId);

    return (result.changes || 0) > 0;
  }

  /**
   * List guest passes for a tenant
   */
  async listGuestPasses(tenantId: string, includeRevoked = false): Promise<GuestPass[]> {
    if (!this.db) {
      return [];
    }

    const query = includeRevoked
      ? `SELECT * FROM guest_passes WHERE tenant_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM guest_passes WHERE tenant_id = ? AND revoked_at IS NULL ORDER BY created_at DESC`;

    const rows = this.db.prepare(query).all(tenantId) as any[];

    return rows.map(row => ({
      id: row.id,
      token: row.token,
      role: row.role as CircleRole,
      tenantId: row.tenant_id,
      expiresAt: row.expires_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      revokedAt: row.revoked_at
    }));
  }

  /**
   * Clean up expired guest passes
   */
  async cleanupExpiredPasses(): Promise<number> {
    if (!this.db) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const result = this.db
      .prepare(`
        DELETE FROM guest_passes 
        WHERE expires_at < ? AND revoked_at IS NULL
      `)
      .run(now);

    return result.changes || 0;
  }

  /**
   * Get pass statistics for a tenant
   */
  async getPassStatistics(tenantId: string): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
  }> {
    if (!this.db) {
      return { total: 0, active: 0, expired: 0, revoked: 0 };
    }

    const now = Math.floor(Date.now() / 1000);

    const stats = this.db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN revoked_at IS NULL AND expires_at >= ? THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN revoked_at IS NULL AND expires_at < ? THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN revoked_at IS NOT NULL THEN 1 ELSE 0 END) as revoked
        FROM guest_passes
        WHERE tenant_id = ?
      `)
      .get(now, now, tenantId) as any;

    return {
      total: stats.total || 0,
      active: stats.active || 0,
      expired: stats.expired || 0,
      revoked: stats.revoked || 0
    };
  }

  // Private helpers

  private generateToken(): string {
    return `gpass_${crypto.randomBytes(32).toString('hex')}`;
  }

  private validateRole(role: string): void {
    const validRoles: CircleRole[] = [
      'analyst', 'assessor', 'innovator', 
      'intuitive', 'orchestrator', 'seeker'
    ];

    if (!validRoles.includes(role as CircleRole)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }
  }
}
