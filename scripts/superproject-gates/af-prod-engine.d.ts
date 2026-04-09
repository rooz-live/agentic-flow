#!/usr/bin/env npx tsx
/**
 * AFProdEngine - Agentic Flow Production Engine
 *
 * Orchestrates circle ceremonies with learned skills, MCP integration,
 * and episode capture for continuous learning.
 */
declare class AFProdEngine {
    private context;
    constructor(circle: string, ceremony: string, mode: string, skillsJson: string);
    /**
     * Check MCP server health before execution
     */
    private checkMCPHealth;
    /**
     * Select best execution strategy based on learned skills
     */
    private selectStrategy;
    /**
     * Route ceremony to MCP tools if available
     */
    private routeToMCP;
    /**
     * Map ceremony names to yo.life dimensional tasks
     */
    private mapCeremonyToTask;
    /**
     * Fallback CLI execution
     */
    private executeCLI;
    /**
     * Main execution flow
     */
    execute(): Promise<number>;
    /**
     * Emit safe_degrade pattern event
     */
    private emitSafeDegrade;
}
export default AFProdEngine;
//# sourceMappingURL=af-prod-engine.d.ts.map