import * as vscode from 'vscode';
import { AlertManager } from '../src/extension';
import { mockVscode, testGoalieDir, mockFileSystem } from './setup';

// Mock alert thresholds for testing
const mockThresholds = {
  wipLimit: 5,
  fileChangeFrequency: 10,
  memoryUsage: 512,
  cpuUsage: 80,
  errorRate: 0.05
};

describe('AlertManager', () => {
  let alertManager: AlertManager;
  let outputChannel: vscode.OutputChannel;

  beforeEach(() => {
    jest.clearAllMocks();
    
    outputChannel = mockVscode.window.createOutputChannel('Goalie Alerts');
    alertManager = new AlertManager(testGoalieDir, outputChannel);
  });

  afterEach(() => {
    alertManager.dispose();
  });

  describe('threshold monitoring', () => {
    it('should trigger WIP limit alert when exceeded', () => {
      const showWarningSpy = jest.spyOn(mockVscode.window, 'showWarningMessage');
      
      // Mock Kanban data with 6 items in NOW (WIP limit is 5)
      mockFileSystem.readFileSync.mockReturnValue(JSON.stringify({
        NOW: Array(6).fill(null).map((_, i) => ({
          title: `Task ${i + 1}`,
          id: `TASK-${String(i + 1).padStart(3, '0')}`
        }))
      }));
      
      alertManager.checkWipThresholds(mockThresholds.wipLimit);
      
      expect(showWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('WIP limit exceeded'),
        expect.stringContaining('6 items in NOW section (limit: 5)')
      );
    });

    it('should not trigger alert when WIP within limit', () => {
      const showWarningSpy = jest.spyOn(mockVscode.window, 'showWarningMessage');
      
      // Mock Kanban data with 4 items in NOW (within WIP limit)
      mockFileSystem.readFileSync.mockReturnValue(JSON.stringify({
        NOW: Array(4).fill(null).map((_, i) => ({
          title: `Task ${i + 1}`,
          id: `TASK-${String(i + 1).padStart(3, '0')}`
        }))
      }));
      
      alertManager.checkWipThresholds(mockThresholds.wipLimit);
      
      expect(showWarningSpy).not.toHaveBeenCalled();
    });

    it('should trigger file change frequency alert', () => {
      const showWarningSpy = jest.spyOn(mockVscode.window, 'showWarningMessage');
      
      // Mock frequent file changes
      const fileChanges = Array(15).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        path: `file${i}.ts`
      }));
      
      alertManager.checkFileChangeFrequency(fileChanges, mockThresholds.fileChangeFrequency);
      
      expect(showWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('High file change frequency'),
        expect.stringContaining('15 changes in 5 minutes')
      );
    });

    it('should trigger memory usage alert', () => {
      const showWarningSpy = jest.spyOn(mockVscode.window, 'showWarningMessage');
      
      // Mock high memory usage
      const memoryMetrics = {
        usage: 600, // Above threshold of 512
        timestamp: new Date().toISOString()
      };
      
      alertManager.checkMemoryUsage(memoryMetrics, mockThresholds.memoryUsage);
      
      expect(showWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage'),
        expect.stringContaining('600MB')
      );
    });

    it('should trigger CPU usage alert', () => {
      const showWarningSpy = jest.spyOn(mockVscode.window, 'showWarningMessage');
      
      // Mock high CPU usage
      const cpuMetrics = {
        usage: 85, // Above threshold of 80
        timestamp: new Date().toISOString()
      };
      
      alertManager.checkCpuUsage(cpuMetrics, mockThresholds.cpuUsage);
      
      expect(showWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('High CPU usage'),
        expect.stringContaining('85%')
      );
    });

    it('should trigger error rate alert', () => {
      const showWarningSpy = jest.spyOn(mockVscode.window, 'showWarningMessage');
      
      // Mock high error rate
      const errorMetrics = {
        rate: 0.08, // Above threshold of 0.05
        timestamp: new Date().toISOString()
      };
      
      alertManager.checkErrorRate(errorMetrics, mockThresholds.errorRate);
      
      expect(showWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('High error rate'),
        expect.stringContaining('8%')
      );
    });
  });

  describe('alert configuration', () => {
    it('should update thresholds', () => {
      const updateConfigSpy = jest.spyOn(mockVscode.workspace.getConfiguration('goalie'), 'update');
      
      alertManager.updateThresholds({
        wipLimit: 8,
        fileChangeFrequency: 20,
        memoryUsage: 1024,
        cpuUsage: 90,
        errorRate: 0.1
      });
      
      expect(updateConfigSpy).toHaveBeenCalledWith('alertThresholds');
    });

    it('should load custom thresholds from configuration', () => {
      mockVscode.workspace.getConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          switch (key) {
            case 'alertThresholds.wipLimit': return 8;
            case 'alertThresholds.fileChangeFrequency': return 20;
            case 'alertThresholds.memoryUsage': return 1024;
            case 'alertThresholds.cpuUsage': return 90;
            case 'alertThresholds.errorRate': return 0.1;
            default: return mockThresholds;
          }
        })
      });
      
      const newManager = new AlertManager(testGoalieDir, outputChannel);
      
      expect(newManager.getThresholds()).toEqual({
        wipLimit: 8,
        fileChangeFrequency: 20,
        memoryUsage: 1024,
        cpuUsage: 90,
        errorRate: 0.1
      });
    });
  });

  describe('notification system', () => {
    it('should show information messages', () => {
      const showInfoSpy = jest.spyOn(mockVscode.window, 'showInformationMessage');
      
      alertManager.showInfo('Test information message');
      
      expect(showInfoSpy).toHaveBeenCalledWith('Test information message');
    });

    it('should show warning messages', () => {
      const showWarningSpy = jest.spyOn(mockVscode.window, 'showWarningMessage');
      
      alertManager.showWarning('Test warning message');
      
      expect(showWarningSpy).toHaveBeenCalledWith('Test warning message');
    });

    it('should show error messages', () => {
      const showErrorSpy = jest.spyOn(mockVscode.window, 'showErrorMessage');
      
      alertManager.showError('Test error message');
      
      expect(showErrorSpy).toHaveBeenCalledWith('Test error message');
    });

    it('should show status bar message', () => {
      const setStatusBarMessageSpy = jest.spyOn(mockVscode.window, 'setStatusBarMessage');
      
      alertManager.showStatusBarMessage('Test status', 5000);
      
      expect(setStatusBarMessageSpy).toHaveBeenCalledWith('Test status', 5000);
    });
  });

  describe('disposal', () => {
    it('should clean up resources', () => {
      const disposeSpy = jest.spyOn(outputChannel, 'dispose');
      
      alertManager.dispose();
      
      expect(disposeSpy).toHaveBeenCalled();
    });
  });
});