import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GoalieKanbanProvider, KanbanItem } from '../src/extension';
import { PatternMetricsProvider } from '../src/extension';
import { GovernanceEconomicsProvider } from '../src/extension';
import { DepthLadderTimelineProvider } from '../src/extension';
import { GoalieGapsProvider } from '../src/extension';
import { ProcessFlowMetricsProvider } from '../src/extension';
import { DtCalibrationProvider } from '../src/dtCalibrationProvider';
import { mockVscode, testWorkspaceDir, testGoalieDir, mockFileSystem } from './setup';

// Mock data for testing
const mockKanbanData = {
  NOW: [
    {
      title: 'Test Task 1',
      summary: 'High priority task for testing',
      id: 'TASK-001',
      filePath: '/path/to/task1.ts',
      metrics: ['priority:high', 'effort:3'],
      createdAt: '2025-12-10T10:00:00Z',
      updatedAt: '2025-12-10T15:30:00Z'
    },
    {
      title: 'Test Task 2',
      summary: 'Medium priority task',
      id: 'TASK-002',
      metrics: ['priority:medium', 'effort:2'],
      createdAt: '2025-12-09T14:00:00Z',
      updatedAt: '2025-12-10T09:15:00Z'
    }
  ],
  NEXT: [
    {
      title: 'Test Task 3',
      summary: 'Low priority task',
      id: 'TASK-003',
      metrics: ['priority:low', 'effort:1'],
      createdAt: '2025-12-08T16:00:00Z',
      updatedAt: '2025-12-10T08:30:00Z'
    }
  ],
  LATER: [
    {
      title: 'Test Task 4',
      summary: 'Future task',
      id: 'TASK-004',
      metrics: ['priority:low', 'effort:4'],
      createdAt: '2025-12-07T10:00:00Z',
      updatedAt: '2025-12-10T07:20:00Z'
    }
  ]
};

const mockPatternMetrics = [
  {
    timestamp: '2025-12-10T08:00:00Z',
    pattern: 'test_pattern_1',
    circle: 'ui',
    depth: 1,
    run_kind: 'feature',
    gate: 'implement',
    tags: ['ui', 'testing'],
    economic: {
      wsjf_score: 12.5,
      cost_of_delay: 2.3,
      job_duration: 3,
      user_business_value: 8
    },
    action_completed: true
  },
  {
    timestamp: '2025-12-10T08:15:00Z',
    pattern: 'test_pattern_2',
    circle: 'core',
    depth: 2,
    run_kind: 'bugfix',
    gate: 'fix',
    tags: ['core', 'performance'],
    economic: {
      wsjf_score: 18.2,
      cost_of_delay: 1.8,
      job_duration: 5,
      user_business_value: 15
    },
    action_completed: false
  }
];

const mockGovernanceData = [
  {
    pattern: 'test_pattern_1',
    circle: 'ui',
    depth: 1,
    cod: 0.85,
    totalImpact: 15.2,
    wsjf: 12.5,
    computeCost: 3.5,
    observability: 'Actions=3, Tags=ui,testing',
    workloads: ['ui', 'testing']
  },
  {
    pattern: 'test_pattern_2',
    circle: 'core',
    depth: 2,
    cod: 0.92,
    totalImpact: 22.8,
    wsjf: 18.2,
    computeCost: 5.2,
    observability: 'Actions=2, Tags=core,performance',
    workloads: ['core', 'performance']
  }
];

const mockDepthTimelineData = [
  {
    timestamp: '2025-12-10T08:00:00Z',
    depth: 1,
    pattern: 'test_pattern_1',
    circle: 'ui',
    run: 'feature',
    iteration: 1
  },
  {
    timestamp: '2025-12-10T09:00:00Z',
    depth: 2,
    pattern: 'test_pattern_2',
    circle: 'core',
    run: 'feature',
    iteration: 1
  }
];

const mockGapsData = [
  {
    id: 'gap-001',
    title: 'Test Gap 1',
    description: 'Test gap for drag-and-drop functionality',
    category: 'ui',
    severity: 'high',
    impact: 'Users cannot efficiently reorganize tasks',
    status: 'open',
    created_at: '2025-12-08T10:00:00Z',
    updated_at: '2025-12-10T16:00:00Z'
  },
  {
    id: 'gap-002',
    title: 'Test Gap 2',
    description: 'Test gap for error handling',
    category: 'reliability',
    severity: 'medium',
    impact: 'Users experience cryptic error messages',
    status: 'open',
    created_at: '2025-12-07T14:00:00Z',
    updated_at: '2025-12-10T16:00:00Z'
  }
];

const mockProcessFlowData = {
  timestamp: '2025-12-10T16:00:00Z',
  process_flows: [
    {
      name: 'Test Flow 1',
      steps: [
        {
          step: 'collect_requirements',
          duration: 30,
          status: 'completed'
        },
        {
          step: 'design_ui',
          duration: 45,
          status: 'completed'
        }
      ],
      total_duration: 75,
      efficiency_score: 0.85,
      bottlenecks: ['ui_design']
    }
  ],
  flow_metrics: {
    avg_flow_duration: 120,
    avg_efficiency_score: 0.85,
    most_common_bottleneck: 'ui_design',
    total_flows_analyzed: 1,
    improvement_trend: 'positive'
  }
};

describe('TreeView Providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup test workspace
    mockFileSystem.existsSync.mockReturnValue(true);
    mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(mockKanbanData));
    
    // Reset workspace folders
    mockVscode.workspace.workspaceFolders = [
      {
        uri: { fsPath: testWorkspaceDir }
      }
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GoalieKanbanProvider', () => {
    let provider: GoalieKanbanProvider;

    beforeEach(() => {
      provider = new GoalieKanbanProvider(testWorkspaceDir, mockVscode.window.createOutputChannel('Test'));
    });

    afterEach(() => {
      provider.dispose();
    });

    describe('getTreeItem', () => {
      it('should return the item itself', () => {
        const item = new KanbanItem('Test Item', vscode.TreeItemCollapsibleState.None);
        const treeItem = provider.getTreeItem(item);
        expect(treeItem).toBe(item);
      });
    });

    describe('getChildren', () => {
      it('should return root sections when no element provided', async () => {
        mockFileSystem.existsSync.mockReturnValue(true);
        mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(mockKanbanData));
        
        const children = await provider.getChildren();
        
        expect(children).toHaveLength(3); // NOW, NEXT, LATER
        expect(children[0].label).toContain('NOW');
        expect(children[1].label).toContain('NEXT');
        expect(children[2].label).toContain('LATER');
      });

      it('should return items for a section', async () => {
        const sectionItem = new KanbanItem('NOW', vscode.TreeItemCollapsibleState.Collapsed, 'NOW');
        
        const children = await provider.getChildren(sectionItem);
        
        expect(children).toHaveLength(2); // Two items in NOW section
        expect(children[0].label).toContain('Test Task 1');
        expect(children[1].label).toContain('Test Task 2');
      });

      it('should handle missing kanban file gracefully', async () => {
        mockFileSystem.existsSync.mockReturnValue(false);
        
        const children = await provider.getChildren();
        
        expect(children).toEqual([]);
        expect(mockVscode.window.showErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('Kanban board file not found')
        );
      });

      it('should handle invalid YAML gracefully', async () => {
        mockFileSystem.existsSync.mockReturnValue(true);
        mockFileSystem.readFileSync.mockReturnValue('invalid yaml content');
        
        const children = await provider.getChildren();
        
        expect(children).toEqual([]);
        expect(mockVscode.window.showErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse board file')
        );
      });
    });

    describe('refresh', () => {
      it('should trigger tree data change event', () => {
        const refreshSpy = jest.spyOn(provider['_onDidChangeTreeData'], 'fire');
        
        provider.refresh();
        
        expect(refreshSpy).toHaveBeenCalledWith();
      });
    });

    describe('WIP limit calculations', () => {
      it('should calculate WIP violations correctly', async () => {
        const sectionItem = new KanbanItem('NOW', vscode.TreeItemCollapsibleState.Collapsed, 'NOW');
        
        // Mock 6 items in NOW section (WIP limit is 5)
        const nowItems = Array(6).fill(null).map((_, i) => ({
          title: `Task ${i + 1}`,
          id: `TASK-${i + 1}`,
          summary: `Test task ${i + 1}`,
          metrics: ['priority:medium', `effort:${i + 1}`],
          createdAt: '2025-12-10T10:00:00Z',
          updatedAt: '2025-12-10T15:30:00Z'
        }));
        
        mockFileSystem.readFileSync.mockReturnValue(JSON.stringify({
          NOW: nowItems,
          NEXT: [],
          LATER: []
        }));
        
        const children = await provider.getChildren(sectionItem);
        
        // Check if WIP violation is indicated
        const nowSection = children.find(child => child.label.includes('NOW'));
        expect(nowSection?.label).toContain('⚠️ WIP: 6/5 (+20%)');
      });
    });
  });

  describe('PatternMetricsProvider', () => {
    let provider: PatternMetricsProvider;

    beforeEach(() => {
      provider = new PatternMetricsProvider(testWorkspaceDir);
    });

    afterEach(() => {
      provider.dispose();
    });

    describe('getChildren', () => {
      it('should return pattern metrics items', async () => {
        mockFileSystem.existsSync.mockReturnValue(true);
        mockFileSystem.readFileSync.mockReturnValue(
          mockPatternMetrics.map(p => JSON.stringify(p)).join('\n')
        );
        
        const children = await provider.getChildren();
        
        expect(children).toHaveLength(mockPatternMetrics.length);
      });

      it('should handle file not found', async () => {
        mockFileSystem.existsSync.mockReturnValue(false);
        
        const children = await provider.getChildren();
        
        expect(children).toEqual([]);
      });
    });

    describe('filtering functionality', () => {
      it('should apply filters correctly', async () => {
        provider.setFilter({ type: 'circle', value: 'ui', label: 'Circle: ui' });
        
        const children = await provider.getChildren();
        
        // Should only return UI circle patterns
        const uiPatterns = children.filter(child => 
          child.tooltip?.includes('circle') && child.tooltip?.includes('ui')
        );
        expect(uiPatterns.length).toBeGreaterThan(0);
      });

      it('should clear filters', async () => {
        provider.setFilter({ type: 'circle', value: 'ui', label: 'Circle: ui' });
        provider.clearFilters();
        
        const children = await provider.getChildren();
        
        // Should return all patterns after clearing
        expect(children).toHaveLength(mockPatternMetrics.length);
      });
    });

    describe('pagination', () => {
      it('should paginate results correctly', async () => {
        // Mock 100 patterns
        const manyPatterns = Array(100).fill(null).map((_, i) => ({
          ...mockPatternMetrics[0],
          pattern: `test_pattern_${i}`,
          timestamp: `2025-12-10T${String(i).padStart(2, '0')}:00:00Z`
        }));
        
        mockFileSystem.readFileSync.mockReturnValue(
          manyPatterns.map(p => JSON.stringify(p)).join('\n')
        );
        
        const children = await provider.getChildren();
        
        // Default page size is 50, should show first page
        expect(children.length).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('GovernanceEconomicsProvider', () => {
    let provider: GovernanceEconomicsProvider;

    beforeEach(() => {
      provider = new GovernanceEconomicsProvider(testWorkspaceDir);
    });

    afterEach(() => {
      provider.dispose();
    });

    describe('getChildren', () => {
      it('should return governance items', async () => {
        mockFileSystem.existsSync.mockReturnValue(true);
        mockFileSystem.readFileSync.mockReturnValue(
          mockGovernanceData.map(p => JSON.stringify(p)).join('\n')
        );
        
        const children = await provider.getChildren();
        
        expect(children).toHaveLength(mockGovernanceData.length);
      });
    });

    describe('lens switching', () => {
      it('should switch between lens types', () => {
        provider.setLens('ML');
        expect(provider.getCurrentLens()).toBe('ML');
        
        provider.setLens('HPC');
        expect(provider.getCurrentLens()).toBe('HPC');
        
        provider.setLens('ALL');
        expect(provider.getCurrentLens()).toBe('ALL');
      });
    });
  });

  describe('DepthLadderTimelineProvider', () => {
    let provider: DepthLadderTimelineProvider;

    beforeEach(() => {
      provider = new DepthLadderTimelineProvider(testWorkspaceDir);
    });

    afterEach(() => {
      provider.dispose();
    });

    describe('getChildren', () => {
      it('should return timeline items', async () => {
        mockFileSystem.existsSync.mockReturnValue(true);
        mockFileSystem.readFileSync.mockReturnValue(
          mockDepthTimelineData.map(p => JSON.stringify(p)).join('\n')
        );
        
        const children = await provider.getChildren();
        
        expect(children).toHaveLength(mockDepthTimelineData.length);
      });
    });
  });

  describe('GoalieGapsProvider', () => {
    let provider: GoalieGapsProvider;

    beforeEach(() => {
      provider = new GoalieGapsProvider(testWorkspaceDir, mockVscode.window.createOutputChannel('Test'));
    });

    afterEach(() => {
      provider.dispose();
    });

    describe('getChildren', () => {
      it('should return gap items', async () => {
        mockFileSystem.existsSync.mockReturnValue(true);
        mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(mockGapsData));
        
        const children = await provider.getChildren();
        
        expect(children).toHaveLength(mockGapsData.length);
      });
    });

    describe('gap filtering', () => {
      it('should filter gaps by category', async () => {
        provider.setLens('ui');
        
        const children = await provider.getChildren();
        
        const uiGaps = children.filter(child => 
          child.description?.includes('ui') || child.title?.includes('UI')
        );
        expect(uiGaps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ProcessFlowMetricsProvider', () => {
    let provider: ProcessFlowMetricsProvider;

    beforeEach(() => {
      provider = new ProcessFlowMetricsProvider(testWorkspaceDir);
    });

    afterEach(() => {
      provider.dispose();
    });

    describe('getChildren', () => {
      it('should return process flow items', async () => {
        mockFileSystem.existsSync.mockReturnValue(true);
        mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(mockProcessFlowData));
        
        const children = await provider.getChildren();
        
        expect(children).toHaveLength(1); // One process flow
      });
    });
  });

  describe('DtCalibrationProvider', () => {
    let provider: DtCalibrationProvider;

    beforeEach(() => {
      provider = new DtCalibrationProvider(testWorkspaceDir, mockVscode.window.createOutputChannel('Test'));
    });

    afterEach(() => {
      provider.dispose();
    });

    describe('handleSummaryMessage', () => {
      it('should handle DT summary messages', () => {
        const mockSummary = {
          timestamp: '2025-12-10T16:00:00Z',
          total_evaluations: 50,
          top1_accuracy: { min: 0.75, p25: 0.80, median: 0.85, p75: 0.90, max: 0.95 },
          per_circle_stats: {
            ui: { p25: 0.70, median: 0.75, p75: 0.82 },
            core: { p25: 0.75, median: 0.82, p75: 0.88 }
          },
          config_impact: {
            debounce_delay_300ms: {
              pass_rate: 0.85,
              pass_count: 42,
              fail_count: 8
            }
          }
        };

        mockFileSystem.existsSync.mockReturnValue(true);
        mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(mockSummary));

        const panelSpy = jest.spyOn(provider, 'ensurePanel');
        
        provider.handleSummaryMessage({
          summaryPath: '/test/path/dt_evaluation_summary.json'
        });

        expect(panelSpy).toHaveBeenCalled();
      });
    });
  });
});