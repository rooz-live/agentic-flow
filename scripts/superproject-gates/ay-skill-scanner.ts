#!/usr/bin/env tsx
/**
 * AY Skill Scanner - Dynamic Script/Skill Discovery
 * Scans and dynamically inserts scripts/skills into ay command runs
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface DiscoveredSkill {
  name: string;
  path: string;
  type: 'script' | 'skill' | 'integration';
  circle?: string;
  ceremony?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export class AYSkillScanner {
  private codeRoot: string;
  private toolingPath: string;
  private projectsPath: string;
  
  constructor(codeRoot?: string) {
    this.codeRoot = codeRoot || process.cwd();
    this.toolingPath = path.join(this.codeRoot, 'tooling');
    this.projectsPath = path.join(this.codeRoot, 'projects');
  }
  
  /**
   * Scan for all available scripts
   */
  scanScripts(): DiscoveredSkill[] {
    const skills: DiscoveredSkill[] = [];
    
    // Scan tooling/scripts/
    const scriptsPath = path.join(this.toolingPath, 'scripts');
    if (fs.existsSync(scriptsPath)) {
      this.scanDirectory(scriptsPath, skills, 'script');
    }
    
    // Scan projects/*/scripts/
    if (fs.existsSync(this.projectsPath)) {
      const projects = fs.readdirSync(this.projectsPath);
      for (const project of projects) {
        const projectScriptsPath = path.join(this.projectsPath, project, 'scripts');
        if (fs.existsSync(projectScriptsPath)) {
          this.scanDirectory(projectScriptsPath, skills, 'script');
        }
      }
    }
    
    return skills;
  }
  
  /**
   * Scan for skills in AgentDB
   */
  async scanSkills(): Promise<DiscoveredSkill[]> {
    const skills: DiscoveredSkill[] = [];
    
    // Check AgentDB for skills
    const agentdbPath = process.env.AGENTDB_PATH || path.join(this.codeRoot, 'agentdb.db');
    if (fs.existsSync(agentdbPath)) {
      try {
        const query = `
          SELECT 
            name,
            circle,
            confidence,
            json_extract(metadata, '$.ceremony') as ceremony
          FROM skills
          WHERE confidence > 50
          ORDER BY confidence DESC;
        `;
        
        const result = execSync(`sqlite3 "${agentdbPath}" "${query}"`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        
        const lines = result.trim().split('\n');
        for (const line of lines) {
          const [name, circle, confidence, ceremony] = line.split('|');
          if (name) {
            skills.push({
              name,
              path: `agentdb://skills/${name}`,
              type: 'skill',
              circle: circle || undefined,
              ceremony: ceremony || undefined,
              confidence: Number(confidence) || undefined
            });
          }
        }
      } catch (error) {
        // AgentDB query failed, continue without skills
      }
    }
    
    return skills;
  }
  
  /**
   * Scan for integrations
   */
  scanIntegrations(): DiscoveredSkill[] {
    const skills: DiscoveredSkill[] = [];
    
    // Scan for integration modules
    const integrationPaths = [
      path.join(this.projectsPath, 'agentic-flow-core', 'src', 'integration'),
      path.join(this.toolingPath, 'integrations')
    ];
    
    for (const integrationPath of integrationPaths) {
      if (fs.existsSync(integrationPath)) {
        this.scanDirectory(integrationPath, skills, 'integration');
      }
    }
    
    return skills;
  }
  
  /**
   * Scan directory for files
   */
  private scanDirectory(dir: string, skills: DiscoveredSkill[], type: 'script' | 'skill' | 'integration'): void {
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          this.scanDirectory(fullPath, skills, type);
        } else if (file.isFile()) {
          // Check if it's an executable script
          if (this.isExecutableScript(fullPath)) {
            const skill = this.parseScriptMetadata(fullPath, type);
            if (skill) {
              skills.push(skill);
            }
          }
        }
      }
    } catch (error) {
      // Directory scan failed, continue
    }
  }
  
  /**
   * Check if file is an executable script
   */
  private isExecutableScript(filePath: string): boolean {
    const ext = path.extname(filePath);
    const name = path.basename(filePath);
    
    // Check extension
    if (['.sh', '.bash', '.ts', '.tsx', '.js', '.mjs'].includes(ext)) {
      return true;
    }
    
    // Check if starts with ay-
    if (name.startsWith('ay-')) {
      return true;
    }
    
    // Check shebang
    try {
      const content = fs.readFileSync(filePath, 'utf-8').substring(0, 100);
      if (content.startsWith('#!/')) {
        return true;
      }
    } catch {
      // Can't read file
    }
    
    return false;
  }
  
  /**
   * Parse script metadata
   */
  private parseScriptMetadata(filePath: string, type: 'script' | 'skill' | 'integration'): DiscoveredSkill | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const name = path.basename(filePath, path.extname(filePath));
      
      // Extract circle from filename or content
      let circle: string | undefined;
      const circleMatch = content.match(/circle[:\s=]+['"]?(\w+)['"]?/i) || 
                         name.match(/(orchestrator|assessor|analyst|innovator|seeker|intuitive)/i);
      if (circleMatch) {
        circle = circleMatch[1]?.toLowerCase();
      }
      
      // Extract ceremony from filename or content
      let ceremony: string | undefined;
      const ceremonyMatch = content.match(/ceremony[:\s=]+['"]?(\w+)['"]?/i) ||
                           name.match(/(standup|wsjf|refine|retro|review|replenish|synthesis)/i);
      if (ceremonyMatch) {
        ceremony = ceremonyMatch[1]?.toLowerCase();
      }
      
      return {
        name,
        path: filePath,
        type,
        circle,
        ceremony,
        metadata: {
          size: fs.statSync(filePath).size,
          modified: fs.statSync(filePath).mtime.toISOString()
        }
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Get all available skills for a circle/ceremony
   */
  async getSkillsForContext(circle?: string, ceremony?: string): Promise<DiscoveredSkill[]> {
    const allSkills: DiscoveredSkill[] = [];
    
    // Scan scripts
    allSkills.push(...this.scanScripts());
    
    // Scan AgentDB skills
    allSkills.push(...await this.scanSkills());
    
    // Scan integrations
    allSkills.push(...this.scanIntegrations());
    
    // Filter by context
    if (circle || ceremony) {
      return allSkills.filter(skill => {
        const matchesCircle = !circle || skill.circle === circle;
        const matchesCeremony = !ceremony || skill.ceremony === ceremony;
        return matchesCircle && matchesCeremony;
      });
    }
    
    return allSkills;
  }
  
  /**
   * Get skill execution command
   */
  getExecutionCommand(skill: DiscoveredSkill): string {
    if (skill.path.startsWith('agentdb://')) {
      // AgentDB skill - use skill lookup
      return `./tooling/scripts/ay-prod-skill-lookup.sh ${skill.circle || 'unknown'} ${skill.ceremony || 'unknown'}`;
    } else {
      // File-based skill - execute directly
      if (skill.path.endsWith('.sh') || skill.path.endsWith('.bash')) {
        return `bash "${skill.path}"`;
      } else if (skill.path.endsWith('.ts') || skill.path.endsWith('.tsx')) {
        return `tsx "${skill.path}"`;
      } else if (skill.path.endsWith('.js') || skill.path.endsWith('.mjs')) {
        return `node "${skill.path}"`;
      }
    }
    
    return `"${skill.path}"`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const scanner = new AYSkillScanner();
  const circle = process.argv[2];
  const ceremony = process.argv[3];
  
  scanner.getSkillsForContext(circle, ceremony)
    .then(skills => {
      console.log(`Found ${skills.length} skills:`);
      for (const skill of skills) {
        console.log(`  - ${skill.name} (${skill.type})`);
        if (skill.circle) console.log(`    Circle: ${skill.circle}`);
        if (skill.ceremony) console.log(`    Ceremony: ${skill.ceremony}`);
        if (skill.confidence) console.log(`    Confidence: ${skill.confidence}%`);
      }
    })
    .catch(error => {
      console.error('Scan failed:', error);
      process.exit(1);
    });
}
