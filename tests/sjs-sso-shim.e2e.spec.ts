import { test, expect } from '@playwright/test';
import { SJSSSOAdapterShim, IDatabaseClient, WordPressUser, FlarumUser } from '../src/integrations/adapters/sjs-sso-shim';

class MockDatabaseClient implements IDatabaseClient {
  public users: any[] = [];
  public meta: Record<number, Record<string, string>> = {};
  public groups: Record<number, number[]> = {};
  public lastExecutedSql: string = '';
  public lastExecutedParams: any[] = [];

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    if (sql.includes('wp_users')) {
      const val = params?.[0];
      const found = this.users.find(u => u.user_email === val || u.user_login === val);
      return found ? [found as any as T] : [];
    }
    if (sql.includes('wp_usermeta')) {
      const userId = params?.[0];
      const metaKey = sql.includes('wp_capabilities') ? 'wp_capabilities' : (params?.[1] || '');
      const val = this.meta[userId]?.[metaKey];
      return val ? [{ meta_value: val } as any as T] : [];
    }
    if (sql.includes('flarum_users')) {
      const email = params?.[0];
      const found = this.users.find(u => u.email === email);
      return found ? [found as any as T] : [];
    }
    if (sql.includes('flarum_user_group')) {
      const userId = params?.[0];
      const userGroups = this.groups[userId] || [];
      return userGroups.map(g => ({ group_id: g })) as any as T[];
    }
    return [];
  }

  async queryOne<T>(sql: string, params?: any[]): Promise<T | undefined> {
    const results = await this.query<T>(sql, params);
    return results[0];
  }


  async execute(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
    this.lastExecutedSql = sql;
    this.lastExecutedParams = params || [];

    if (sql.includes('INSERT INTO flarum_users')) {
      const [username, email, passwordHash, joinedAt] = params || [];
      const newId = this.users.length + 1;
      const newUser = { id: newId, username, email, password: passwordHash, joined_at: joinedAt };
      this.users.push(newUser);
      return { lastID: newId, changes: 1 };
    }

    if (sql.includes('INSERT INTO flarum_user_group')) {
      const [userId, groupId] = params || [];
      if (!this.groups[userId]) {
        this.groups[userId] = [];
      }
      this.groups[userId].push(groupId);
      return { lastID: 1, changes: 1 };
    }

    if (sql.includes('DELETE FROM flarum_user_group')) {
      const [userId] = params || [];
      this.groups[userId] = [];
      return { lastID: 1, changes: 1 };
    }

    if (sql.includes('UPDATE flarum_users')) {
      const [passwordHash, userId] = params || [];
      const user = this.users.find(u => u.id === userId);
      if (user) {
        user.password = passwordHash;
      }
      return { lastID: userId, changes: 1 };
    }

    return { lastID: 0, changes: 0 };
  }
}

test.describe('SummerJobSwap SSO Adapter Shim', () => {
  const SECRET = 'test-jwt-secret-key-12345';
  let wpDb: MockDatabaseClient;
  let flarumDb: MockDatabaseClient;
  let shim: SJSSSOAdapterShim;

  test.beforeEach(() => {
    wpDb = new MockDatabaseClient();
    flarumDb = new MockDatabaseClient();
    shim = new SJSSSOAdapterShim(wpDb, flarumDb, SECRET);

    // Seed WordPress DB with a user
    wpDb.users.push({
      id: 42,
      user_login: 'john_doe',
      user_email: 'john@example.com',
      user_pass: 'securepassword',
      display_name: 'John Doe',
    });

    // Seed roles in usermeta
    wpDb.meta[42] = {
      'wp_capabilities': 'a:1:{s:13:"administrator";b:1;}',
    };
  });

  test('should authenticate and auto-provision user on Flarum', async () => {
    const session = await shim.authenticateUser('john@example.com', 'securepassword');

    expect(session.userId).toBe('wp-42');
    expect(session.username).toBe('john_doe');
    expect(session.email).toBe('john@example.com');
    expect(session.roles).toContain('administrator');
    expect(session.token).toBeDefined();

    // Verify Flarum DB has the user provisioned
    const provisionedUser = flarumDb.users.find(u => u.email === 'john@example.com');
    expect(provisionedUser).toBeDefined();
    expect(provisionedUser?.username).toBe('john_doe');

    // Groups check: mapped administrator role (1) and member default (2)
    const userGroups = flarumDb.groups[provisionedUser?.id];
    expect(userGroups).toContain(1);
    expect(userGroups).toContain(2);
  });

  test('should verify active session token successfully', async () => {
    const session = await shim.authenticateUser('john_doe', 'securepassword');
    const decoded = await shim.verifySession(session.token);

    expect(decoded.username).toBe('john_doe');
    expect(decoded.email).toBe('john@example.com');
    expect(decoded.groups).toContain(1);
    expect(decoded.groups).toContain(2);
  });

  test('should fail authentication for invalid password', async () => {
    await expect(shim.authenticateUser('john_doe', 'wrongpassword')).rejects.toThrow('ERR_INVALID_CREDENTIALS');
  });

  test('should fail authentication for non-existent user', async () => {
    await expect(shim.authenticateUser('not_exist', 'password')).rejects.toThrow('ERR_USER_NOT_FOUND');
  });
});
