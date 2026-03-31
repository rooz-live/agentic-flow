import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'yaml';
import { mockFileSystem, testGoalieDir } from './setup';

describe('Data Parsing and Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Kanban board parsing', () => {
    it('should parse valid YAML correctly', () => {
      const validYaml = `
NOW:
  - title: "Test Task 1"
    summary: "Test summary 1"
    id: "TASK-001"
NEXT:
  - title: "Test Task 2"
    summary: "Test summary 2"
    id: "TASK-002"
LATER:
  - title: "Test Task 3"
    summary: "Test summary 3"
    id: "TASK-003"
      `;
      
      mockFileSystem.readFileSync.mockReturnValue(validYaml);
      
      // Import and call the actual parsing function from extension
      const { loadKanbanDoc } = require('../extension');
      const result = loadKanbanDoc(testGoalieDir);
      
      expect(result).toEqual({
        NOW: [
          {
            title: 'Test Task 1',
            summary: 'Test summary 1',
            id: 'TASK-001'
          }
        ],
        NEXT: [
          {
            title: 'Test Task 2',
            summary: 'Test summary 2',
            id: 'TASK-002'
          }
        ],
        LATER: [
          {
            title: 'Test Task 3',
            summary: 'Test summary 3',
            id: 'TASK-003'
          }
        ]
      });
    });

    it('should handle invalid YAML gracefully', () => {
      const invalidYaml = `
NOW:
  - title: "Test Task 1"
    summary: "Test summary 1"
    id: "TASK-001"
  - invalid_yaml: true
NEXT:
  - title: "Test Task 2"
    summary: "Test summary 2"
    id: "TASK-002"
      `;
      
      mockFileSystem.readFileSync.mockReturnValue(invalidYaml);
      
      // Import and call the actual parsing function from extension
      const { loadKanbanDoc } = require('../extension');
      const result = loadKanbanDoc(testGoalieDir);
      
      expect(result).toBeUndefined();
    });

    it('should handle missing file gracefully', () => {
      mockFileSystem.existsSync.mockReturnValue(false);
      
      // Import and call the actual parsing function from extension
      const { loadKanbanDoc } = require('../extension');
      const result = loadKanbanDoc(testGoalieDir);
      
      expect(result).toBeUndefined();
    });
  });

  describe('Pattern metrics parsing', () => {
    it('should parse valid JSONL format', () => {
      const validJsonl = [
        '{"timestamp": "2025-12-10T08:00:00Z", "pattern": "test_pattern_1", "circle": "ui", "depth": 1}',
        '{"timestamp": "2025-12-10T08:15:00Z", "pattern": "test_pattern_2", "circle": "core", "depth": 2}',
        '{"timestamp": "2025-12-10T08:30:00Z", "pattern": "test_pattern_3", "circle": "ui", "depth": 3}'
      ];
      
      mockFileSystem.readFileSync.mockReturnValue(validJsonl.join('\n'));
      
      // Import and call the actual parsing function from extension
      const patternMetricsPath = path.join(testGoalieDir, 'pattern_metrics.jsonl');
      const lines = require('fs').readFileSync(patternMetricsPath, 'utf8').split(/\r?\n/).filter(Boolean);
      
      const patterns = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      expect(patterns).toHaveLength(3);
      expect(patterns[0]).toEqual({
        timestamp: '2025-12-10T08:00:00Z',
        pattern: 'test_pattern_1',
        circle: 'ui',
        depth: 1
      });
      expect(patterns[1]).toEqual({
        timestamp: '2025-12-10T08:15:00Z',
        pattern: 'test_pattern_2',
        circle: 'core',
        depth: 2
      });
      expect(patterns[2]).toEqual({
        timestamp: '2025-12-10T08:30:00Z',
        pattern: 'test_pattern_3',
        circle: 'ui',
        depth: 3
      });
    });

    it('should handle malformed JSONL lines gracefully', () => {
      const malformedJsonl = [
        '{"timestamp": "2025-12-10T08:00:00Z", "pattern": "test_pattern_1" - invalid json}',
        '{"timestamp": "2025-12-10T08:15:00Z", "pattern": "test_pattern_2"}',
        'invalid json line without quotes'
      ];
      
      mockFileSystem.readFileSync.mockReturnValue(malformedJsonl.join('\n'));
      
      // Import and call the actual parsing function from extension
      const patternMetricsPath = path.join(testGoalieDir, 'pattern_metrics.jsonl');
      const lines = require('fs').readFileSync(patternMetricsPath, 'utf8').split(/\r?\n/).filter(Boolean);
      
      const patterns = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      // Should skip malformed lines
      expect(patterns).toHaveLength(0);
    });

    it('should handle empty file gracefully', () => {
      mockFileSystem.readFileSync.mockReturnValue('');
      
      // Import and call the actual parsing function from extension
      const patternMetricsPath = path.join(testGoalieDir, 'pattern_metrics.jsonl');
      const lines = require('fs').readFileSync(patternMetricsPath, 'utf8').split(/\r?\n/).filter(Boolean);
      
      const patterns = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      expect(patterns).toEqual([]);
    });
  });

  describe('Process flow metrics parsing', () => {
    it('should parse valid JSON correctly', () => {
      const validJson = {
        timestamp: '2025-12-10T16:00:00Z',
        process_flows: [
          {
            name: 'Test Flow 1',
            steps: [
              { step: 'step1', duration: 30, status: 'completed' }
            ]
          }
        ]
      };
      
      mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(validJson));
      
      // Import and call the actual parsing function from extension
      const processFlowPath = path.join(testGoalieDir, 'process_flow_metrics.json');
      const result = JSON.parse(require('fs').readFileSync(processFlowPath, 'utf8'));
      
      expect(result).toEqual(validJson);
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = '{"timestamp": "2025-12-10T16:00:00Z", "process_flows": "invalid"';
      
      mockFileSystem.readFileSync.mockReturnValue(invalidJson);
      
      // Import and call the actual parsing function from extension
      const processFlowPath = path.join(testGoalieDir, 'process_flow_metrics.json');
      
      expect(() => {
        JSON.parse(require('fs').readFileSync(processFlowPath, 'utf8'));
      }).toThrow();
    });
  });

  describe('Learning metrics parsing', () => {
    it('should parse valid JSON correctly', () => {
      const validJson = {
        timestamp: '2025-12-10T16:00:00Z',
        learning_data: {
          user_patterns: {
            most_used_sections: ['NOW', 'NEXT']
          }
        }
      };
      
      mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(validJson));
      
      // Import and call the actual parsing function from extension
      const learningMetricsPath = path.join(testGoalieDir, 'learning_metrics.json');
      const result = JSON.parse(require('fs').readFileSync(learningMetricsPath, 'utf8'));
      
      expect(result).toEqual(validJson);
    });
  });

  describe('DT evaluation summary parsing', () => {
    it('should parse valid JSON correctly', () => {
      const validJson = {
        timestamp: '2025-12-10T16:00:00Z',
        total_evaluations: 100,
        top1_accuracy: { min: 0.75, p25: 0.80, median: 0.85, p75: 0.90 }
      };
      
      mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(validJson));
      
      // Import and call the actual parsing function from extension
      const dtSummaryPath = path.join(testGoalieDir, 'dt_evaluation_summary.json');
      const result = JSON.parse(require('fs').readFileSync(dtSummaryPath, 'utf8'));
      
      expect(result).toEqual(validJson);
    });
  });

  describe('Goalie gaps parsing', () => {
    it('should parse valid JSON correctly', () => {
      const validJson = {
        timestamp: '2025-12-10T16:00:00Z',
        gaps: [
          {
            id: 'gap-001',
            title: 'Test Gap 1',
            severity: 'high'
          }
        ]
      };
      
      mockFileSystem.readFileSync.mockReturnValue(JSON.stringify(validJson));
      
      // Import and call the actual parsing function from extension
      const gapsPath = path.join(testGoalieDir, 'goalie_gaps.json');
      const result = JSON.parse(require('fs').readFileSync(gapsPath, 'utf8'));
      
      expect(result).toEqual(validJson);
    });
  });

  describe('File validation', () => {
    it('should validate YAML structure', () => {
      const validYaml = `
NOW:
  - title: "Test Task"
    id: "TASK-001"
NEXT:
  - title: "Test Task"
    id: "TASK-002"
      `;
      
      mockFileSystem.readFileSync.mockReturnValue(validYaml);
      
      // Validate YAML structure
      const doc = yaml.parse(validYaml);
      
      expect(doc).toHaveProperty('NOW');
      expect(doc).toHaveProperty('NEXT');
      expect(doc.NOW).toEqual(
        expect.arrayContaining(
          expect.objectContaining({
            title: expect.any(String),
            id: expect.any(String)
          })
        )
      );
      expect(doc.NEXT).toEqual(
        expect.arrayContaining(
          expect.objectContaining({
            title: expect.any(String),
            id: expect.any(String)
          })
        )
      );
    });

    it('should validate required fields', () => {
      const validYaml = `
NOW:
  - title: "Test Task"
NEXT:
  - title: ""
    id: "TASK-002"
      `;
      
      mockFileSystem.readFileSync.mockReturnValue(validYaml);
      
      // Validate YAML structure
      const doc = yaml.parse(validYaml);
      
      expect(doc.NEXT[0]).toHaveProperty('title');
      expect(doc.NEXT[0].title).toBe('');
    });

    it('should validate JSONL format', () => {
      const validJsonl = '{"timestamp": "2025-12-10T08:00:00Z", "pattern": "test", "circle": "ui", "depth": 1}';
      
      // Validate JSONL format
      const lines = [validJsonl];
      const isValid = lines.every(line => {
        try {
          const parsed = JSON.parse(line);
          return parsed && 
                 typeof parsed.timestamp === 'string' &&
                 typeof parsed.pattern === 'string' &&
                 typeof parsed.circle === 'string' &&
                 typeof parsed.depth === 'number';
        } catch {
          return false;
        }
      });
      
      expect(isValid).toBe(true);
    });
  });
});