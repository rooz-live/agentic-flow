import * as path from 'path';
import * as fs from 'fs';
// Mock VSCode API for testing
const mockVscode = {
    window: {
        createOutputChannel: jest.fn().mockReturnValue({
            name: 'Test Output Channel',
            appendLine: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        }),
        createWebviewPanel: jest.fn().mockReturnValue({
            webview: {
                html: '',
                onDidReceiveMessage: jest.fn(),
                onDidDispose: jest.fn(),
                postMessage: jest.fn(),
                reveal: jest.fn()
            },
            onDidDispose: jest.fn()
        }),
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showQuickPick: jest.fn(),
        workspace: {
            getConfiguration: jest.fn().mockReturnValue({
                get: jest.fn(),
                update: jest.fn()
            }),
            workspaceFolders: [
                {
                    uri: { fsPath: path.join(__dirname, '..', '..', '..', '..', '..', '..', '..', '..', 'test-workspace') }
                }
            ]
        },
        commands: {
            registerCommand: jest.fn(),
            executeCommand: jest.fn()
        },
        Uri: {
            file: jest.fn((path) => ({ fsPath: path }))
        },
        ViewColumn: {
            One: 1,
            Beside: 2
        },
        TreeItem: jest.fn().mockImplementation((label, collapsibleState) => ({
            label,
            collapsibleState,
            tooltip: '',
            description: '',
            contextValue: '',
            iconPath: '',
            command: undefined
        })),
        TreeItemCollapsibleState: {
            None: 0,
            Collapsed: 1,
            Expanded: 2
        },
        ThemeIcon: jest.fn((id) => id),
        RelativePattern: jest.fn((pattern, base) => ({ pattern, base })),
        EventEmitter: jest.fn().mockImplementation(() => ({
            event: jest.fn(),
            fire: jest.fn()
        }))
    }
};
// Mock file system operations
const mockFileSystem = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn()
};
// Mock workspace state
const mockWorkspaceState = {
    get: jest.fn(),
    update: jest.fn()
};
// Mock global state
const mockGlobalState = {
    get: jest.fn(),
    update: jest.fn()
};
// Test workspace directory
const testWorkspaceDir = path.join(__dirname, '..', '..', '..', '..', '..', '..', '..', 'test-workspace');
const testGoalieDir = path.join(testWorkspaceDir, '.goalie');
// Ensure test directories exist
if (!fs.existsSync(testWorkspaceDir)) {
    fs.mkdirSync(testWorkspaceDir, { recursive: true });
}
if (!fs.existsSync(testGoalieDir)) {
    fs.mkdirSync(testGoalieDir, { recursive: true });
}
// Global test setup
global.vscode = mockVscode;
global.testFileSystem = mockFileSystem;
global.testWorkspaceDir = testWorkspaceDir;
global.testGoalieDir = testGoalieDir;
global.mockWorkspaceState = mockWorkspaceState;
global.mockGlobalState = mockGlobalState;
// Export test utilities
export { mockVscode, mockFileSystem, mockWorkspaceState, mockGlobalState, testWorkspaceDir, testGoalieDir };
//# sourceMappingURL=setup.js.map