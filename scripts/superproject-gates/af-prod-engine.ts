#!/usr/bin/env npx tsx
/**
 * AFProdEngine - Agentic Flow Production Engine
 * 
 * Orchestrates circle ceremonies with learned skills, MCP integration,
 * and episode capture for continuous learning.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parseArgs } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Skill {
  skill_id: string;
  description: string;
  success_rate: number;
  uses: number;
  avg_reward: number;
  avg_latency_ms: number;
}

interface SkillContext {
  skills: Skill[];
  total_skills: number;
  circle: string;
  ceremony: string;
}

interface MCPHealthCheck {
  status: 'healthy' | 'degraded' | 'unavailable';
  servers: Array<{ name: string; status: string }>;
  tools_available: number;
}

interface ExecutionContext {
  circle: string;
  ceremony: string;
  mode: 'advisory' | 'mutate' | 'safe_degrade';
  skills: SkillContext;
  mcp_health: MCPHealthCheck;
  start_time: number;
}

class AFProdEngine {
  private context: ExecutionContext;

  constructor(
    circle: string,
    ceremony: string,
    mode: string,
    skillsJson: string
  ) {
    const skills: SkillContext = JSON.parse(skillsJson);
    const mcp_health = this.checkMCPHealth();

    this.context = {
      circle,
      ceremony,
      mode: mode as any,
      skills,
      mcp_health,
      start_time: Date.now(),
    };
  }

  /**
   * Check MCP server health before execution
   */
  private checkMCPHealth(): MCPHealthCheck {
    try {
      const result = execSync('npx agentdb mcp health --json', {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      const health = JSON.parse(result);
      return {
        status: 'healthy',
        servers: health.servers || [],
        tools_available: health.tools_available || 0,
      };
    } catch (error) {
      return {
        status: 'unavailable',
        servers: [],
        tools_available: 0,
      };
    }
  }

  /**
   * Select best execution strategy based on learned skills
   */
  private selectStrategy(): Skill | null {
    const { skills } = this.context;

    if (!skills.skills || skills.skills.length === 0) {
      return null;
    }

    // Find skill with highest success rate and reward
    return skills.skills.reduce((best, current) => {
      const bestScore = best.success_rate * best.avg_reward;
      const currentScore = current.success_rate * current.avg_reward;
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Route ceremony to MCP tools if available
   */
  private async routeToMCP(): Promise<boolean> {
    const { ceremony, circle, mcp_health } = this.context;

    if (mcp_health.status !== 'healthy') {
      console.log('⚠️  MCP unavailable - using fallback execution');
      return false;
    }

    // Map ceremonies to MCP tools
    const toolMap: Record<string, string> = {
      standup: 'circle_standup_tool',
      review: 'quality_review_tool',
      wsjf: 'priority_scoring_tool',
      retro: 'retrospective_tool',
      refine: 'backlog_refinement_tool',
      replenish: 'circle_replenishment_tool',
    };

    const toolName = toolMap[ceremony];
    if (!toolName) {
      return false;
    }

    try {
      console.log(`🔧 Routing to MCP tool: ${toolName}`);
      execSync(
        `npx agentdb mcp call ${toolName} --circle ${circle} --json`,
        {
          encoding: 'utf-8',
          timeout: 30000,
          stdio: 'inherit',
        }
      );
      return true;
    } catch (error) {
      console.log(`⚠️  MCP tool failed: ${error}`);
      return false;
    }
  }

  /**
   * Map ceremony names to yo.life dimensional tasks
   */
  private mapCeremonyToTask(ceremony: string): string {
    // Circle -> Ceremony -> yo.life task mapping:
    // - orchestrator/standup -> temporal (time management)
    // - assessor/wsjf -> goal (value prioritization)
    // - assessor/review -> event (retrospective analysis)
    // - innovator/retro -> barrier (learning obstacles)
    // - analyst/refine -> mindset (cognitive patterns)
    // - seeker/replenish -> cockpit (holistic overview)
    // - intuitive/synthesis -> psychological (sensemaking patterns)
    const ceremonyMap: Record<string, string> = {
      standup: 'temporal',
      wsjf: 'goal',
      review: 'event',
      retro: 'barrier',
      refine: 'mindset',
      replenish: 'cockpit',
      synthesis: 'psychological',
    };

    return ceremonyMap[ceremony] || ceremony;
  }

  /**
   * Fallback CLI execution
   */
  private executeCLI(): number {
    const { circle, ceremony, mode } = this.context;
    const scriptPath = `${__dirname}/../../scripts/ay-yolife-with-skills.sh`;

    if (!existsSync(scriptPath)) {
      console.log('⚠️  Fallback script not found');
      return 1;
    }

    // Map ceremony to yo.life task
    const yolifeTask = this.mapCeremonyToTask(ceremony);

    try {
      console.log(`🔄 Executing via CLI: ${ceremony} (${mode})`);
      // Pass yo.life task (not ceremony) and circle as parameters
      execSync(`${scriptPath} ${yolifeTask} ${circle}`, {
        encoding: 'utf-8',
        stdio: 'inherit',
      });
      return 0;
    } catch (error: any) {
      return error.status || 1;
    }
  }

  /**
   * Main execution flow
   */
  async execute(): Promise<number> {
    const { circle, ceremony, mode } = this.context;

    console.log(`🎯 AFProdEngine: ${circle}/${ceremony}/${mode}`);

    // Step 1: Select strategy from learned skills
    const strategy = this.selectStrategy();
    if (strategy) {
      console.log(`✨ Using learned strategy: ${strategy.description}`);
      console.log(
        `   Success rate: ${(strategy.success_rate * 100).toFixed(1)}% (${strategy.uses} uses)`
      );
    }

    // Step 2: Try MCP routing first
    const mcpSuccess = await this.routeToMCP();
    if (mcpSuccess) {
      console.log('✅ Executed via MCP');
      return 0;
    }

    // Step 3: Fallback to CLI
    const exitCode = this.executeCLI();

    // Step 4: Emit safe_degrade on failure
    if (exitCode !== 0) {
      console.log('⚠️  Emitting safe_degrade event');
      this.emitSafeDegrade(exitCode);
    }

    const duration = Date.now() - this.context.start_time;
    console.log(`⏱️  Execution time: ${(duration / 1000).toFixed(2)}s`);

    return exitCode;
  }

  /**
   * Emit safe_degrade pattern event
   */
  private emitSafeDegrade(exitCode: number): void {
    const event = {
      pattern: 'safe_degrade',
      circle: this.context.circle,
      ceremony: this.context.ceremony,
      exit_code: exitCode,
      mcp_status: this.context.mcp_health.status,
      timestamp: new Date().toISOString(),
    };

    // Write to pattern metrics (if available)
    try {
      const metricsPath = `${__dirname}/../../.goalie/pattern_metrics.jsonl`;
      writeFileSync(metricsPath, JSON.stringify(event) + '\n', {
        flag: 'a',
      });
    } catch (error) {
      console.error('Failed to write safe_degrade event:', error);
    }
  }
}

// CLI Entry Point
async function main() {
  const { values } = parseArgs({
    options: {
      circle: { type: 'string', short: 'c' },
      ceremony: { type: 'string', short: 'e' },
      mode: { type: 'string', short: 'm', default: 'advisory' },
      skills: { type: 'string', short: 's', default: '{"skills":[]}' },
    },
    allowPositionals: false,
    strict: true,
  });

  if (!values.circle || !values.ceremony) {
    console.error('Usage: af-prod-engine --circle <name> --ceremony <name>');
    process.exit(1);
  }

  const engine = new AFProdEngine(
    values.circle,
    values.ceremony,
    values.mode || 'advisory',
    values.skills || '{"skills":[]}'
  );

  const exitCode = await engine.execute();
  process.exit(exitCode);
}

// ES module entry point check
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default AFProdEngine;
