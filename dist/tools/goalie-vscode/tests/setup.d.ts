declare const mockVscode: {
    window: {
        createOutputChannel: jest.Mock<any, any, any>;
        createWebviewPanel: jest.Mock<any, any, any>;
        showInformationMessage: jest.Mock<any, any, any>;
        showErrorMessage: jest.Mock<any, any, any>;
        showWarningMessage: jest.Mock<any, any, any>;
        showQuickPick: jest.Mock<any, any, any>;
        workspace: {
            getConfiguration: jest.Mock<any, any, any>;
            workspaceFolders: {
                uri: {
                    fsPath: string;
                };
            }[];
        };
        commands: {
            registerCommand: jest.Mock<any, any, any>;
            executeCommand: jest.Mock<any, any, any>;
        };
        Uri: {
            file: jest.Mock<{
                fsPath: string;
            }, [path: string], any>;
        };
        ViewColumn: {
            One: number;
            Beside: number;
        };
        TreeItem: jest.Mock<any, any, any>;
        TreeItemCollapsibleState: {
            None: number;
            Collapsed: number;
            Expanded: number;
        };
        ThemeIcon: jest.Mock<string, [id: string], any>;
        RelativePattern: jest.Mock<{
            pattern: string;
            base: string | undefined;
        }, [pattern: string, base?: string | undefined], any>;
        EventEmitter: jest.Mock<any, any, any>;
    };
};
declare const mockFileSystem: {
    existsSync: jest.Mock<any, any, any>;
    readFileSync: jest.Mock<any, any, any>;
    writeFileSync: jest.Mock<any, any, any>;
    mkdirSync: jest.Mock<any, any, any>;
    readdirSync: jest.Mock<any, any, any>;
    statSync: jest.Mock<any, any, any>;
};
declare const mockWorkspaceState: {
    get: jest.Mock<any, any, any>;
    update: jest.Mock<any, any, any>;
};
declare const mockGlobalState: {
    get: jest.Mock<any, any, any>;
    update: jest.Mock<any, any, any>;
};
declare const testWorkspaceDir: string;
declare const testGoalieDir: string;
export { mockVscode, mockFileSystem, mockWorkspaceState, mockGlobalState, testWorkspaceDir, testGoalieDir };
//# sourceMappingURL=setup.d.ts.map