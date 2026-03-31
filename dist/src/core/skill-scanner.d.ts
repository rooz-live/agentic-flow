/**
 * Dynamic Skill/Script Scanner and Integration System
 *
 * Automatically discovers and integrates:
 * - Shell scripts in scripts/ directory
 * - Skills from AgentDB
 * - Patterns from ROAM/MYM framework
 * - Deployment targets
 * - Test suites
 *
 * Integration points for ay command:
 * - Auto mode: Select optimal skills based on health metrics
 * - Iterative mode: Apply skills in priority order
 * - Interactive mode: Present skills as menu options
 */
export interface Skill {
    id: string;
    name: string;
    description: string;
    type: 'script' | 'pattern' | 'deployment' | 'test' | 'analysis';
    filePath?: string;
    command?: string;
    confidence: number;
    prerequisites?: string[];
    estimatedDuration?: number;
    impact: {
        health?: number;
        roam?: {
            reach?: number;
            optimize?: number;
            automate?: number;
            monitor?: number;
        };
    };
    metadata?: {
        lastRun?: Date;
        successCount?: number;
        failureCount?: number;
        avgDuration?: number;
    };
}
export interface SkillContext {
    currentHealth: number;
    currentROAM: number;
    typescriptErrors: number;
    testsPassing: number;
    deploymentTargets: string[];
    mode: 'auto' | 'iterative' | 'interactive';
}
export declare class SkillScanner {
    private projectRoot;
    private skills;
    private agentDBPath?;
    constructor(projectRoot: string);
    /**
     * Scan all available skills/scripts
     */
    scanAll(): Promise<Skill[]>;
    /**
     * Scan scripts/ directory for executable scripts
     */
    private scanScripts;
    /**
     * Scan AgentDB for learned skills
     */
    private scanAgentDBSkills;
    /**
     * Scan deployment targets from deploy scripts
     */
    private scanDeploymentTargets;
    /**
     * Scan test suites
     */
    private scanTestSuites;
    /**
     * Scan patterns and runbooks
     */
    private scanPatterns;
    /**
     * Select optimal skills for current context
     */
    selectOptimalSkills(context: SkillContext, maxSkills?: number): Skill[];
    /**
     * Calculate skill relevance score for current context
     */
    private calculateSkillScore;
    /**
     * Get skill by ID
     */
    getSkill(skillId: string): Skill | undefined;
    /**
     * Get skills by type
     */
    getSkillsByType(type: Skill['type']): Skill[];
    /**
     * Export skills to JSON for persistence
     */
    exportSkills(outputPath: string): void;
}
/**
 * Example usage in ay command
 */
export declare function integrateSkillsIntoAy(projectRoot: string, context: SkillContext): Promise<void>;
//# sourceMappingURL=skill-scanner.d.ts.map