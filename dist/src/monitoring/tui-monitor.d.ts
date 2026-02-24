#!/usr/bin/env npx tsx
/**
 * TUI Status Monitor with Visual Metaphors
 *
 * P1-4 (WSJF 4.6): Real-time terminal UI for swarm monitoring
 *
 * Features:
 * - Live agent status grid with health indicators
 * - Real-time progress bars for tasks
 * - Network topology visualization (ASCII art)
 * - Performance metrics streaming
 * - Interactive controls (pause/resume/scale)
 * - ROAM metrics integration
 * - WSJF prioritization display
 *
 * Technology: Blessed (Node.js TUI library)
 * Fallback: Pure terminal output for compatibility
 * Future: Rio Terminal (WGPU) + Three.js for 3D visualization
 */
interface MonitorConfig {
    refreshInterval: number;
    enableColors: boolean;
    compactMode: boolean;
}
export declare class TUIMonitor {
    private screen;
    private coordinator;
    private config;
    private refreshTimer?;
    private agentGrid?;
    private taskList?;
    private metricsBar?;
    private topologyBox?;
    private logBox?;
    private commandBar?;
    constructor(config?: Partial<MonitorConfig>);
    private setupUI;
    private setupKeybindings;
    refresh(): void;
    private renderNoSwarm;
    private renderAgentGrid;
    private renderTaskList;
    private renderMetrics;
    private renderTopology;
    private generateTopologyASCII;
    private getStatusIcon;
    private getTaskStatusIcon;
    private getHealthBar;
    private getTimeAgo;
    private getTaskDuration;
    log(message: string): void;
    private startRefresh;
    start(): void;
    stop(): void;
}
export default TUIMonitor;
//# sourceMappingURL=tui-monitor.d.ts.map