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
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class SkillScanner {
    projectRoot;
    skills = [];
    agentDBPath;
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.agentDBPath = path.join(projectRoot, 'agentdb.sqlite');
    }
    /**
     * Scan all available skills/scripts
     */
    async scanAll() {
        this.skills = [];
        // 1. Scan shell scripts
        await this.scanScripts();
        // 2. Scan AgentDB skills
        await this.scanAgentDBSkills();
        // 3. Scan deployment targets
        await this.scanDeploymentTargets();
        // 4. Scan test suites
        await this.scanTestSuites();
        // 5. Scan patterns/runbooks
        await this.scanPatterns();
        return this.skills;
    }
    /**
     * Scan scripts/ directory for executable scripts
     */
    async scanScripts() {
        const scriptsDir = path.join(this.projectRoot, 'scripts');
        if (!fs.existsSync(scriptsDir)) {
            return;
        }
        const files = fs.readdirSync(scriptsDir);
        for (const file of files) {
            if (!file.endsWith('.sh'))
                continue;
            const filePath = path.join(scriptsDir, file);
            const stats = fs.statSync(filePath);
            // Check if executable
            if (!(stats.mode & fs.constants.S_IXUSR)) {
                continue;
            }
            // Read first comment block for description
            const content = fs.readFileSync(filePath, 'utf-8');
            const descMatch = content.match(/^#\s*(.+?)$/m);
            const description = descMatch ? descMatch[1] : `Execute ${file}`;
            // Determine skill type from filename
            let type = 'script';
            let impact = {};
            if (file.includes('deploy')) {
                type = 'deployment';
                impact = {
                    health: 10,
                    roam: { reach: 20 },
                };
            }
            else if (file.includes('test')) {
                type = 'test';
                impact = {
                    health: 15,
                    roam: { optimize: 10, monitor: 10 },
                };
            }
            else if (file.includes('ay')) {
                type = 'analysis';
                impact = {
                    health: 5,
                    roam: { monitor: 15 },
                };
            }
            this.skills.push({
                id: `script:${file}`,
                name: file.replace('.sh', '').replace(/-/g, ' '),
                description,
                type,
                filePath,
                command: `bash ${filePath}`,
                confidence: 0.8,
                estimatedDuration: 30,
                impact,
            });
        }
    }
    /**
     * Scan AgentDB for learned skills
     */
    async scanAgentDBSkills() {
        if (!fs.existsSync(this.agentDBPath)) {
            return;
        }
        try {
            // Query AgentDB skills table
            const { stdout } = await execAsync(`sqlite3 "${this.agentDBPath}" "SELECT id, name, description, confidence, metadata FROM skills LIMIT 100"`);
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
                const [id, name, description, confidence, metadata] = line.split('|');
                this.skills.push({
                    id: `agentdb:${id}`,
                    name: name || 'Unnamed skill',
                    description: description || 'No description',
                    type: 'pattern',
                    confidence: parseFloat(confidence) || 0.5,
                    estimatedDuration: 15,
                    impact: {
                        health: 8,
                    },
                    metadata: metadata ? JSON.parse(metadata) : undefined,
                });
            }
        }
        catch (error) {
            // AgentDB not available or empty
            console.warn('AgentDB skills not available:', error);
        }
    }
    /**
     * Scan deployment targets from deploy scripts
     */
    async scanDeploymentTargets() {
        const deployScript = path.join(this.projectRoot, 'scripts/deploy-to-real-infra.sh');
        if (!fs.existsSync(deployScript)) {
            return;
        }
        const targets = [
            { id: 'aws', name: 'AWS cPanel', url: 'viz.interface.tag.ooo', reach: 25 },
            { id: 'stx', name: 'StarlingX', url: 'stx-viz.corp.interface.tag.ooo', reach: 25 },
            { id: 'hivelocity', name: 'Hivelocity', url: 'hv-viz.interface.tag.ooo', reach: 25 },
            { id: 'hetzner', name: 'Hetzner', url: 'hz-viz.interface.tag.ooo', reach: 25 },
        ];
        for (const target of targets) {
            this.skills.push({
                id: `deploy:${target.id}`,
                name: `Deploy to ${target.name}`,
                description: `Deploy Deck.gl visualization to ${target.url}`,
                type: 'deployment',
                command: `bash ${deployScript} ${target.id}`,
                confidence: 0.9,
                estimatedDuration: 60,
                impact: {
                    health: 10,
                    roam: {
                        reach: target.reach,
                        automate: 5,
                    },
                },
            });
        }
        // Add "all" deployment
        this.skills.push({
            id: 'deploy:all',
            name: 'Deploy to All Infrastructure',
            description: 'Deploy to AWS, StarlingX, Hivelocity, and Hetzner',
            type: 'deployment',
            command: `bash ${deployScript} all`,
            confidence: 0.85,
            estimatedDuration: 240,
            prerequisites: ['deploy:aws', 'deploy:stx', 'deploy:hivelocity', 'deploy:hetzner'],
            impact: {
                health: 40,
                roam: {
                    reach: 100,
                    automate: 20,
                },
            },
        });
    }
    /**
     * Scan test suites
     */
    async scanTestSuites() {
        const testsDir = path.join(this.projectRoot, 'tests');
        if (!fs.existsSync(testsDir)) {
            return;
        }
        // Add Jest test suite
        this.skills.push({
            id: 'test:jest',
            name: 'Run Jest Test Suite',
            description: 'Execute all Jest tests with coverage',
            type: 'test',
            command: 'npm test -- --coverage',
            confidence: 0.95,
            estimatedDuration: 120,
            impact: {
                health: 20,
                roam: {
                    optimize: 15,
                    monitor: 15,
                },
            },
        });
        // Add TypeScript type checking
        this.skills.push({
            id: 'test:typecheck',
            name: 'TypeScript Type Check',
            description: 'Run TypeScript compiler in check mode',
            type: 'test',
            command: 'npm run typecheck',
            confidence: 1.0,
            estimatedDuration: 30,
            impact: {
                health: 15,
                roam: {
                    optimize: 10,
                },
            },
        });
    }
    /**
     * Scan patterns and runbooks
     */
    async scanPatterns() {
        const patternsFile = path.join(this.projectRoot, 'docs/patterns/pattern-rationale.md');
        if (fs.existsSync(patternsFile)) {
            this.skills.push({
                id: 'pattern:validate',
                name: 'Validate Pattern Rationale',
                description: 'Check that all patterns have complete rationale documentation',
                type: 'pattern',
                confidence: 0.7,
                estimatedDuration: 10,
                impact: {
                    health: 5,
                    roam: {
                        monitor: 10,
                    },
                },
            });
        }
        // ROAM falsifiability audit
        const auditScript = path.join(this.projectRoot, 'scripts/roam-falsifiability-audit.sh');
        if (fs.existsSync(auditScript)) {
            this.skills.push({
                id: 'pattern:roam-audit',
                name: 'ROAM Falsifiability Audit',
                description: 'Verify ROAM metrics match advertised claims',
                type: 'analysis',
                command: `bash ${auditScript}`,
                confidence: 0.9,
                estimatedDuration: 15,
                impact: {
                    roam: {
                        reach: 5,
                        optimize: 5,
                        automate: 5,
                        monitor: 5,
                    },
                },
            });
        }
    }
    /**
     * Select optimal skills for current context
     */
    selectOptimalSkills(context, maxSkills = 5) {
        const scored = this.skills.map((skill) => ({
            skill,
            score: this.calculateSkillScore(skill, context),
        }));
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, maxSkills).map((s) => s.skill);
    }
    /**
     * Calculate skill relevance score for current context
     */
    calculateSkillScore(skill, context) {
        let score = 0;
        // Base confidence
        score += skill.confidence * 50;
        // Health impact (prioritize if health is low)
        if (skill.impact.health && context.currentHealth < 80) {
            score += skill.impact.health * (1 - context.currentHealth / 100) * 30;
        }
        // ROAM impact
        if (skill.impact.roam) {
            const roamImprovement = (skill.impact.roam.reach || 0) +
                (skill.impact.roam.optimize || 0) +
                (skill.impact.roam.automate || 0) +
                (skill.impact.roam.monitor || 0);
            score += roamImprovement * 0.2;
        }
        // Mode-specific adjustments
        if (context.mode === 'auto') {
            // Prefer quick wins in auto mode
            if (skill.estimatedDuration && skill.estimatedDuration < 60) {
                score += 20;
            }
        }
        else if (context.mode === 'iterative') {
            // Prefer high-impact skills in iterative mode
            if (skill.impact.health && skill.impact.health > 10) {
                score += 15;
            }
        }
        // Type-specific adjustments
        if (context.typescriptErrors > 50 && skill.type === 'test') {
            score += 30; // Prioritize testing/type checking
        }
        // Success history bonus
        if (skill.metadata?.successCount) {
            const successRate = skill.metadata.successCount / (skill.metadata.successCount + (skill.metadata.failureCount || 0));
            score += successRate * 20;
        }
        return score;
    }
    /**
     * Get skill by ID
     */
    getSkill(skillId) {
        return this.skills.find((s) => s.id === skillId);
    }
    /**
     * Get skills by type
     */
    getSkillsByType(type) {
        return this.skills.filter((s) => s.type === type);
    }
    /**
     * Export skills to JSON for persistence
     */
    exportSkills(outputPath) {
        fs.writeFileSync(outputPath, JSON.stringify(this.skills, null, 2));
    }
}
/**
 * Example usage in ay command
 */
export async function integrateSkillsIntoAy(projectRoot, context) {
    const scanner = new SkillScanner(projectRoot);
    console.log('🔍 Scanning for skills and scripts...');
    const skills = await scanner.scanAll();
    console.log(`✅ Found ${skills.length} skills`);
    // Select optimal skills for current context
    const optimal = scanner.selectOptimalSkills(context, 5);
    console.log('\n📋 Recommended Skills:');
    optimal.forEach((skill, i) => {
        console.log(`${i + 1}. ${skill.name}`);
        console.log(`   ${skill.description}`);
        console.log(`   Type: ${skill.type} | Confidence: ${(skill.confidence * 100).toFixed(0)}%`);
        console.log(`   Impact: Health +${skill.impact.health || 0}`);
        console.log(`   Command: ${skill.command || 'N/A'}`);
        console.log();
    });
    // Export for use by shell scripts
    scanner.exportSkills(path.join(projectRoot, 'reports/discovered-skills.json'));
}
//# sourceMappingURL=skill-scanner.js.map