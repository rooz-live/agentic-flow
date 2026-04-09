/**
 * Progress Formatter: Terminal UI with Tree Rendering
 * 
 * Renders hierarchical progress with visual bars, colors, and ETA
 */

import { ProcessingProgress, PhaseProgress, ProgressCalculator } from './index';

export class ProgressFormatter {
  private static readonly COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
  };

  private static readonly SYMBOLS = {
    waiting: '⏸️',
    running: '🔄',
    completed: '✅',
    failed: '❌',
    treeVertical: '│',
    treeBranch: '├─',
    treeEnd: '└─',
    treeSpacer: '  '
  };

  /**
   * Render full pipeline progress as tree
   */
  static renderTree(progress: ProcessingProgress): string {
    const metrics = progress.calculateMetrics();
    const phases = progress.getPhases();
    
    const lines: string[] = [];
    
    // Header with overall progress
    const overallBar = this.renderProgressBar(metrics.overallPercentage, 30);
    const eta = metrics.estimatedTimeRemaining > 0
      ? ` | ETA: ${ProgressCalculator.formatDuration(metrics.estimatedTimeRemaining)}`
      : '';
    
    lines.push(
      `${this.COLORS.bold}📊 Pipeline: ${metrics.overallPercentage.toFixed(1)}% complete${eta}${this.COLORS.reset}`
    );
    lines.push(overallBar);
    
    // Render each phase
    phases.forEach((phase, index) => {
      const isLast = index === phases.length - 1;
      const phaseLines = this.renderPhase(phase, isLast, '');
      lines.push(...phaseLines);
    });
    
    return lines.join('\n');
  }

  /**
   * Render single phase with children
   */
  private static renderPhase(
    phase: PhaseProgress,
    isLast: boolean,
    prefix: string
  ): string[] {
    const lines: string[] = [];
    const percentage = phase.total > 0
      ? ((phase.completed / phase.total) * 100).toFixed(1)
      : '0.0';
    
    // Tree structure characters
    const connector = isLast ? this.SYMBOLS.treeEnd : this.SYMBOLS.treeBranch;
    const childPrefix = isLast
      ? prefix + this.SYMBOLS.treeSpacer + ' '
      : prefix + this.SYMBOLS.treeVertical + ' ';
    
    // Status icon
    const statusIcon = this.SYMBOLS[phase.status] || '•';
    
    // Color based on status
    let color = this.COLORS.gray;
    if (phase.status === 'completed') color = this.COLORS.green;
    else if (phase.status === 'running') color = this.COLORS.cyan;
    else if (phase.status === 'failed') color = this.COLORS.yellow;
    
    // Phase line
    const phaseName = phase.name.charAt(0).toUpperCase() + phase.name.slice(1);
    const counts = `(${phase.completed}/${phase.total})`;
    const progressBar = this.renderProgressBar(parseFloat(percentage), 20);
    
    lines.push(
      `${prefix}${connector} ${color}${phaseName}: ${percentage}% ${counts} ${statusIcon}${this.COLORS.reset}`
    );
    lines.push(`${childPrefix}${progressBar}`);
    
    // Render children if present
    if (phase.children && phase.children.length > 0) {
      phase.children.forEach((child, childIndex) => {
        const isLastChild = childIndex === phase.children!.length - 1;
        const childLines = this.renderPhase(child, isLastChild, childPrefix);
        lines.push(...childLines);
      });
    }
    
    return lines;
  }

  /**
   * Render progress bar
   */
  private static renderProgressBar(percentage: number, width: number = 30): string {
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    let color = this.COLORS.gray;
    if (percentage >= 100) color = this.COLORS.green;
    else if (percentage >= 50) color = this.COLORS.cyan;
    else if (percentage > 0) color = this.COLORS.yellow;
    
    return `${color}[${filledBar}${emptyBar}]${this.COLORS.reset} ${percentage.toFixed(1)}%`;
  }

  /**
   * Render compact single-line progress
   */
  static renderCompact(progress: ProcessingProgress): string {
    const metrics = progress.calculateMetrics();
    const phases = progress.getPhases();
    
    const phaseStatus = phases.map(phase => {
      const percentage = phase.total > 0
        ? ((phase.completed / phase.total) * 100).toFixed(0)
        : '0';
      const icon = this.SYMBOLS[phase.status] || '•';
      return `${phase.name}: ${percentage}% ${icon}`;
    }).join(' | ');
    
    const eta = metrics.estimatedTimeRemaining > 0
      ? ` | ETA: ${ProgressCalculator.formatDuration(metrics.estimatedTimeRemaining)}`
      : '';
    
    return `📊 ${metrics.overallPercentage.toFixed(1)}% | ${phaseStatus}${eta}`;
  }

  /**
   * Clear terminal and move cursor to top
   */
  static clearScreen(): void {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  /**
   * Move cursor up N lines
   */
  static moveCursorUp(lines: number): void {
    process.stdout.write(`\x1b[${lines}A`);
  }

  /**
   * Render progress with auto-refresh (overwrites previous render)
   */
  static renderLive(progress: ProcessingProgress, previousLines: number = 0): number {
    if (previousLines > 0) {
      this.moveCursorUp(previousLines);
    }
    
    const output = this.renderTree(progress);
    process.stdout.write(output + '\n');
    
    return output.split('\n').length;
  }
}
