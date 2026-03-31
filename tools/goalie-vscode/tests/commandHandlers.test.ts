import * as vscode from 'vscode';
import * as path from 'path';
import { mockVscode, testWorkspaceDir, testGoalieDir, mockFileSystem, mockWorkspaceState, mockGlobalState } from './setup';

// Mock command implementations for testing
const mockCommandHandlers = {
  moveKanbanItem: jest.fn(),
  addKanbanItem: jest.fn(),
  removeKanbanItem: jest.fn(),
  refreshKanban: jest.fn(),
  openKanbanItem: jest.fn(),
  applyFilterPreset: jest.fn(),
  clearFilters: jest.fn(),
  quickFilterByCircle: jest.fn(),
  quickFilterByWorkload: jest.fn(),
  showPatternChart: jest.fn(),
  exportPatternMetricsCSV: jest.fn(),
  exportPatternMetricsJSON: jest.fn(),
  patternMetricsPreviousPage: jest.fn(),
  patternMetricsNextPage: jest.fn(),
  patternMetricsSetPageSize: jest.fn(),
  runGovernanceAudit: jest.fn(),
  runRetro: jest.fn(),
  openLiveGapsPanel: jest.fn(),
  showDtDashboard: jest.fn(),
  runDtE2eCheck: jest.fn(),
  runWsjf: jest.fn(),
  runProdCycle: jest.fn(),
  startFederation: jest.fn(),
  showProcessMetrics: jest.fn(),
  applyCodeFixProposal: jest.fn(),
  showQuickFixesForGap: jest.fn()
};

describe('Command Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset command registry
    mockVscode.commands.registerCommand.mockImplementation((command: string, callback: Function) => {
      mockCommandHandlers[command.replace('goalieDashboard.', '')] = callback;
      return { dispose: jest.fn() };
    });
    
    // Reset workspace state
    mockWorkspaceState.get.mockReturnValue(undefined);
    mockWorkspaceState.update.mockReturnValue(jest.fn());
    mockGlobalState.get.mockReturnValue(undefined);
    mockGlobalState.update.mockReturnValue(jest.fn());
  });

  describe('Kanban commands', () => {
    describe('moveKanbanItem', () => {
      it('should move item between sections', async () => {
        const mockItem = {
          label: 'Test Task',
          payload: { id: 'TASK-001', title: 'Test Task' },
          section: 'NOW' as any
        };
        
        const mockTarget = 'NEXT';
        const showQuickPickSpy = jest.spyOn(mockVscode.window, 'showQuickPick');
        showQuickPickSpy.mockResolvedValue(mockTarget);
        
        // Execute command
        await vscode.commands.executeCommand('goalieKanban.moveItem', mockItem);
        
        expect(showQuickPickSpy).toHaveBeenCalledWith(
          expect.arrayContaining(['NEXT', 'LATER', 'DONE']),
          expect.objectContaining({ placeHolder: expect.stringContaining('Move "Test Task" to...') })
        );
        expect(mockCommandHandlers.moveKanbanItem).toHaveBeenCalledWith(mockItem, mockTarget);
      });

      it('should handle cancellation', async () => {
        const mockItem = {
          label: 'Test Task',
          payload: { id: 'TASK-001', title: 'Test Task' },
          section: 'NOW' as any
        };
        
        const showQuickPickSpy = jest.spyOn(mockVscode.window, 'showQuickPick');
        showQuickPickSpy.mockResolvedValue(undefined); // User cancelled
        
        // Execute command
        await vscode.commands.executeCommand('goalieKanban.moveItem', mockItem);
        
        expect(showQuickPickSpy).toHaveBeenCalled();
        expect(mockCommandHandlers.moveKanbanItem).not.toHaveBeenCalled();
      });
    });

    describe('addKanbanItem', () => {
      it('should add new item to section', async () => {
        const mockTitle = 'New Test Task';
        const mockSummary = 'Test summary';
        const mockSection = 'NEXT';
        
        const showInputBoxSpy = jest.spyOn(mockVscode.window, 'showInputBox');
        showInputBoxSpy.mockResolvedValues([mockTitle, mockSummary]);
        
        // Execute command
        await vscode.commands.executeCommand('goalieKanban.addItem');
        
        expect(showInputBoxSpy).toHaveBeenCalledWith(
          expect.stringContaining('Task Title'),
          expect.stringContaining('Summary')
        );
        expect(mockCommandHandlers.addKanbanItem).toHaveBeenCalledWith(mockTitle, mockSummary, mockSection);
      });
    });

    describe('removeKanbanItem', () => {
      it('should remove item from section', async () => {
        const mockItem = {
          label: 'Test Task',
          payload: { id: 'TASK-001', title: 'Test Task' },
          section: 'NOW' as any
        };
        
        const showQuickPickSpy = jest.spyOn(mockVscode.window, 'showQuickPick');
        showQuickPickSpy.mockResolvedValue(mockItem);
        
        // Execute command
        await vscode.commands.executeCommand('goalieKanban.removeItem', mockItem);
        
        expect(showQuickPickSpy).toHaveBeenCalledWith(
          expect.stringContaining('Select item to remove'),
          expect.any(Array)
        );
        expect(mockCommandHandlers.removeKanbanItem).toHaveBeenCalledWith(mockItem);
      });
    });

    describe('refreshKanban', () => {
      it('should refresh kanban view', async () => {
        const refreshSpy = jest.fn();
        
        // Mock the refresh method
        mockCommandHandlers.refreshKanban = refreshSpy;
        
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.refreshKanban');
        
        expect(refreshSpy).toHaveBeenCalled();
      });
    });

    describe('openKanbanItem', () => {
      it('should open associated file', async () => {
        const mockItem = {
          label: 'Test Task',
          payload: { 
            id: 'TASK-001', 
            title: 'Test Task',
            filePath: '/path/to/test-file.ts'
          },
          section: 'NOW' as any
        };
        
        const openTextDocumentSpy = jest.spyOn(mockVscode.workspace, 'openTextDocument');
        const showTextDocumentSpy = jest.spyOn(mockVscode.window, 'showTextDocument');
        
        mockFileSystem.existsSync.mockReturnValue(true);
        const mockDocument = { uri: { fsPath: '/path/to/test-file.ts' } };
        openTextDocumentSpy.mockResolvedValue(mockDocument);
        showTextDocumentSpy.mockResolvedValue(undefined);
        
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.openKanbanItem', mockItem);
        
        expect(openTextDocumentSpy).toHaveBeenCalledWith(mockDocument.uri);
        expect(showTextDocumentSpy).toHaveBeenCalledWith(mockDocument);
      });

      it('should handle missing file gracefully', async () => {
        const mockItem = {
          label: 'Test Task',
          payload: { 
            id: 'TASK-001', 
            title: 'Test Task',
            filePath: '/path/to/missing-file.ts'
          },
          section: 'NOW' as any
        };
        
        const showWarningSpy = jest.spyOn(mockVscode.window, 'showWarningMessage');
        mockFileSystem.existsSync.mockReturnValue(false);
        
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.openKanbanItem', mockItem);
        
        expect(showWarningSpy).toHaveBeenCalledWith(
          expect.stringContaining('No file associated')
        );
      });
    });
  });

  describe('Pattern Metrics commands', () => {
    describe('filtering commands', () => {
      it('should apply filter preset', async () => {
        const mockPreset = 'ml-focus';
        
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.applyFilterPreset', mockPreset);
        
        expect(mockCommandHandlers.applyFilterPreset).toHaveBeenCalledWith(mockPreset);
      });

      it('should clear filters', async () => {
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.clearFilters');
        
        expect(mockCommandHandlers.clearFilters).toHaveBeenCalled();
      });

      it('should quick filter by circle', async () => {
        const mockCircle = 'ui';
        
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.quickFilterByCircle', mockCircle);
        
        expect(mockCommandHandlers.quickFilterByCircle).toHaveBeenCalledWith(mockCircle);
      });

      it('should quick filter by workload', async () => {
        const mockWorkload = 'ML';
        
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.quickFilterByWorkload', mockWorkload);
        
        expect(mockCommandHandlers.quickFilterByWorkload).toHaveBeenCalledWith(mockWorkload);
      });
    });

    describe('chart commands', () => {
      it('should show pattern chart', async () => {
        const mockChartType = 'bar';
        
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.showPatternChart', mockChartType);
        
        expect(mockCommandHandlers.showPatternChart).toHaveBeenCalledWith(mockChartType);
      });
    });

    describe('export commands', () => {
      it('should export to CSV', async () => {
        const showSaveDialogSpy = jest.spyOn(mockVscode.window, 'showSaveDialog');
        const mockUri = vscode.Uri.file('/path/to/export.csv');
        showSaveDialogSpy.mockResolvedValue(mockUri);
        
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.exportPatternMetricsCSV');
        
        expect(showSaveDialogSpy).toHaveBeenCalled();
        expect(mockCommandHandlers.exportPatternMetricsCSV).toHaveBeenCalledWith('csv');
      });

      it('should export to JSON', async () => {
        const showSaveDialogSpy = jest.spyOn(mockVscode.window, 'showSaveDialog');
        const mockUri = vscode.Uri.file('/path/to/export.json');
        showSaveDialogSpy.mockResolvedValue(mockUri);
        
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.exportPatternMetricsJSON');
        
        expect(showSaveDialogSpy).toHaveBeenCalled();
        expect(mockCommandHandlers.exportPatternMetricsJSON).toHaveBeenCalledWith('json');
      });
    });

    describe('pagination commands', () => {
      it('should navigate to previous page', async () => {
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.patternMetricsPreviousPage');
        
        expect(mockCommandHandlers.patternMetricsPreviousPage).toHaveBeenCalled();
      });

      it('should navigate to next page', async () => {
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.patternMetricsNextPage');
        
        expect(mockCommandHandlers.patternMetricsNextPage).toHaveBeenCalled();
      });

      it('should set page size', async () => {
        const mockPageSize = 100;
        
        // Execute command
        await vscode.commands.executeCommand('goalieDashboard.patternMetricsSetPageSize', mockPageSize);
        
        expect(mockCommandHandlers.patternMetricsSetPageSize).toHaveBeenCalledWith(mockPageSize);
      });
    });
  });

  describe('Governance commands', () => {
    it('should run governance audit', async () => {
      const executeCommandSpy = jest.spyOn(mockVscode.commands, 'executeCommand');
      const createTerminalSpy = jest.spyOn(mockVscode.window, 'createTerminal');

      // Execute command
      await vscode.commands.executeCommand('goalie.runGovernanceAudit');

      expect(executeCommandSpy).toHaveBeenCalledWith('af', expect.stringContaining('governance audit'));
      expect(createTerminalSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Goalie Governance Audit' })
      );
    });

    describe('DT Calibration commands', () => {
      it('should show DT dashboard', async () => {
        const openExternalSpy = jest.spyOn(mockVscode.env, 'openExternal');
        
        // Execute command
        await vscode.commands.executeCommand('goalie.showDtDashboard');
        
        expect(openExternalSpy).toHaveBeenCalled();
      });

      it('should run DT E2E check', async () => {
        const executeCommandSpy = jest.spyOn(mockVscode.commands, 'executeCommand');
        const createTerminalSpy = jest.spyOn(mockVscode.window, 'createTerminal');
        
        // Execute command
        await vscode.commands.executeCommand('goalie.runDtE2eCheck');
        
        expect(executeCommandSpy).toHaveBeenCalledWith('af', expect.stringContaining('dt-e2e-check'));
        expect(createTerminalSpy).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Goalie DT E2E Check' })
        );
      });
    });
  });

  describe('Error handling', () => {
    it('should handle command errors gracefully', async () => {
      const showErrorSpy = jest.spyOn(mockVscode.window, 'showErrorMessage');
      
      // Mock command that throws error
      mockCommandHandlers.moveKanbanItem.mockImplementation(() => {
        throw new Error('Command execution failed');
      });
      
      // Execute command
      await vscode.commands.executeCommand('goalieKanban.moveItem', {
        label: 'Test Task',
        payload: { id: 'TASK-001' }
      });
      
      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Command execution failed')
      );
    });
  });

  describe('State persistence', () => {
    it('should persist filter state', async () => {
      const updateSpy = jest.spyOn(mockWorkspaceState, 'update');
      
      // Execute command that updates state
      await vscode.commands.executeCommand('goalieDashboard.clearFilters');
      
      expect(updateSpy).toHaveBeenCalledWith('patternMetrics.filters', []);
    });

    it('should persist global state', async () => {
      const updateSpy = jest.spyOn(mockGlobalState, 'update');
      
      // Execute command that updates global state
      await vscode.commands.executeCommand('goalieDashboard.patternMetricsSetPageSize', 100);
      
      expect(updateSpy).toHaveBeenCalledWith('patternMetrics.pageSize', 100);
    });
  });
});