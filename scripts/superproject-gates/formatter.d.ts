/**
 * Progress Formatter: Terminal UI with Tree Rendering
 *
 * Renders hierarchical progress with visual bars, colors, and ETA
 */
import { ProcessingProgress } from './index';
export declare class ProgressFormatter {
    private static readonly COLORS;
    private static readonly SYMBOLS;
    /**
     * Render full pipeline progress as tree
     */
    static renderTree(progress: ProcessingProgress): string;
    /**
     * Render single phase with children
     */
    private static renderPhase;
    /**
     * Render progress bar
     */
    private static renderProgressBar;
    /**
     * Render compact single-line progress
     */
    static renderCompact(progress: ProcessingProgress): string;
    /**
     * Clear terminal and move cursor to top
     */
    static clearScreen(): void;
    /**
     * Move cursor up N lines
     */
    static moveCursorUp(lines: number): void;
    /**
     * Render progress with auto-refresh (overwrites previous render)
     */
    static renderLive(progress: ProcessingProgress, previousLines?: number): number;
}
//# sourceMappingURL=formatter.d.ts.map