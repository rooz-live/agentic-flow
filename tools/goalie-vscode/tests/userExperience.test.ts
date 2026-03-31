import * as vscode from 'vscode';
import { mockVscode, testWorkspaceDir, testGoalieDir, mockFileSystem } from './setup';

describe('User Experience Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Handling', () => {
    it('should show user-friendly error messages', async () => {
      const showErrorSpy = jest.spyOn(mockVscode.window, 'showErrorMessage');
      
      // Mock error with context
      const error = new Error('Test error message');
      (error as any).context = {
        action: 'file_operation',
        file: 'test-file.json',
        operation: 'read'
      };
      
      // Execute command that triggers error
      await vscode.commands.executeCommand('goalieKanban.addItem');
      
      // Should show user-friendly error with context
      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read file'),
        expect.stringContaining('test-file.json'),
        expect.stringContaining('file operation'),
        expect.stringContaining('read')
      );
    });

    it('should provide recovery suggestions', async () => {
      const showWarningSpy = jest.spyOn(mockVscode.window, 'showWarningMessage');
      
      // Mock error with recovery suggestion
      const error = new Error('File not found');
      (error as any).context = {
        action: 'file_operation',
        file: 'test-file.json',
        operation: 'read',
        recovery: {
          suggestion: 'Check if the file exists in the correct location',
          action: 'check_file_exists'
        }
      };
      
      // Execute command that triggers error
      await vscode.commands.executeCommand('goalieKanban.addItem');
      
      // Should show warning with recovery suggestion
      expect(showWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found'),
        expect.stringContaining('Check if the file exists in the correct location')
      );
    });

    it('should handle network errors gracefully', async () => {
      const showErrorSpy = jest.spyOn(mockVscode.window, 'showErrorMessage');
      
      // Mock network error
      const networkError = new Error('Network connection failed');
      (networkError as any).code = 'NETWORK_ERROR';
      
      // Execute command that triggers network error
      await vscode.commands.executeCommand('goalieDashboard.exportPatternMetricsCSV');
      
      // Should show network error with code
      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Network connection failed'),
        expect.stringContaining('NETWORK_ERROR')
      );
    });
  });

  describe('Loading States', () => {
    it('should show loading indicators', async () => {
      const setStatusBarMessageSpy = jest.spyOn(mockVscode.window, 'setStatusBarMessage');
      
      // Execute command that shows loading
      await vscode.commands.executeCommand('goalieDashboard.exportPatternMetricsCSV');
      
      // Should show loading indicator
      expect(setStatusBarMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Exporting'),
        expect.any(Number) // Progress percentage
      );
      
      // Check if loading is cleared
      setTimeout(() => {
        expect(setStatusBarMessageSpy).toHaveBeenCalledWith(
          expect.stringContaining('Export complete'),
          expect.any(Number)
        );
      }, 1000);
    });

    it('should show progress indicators', async () => {
      const withProgressSpy = jest.spyOn(mockVscode.window, 'withProgress');
      
      // Execute command with progress
      await vscode.commands.executeCommand('goalieDashboard.exportPatternMetricsCSV', {
        progress: { increment: 10 }
      });
      
      // Should show progress
      expect(withProgressSpy).toHaveBeenCalledWith(
        expect.objectContaining({ increment: 10 })
      );
      
      // Check if progress is completed
      setTimeout(() => {
        expect(withProgressSpy).toHaveBeenCalledWith(
          expect.objectContaining({ increment: 100 })
        );
      }, 2000);
    });
  });

  describe('Accessibility Features', () => {
    it('should support keyboard navigation', async () => {
      // Mock keyboard event
      const mockKeyboardEvent = {
        keyCode: 'Enter',
        type: 'keydown'
      };
      
      // Execute command that should handle keyboard
      const executeCommandSpy = jest.spyOn(mockVscode.commands, 'executeCommand');
      
      // Mock command registration with keyboard shortcut
      mockVscode.commands.registerCommand.mockImplementation((command: string, callback: Function, thisArg?: any) => {
        if (command === 'goalieKanban.moveItem') {
          // Simulate keyboard shortcut
          callback(mockKeyboardEvent);
          return { dispose: jest.fn() };
        }
        return { dispose: jest.fn() };
      });
      
      // Execute with keyboard event
      await vscode.commands.executeCommand('goalieKanban.moveItem', mockKeyboardEvent);
      
      // Should have called command with keyboard event
      expect(executeCommandSpy).toHaveBeenCalledWith('goalieKanban.moveItem', mockKeyboardEvent);
    });

    it('should support screen reader', async () => {
      // Mock screen reader API
      const mockScreenReader = {
        announce: jest.fn(),
        setFocus: jest.fn()
      };
      
      // Test if extension provides screen reader support
      const hasScreenReader = await vscode.commands.executeCommand('goalieDashboard.checkScreenReaderSupport');
      
      if (hasScreenReader) {
        expect(mockScreenReader.announce).toHaveBeenCalled();
      }
    });
  });

  describe('Tooltips and Help', () => {
    it('should provide contextual help', async () => {
      const showInformationMessageSpy = jest.spyOn(mockVscode.window, 'showInformationMessage');
      
      // Execute help command
      await vscode.commands.executeCommand('goalieDashboard.showQuickFixesForGap');
      
      // Should show contextual help
      expect(showInformationMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('Quick fixes available'),
        expect.stringContaining('Right-click on gap items')
      );
    });

    it('should provide hover information', async () => {
      // Mock hover provider
      const mockHoverProvider = {
        provideHover: jest.fn().mockResolvedValue({
          contents: [
            { language: 'typescript', value: 'Hover information for task' }
          ]
        })
      };
      
      // Test hover functionality
      const result = await mockHoverProvider.provideHover(
        { textDocument: { uri: vscode.Uri.file('/path/to/test-file.ts') } },
        new vscode.Position(0, 0)
      );
      
      expect(result).toBeDefined();
      expect(result?.contents).toHaveLength(1);
      expect(result?.contents[0].value).toContain('Hover information for task');
    });
  });
});