#!/usr/bin/env tsx
/**
 * Lean Budget Guardrails Manager
 * Enforces budget constraints on file/folder structure
 * Prevents technical debt through size, depth, and count limits
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface GuardrailConfig {
  maxFolderDepth: number;
  maxFileSize: {
    warn: number;      // Bytes - warning threshold
    block: number;     // Bytes - blocking threshold
  };
  maxFilesPerFolder: {
    warn: number;      // Warning threshold
    block: number;     // Blocking threshold
  };
  budgetLimits: {
    totalSize: number; // Total codebase size limit
    totalFiles: number; // Total file count limit
  };
}

export interface GuardrailViolation {
  type: 'depth' | 'file_size' | 'file_count' | 'total_size' | 'total_files';
  severity: 'warning' | 'blocking';
  path: string;
  current: number;
  limit: number;
  message: string;
}

export class BudgetGuardrails {
  private config: GuardrailConfig;
  private codeRoot: string;
  private violations: GuardrailViolation[] = [];
  
  constructor(codeRoot?: string, config?: Partial<GuardrailConfig>) {
    this.codeRoot = codeRoot || process.cwd();
    this.config = {
      maxFolderDepth: config?.maxFolderDepth || 5,
      maxFileSize: config?.maxFileSize || {
        warn: 100 * 1024 * 1024,    // 100MB
        block: 1024 * 1024 * 1024   // 1GB
      },
      maxFilesPerFolder: config?.maxFilesPerFolder || {
        warn: 10000,
        block: 50000
      },
      budgetLimits: config?.budgetLimits || {
        totalSize: 10 * 1024 * 1024 * 1024,  // 10GB
        totalFiles: 1000000                    // 1M files
      }
    };
  }
  
  /**
   * Validate entire codebase structure
   */
  async validateStructure(): Promise<{
    valid: boolean;
    violations: GuardrailViolation[];
    summary: {
      totalFiles: number;
      totalSize: number;
      maxDepth: number;
      warnings: number;
      blocks: number;
    };
  }> {
    this.violations = [];
    
    const summary = {
      totalFiles: 0,
      totalSize: 0,
      maxDepth: 0,
      warnings: 0,
      blocks: 0
    };
    
    // Scan entire structure
    await this.scanDirectory(this.codeRoot, 0, summary);
    
    // Check total limits
    this.checkTotalLimits(summary);
    
    // Categorize violations
    for (const violation of this.violations) {
      if (violation.severity === 'warning') {
        summary.warnings++;
      } else {
        summary.blocks++;
      }
    }
    
    return {
      valid: summary.blocks === 0,
      violations: this.violations,
      summary
    };
  }
  
  /**
   * Recursively scan directory
   */
  private async scanDirectory(dirPath: string, depth: number, summary: { totalFiles: number; totalSize: number; maxDepth: number }): Promise<void> {
    // Check depth
    if (depth > this.config.maxFolderDepth) {
      this.violations.push({
        type: 'depth',
        severity: 'blocking',
        path: dirPath,
        current: depth,
        limit: this.config.maxFolderDepth,
        message: `Folder depth ${depth} exceeds maximum ${this.config.maxFolderDepth}`
      });
      return; // Don't scan deeper
    }
    
    if (depth > summary.maxDepth) {
      summary.maxDepth = depth;
    }
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      let fileCount = 0;
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip hidden/system directories
        if (entry.name.startsWith('.') && entry.name !== '.goalie') {
          continue;
        }
        
        // Skip node_modules, .git, etc.
        if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, depth + 1, summary);
        } else if (entry.isFile()) {
          fileCount++;
          summary.totalFiles++;
          
          // Check file size
          const stats = fs.statSync(fullPath);
          summary.totalSize += stats.size;
          
          if (stats.size >= this.config.maxFileSize.block) {
            this.violations.push({
              type: 'file_size',
              severity: 'blocking',
              path: fullPath,
              current: stats.size,
              limit: this.config.maxFileSize.block,
              message: `File size ${this.formatBytes(stats.size)} exceeds blocking limit ${this.formatBytes(this.config.maxFileSize.block)}`
            });
          } else if (stats.size >= this.config.maxFileSize.warn) {
            this.violations.push({
              type: 'file_size',
              severity: 'warning',
              path: fullPath,
              current: stats.size,
              limit: this.config.maxFileSize.warn,
              message: `File size ${this.formatBytes(stats.size)} exceeds warning limit ${this.formatBytes(this.config.maxFileSize.warn)}`
            });
          }
        }
      }
      
      // Check file count per folder
      if (fileCount >= this.config.maxFilesPerFolder.block) {
        this.violations.push({
          type: 'file_count',
          severity: 'blocking',
          path: dirPath,
          current: fileCount,
          limit: this.config.maxFilesPerFolder.block,
          message: `Folder contains ${fileCount} files, exceeds blocking limit ${this.config.maxFilesPerFolder.block}`
        });
      } else if (fileCount >= this.config.maxFilesPerFolder.warn) {
        this.violations.push({
          type: 'file_count',
          severity: 'warning',
          path: dirPath,
          current: fileCount,
          limit: this.config.maxFilesPerFolder.warn,
          message: `Folder contains ${fileCount} files, exceeds warning limit ${this.config.maxFilesPerFolder.warn}`
        });
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  /**
   * Check total budget limits
   */
  private checkTotalLimits(summary: { totalFiles: number; totalSize: number }): void {
    // Check total size
    if (summary.totalSize >= this.config.budgetLimits.totalSize) {
      this.violations.push({
        type: 'total_size',
        severity: 'blocking',
        path: this.codeRoot,
        current: summary.totalSize,
        limit: this.config.budgetLimits.totalSize,
        message: `Total codebase size ${this.formatBytes(summary.totalSize)} exceeds limit ${this.formatBytes(this.config.budgetLimits.totalSize)}`
      });
    } else if (summary.totalSize >= this.config.budgetLimits.totalSize * 0.8) {
      this.violations.push({
        type: 'total_size',
        severity: 'warning',
        path: this.codeRoot,
        current: summary.totalSize,
        limit: this.config.budgetLimits.totalSize,
        message: `Total codebase size ${this.formatBytes(summary.totalSize)} is approaching limit ${this.formatBytes(this.config.budgetLimits.totalSize)}`
      });
    }
    
    // Check total files
    if (summary.totalFiles >= this.config.budgetLimits.totalFiles) {
      this.violations.push({
        type: 'total_files',
        severity: 'blocking',
        path: this.codeRoot,
        current: summary.totalFiles,
        limit: this.config.budgetLimits.totalFiles,
        message: `Total file count ${summary.totalFiles} exceeds limit ${this.config.budgetLimits.totalFiles}`
      });
    } else if (summary.totalFiles >= this.config.budgetLimits.totalFiles * 0.8) {
      this.violations.push({
        type: 'total_files',
        severity: 'warning',
        path: this.codeRoot,
        current: summary.totalFiles,
        limit: this.config.budgetLimits.totalFiles,
        message: `Total file count ${summary.totalFiles} is approaching limit ${this.config.budgetLimits.totalFiles}`
      });
    }
  }
  
  /**
   * Validate before file operation
   */
  async validateBeforeOperation(operation: 'create' | 'move' | 'copy', filePath: string, targetPath?: string): Promise<{
    allowed: boolean;
    violations: GuardrailViolation[];
  }> {
    const violations: GuardrailViolation[] = [];
    
    // Check file size if creating/moving/copying
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      if (stats.size >= this.config.maxFileSize.block) {
        violations.push({
          type: 'file_size',
          severity: 'blocking',
          path: filePath,
          current: stats.size,
          limit: this.config.maxFileSize.block,
          message: `File too large for operation: ${this.formatBytes(stats.size)}`
        });
      }
    }
    
    // Check target folder depth
    if (targetPath) {
      const targetDir = path.dirname(targetPath);
      const depth = targetDir.split(path.sep).length - this.codeRoot.split(path.sep).length;
      
      if (depth > this.config.maxFolderDepth) {
        violations.push({
          type: 'depth',
          severity: 'blocking',
          path: targetDir,
          current: depth,
          limit: this.config.maxFolderDepth,
          message: `Target folder depth ${depth} exceeds maximum ${this.config.maxFolderDepth}`
        });
      }
      
      // Check target folder file count
      if (fs.existsSync(targetDir)) {
        const files = fs.readdirSync(targetDir).filter(f => {
          const fullPath = path.join(targetDir, f);
          return fs.statSync(fullPath).isFile();
        });
        
        if (files.length >= this.config.maxFilesPerFolder.block) {
          violations.push({
            type: 'file_count',
            severity: 'blocking',
            path: targetDir,
            current: files.length,
            limit: this.config.maxFilesPerFolder.block,
            message: `Target folder already contains ${files.length} files`
          });
        }
      }
    }
    
    return {
      allowed: violations.filter(v => v.severity === 'blocking').length === 0,
      violations
    };
  }
  
  /**
   * Get budget status
   */
  async getBudgetStatus(): Promise<{
    used: {
      size: number;
      files: number;
      depth: number;
    };
    limits: {
      size: number;
      files: number;
      depth: number;
    };
    utilization: {
      size: number;  // Percentage
      files: number;  // Percentage
      depth: number; // Percentage
    };
  }> {
    const validation = await this.validateStructure();
    
    return {
      used: {
        size: validation.summary.totalSize,
        files: validation.summary.totalFiles,
        depth: validation.summary.maxDepth
      },
      limits: {
        size: this.config.budgetLimits.totalSize,
        files: this.config.budgetLimits.totalFiles,
        depth: this.config.maxFolderDepth
      },
      utilization: {
        size: (validation.summary.totalSize / this.config.budgetLimits.totalSize) * 100,
        files: (validation.summary.totalFiles / this.config.budgetLimits.totalFiles) * 100,
        depth: (validation.summary.maxDepth / this.config.maxFolderDepth) * 100
      }
    };
  }
  
  /**
   * Format bytes to human-readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
   * Generate budget report
   */
  async generateReport(): Promise<string> {
    const validation = await this.validateStructure();
    const budget = await this.getBudgetStatus();
    
    const lines: string[] = [];
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('BUDGET GUARDRAILS REPORT');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    
    lines.push('BUDGET UTILIZATION:');
    lines.push(`  Total Size: ${this.formatBytes(budget.used.size)} / ${this.formatBytes(budget.limits.size)} (${budget.utilization.size.toFixed(1)}%)`);
    lines.push(`  Total Files: ${budget.used.files.toLocaleString()} / ${budget.limits.files.toLocaleString()} (${budget.utilization.files.toFixed(1)}%)`);
    lines.push(`  Max Depth: ${budget.used.depth} / ${budget.limits.depth} (${budget.utilization.depth.toFixed(1)}%)`);
    lines.push('');
    
    lines.push(`VIOLATIONS: ${validation.violations.length} total`);
    lines.push(`  Warnings: ${validation.summary.warnings}`);
    lines.push(`  Blocking: ${validation.summary.blocks}`);
    lines.push('');
    
    if (validation.violations.length > 0) {
      lines.push('VIOLATION DETAILS:');
      for (const violation of validation.violations.slice(0, 20)) {
        const icon = violation.severity === 'blocking' ? '🔴' : '🟡';
        lines.push(`  ${icon} [${violation.type}] ${violation.message}`);
        lines.push(`     Path: ${violation.path}`);
      }
      if (validation.violations.length > 20) {
        lines.push(`  ... and ${validation.violations.length - 20} more violations`);
      }
    }
    
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return lines.join('\n');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const guardrails = new BudgetGuardrails();
  const command = process.argv[2] || 'validate';
  
  switch (command) {
    case 'validate':
      guardrails.validateStructure().then(result => {
        console.log(guardrails.generateReport());
        process.exit(result.valid ? 0 : 1);
      });
      break;
    case 'status':
      guardrails.getBudgetStatus().then(status => {
        console.log(JSON.stringify(status, null, 2));
      });
      break;
    case 'check':
      const filePath = process.argv[3];
      const targetPath = process.argv[4];
      guardrails.validateBeforeOperation('create', filePath, targetPath).then(result => {
        if (result.allowed) {
          console.log('✓ Operation allowed');
        } else {
          console.log('✗ Operation blocked:');
          for (const violation of result.violations) {
            console.log(`  - ${violation.message}`);
          }
        }
        process.exit(result.allowed ? 0 : 1);
      });
      break;
    default:
      console.log('Usage: budget-guardrails.ts [validate|status|check]');
  }
}
