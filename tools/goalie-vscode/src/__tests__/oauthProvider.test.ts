import { GoalieAuthSession, GoalieOAuthProvider, OAuthDomain, registerOAuthCommands } from '../oauthProvider';

// Mock VS Code API
const mockEventEmitter = {
  event: jest.fn(),
  fire: jest.fn(),
  dispose: jest.fn(),
};

const mockGlobalState = {
  get: jest.fn(),
  update: jest.fn(),
};

const mockExtensionContext = {
  subscriptions: [],
  globalState: mockGlobalState,
  extensionPath: '/mock/extension/path',
  extensionUri: { fsPath: '/mock/extension/path' },
  storagePath: '/mock/storage/path',
  globalStoragePath: '/mock/global/storage/path',
  logPath: '/mock/log/path',
  extensionMode: 1,
  workspaceState: { get: jest.fn(), update: jest.fn() },
  secrets: { get: jest.fn(), store: jest.fn(), delete: jest.fn() },
};

const mockConfiguration = {
  get: jest.fn((key: string, defaultValue?: unknown) => {
    if (key === 'oauth.domain') return defaultValue ?? 'rooz.live';
    return defaultValue;
  }),
  update: jest.fn(),
  has: jest.fn(),
  inspect: jest.fn(),
};

jest.mock('vscode', () => ({
  EventEmitter: jest.fn(() => mockEventEmitter),
  window: {
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    })),
    showQuickPick: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      text: '',
      tooltip: '',
      command: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
    createWebviewPanel: jest.fn(() => ({
      webview: { html: '' },
      dispose: jest.fn(),
      onDidDispose: jest.fn(),
    })),
  },
  workspace: {
    getConfiguration: jest.fn(() => mockConfiguration),
  },
  commands: {
    registerCommand: jest.fn((command: string, callback: () => void) => ({
      dispose: jest.fn(),
    })),
    executeCommand: jest.fn(),
  },
  env: {
    openExternal: jest.fn(() => Promise.resolve(true)),
  },
  Uri: {
    parse: jest.fn((uri: string) => ({ toString: () => uri })),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  ThemeIcon: jest.fn(),
  ThemeColor: jest.fn(),
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}), { virtual: true });

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn((size: number) => ({
    toString: (encoding: string) => 'mock-random-string-' + size,
  })),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => ({
      toString: (encoding: string) => 'mock-hash-digest',
    })),
  })),
}));

// Mock http
jest.mock('http', () => ({
  createServer: jest.fn(() => ({
    listen: jest.fn((port: number, host: string, callback: () => void) => {
      callback?.();
    }),
    close: jest.fn(),
    on: jest.fn(),
  })),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GoalieOAuthProvider', () => {
  let provider: GoalieOAuthProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalState.get.mockReturnValue({});
    mockGlobalState.update.mockResolvedValue(undefined);
    provider = new GoalieOAuthProvider(mockExtensionContext as any);
  });

  afterEach(() => {
    provider.dispose();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(provider).toBeDefined();
    });
  });

  describe('getConfiguredDomain', () => {
    it('should return the configured OAuth domain', () => {
      const domain = provider.getConfiguredDomain();
      expect(domain).toBe('rooz.live');
    });

    it('should return default domain when not configured', () => {
      // The implementation uses config.get('oauth.domain', 'rooz.live')
      // so VS Code returns the default value when setting is undefined
      const domain = provider.getConfiguredDomain();
      // Default is 'rooz.live' as specified in the implementation
      expect(domain).toBe('rooz.live');
    });
  });

  describe('getDomainConfig', () => {
    it('should return config for 720.chat', () => {
      const config = provider.getDomainConfig('720.chat');
      expect(config.domain).toBe('720.chat');
      expect(config.displayName).toBe('720 Chat');
      expect(config.scopes).toContain('openid');
      expect(config.scopes).toContain('goalie:read');
    });

    it('should return config for rooz.live', () => {
      const config = provider.getDomainConfig('rooz.live');
      expect(config.domain).toBe('rooz.live');
      expect(config.displayName).toBe('Rooz Live');
      expect(config.scopes).toContain('live:access');
    });

    it('should return config for artchat.art', () => {
      const config = provider.getDomainConfig('artchat.art');
      expect(config.domain).toBe('artchat.art');
      expect(config.displayName).toBe('ArtChat');
    });

    it('should return config for chatfans.fans', () => {
      const config = provider.getDomainConfig('chatfans.fans');
      expect(config.domain).toBe('chatfans.fans');
      expect(config.displayName).toBe('ChatFans');
    });

    it('should return config for decisioncall.com', () => {
      const config = provider.getDomainConfig('decisioncall.com');
      expect(config.domain).toBe('decisioncall.com');
      expect(config.displayName).toBe('DecisionCall');
      expect(config.scopes).toContain('decisions:read');
    });
  });

  describe('getSupportedDomains', () => {
    it('should return all supported domains', () => {
      const domains = provider.getSupportedDomains();
      expect(domains).toHaveLength(7);
      expect(domains.map(d => d.domain)).toContain('720.chat');
      expect(domains.map(d => d.domain)).toContain('artchat.art');
      expect(domains.map(d => d.domain)).toContain('chatfans.fans');
      expect(domains.map(d => d.domain)).toContain('decisioncall.com');
      expect(domains.map(d => d.domain)).toContain('o-gov.com');
      expect(domains.map(d => d.domain)).toContain('rooz.live');
      expect(domains.map(d => d.domain)).toContain('tag.vote');
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no session exists', async () => {
      mockGlobalState.get.mockReturnValue({});
      const isAuth = await provider.isAuthenticated();
      expect(isAuth).toBe(false);
    });

    it('should return true when valid session exists', async () => {
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      mockGlobalState.get.mockReturnValue({
        'rooz.live': {
          domain: 'rooz.live',
          accessToken: 'test-token',
          expiresAt: futureExpiry,
        },
      });

      const isAuth = await provider.isAuthenticated('rooz.live');
      expect(isAuth).toBe(true);
    });

    it('should return false when session is expired', async () => {
      const pastExpiry = Date.now() - 3600000; // 1 hour ago
      mockGlobalState.get.mockReturnValue({
        'rooz.live': {
          domain: 'rooz.live',
          accessToken: 'test-token',
          expiresAt: pastExpiry,
        },
      });

      const isAuth = await provider.isAuthenticated('rooz.live');
      expect(isAuth).toBe(false);
    });

    it('should check configured domain when no domain specified', async () => {
      const isAuth = await provider.isAuthenticated();
      expect(mockConfiguration.get).toHaveBeenCalledWith('oauth.domain', 'rooz.live');
    });
  });

  describe('getSession', () => {
    it('should return undefined when no session exists', async () => {
      mockGlobalState.get.mockReturnValue({});
      const session = await provider.getSession('rooz.live');
      expect(session).toBeUndefined();
    });

    it('should return session when valid', async () => {
      const futureExpiry = Date.now() + 3600000;
      const mockSession: GoalieAuthSession = {
        domain: 'rooz.live',
        accessToken: 'test-token',
        expiresAt: futureExpiry,
        userInfo: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          domain: 'rooz.live',
        },
      };

      mockGlobalState.get.mockReturnValue({
        'rooz.live': mockSession,
      });

      const session = await provider.getSession('rooz.live');
      expect(session).toEqual(mockSession);
    });

    it('should attempt token refresh when session expired with refresh token', async () => {
      const pastExpiry = Date.now() - 3600000;
      mockGlobalState.get.mockReturnValue({
        'rooz.live': {
          domain: 'rooz.live',
          accessToken: 'expired-token',
          refreshToken: 'refresh-token',
          expiresAt: pastExpiry,
        },
      });

      // Mock failed refresh
      mockFetch.mockRejectedValueOnce(new Error('Refresh failed'));

      const session = await provider.getSession('rooz.live');
      expect(session).toBeUndefined();
    });
  });

  describe('clearSession', () => {
    it('should clear session for specified domain', async () => {
      mockGlobalState.get.mockReturnValue({
        'rooz.live': { domain: 'rooz.live', accessToken: 'token' },
        '720.chat': { domain: '720.chat', accessToken: 'token2' },
      });

      await provider.clearSession('rooz.live');

      expect(mockGlobalState.update).toHaveBeenCalled();
    });

    it('should clear session for configured domain when no domain specified', async () => {
      mockGlobalState.get.mockReturnValue({
        'rooz.live': { domain: 'rooz.live', accessToken: 'token' },
      });

      await provider.clearSession();

      expect(mockGlobalState.update).toHaveBeenCalled();
    });
  });

  describe('clearAllSessions', () => {
    it('should clear all sessions', async () => {
      mockGlobalState.get.mockReturnValue({
        'rooz.live': { domain: 'rooz.live', accessToken: 'token' },
        '720.chat': { domain: '720.chat', accessToken: 'token2' },
      });

      await provider.clearAllSessions();

      expect(mockGlobalState.update).toHaveBeenCalledWith(
        'goalie.oauth.sessions',
        {}
      );
    });
  });

  describe('createStatusBarItem', () => {
    it('should create a status bar item', () => {
      const statusBarItem = provider.createStatusBarItem();
      expect(statusBarItem).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should dispose resources', () => {
      expect(() => provider.dispose()).not.toThrow();
    });
  });
});

describe('registerOAuthCommands', () => {
  let provider: GoalieOAuthProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGlobalState.get.mockReturnValue({});
    provider = new GoalieOAuthProvider(mockExtensionContext as any);
  });

  afterEach(() => {
    provider.dispose();
  });

  it('should register all OAuth commands', () => {
    const vscode = require('vscode');
    registerOAuthCommands(mockExtensionContext as any, provider);

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'goalie.oauth.login',
      expect.any(Function)
    );
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'goalie.oauth.loginWithDomain',
      expect.any(Function)
    );
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'goalie.oauth.logout',
      expect.any(Function)
    );
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'goalie.oauth.showMenu',
      expect.any(Function)
    );
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'goalie.oauth.switchDomain',
      expect.any(Function)
    );
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'goalie.oauth.status',
      expect.any(Function)
    );
  });
});

describe('OAuthDomain type', () => {
  it('should accept valid domain strings', () => {
    const domains: OAuthDomain[] = [
      '720.chat',
      'artchat.art',
      'chatfans.fans',
      'decisioncall.com',
      'rooz.live',
    ];

    expect(domains).toHaveLength(5);
    domains.forEach(domain => {
      expect(typeof domain).toBe('string');
    });
  });
});

describe('GoalieAuthSession interface', () => {
  it('should accept valid session objects', () => {
    const session: GoalieAuthSession = {
      domain: 'rooz.live',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 3600000,
      userInfo: {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.png',
        domain: 'rooz.live',
      },
    };

    expect(session.domain).toBe('rooz.live');
    expect(session.accessToken).toBe('test-access-token');
    expect(session.userInfo?.email).toBe('user@example.com');
  });

  it('should accept session without optional fields', () => {
    const session: GoalieAuthSession = {
      domain: '720.chat',
      accessToken: 'test-token',
      expiresAt: Date.now() + 3600000,
    };

    expect(session.domain).toBe('720.chat');
    expect(session.refreshToken).toBeUndefined();
    expect(session.userInfo).toBeUndefined();
  });
});
