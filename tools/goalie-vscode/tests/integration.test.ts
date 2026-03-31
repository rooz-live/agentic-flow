import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GoalieKanbanProvider, PatternMetricsProvider, GovernanceEconomicsProvider, DepthLadderTimelineProvider, GoalieGapsProvider, ProcessFlowMetricsProvider } from '../src/extension';
import { DtCalibrationProvider } from '../src/dtCalibrationProvider';
import { mockVscode, testWorkspaceDir, testGoalieDir, mockFileSystem, mockWorkspaceState, mockGlobalState } from './setup';

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup test workspace with .goalie directory
    mockFileSystem.existsSync.mockReturnValue(true);
    mockFileSystem.readdirSync.mockReturnValue(['KANBAN_BOARD.yaml', 'pattern_metrics.jsonl']);
    mockVscode.workspace.workspaceFolders = [
      { uri: { fsPath: testWorkspaceDir } }
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Workflow', () => {
    it('should load and display all views with sample data', async () => {
      // Create extension context
      const mockContext = {
        subscriptions: [],
        workspaceState: mockWorkspaceState,
        globalState: mockGlobalState,
        extensionUri: vscode.Uri.file(testWorkspaceDir)
      } as any;
      
      // Initialize all providers
      const kanbanProvider = new GoalieKanbanProvider(testWorkspaceDir, mockVscode.window.createOutputChannel('Test'));
      const patternMetricsProvider = new PatternMetricsProvider(testWorkspaceDir, mockContext);
      const governanceProvider = new GovernanceEconomicsProvider(testWorkspaceDir);
      const depthTimelineProvider = new DepthLadderTimelineProvider(testWorkspaceDir);
      const gapsProvider = new GoalieGapsProvider(testWorkspaceDir, mockVscode.window.createOutputChannel('Test'));
      const processFlowProvider = new ProcessFlowMetricsProvider(testWorkspaceDir);
      const dtCalibrationProvider = new DtCalibrationProvider(testWorkspaceDir, mockVscode.window.createOutputChannel('Test'));
      
      // Test loading children
      const kanbanItems = await kanbanProvider.getChildren();
      const patternItems = await patternMetricsProvider.getChildren();
      const governanceItems = await governanceProvider.getChildren();
      const timelineItems = await depthTimelineProvider.getChildren();
      const gapItems = await gapsProvider.getChildren();
      const processFlowItems = await processFlowProvider.getChildren();
      
      // Verify data was loaded
      expect(kanbanItems.length).toBeGreaterThan(0);
      expect(patternItems.length).toBeGreaterThan(0);
      expect(governanceItems.length).toBeGreaterThan(0);
      expect(timelineItems.length).toBeGreaterThan(0);
      expect(gapItems.length).toBeGreaterThan(0);
      expect(processFlowItems.length).toBeGreaterThan(0);
    });

    it('should handle real-time file updates', async () => {
      const kanbanProvider = new GoalieKanbanProvider(testWorkspaceDir, mockVscode.window.createOutputChannel('Test'));
      const patternMetricsProvider = new PatternMetricsProvider(testWorkspaceDir, mockContext);
      
      // Get initial state
      const initialKanbanItems = await kanbanProvider.getChildren();
      const initialPatternItems = await patternMetricsProvider.getChildren();
      
      // Simulate file change
      const updatedKanbanData = {
        NOW: [
          { title: 'Updated Task 1', id: 'TASK-001' },
          { title: 'New Task 2', id: 'TASK-002' }
        ],
        NEXT: [],
        LATER: []
      };
      
      mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(updatedKanbanData));
      
      // Trigger file change notification
      const fileChangeEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
      kanbanProvider['_onDidChangeTreeData'] = fileChangeEmitter;
      
      // Wait for file change to be processed
      await new Promise(resolve => {
        fileChangeEmitter.event((changes: vscode.FileChangeEvent[]) => {
          if (changes.some(c => c.path.includes('KANBAN_BOARD.yaml'))) {
            resolve();
          }
        });
        
        // Simulate file change
        setTimeout(() => {
          fileChangeEmitter.fire([{
            type: vscode.FileChangeType.Changed,
            path: path.join(testGoalieDir, 'KANBAN_BOARD.yaml')
          }]);
        }, 100);
      });
      
      // Check if view updated
      const updatedKanbanItems = await kanbanProvider.getChildren();
      
      expect(updatedKanbanItems.length).toBeGreaterThan(initialKanbanItems.length);
    });

    it('should handle drag-and-drop functionality', async () => {
      const kanbanProvider = new GoalieKanbanProvider(testWorkspaceDir, mockVscode.window.createOutputChannel('Test'));
      
      // Mock drag and drop event
      const mockDragItem = {
        label: 'Test Task',
        payload: { id: 'TASK-001', title: 'Test Task' },
        section: 'NOW' as any
      };
      
      const mockTargetSection = 'NEXT';
      const showQuickPickSpy = jest.spyOn(mockVscode.window, 'showQuickPick');
      showQuickPickSpy.mockResolvedValue(mockTargetSection);
      
      // Execute move command
      await vscode.commands.executeCommand('goalieKanban.moveItem', mockDragItem);
      
      expect(showQuickPickSpy).toHaveBeenCalledWith(
        expect.arrayContaining(['NEXT', 'LATER', 'DONE']),
        expect.objectContaining({ placeHolder: expect.stringContaining('Move "Test Task" to...') })
      );
      
      // Verify item was moved
      const updatedItems = await kanbanProvider.getChildren();
      const nextSection = updatedItems.find(item => item.label === 'NEXT');
      const movedItem = nextSection?.children?.find(child => child.payload?.id === 'TASK-001');
      
      expect(movedItem).toBeDefined();
      expect(movedItem?.payload?.title).toBe('Test Task');
    });

    it('should handle alert threshold triggers', async () => {
      const outputChannel = mockVscode.window.createOutputChannel('Test');
      const alertManager = new (await import('../extension')).AlertManager(testGoalieDir, outputChannel);
      
      const showWarningSpy = jest.spyOn(mockVscode.window, 'showWarningMessage');
      
      // Mock data that exceeds WIP limit
      const wipExceededData = {
        NOW: Array(6).fill(null).map((_, i) => ({
          title: `Task ${i + 1}`,
          id: `TASK-${String(i + 1).padStart(3, '0')}`
        }))
      };
      
      mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(wipExceededData));
      
      // Check WIP thresholds
      alertManager.checkWipThresholds(5);
      
      expect(showWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('WIP limit exceeded'),
        expect.stringContaining('6 items in NOW section')
      );
    });

    it('should handle command execution with errors', async () => {
      const showErrorSpy = jest.spyOn(mockVscode.window, 'showErrorMessage');
      
      // Mock command that throws error
      const originalExecuteCommand = vscode.commands.executeCommand;
      vscode.commands.executeCommand = jest.fn().mockImplementation(() => {
        throw new Error('Command failed');
      });
      
      try {
        await vscode.commands.executeCommand('goalieKanban.addItem');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Command failed');
      }
      
      // Restore original function
      vscode.commands.executeCommand = originalExecuteCommand;
    });
  });

  describe('Data persistence', () => {
    it('should persist and restore workspace state', async () => {
      const mockContext = {
        subscriptions: [],
        workspaceState: mockWorkspaceState,
        globalState: mockGlobalState,
        extensionUri: vscode.Uri.file(testWorkspaceDir)
      } as any;
      
      // Test state persistence
      mockWorkspaceState.update.mockReturnValue(Promise.resolve());
      mockGlobalState.update.mockReturnValue(Promise.resolve());
      
      // Create provider and trigger state update
      const patternMetricsProvider = new PatternMetricsProvider(testWorkspaceDir, mockContext);
      patternMetricsProvider.setFilter({ type: 'circle', value: 'ui', label: 'Circle: ui' });
      
      // Verify state was persisted
      expect(mockWorkspaceState.update).toHaveBeenCalledWith('patternMetrics.filters', [
        { type: 'circle', value: 'ui', label: 'Circle: ui' }
      ]);
    });
  });

  describe('Performance with large datasets', () => {
    it('should handle large pattern metrics files efficiently', async () => {
      // Mock large dataset (1000 entries)
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        timestamp: `2025-12-10T${String(i).padStart(2, '0')}:00:00Z`,
        pattern: `test_pattern_${i}`,
        circle: ['ui', 'core'][i % 2],
        depth: Math.floor(Math.random() * 5) + 1,
        run_kind: ['feature', 'bugfix'][i % 2],
        gate: ['implement', 'fix'][i % 2],
        tags: [`tag_${i}`, 'test'],
        economic: {
          wsjf_score: Math.random() * 20,
          cost_of_delay: Math.random() * 5,
          job_duration: Math.floor(Math.random() * 10) + 1,
          user_business_value: Math.floor(Math.random() * 20) + 1
        },
        action_completed: Math.random() > 0.5
      }));
      
      mockFileSystem.readFileSync.mockReturnValue(largeDataset.map(p => JSON.stringify(p)).join('\n'));
      
      const patternMetricsProvider = new PatternMetricsProvider(testWorkspaceDir, mockContext);
      
      // Measure performance
      const startTime = Date.now();
      const items = await patternMetricsProvider.getChildren();
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process large dataset efficiently
      expect(processingTime).toBeLessThan(1000); // Less than 1 second
      expect(items).toHaveLength(50); // Should be paginated
    });
  });
});