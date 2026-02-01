#!/usr/bin/env npx tsx
/**
 * WSJF Implementation CLI Commands
 *
 * Provides easy-to-use commands for:
 * - Swarm binding coordination
 * - MCP/MPP registry management
 * - TUI monitoring
 * - ROAM tracking
 *
 * Usage:
 *   npx tsx src/cli/wsjf-commands.ts <command> [options]
 *
 * Commands:
 *   swarm init              - Initialize swarm with binding coordinator
 *   swarm bind <agentId>    - Bind agent to swarm
 *   swarm status            - Get swarm status with metrics
 *   swarm health            - Run health check
 *   mcp route <task>        - Route task to optimal model
 *   mcp session create      - Create new session
 *   mcp stats               - View MPP registry stats
 *   monitor                 - Start TUI monitor
 *   roam update             - Update ROAM tracker
 *   roam status             - View ROAM metrics
 */
interface CommandHandler {
    description: string;
    usage: string;
    handler: (args: string[]) => Promise<void> | void;
}
declare const commands: Record<string, CommandHandler>;
declare function main(): Promise<void>;
export { commands, main };
//# sourceMappingURL=wsjf-commands.d.ts.map