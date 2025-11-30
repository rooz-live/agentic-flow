/**
 * @file VSCode Mock for Jest Tests
 * @description Provides mock implementations of vscode module for testing
 */

export class TelemetryLogger {
  logUsage = jest.fn();
  logError = jest.fn();
  dispose = jest.fn();
}

export const env = {
  createTelemetryLogger: jest.fn(() => new TelemetryLogger()),
  machineId: 'test-machine-id',
  sessionId: 'test-session-id',
  uriScheme: 'vscode',
  language: 'en',
};

export const window = {
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    append: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    name: 'Test Output Channel',
  })),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showQuickPick: jest.fn(),
  showInputBox: jest.fn(),
  createStatusBarItem: jest.fn(() => ({
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    text: '',
    tooltip: '',
  })),
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
    update: jest.fn(),
    has: jest.fn(() => false),
    inspect: jest.fn(),
  })),
  workspaceFolders: [],
  onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  onDidSaveTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
    readDirectory: jest.fn(),
  },
};

export const Uri = {
  file: jest.fn((path: string) => ({ fsPath: path, path, scheme: 'file' })),
  parse: jest.fn((str: string) => ({ fsPath: str, path: str, scheme: 'file' })),
  joinPath: jest.fn((...args: any[]) => ({ fsPath: args.join('/'), path: args.join('/') })),
};

export const ExtensionMode = {
  Production: 1,
  Development: 2,
  Test: 3,
};

export const commands = {
  registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
  executeCommand: jest.fn(),
};

export const EventEmitter = class {
  event = jest.fn();
  fire = jest.fn();
  dispose = jest.fn();
};

export const Disposable = {
  from: jest.fn((..._disposables: any[]) => ({ dispose: jest.fn() })),
};

export default {
  TelemetryLogger,
  env,
  window,
  workspace,
  Uri,
  ExtensionMode,
  commands,
  EventEmitter,
  Disposable,
};

