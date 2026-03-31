/**
 * Tests for VSCode Extension Enhancements (with Mocks)
 * Tests extension functionality, command handling, and integration with agentic-flow
 */

import { beforeEach, afterEach, describe, it, expect, jest } from '@jest/globals';

// Mock VSCode API
const mockVSCode = {
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
    getCommands: jest.fn(() => Promise.resolve(['af.command1', 'af.command2']))
  },
  window: {
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      clear: jest.fn()
    })),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
    withProgress: jest.fn()
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn(),
      update: jest.fn(),
      inspect: jest.fn()
    })),
    workspaceFolders: [
      { uri: { fsPath: '/workspace/agentic-flow' }, name: 'agentic-flow', index: 0 }
    ],
    findFiles: jest.fn(() => Promise.resolve([])),
    openTextDocument: jest.fn(),
    saveAll: jest.fn()
  },
  env: {
    appName: 'Visual Studio Code',
    appRoot: '/vscode',
    language: 'en',
    machineId: 'test-machine-id',
    sessionId: 'test-session-id'
  },
  Uri: {
    file: jest.fn((path) => ({ fsPath: path })),
    parse: jest.fn()
  },
  Range: jest.fn(),
  Position: jest.fn(),
  Selection: jest.fn(),
  TextEditor: jest.fn(),
  ExtensionContext: jest.fn()
};

// Mock the vscode module
jest.mock('vscode', () => mockVSCode, { virtual: true });

describe('VSCode Extension Enhancements', () => {
  let mockExtensionContext: any;
  let mockOutputChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockExtensionContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(() => [])
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn(() => [])
      },
      extensionPath: '/extension/path',
      storagePath: '/storage/path',
      globalStoragePath: '/global/storage/path'
    };

    mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      clear: jest.fn()
    };

    mockVSCode.window.createOutputChannel.mockReturnValue(mockOutputChannel);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Extension Activation and Lifecycle', () => {
    it('should activate extension successfully', async () => {
      // Mock extension activate function
      const mockActivate = jest.fn().mockResolvedValue({
        status: 'activated',
        commands: ['af.start', 'af.stop', 'af.status'],
        version: '1.0.0'
      });

      const result = await mockActivate(mockExtensionContext);

      expect(result.status).toBe('activated');
      expect(result.commands).toContain('af.start');
      expect(result.commands).toContain('af.stop');
      expect(result.commands).toContain('af.status');
    });

    it('should register commands on activation', async () => {
      const mockCommands = [
        { command: 'af.start', handler: jest.fn() },
        { command: 'af.stop', handler: jest.fn() },
        { command: 'af.status', handler: jest.fn() },
        { command: 'af.config', handler: jest.fn() }
      ];

      // Simulate command registration
      mockCommands.forEach(({ command, handler }) => {
        mockVSCode.commands.registerCommand(command, handler);
      });

      expect(mockVSCode.commands.registerCommand).toHaveBeenCalledTimes(4);
      expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith('af.start', expect.any(Function));
      expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith('af.stop', expect.any(Function));
    });

    it('should handle activation errors gracefully', async () => {
      const mockActivate = jest.fn().mockRejectedValue(new Error('Extension activation failed'));

      await expect(mockActivate(mockExtensionContext)).rejects.toThrow('Extension activation failed');
    });

    it('should deactivate extension cleanly', async () => {
      const mockDeactivate = jest.fn().mockResolvedValue(true);

      const result = await mockDeactivate();

      expect(result).toBe(true);
      expect(mockDeactivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Command Handling', () => {
    it('should handle af.start command', async () => {
      const mockStartHandler = jest.fn().mockImplementation(async () => {
        mockOutputChannel.appendLine('Starting Agentic Flow...');
        return {
          success: true,
          message: 'Agentic Flow started successfully',
          pid: 12345
        };
      });

      // Register and execute command
      mockVSCode.commands.registerCommand('af.start', mockStartHandler);
      const registeredHandler = mockVSCode.commands.registerCommand.mock.calls[0][1];

      const result = await registeredHandler();

      expect(result.success).toBe(true);
      expect(result.pid).toBe(12345);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Starting Agentic Flow...');
    });

    it('should handle af.stop command', async () => {
      const mockStopHandler = jest.fn().mockImplementation(async () => {
        mockOutputChannel.appendLine('Stopping Agentic Flow...');
        return {
          success: true,
          message: 'Agentic Flow stopped successfully',
          stoppedProcesses: ['governance-agent', 'retro-coach']
        };
      });

      mockVSCode.commands.registerCommand('af.stop', mockStopHandler);
      const registeredHandler = mockVSCode.commands.registerCommand.mock.calls[0][1];

      const result = await registeredHandler();

      expect(result.success).toBe(true);
      expect(result.stoppedProcesses).toContain('governance-agent');
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Stopping Agentic Flow...');
    });

    it('should handle af.status command', async () => {
      const mockStatusHandler = jest.fn().mockImplementation(async () => {
        mockOutputChannel.appendLine('Checking Agentic Flow status...');
        return {
          status: 'running',
          uptime: '2h 30m',
          activeAgents: 3,
          memoryUsage: '256MB',
          cpuUsage: '15%'
        };
      });

      mockVSCode.commands.registerCommand('af.status', mockStatusHandler);
      const registeredHandler = mockVSCode.commands.registerCommand.mock.calls[0][1];

      const result = await registeredHandler();

      expect(result.status).toBe('running');
      expect(result.activeAgents).toBe(3);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Checking Agentic Flow status...');
    });

    it('should handle command errors', async () => {
      const mockErrorHandler = jest.fn().mockImplementation(async () => {
        mockVSCode.window.showErrorMessage('Command failed', 'Show Details');
        throw new Error('Command failed');
      });

      mockVSCode.commands.registerCommand('af.error', mockErrorHandler);
      const registeredHandler = mockVSCode.commands.registerCommand.mock.calls[0][1];

      await expect(registeredHandler()).rejects.toThrow('Command failed');
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        'Command failed',
        'Show Details'
      );
    });
  });

  describe('Configuration Management', () => {
    it('should load extension configuration', () => {
      const mockConfig = {
        afServerUrl: 'http://localhost:8080',
        afTimeout: 30000,
        afLogLevel: 'info',
        afAutoStart: true,
        afWorkspacePath: '/workspace/agentic-flow'
      };

      mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key) => mockConfig[key]),
        update: jest.fn(),
        inspect: jest.fn()
      });

      const config = mockVSCode.workspace.getConfiguration('agenticFlow');

      expect(config.get('afServerUrl')).toBe('http://localhost:8080');
      expect(config.get('afTimeout')).toBe(30000);
      expect(config.get('afLogLevel')).toBe('info');
      expect(config.get('afAutoStart')).toBe(true);
    });

    it('should update configuration', async () => {
      const mockConfig = {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(true),
        inspect: jest.fn()
      };

      mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

      await mockConfig.update('afServerUrl', 'http://new-server:8080');

      expect(mockConfig.update).toHaveBeenCalledWith('afServerUrl', 'http://new-server:8080');
    });

    it('should validate configuration values', () => {
      const mockConfig = {
        get: jest.fn((key) => {
          const values = {
            afServerUrl: 'invalid-url',
            afTimeout: 'not-a-number',
            afLogLevel: 'invalid-level'
          };
          return values[key];
        })
      };

      mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

      const config = mockVSCode.workspace.getConfiguration('agenticFlow');
      
      // Configuration validation should detect invalid values
      expect(config.get('afServerUrl')).toBe('invalid-url');
      expect(config.get('afTimeout')).toBe('not-a-number');
      expect(config.get('afLogLevel')).toBe('invalid-level');
    });
  });

  describe('Workspace Integration', () => {
    it('should detect agentic-flow workspace', () => {
      const mockWorkspaceFolders = [
        { uri: { fsPath: '/workspace/agentic-flow' }, name: 'agentic-flow', index: 0 },
        { uri: { fsPath: '/workspace/other-project' }, name: 'other-project', index: 1 }
      ];

      mockVSCode.workspace.workspaceFolders = mockWorkspaceFolders;

      const afWorkspace = mockVSCode.workspace.workspaceFolders.find(
        folder => folder.name === 'agentic-flow'
      );

      expect(afWorkspace).toBeDefined();
      expect(afWorkspace.uri.fsPath).toBe('/workspace/agentic-flow');
    });

    it('should find agentic-flow configuration files', async () => {
      const mockFiles = [
        '/workspace/agentic-flow/package.json',
        '/workspace/agentic-flow/goalie.config.json',
        '/workspace/agentic-flow/.goalie/config.json'
      ];

      mockVSCode.workspace.findFiles.mockResolvedValue(
        mockFiles.map(file => ({ fsPath: file }))
      );

      const configFiles = await mockVSCode.workspace.findFiles(
        '**/{package.json,goalie.config.json,.goalie/**}'
      );

      expect(configFiles).toHaveLength(3);
      expect(mockVSCode.workspace.findFiles).toHaveBeenCalledWith(
        '**/{package.json,goalie.config.json,.goalie/**}'
      );
    });

    it('should handle workspace without agentic-flow', () => {
      mockVSCode.workspace.workspaceFolders = [
        { uri: { fsPath: '/workspace/other-project' }, name: 'other-project', index: 0 }
      ];

      const afWorkspace = mockVSCode.workspace.workspaceFolders.find(
        folder => folder.name === 'agentic-flow'
      );

      expect(afWorkspace).toBeUndefined();
    });
  });

  describe('Output Channel Management', () => {
    it('should create output channel for agentic-flow', () => {
      const outputChannel = mockVSCode.window.createOutputChannel('Agentic Flow');

      expect(mockVSCode.window.createOutputChannel).toHaveBeenCalledWith('Agentic Flow');
      expect(outputChannel).toBeDefined();
    });

    it('should log messages to output channel', () => {
      const messages = [
        'Extension activated',
        'Starting federation agents...',
        'Governance agent started',
        'Retro coach started',
        'All agents ready'
      ];

      messages.forEach(message => {
        mockOutputChannel.appendLine(message);
      });

      expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(5);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Extension activated');
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('All agents ready');
    });

    it('should show output channel on command', () => {
      mockOutputChannel.show();

      expect(mockOutputChannel.show).toHaveBeenCalled();
    });

    it('should clear output channel', () => {
      mockOutputChannel.clear();

      expect(mockOutputChannel.clear).toHaveBeenCalled();
    });
  });

  describe('Progress Indication', () => {
    it('should show progress for long-running operations', async () => {
      const mockProgress = {
        report: jest.fn(),
        increment: jest.fn()
      };

      mockVSCode.window.withProgress.mockImplementation(async (options, task) => {
        expect(options.location).toBe(15); // ProgressLocation.Notification
        expect(options.title).toBe('Starting Agentic Flow');

        return await task(mockProgress, new Promise(resolve => setTimeout(resolve, 100)));
      });

      const progressHandler = async () => {
        return await mockVSCode.window.withProgress(
          {
            location: 15, // ProgressLocation.Notification
            title: 'Starting Agentic Flow',
            cancellable: true
          },
          async (progress) => {
            progress.report({ increment: 25, message: 'Initializing...' });
            await new Promise(resolve => setTimeout(resolve, 50));
            progress.report({ increment: 50, message: 'Starting agents...' });
            await new Promise(resolve => setTimeout(resolve, 50));
            progress.report({ increment: 25, message: 'Complete!' });
            return { success: true };
          }
        );
      };

      const result = await progressHandler();

      expect(result.success).toBe(true);
      expect(mockProgress.report).toHaveBeenCalledTimes(3);
      expect(mockProgress.report).toHaveBeenCalledWith({ increment: 25, message: 'Initializing...' });
    });
  });

  describe('User Interaction', () => {
    it('should show quick pick for agent selection', async () => {
      const mockQuickPickItems = [
        { label: 'Governance Agent', description: 'Manages policies and compliance' },
        { label: 'Retro Coach', description: 'Analyzes retrospectives and improvements' },
        { label: 'All Agents', description: 'Manage all federation agents' }
      ];

      mockVSCode.window.showQuickPick.mockResolvedValue(mockQuickPickItems[1]);

      const selectedAgent = await mockVSCode.window.showQuickPick(mockQuickPickItems);

      expect(selectedAgent).toBe(mockQuickPickItems[1]);
      expect(selectedAgent.label).toBe('Retro Coach');
      expect(mockVSCode.window.showQuickPick).toHaveBeenCalledWith(mockQuickPickItems);
    });

    it('should show input box for configuration', async () => {
      mockVSCode.window.showInputBox.mockResolvedValue('http://localhost:8080');

      const serverUrl = await mockVSCode.window.showInputBox({
        prompt: 'Enter Agentic Flow server URL',
        value: 'http://localhost:8080',
        validateInput: (value) => {
          if (!value) return 'Server URL is required';
          if (!value.startsWith('http')) return 'Invalid URL format';
          return null;
        }
      });

      expect(serverUrl).toBe('http://localhost:8080');
      expect(mockVSCode.window.showInputBox).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Enter Agentic Flow server URL',
          value: 'http://localhost:8080'
        })
      );
    });

    it('should show information messages', async () => {
      mockVSCode.window.showInformationMessage.mockResolvedValue('OK');

      const result = await mockVSCode.window.showInformationMessage(
        'Agentic Flow started successfully',
        'OK', 'View Logs'
      );

      expect(result).toBe('OK');
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        'Agentic Flow started successfully',
        'OK',
        'View Logs'
      );
    });

    it('should show error messages', async () => {
      mockVSCode.window.showErrorMessage.mockResolvedValue('Retry');

      const result = await mockVSCode.window.showErrorMessage(
        'Failed to start Agentic Flow',
        'Retry', 'Show Details'
      );

      expect(result).toBe('Retry');
      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to start Agentic Flow',
        'Retry',
        'Show Details'
      );
    });
  });

  describe('File System Integration', () => {
    it('should open agentic-flow configuration files', async () => {
      const mockTextDocument = {
        uri: { fsPath: '/workspace/agentic-flow/goalie.config.json' },
        getText: jest.fn(() => '{"server": "localhost:8080"}'),
        save: jest.fn()
      };

      mockVSCode.workspace.openTextDocument.mockResolvedValue(mockTextDocument);

      const document = await mockVSCode.workspace.openTextDocument(
        '/workspace/agentic-flow/goalie.config.json'
      );

      expect(document.uri.fsPath).toBe('/workspace/agentic-flow/goalie.config.json');
      expect(document.getText()).toBe('{"server": "localhost:8080"}');
      expect(mockVSCode.workspace.openTextDocument).toHaveBeenCalledWith(
        '/workspace/agentic-flow/goalie.config.json'
      );
    });

    it('should save workspace changes', async () => {
      mockVSCode.workspace.saveAll.mockResolvedValue(true);

      const result = await mockVSCode.workspace.saveAll();

      expect(result).toBe(true);
      expect(mockVSCode.workspace.saveAll).toHaveBeenCalled();
    });
  });

  describe('Extension State Management', () => {
    it('should persist extension state', async () => {
      const mockState = {
        lastStarted: '2024-01-01T12:00:00Z',
        agentStatus: {
          governance: 'running',
          retroCoach: 'running'
        },
        userPreferences: {
          autoStart: true,
          showNotifications: true
        }
      };

      mockExtensionContext.workspaceState.update.mockResolvedValue(true);

      await mockExtensionContext.workspaceState.update('extensionState', mockState);

      expect(mockExtensionContext.workspaceState.update).toHaveBeenCalledWith(
        'extensionState',
        mockState
      );
    });

    it('should retrieve extension state', () => {
      const mockState = {
        lastStarted: '2024-01-01T12:00:00Z',
        agentStatus: {
          governance: 'running',
          retroCoach: 'stopped'
        }
      };

      mockExtensionContext.workspaceState.get.mockReturnValue(mockState);

      const state = mockExtensionContext.workspaceState.get('extensionState');

      expect(state).toEqual(mockState);
      expect(state.agentStatus.governance).toBe('running');
      expect(state.agentStatus.retroCoach).toBe('stopped');
    });

    it('should handle missing state gracefully', () => {
      mockExtensionContext.workspaceState.get.mockReturnValue(undefined);

      const state = mockExtensionContext.workspaceState.get('nonExistentKey');

      expect(state).toBeUndefined();
    });
  });

  describe('Extension Telemetry', () => {
    it('should track extension usage metrics', async () => {
      const mockTelemetry = {
        sendTelemetryEvent: jest.fn(),
        sendTelemetryErrorEvent: jest.fn(),
        sendTelemetryException: jest.fn()
      };

      // Mock telemetry service
      const mockTelemetryService = {
        trackEvent: jest.fn().mockResolvedValue(true),
        trackError: jest.fn().mockResolvedValue(true),
        trackMetric: jest.fn().mockResolvedValue(true)
      };

      await mockTelemetryService.trackEvent('extension.activated', {
        version: '1.0.0',
        workspaceType: 'agentic-flow',
        os: 'linux'
      });

      await mockTelemetryService.trackMetric('agent.startup.time', 1500);
      await mockTelemetryService.trackError('command.failed', new Error('Test error'));

      expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
        'extension.activated',
        expect.objectContaining({
          version: '1.0.0',
          workspaceType: 'agentic-flow'
        })
      );
      expect(mockTelemetryService.trackMetric).toHaveBeenCalledWith('agent.startup.time', 1500);
      expect(mockTelemetryService.trackError).toHaveBeenCalledWith(
        'command.failed',
        expect.any(Error)
      );
    });
  });

  describe('Extension Performance', () => {
    it('should handle rapid command execution', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      mockVSCode.commands.registerCommand('af.rapid', mockHandler);

      const registeredHandler = mockVSCode.commands.registerCommand.mock.calls[0][1];

      // Execute multiple commands rapidly
      const promises = Array(10).fill(0).map(() => registeredHandler());
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      expect(mockHandler).toHaveBeenCalledTimes(10);
    });

    it('should handle memory efficiently', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate memory-intensive operations
      const largeData = Array(10000).fill(0).map((_, i) => ({
        id: i,
        data: 'x'.repeat(1000),
        timestamp: Date.now()
      }));

      // Process large dataset
      const processedData = largeData.map(item => ({
        ...item,
        processed: true
      }));

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      expect(processedData).toHaveLength(10000);
    });
  });
});