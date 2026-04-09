/**
 * Dimensional Menu Builder
 * 
 * Extends MenuBuilder with real-time skill integration, dimensional pivots,
 * and expandable sections with lazy-loaded skills from agentdb
 * 
 * Features:
 * - Build menus with circle skill context
 * - Pivot dimensions while preserving filters
 * - Lazy-load skills per menu section
 * - Update MCP tool availability per dimension
 */

import { MenuBuilder, MenuBuilderConfig } from './menu-builder.js';
import { NavigationNode, MenuTree } from './types.js';
import { Dimension, ViewMode } from '../cli/yolife-cockpit.js';
import { EventEmitter } from 'events';
import { execSync } from 'child_process';

// ============================================================================
// Extended Types
// ============================================================================

export interface DimensionalNavigationNode extends NavigationNode {
  dimension?: Dimension;
  viewMode?: ViewMode;
  skillContext?: {
    circleId: string;
    relevantSkills: SkillSummary[];
    successRate: number;
  };
  mcpTools?: {
    serverId: string;
    availableTools: string[];
  };
  roozContext?: {
    subscriptionTier: 'community' | 'pro' | 'enterprise';
    hidePricing: boolean;
    activeClasses: string[];
  };
}

export interface SkillSummary {
  id: string;
  description: string;
  successRate: number;
  uses: number;
}

export interface AgentDBClient {
  skillSearch(query: string, limit: number): Promise<SkillSummary[]>;
  stats(): Promise<{ embeddings: number; skills: number }>;
}

export interface MCPServerRegistry {
  getAllServers(): Array<{ id: string; name: string }>;
  checkServerHealth(serverId: string): Promise<{ healthy: boolean }>;
  getServerConfig(serverId: string): any;
}

export interface PivotSnapshot {
  filters: string[];
  selectedPath: string;
  skills: { circleId: string; skills: SkillSummary[] };
  dimension: Dimension;
}

// ============================================================================
// Dimensional Menu Builder Implementation
// ============================================================================

export class DimensionalMenuBuilder extends MenuBuilder {
  private agentDBClient: AgentDBClient | null = null;
  private mcpRegistry: MCPServerRegistry | null = null;
  private pivotHistory: PivotSnapshot[] = [];
  private currentSnapshot: PivotSnapshot | null = null;

  constructor(
    config?: Partial<MenuBuilderConfig>,
    agentDB?: AgentDBClient,
    mcpRegistry?: MCPServerRegistry
  ) {
    super(config);
    this.agentDBClient = agentDB || this.createDefaultAgentDBClient();
    this.mcpRegistry = mcpRegistry;
  }

  // ========================================================================
  // Build Menu with Skills
  // ========================================================================

  /**
   * Build menu with real-time circle skill context
   */
  async buildMenuWithSkills(
    nodes: DimensionalNavigationNode[],
    activeDimension: Dimension,
    activeCircle: string
  ): Promise<MenuTree> {
    // 1. Query skills for active circle+dimension
    const skills = await this.querySkills(`${activeCircle} ${activeDimension}`, 10);

    // 2. Enrich nodes with skill context
    const enrichedNodes = nodes.map(node => ({
      ...node,
      skillContext: {
        circleId: activeCircle,
        relevantSkills: skills,
        successRate: this.calculateAverageSuccessRate(skills)
      }
    }));

    // 3. Build menu with enriched context
    return this.buildMenu(enrichedNodes);
  }

  /**
   * Build menu with dimension-specific tools
   */
  async buildMenuWithDimensionTools(
    nodes: DimensionalNavigationNode[],
    dimension: Dimension
  ): Promise<MenuTree> {
    if (!this.mcpRegistry) {
      return this.buildMenu(nodes);
    }

    // Get dimension-specific servers
    const servers = this.getDimensionSpecificServers(dimension);

    // Enrich nodes with MCP tool context
    const enrichedNodes = await Promise.all(
      nodes.map(async node => {
        const mcpTools: Record<string, string[]> = {};

        for (const serverId of servers) {
          // In production: query actual tools from MCP server
          mcpTools[serverId] = [`${serverId}-tool-1`, `${serverId}-tool-2`];
        }

        return {
          ...node,
          mcpTools: {
            serverId: servers[0] || 'default',
            availableTools: Object.values(mcpTools).flat()
          }
        };
      })
    );

    return this.buildMenu(enrichedNodes);
  }

  // ========================================================================
  // Pivot Operations
  // ========================================================================

  /**
   * Pivot dimension while preserving skill context
   */
  async pivotDimension(
    currentMenu: MenuTree,
    fromDim: Dimension,
    toDim: Dimension,
    preserveFilters: boolean = true
  ): Promise<MenuTree> {
    // 1. Snapshot current context
    const snapshot: PivotSnapshot = {
      filters: this.extractFilters(currentMenu),
      selectedPath: this.getActivePath(currentMenu),
      skills: this.extractSkillContext(currentMenu),
      dimension: fromDim
    };

    // Save to history
    this.pivotHistory.push(snapshot);
    this.currentSnapshot = snapshot;

    // 2. Query skills for new dimension
    const newSkills = await this.querySkills(
      `${snapshot.skills.circleId} ${toDim}`,
      10
    );

    // 3. Rebuild menu with preserved context
    const newNodes = this.generateNodesForDimension(toDim);
    const enrichedNodes = this.enrichWithContext(newNodes, {
      ...snapshot,
      dimension: toDim,
      skills: { circleId: snapshot.skills.circleId, skills: newSkills }
    });

    // 4. Build new menu
    const newMenu = this.buildMenu(enrichedNodes);

    // 5. Restore filters if requested
    if (preserveFilters && snapshot.filters.length > 0) {
      // In production: apply filters to newMenu
      console.log(`Preserving filters: ${snapshot.filters.join(', ')}`);
    }

    return newMenu;
  }

  /**
   * Undo last pivot (restore previous dimension)
   */
  async undoPivot(): Promise<MenuTree | null> {
    if (this.pivotHistory.length === 0) {
      return null;
    }

    const previousSnapshot = this.pivotHistory.pop()!;
    this.currentSnapshot = this.pivotHistory[this.pivotHistory.length - 1] || null;

    // Rebuild menu from snapshot
    const nodes = this.generateNodesForDimension(previousSnapshot.dimension);
    const enrichedNodes = this.enrichWithContext(nodes, previousSnapshot);

    return this.buildMenu(enrichedNodes);
  }

  /**
   * Get pivot history stack
   */
  getPivotHistory(): PivotSnapshot[] {
    return [...this.pivotHistory];
  }

  // ========================================================================
  // Expandable Sections
  // ========================================================================

  /**
   * Expand menu section with lazy-loaded skills
   */
  async expandSection(
    nodeId: string,
    circle: string,
    limit: number = 20
  ): Promise<NavigationNode[]> {
    // 1. Check cache
    const cacheKey = `${nodeId}_${circle}`;
    const cached = this.getCachedMenu(cacheKey);
    if (cached) {
      return cached.nodes;
    }

    // 2. Lazy load from agentdb
    const skills = await this.querySkills(`${circle} ${nodeId}`, limit);

    // 3. Transform to navigation nodes
    const nodes = this.transformSkillsToNodes(skills, nodeId);

    // 4. Cache result
    this.cacheMenu({
      nodes,
      maxDepth: 1,
      nodeCount: nodes.length,
      lastBuilt: new Date(),
      cacheKey
    });

    return nodes;
  }

  /**
   * Get skill count for a section (for expandable UI)
   */
  async getSkillCount(section: string, circle?: string): Promise<number> {
    const query = circle ? `${circle} ${section}` : section;
    const skills = await this.querySkills(query, 100);
    return skills.length;
  }

  // ========================================================================
  // MCP Tool Integration
  // ========================================================================

  /**
   * Update MCP tool availability after dimension change
   */
  async updateMCPTools(dimension: Dimension): Promise<void> {
    if (!this.mcpRegistry) {
      return;
    }

    const relevantServers = this.getDimensionSpecificServers(dimension);

    for (const serverId of relevantServers) {
      const health = await this.mcpRegistry.checkServerHealth(serverId);
      if (!health?.healthy) {
        this.emit('safe_degrade', { serverId, dimension, timestamp: new Date() });
      }
    }
  }

  /**
   * Get dimension-specific MCP servers
   */
  private getDimensionSpecificServers(dim: Dimension): string[] {
    const mapping: Record<Dimension, string[]> = {
      [Dimension.TEMPORAL]: ['timeline-analyzer', 'predict-events'],
      [Dimension.SPATIAL]: ['osint-intelligence', 'geo-analysis'],
      [Dimension.DEMOGRAPHIC]: ['social-network-analyzer'],
      [Dimension.PSYCHOLOGICAL]: ['mindset-tracker', 'flm-coach'],
      [Dimension.ECONOMIC]: ['resource-optimizer']
    };
    return mapping[dim] || [];
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Query skills from agentdb
   */
  private async querySkills(query: string, limit: number): Promise<SkillSummary[]> {
    if (!this.agentDBClient) {
      return [];
    }

    try {
      return await this.agentDBClient.skillSearch(query, limit);
    } catch (error) {
      console.error(`Failed to query skills: ${error}`);
      return [];
    }
  }

  /**
   * Calculate average success rate from skills
   */
  private calculateAverageSuccessRate(skills: SkillSummary[]): number {
    if (skills.length === 0) return 0;
    const total = skills.reduce((sum, skill) => sum + skill.successRate, 0);
    return total / skills.length;
  }

  /**
   * Extract filters from menu
   */
  private extractFilters(menu: MenuTree): string[] {
    // In production: extract from menu metadata
    return [];
  }

  /**
   * Get active path from menu
   */
  private getActivePath(menu: MenuTree): string {
    // In production: find selected node path
    return '/';
  }

  /**
   * Extract skill context from menu
   */
  private extractSkillContext(menu: MenuTree): { circleId: string; skills: SkillSummary[] } {
    // In production: extract from menu nodes
    const firstNode = menu.nodes[0] as DimensionalNavigationNode;
    return {
      circleId: firstNode?.skillContext?.circleId || 'orchestrator',
      skills: firstNode?.skillContext?.relevantSkills || []
    };
  }

  /**
   * Generate nodes for dimension
   */
  private generateNodesForDimension(dimension: Dimension): DimensionalNavigationNode[] {
    const viewModes: Record<Dimension, ViewMode> = {
      [Dimension.TEMPORAL]: ViewMode.TIMELINE,
      [Dimension.SPATIAL]: ViewMode.MAP,
      [Dimension.DEMOGRAPHIC]: ViewMode.NETWORK,
      [Dimension.PSYCHOLOGICAL]: ViewMode.MENTAL_MODEL,
      [Dimension.ECONOMIC]: ViewMode.RESOURCE
    };

    return [
      {
        id: `${dimension}-root`,
        label: `${dimension} View`,
        path: `/${dimension}`,
        icon: this.getIconForDimension(dimension),
        dimension,
        viewMode: viewModes[dimension],
        children: []
      }
    ];
  }

  /**
   * Enrich nodes with context
   */
  private enrichWithContext(
    nodes: DimensionalNavigationNode[],
    snapshot: PivotSnapshot
  ): DimensionalNavigationNode[] {
    return nodes.map(node => ({
      ...node,
      skillContext: {
        circleId: snapshot.skills.circleId,
        relevantSkills: snapshot.skills.skills,
        successRate: this.calculateAverageSuccessRate(snapshot.skills.skills)
      }
    }));
  }

  /**
   * Transform skills to navigation nodes
   */
  private transformSkillsToNodes(skills: SkillSummary[], parentId: string): NavigationNode[] {
    return skills.map((skill, index) => ({
      id: `${parentId}-skill-${index}`,
      label: skill.description,
      path: `/${parentId}/skills/${skill.id}`,
      metadata: {
        successRate: skill.successRate,
        uses: skill.uses
      }
    }));
  }

  /**
   * Get icon for dimension
   */
  private getIconForDimension(dimension: Dimension): string {
    const icons: Record<Dimension, string> = {
      [Dimension.TEMPORAL]: '📅',
      [Dimension.SPATIAL]: '🗺️',
      [Dimension.DEMOGRAPHIC]: '👥',
      [Dimension.PSYCHOLOGICAL]: '🧠',
      [Dimension.ECONOMIC]: '💰'
    };
    return icons[dimension];
  }

  /**
   * Create default AgentDB client (shell-based)
   */
  private createDefaultAgentDBClient(): AgentDBClient {
    return {
      skillSearch: async (query: string, limit: number): Promise<SkillSummary[]> => {
        try {
          const result = execSync(
            `npx agentdb skill search "${query}" ${limit} --json 2>/dev/null || echo '{"skills":[]}'`,
            { encoding: 'utf-8', timeout: 10000 }
          );

          const parsed = JSON.parse(result.trim());
          
          if (parsed.skills && Array.isArray(parsed.skills)) {
            return parsed.skills.map((s: any) => ({
              id: s.id || `skill-${Date.now()}`,
              description: s.description || s.name || 'Unknown skill',
              successRate: s.success_rate || s.successRate || 0.5,
              uses: s.uses || s.usage_count || 0
            }));
          }

          return [];
        } catch (error) {
          console.error(`AgentDB query failed: ${error}`);
          return [];
        }
      },

      stats: async (): Promise<{ embeddings: number; skills: number }> => {
        try {
          const result = execSync('npx agentdb stats 2>/dev/null', {
            encoding: 'utf-8',
            timeout: 5000
          });

          // Parse stats from output
          const embeddingsMatch = result.match(/Embeddings:\s*(\d+)/);
          const skillsMatch = result.match(/Skills:\s*(\d+)/);

          return {
            embeddings: embeddingsMatch ? parseInt(embeddingsMatch[1]) : 0,
            skills: skillsMatch ? parseInt(skillsMatch[1]) : 0
          };
        } catch {
          return { embeddings: 0, skills: 0 };
        }
      }
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDimensionalMenuBuilder(
  config?: Partial<MenuBuilderConfig>,
  agentDB?: AgentDBClient,
  mcpRegistry?: MCPServerRegistry
): DimensionalMenuBuilder {
  return new DimensionalMenuBuilder(config, agentDB, mcpRegistry);
}
