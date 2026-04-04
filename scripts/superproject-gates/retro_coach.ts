/**
 * Retro Coach - Auto-Generate Runbooks from RESOLVED ROAM Items
 *
 * P2-TIME: Automatically generate runbooks from RESOLVED ROAM entries
 * to preserve knowledge and enable faster remediation.
 *
 * Philosophical Foundations:
 * - Manthra: Directed thought-power ensuring complete knowledge capture from resolved issues
 * - Yasna: Disciplined alignment through consistent runbook structure
 * - Mithra: Binding force preserving resolution knowledge through executable runbooks
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import yaml from 'js-yaml';
import slugify from 'slugify';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * ROAM category types
 */
export type ROAMCategory = 'resolved' | 'owned' | 'accepted' | 'mitigated';

/**
 * ROAM severity levels
 */
export type ROAMSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Resolution step in a runbook
 */
export interface ResolutionStep {
  step: number;
  action: string;
  command?: string;
  expected_result?: string;
  verification_method?: string;
}

/**
 * Runbook interface for executable procedures
 */
export interface Runbook {
  id: string; // UUID
  title: string;
  roam_id: string; // Reference to ROAM entry
  category: ROAMCategory; // blocker, risk, dependency
  severity: ROAMSeverity; // critical, high, medium, low
  description: string;
  resolution_steps: ResolutionStep[];
  prerequisites: string[];
  estimated_duration: string;
  success_criteria: string[];
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * Parsed ROAM entry from markdown
 */
export interface ROAMEntry {
  id: string;
  title: string;
  category: ROAMCategory;
  severity: ROAMSeverity;
  status: string;
  owner?: string;
  resolution_date?: string;
  description: string;
  validation_result?: string[];
  evidence?: string[];
  deployment_result?: string[];
  action_plan?: string[];
  mitigation_strategy?: string[];
  implementation_plan?: string[];
}

/**
 * Runbook validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// ROAM PARSER
// ============================================================================

/**
 * ROAMParser - Parse ROAM markdown files into structured entries
 */
export class ROAMParser {
  /**
   * Parse ROAM markdown file and extract all entries
   */
  static async parseMarkdown(filePath: string): Promise<ROAMEntry[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.extractEntries(content);
  }

  /**
   * Extract ROAM entries from markdown content
   */
  private static extractEntries(content: string): ROAMEntry[] {
    const entries: ROAMEntry[] = [];
    const lines = content.split('\n');
    let currentEntry: Partial<ROAMEntry> | null = null;
    let currentSection = '';
    let currentList: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect ROAM entry headers (### R###: ...)
      const entryMatch = line.match(/^###\s+(R\d+):\s+(.+)$/);
      if (entryMatch) {
        // Save previous entry
        if (currentEntry) {
          entries.push(this.finalizeEntry(currentEntry, currentSection, currentList));
        }
        // Start new entry
        currentEntry = {
          id: entryMatch[1],
          title: entryMatch[2].trim(),
          description: '',
          category: 'resolved',
          severity: 'low'
        };
        currentSection = '';
        currentList = [];
        continue;
      }

      // Detect category
      const categoryMatch = line.match(/\*\*Category\*\*\s*\|(.+)\|/);
      if (categoryMatch && currentEntry) {
        currentEntry.category = this.parseCategory(categoryMatch[1].trim());
      }

      // Detect severity
      const severityMatch = line.match(/\*\*Severity\*\*\s*\|(.+)\|/);
      if (severityMatch && currentEntry) {
        currentEntry.severity = this.parseSeverity(severityMatch[1].trim());
      }

      // Detect status
      const statusMatch = line.match(/\*\*Status\*\*\s*(.+)$/);
      if (statusMatch && currentEntry) {
        currentEntry.status = statusMatch[1].trim();
      }

      // Detect owner
      const ownerMatch = line.match(/\*\*Owner\*\*\s*(.+)$/);
      if (ownerMatch && currentEntry) {
        currentEntry.owner = ownerMatch[1].trim();
      }

      // Detect resolution date
      const dateMatch = line.match(/\*\*Resolution Date\*\*\s*(.+)$/);
      if (dateMatch && currentEntry) {
        currentEntry.resolution_date = dateMatch[1].trim();
      }

      // Detect description
      const descMatch = line.match(/\*\*Description\*\*\s*(.+)$/);
      if (descMatch && currentEntry) {
        currentEntry.description = descMatch[1].trim();
      }

      // Collect list items (action plans, evidence, etc.)
      if (line.trim().match(/^\d+\./)) {
        currentList.push(line.trim());
      } else if (line.trim() === '' && currentList.length > 0) {
        // End of list, assign to appropriate section
        if (currentEntry) {
          if (currentSection.includes('Action Plan')) {
            currentEntry.action_plan = [...currentList];
          } else if (currentSection.includes('Evidence')) {
            currentEntry.evidence = [...currentList];
          } else if (currentSection.includes('Validation Result')) {
            currentEntry.validation_result = [...currentList];
          } else if (currentSection.includes('Deployment Result')) {
            currentEntry.deployment_result = [...currentList];
          } else if (currentSection.includes('Mitigation Strategy')) {
            currentEntry.mitigation_strategy = [...currentList];
          } else if (currentSection.includes('Implementation Plan')) {
            currentEntry.implementation_plan = [...currentList];
          }
        }
        currentList = [];
      } else if (line.match(/^-+\s*(.+)$/)) {
        currentSection = line.replace(/^-+\s*/, '').trim();
      }
    }

    // Save last entry
    if (currentEntry) {
      entries.push(this.finalizeEntry(currentEntry, currentSection, currentList));
    }

    return entries;
  }

  /**
   * Parse category string to ROAMCategory type
   */
  private static parseCategory(category: string): ROAMCategory {
    const lower = category.toLowerCase();
    if (lower.includes('resolved')) return 'resolved';
    if (lower.includes('owned')) return 'owned';
    if (lower.includes('accepted')) return 'accepted';
    if (lower.includes('mitigated')) return 'mitigated';
    return 'resolved'; // Default
  }

  /**
   * Parse severity string to ROAMSeverity type
   */
  private static parseSeverity(severity: string): ROAMSeverity {
    const lower = severity.toLowerCase();
    if (lower.includes('critical')) return 'critical';
    if (lower.includes('high')) return 'high';
    if (lower.includes('medium')) return 'medium';
    if (lower.includes('low')) return 'low';
    return 'low'; // Default
  }

  /**
   * Finalize entry with collected data
   */
  private static finalizeEntry(
    entry: Partial<ROAMEntry>,
    section: string,
    list: string[]
  ): ROAMEntry {
    return {
      id: entry.id || '',
      title: entry.title || '',
      category: entry.category || 'resolved',
      severity: entry.severity || 'low',
      status: entry.status || '',
      owner: entry.owner,
      resolution_date: entry.resolution_date,
      description: entry.description || '',
      validation_result: entry.validation_result,
      evidence: entry.evidence,
      deployment_result: entry.deployment_result,
      action_plan: entry.action_plan,
      mitigation_strategy: entry.mitigation_strategy,
      implementation_plan: entry.implementation_plan
    };
  }
}

// ============================================================================
// RUNBOOK GENERATOR
// ============================================================================

/**
 * RunbookGenerator - Generate executable runbooks from ROAM entries
 */
export class RunbookGenerator {
  /**
   * Generate runbook from a RESOLVED ROAM entry
   */
  static generateFromROAM(entry: ROAMEntry): Runbook {
    const now = new Date().toISOString();

    // Extract resolution steps from entry
    const resolutionSteps = this.extractResolutionSteps(entry);

    // Extract prerequisites
    const prerequisites = this.extractPrerequisites(entry);

    // Determine estimated duration based on severity
    const estimatedDuration = this.estimateDuration(entry.severity);

    // Generate success criteria
    const successCriteria = this.generateSuccessCriteria(entry);

    return {
      id: crypto.randomUUID(),
      title: entry.title,
      roam_id: entry.id,
      category: entry.category,
      severity: entry.severity,
      description: entry.description,
      resolution_steps: resolutionSteps,
      prerequisites,
      estimated_duration: estimatedDuration,
      success_criteria: successCriteria,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Extract resolution steps from ROAM entry
   */
  private static extractResolutionSteps(entry: ROAMEntry): ResolutionStep[] {
    const steps: ResolutionStep[] = [];
    let stepNumber = 1;

    // Parse from validation_result, evidence, or deployment_result
    const sourceList = entry.validation_result || entry.evidence || entry.deployment_result || [];

    for (const item of sourceList) {
      const step = this.parseStep(item, stepNumber++);
      if (step) {
        steps.push(step);
      }
    }

    // Also parse from action_plan if available
    if (entry.action_plan) {
      for (const item of entry.action_plan) {
        const step = this.parseStep(item, stepNumber++);
        if (step) {
          steps.push(step);
        }
      }
    }

    // Also parse from implementation_plan if available
    if (entry.implementation_plan) {
      for (const item of entry.implementation_plan) {
        const step = this.parseStep(item, stepNumber++);
        if (step) {
          steps.push(step);
        }
      }
    }

    return steps;
  }

  /**
   * Parse a single step from list item
   */
  private static parseStep(item: string, stepNumber: number): ResolutionStep | null {
    const cleanItem = item.replace(/^\d+\.\s*/, '').trim();
    
    // Extract commands from step
    const commandMatch = cleanItem.match(/`([^`]+)`/);
    const command = commandMatch ? commandMatch[1] : undefined;

    // Extract expected result
    const resultMatch = cleanItem.match(/Expected:\s*(.+)$/i);
    const expectedResult = resultMatch ? resultMatch[1] : undefined;

    // Extract verification method
    const verifyMatch = cleanItem.match(/Verify:\s*(.+)$/i);
    const verificationMethod = verifyMatch ? verifyMatch[1] : undefined;

    return {
      step: stepNumber,
      action: cleanItem
        .replace(/`[^`]+`/g, '') // Remove code blocks from action
        .replace(/Expected:\s*.+$/i, '') // Remove expected from action
        .replace(/Verify:\s*.+$/i, '') // Remove verify from action
        .trim(),
      command,
      expected_result: expectedResult,
      verification_method: verificationMethod
    };
  }

  /**
   * Extract prerequisites from ROAM entry
   */
  private static extractPrerequisites(entry: ROAMEntry): string[] {
    const prerequisites: string[] = [];

    // Add owner as prerequisite
    if (entry.owner) {
      prerequisites.push(`Access to ${entry.owner} resources`);
    }

    // Add cluster access for STX-related entries
    if (entry.title.toLowerCase().includes('stx') || 
        entry.title.toLowerCase().includes('cluster')) {
      prerequisites.push('STX cluster access and SSH credentials');
      prerequisites.push('kubectl configured for target cluster');
    }

    // Add observability access for monitoring-related entries
    if (entry.title.toLowerCase().includes('observability') ||
        entry.title.toLowerCase().includes('monitoring')) {
      prerequisites.push('Grafana dashboard access');
      prerequisites.push('Prometheus query access');
      prerequisites.push('Loki log access');
    }

    // Add CI/CD access for deployment-related entries
    if (entry.title.toLowerCase().includes('ci') ||
        entry.title.toLowerCase().includes('deployment') ||
        entry.title.toLowerCase().includes('pipeline')) {
      prerequisites.push('CI/CD pipeline access');
      prerequisites.push('GitHub/GitLab repository access');
    }

    return prerequisites;
  }

  /**
   * Estimate duration based on severity
   */
  private static estimateDuration(severity: ROAMSeverity): string {
    switch (severity) {
      case 'critical':
        return '4-8 hours';
      case 'high':
        return '2-4 hours';
      case 'medium':
        return '1-2 hours';
      case 'low':
        return '30-60 minutes';
      default:
        return '1-2 hours';
    }
  }

  /**
   * Generate success criteria from entry
   */
  private static generateSuccessCriteria(entry: ROAMEntry): string[] {
    const criteria: string[] = [];

    // Add validation criteria if available
    if (entry.validation_result && entry.validation_result.length > 0) {
      criteria.push('All validation steps completed successfully');
    }

    // Add evidence criteria if available
    if (entry.evidence && entry.evidence.length > 0) {
      criteria.push('All evidence items collected and verified');
    }

    // Add deployment criteria if available
    if (entry.deployment_result && entry.deployment_result.length > 0) {
      criteria.push('Deployment completed and verified');
    }

    // Add general criteria based on entry type
    if (entry.title.toLowerCase().includes('connectivity')) {
      criteria.push('Network connectivity verified');
      criteria.push('All nodes/pods healthy');
    }

    if (entry.title.toLowerCase().includes('observability')) {
      criteria.push('Monitoring stack operational');
      criteria.push('Dashboard accessible and functional');
    }

    if (entry.title.toLowerCase().includes('compilation')) {
      criteria.push('Zero compilation errors');
      criteria.push('All tests passing');
    }

    return criteria;
  }
}

// ============================================================================
// RUNBOOK STORAGE
// ============================================================================

/**
 * RunbookStorage - Manage runbook files in docs/runbooks/
 */
export class RunbookStorage {
  private static readonly RUNBOOKS_DIR = path.join(__dirname, '../../../docs/runbooks');

  /**
   * Ensure runbooks directory exists
   */
  private static async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.RUNBOOKS_DIR, { recursive: true });
    } catch (error) {
      // Directory exists or permission error
      if ((error as any).code !== 'EEXIST') {
        console.error('[RETRO-COACH] Failed to create runbooks directory:', error);
        throw error;
      }
    }
  }

  /**
   * Generate filename for runbook
   */
  private static generateFilename(runbook: Runbook): string {
    const slug = slugify(runbook.title, { lower: true, strict: true });
    return `${runbook.roam_id}_${runbook.category}_${slug}.md`;
  }

  /**
   * Convert runbook to markdown format
   */
  private static toMarkdown(runbook: Runbook): string {
    const steps = runbook.resolution_steps
      .map(step => {
        let md = `### Step ${step.step}: ${step.action}\n\n`;
        if (step.command) {
          md += `\`\`\`bash\n${step.command}\n\`\`\`\n\n`;
        }
        if (step.expected_result) {
          md += `**Expected Result:** ${step.expected_result}\n\n`;
        }
        if (step.verification_method) {
          md += `**Verification:** ${step.verification_method}\n\n`;
        }
        return md;
      })
      .join('\n');

    const prerequisites = runbook.prerequisites
      .map(prereq => `- ${prereq}`)
      .join('\n');

    const successCriteria = runbook.success_criteria
      .join('\n- ');

    return `---
id: ${runbook.id}
roam_id: ${runbook.roam_id}
title: ${runbook.title}
category: ${runbook.category}
severity: ${runbook.severity}
created_at: ${runbook.created_at}
updated_at: ${runbook.updated_at}
estimated_duration: ${runbook.estimated_duration}
---

# ${runbook.title}

## Description

${runbook.description}

## Prerequisites

${prerequisites || 'None'}

## Resolution Steps

${steps}

## Success Criteria

- ${successCriteria}

## Metadata

| Attribute | Value |
|-----------|-------|
| **ROAM ID** | ${runbook.roam_id} |
| **Category** | ${runbook.category} |
| **Severity** | ${runbook.severity} |
| **Estimated Duration** | ${runbook.estimated_duration} |
| **Created** | ${runbook.created_at} |
| **Updated** | ${runbook.updated_at} |
`;
  }

  /**
   * Save runbook to file
   */
  static async save(runbook: Runbook): Promise<string> {
    await this.ensureDirectory();
    const filename = this.generateFilename(runbook);
    const filePath = path.join(this.RUNBOOKS_DIR, filename);
    const content = this.toMarkdown(runbook);
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`[RETRO-COACH] Saved runbook: ${filename}`);
    return filePath;
  }

  /**
   * Load runbook from file
   */
  static async load(filename: string): Promise<Runbook | null> {
    try {
      const filePath = path.join(this.RUNBOOKS_DIR, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseMarkdown(content);
    } catch (error) {
      console.error(`[RETRO-COACH] Failed to load runbook ${filename}:`, error);
      return null;
    }
  }

  /**
   * Parse runbook from markdown
   */
  private static parseMarkdown(content: string): Runbook | null {
    const lines = content.split('\n');
    const runbook: Partial<Runbook> = {};
    const steps: ResolutionStep[] = [];
    let inSteps = false;
    let stepNumber = 0;

    for (const line of lines) {
      // Parse frontmatter
      const idMatch = line.match(/^id:\s*(.+)$/);
      if (idMatch) runbook.id = idMatch[1].trim();

      const roamIdMatch = line.match(/^roam_id:\s*(.+)$/);
      if (roamIdMatch) runbook.roam_id = roamIdMatch[1].trim();

      const titleMatch = line.match(/^title:\s*(.+)$/);
      if (titleMatch) runbook.title = titleMatch[1].trim();

      const categoryMatch = line.match(/^category:\s*(.+)$/);
      if (categoryMatch) runbook.category = this.parseCategory(categoryMatch[1].trim());

      const severityMatch = line.match(/^severity:\s*(.+)$/);
      if (severityMatch) runbook.severity = this.parseSeverity(severityMatch[1].trim());

      const createdAtMatch = line.match(/^created_at:\s*(.+)$/);
      if (createdAtMatch) runbook.created_at = createdAtMatch[1].trim();

      const updatedAtMatch = line.match(/^updated_at:\s*(.+)$/);
      if (updatedAtMatch) runbook.updated_at = updatedAtMatch[1].trim();

      const durationMatch = line.match(/^estimated_duration:\s*(.+)$/);
      if (durationMatch) runbook.estimated_duration = durationMatch[1].trim();

      const descMatch = line.match(/^## Description$/);
      if (descMatch) {
        runbook.description = '';
        inSteps = false;
      }

      const stepsMatch = line.match(/^## Resolution Steps$/);
      if (stepsMatch) {
        inSteps = true;
      }

      // Parse step
      if (inSteps && line.match(/^###\s+Step\s+\d+:/)) {
        stepNumber++;
        const step: ResolutionStep = {
          step: stepNumber,
          action: '',
        };
        steps.push(step);
      }

      // Parse step details
      if (inSteps && steps.length > 0) {
        const currentStep = steps[steps.length - 1];
        
        const commandMatch = line.match(/```bash\n(.+?)\n```/s);
        if (commandMatch) {
          currentStep.command = commandMatch[1].trim();
        }

        const expectedMatch = line.match(/\*\*Expected Result:\*\*\s*(.+)$/);
        if (expectedMatch) {
          currentStep.expected_result = expectedMatch[1].trim();
        }

        const verifyMatch = line.match(/\*\*Verification:\*\*\s*(.+)$/);
        if (verifyMatch) {
          currentStep.verification_method = verifyMatch[1].trim();
        }

        const actionMatch = line.match(/^###\s+Step\s+\d+:\s*(.+)$/);
        if (actionMatch) {
          currentStep.action = actionMatch[1].trim();
        }
      }
    }

    if (runbook.id && runbook.title) {
      return {
        ...runbook,
        resolution_steps: steps,
        prerequisites: [],
        success_criteria: []
      } as Runbook;
    }

    return null;
  }

  /**
   * List all runbooks
   */
  static async listAll(): Promise<Runbook[]> {
    await this.ensureDirectory();
    const files = await fs.readdir(this.RUNBOOKS_DIR);
    const runbooks: Runbook[] = [];

    for (const file of files) {
      if (file.endsWith('.md')) {
        const runbook = await this.load(file);
        if (runbook) {
          runbooks.push(runbook);
        }
      }
    }

    return runbooks.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  /**
   * Delete runbook
   */
  static async delete(filename: string): Promise<void> {
    const filePath = path.join(this.RUNBOOKS_DIR, filename);
    await fs.unlink(filePath);
    console.log(`[RETRO-COACH] Deleted runbook: ${filename}`);
  }

  /**
   * Update existing runbook
   */
  static async update(runbook: Runbook): Promise<void> {
    runbook.updated_at = new Date().toISOString();
    await this.save(runbook);
  }

  /**
   * Parse category from string
   */
  private static parseCategory(category: string): ROAMCategory {
    const lower = category.toLowerCase();
    if (lower.includes('resolved')) return 'resolved';
    if (lower.includes('owned')) return 'owned';
    if (lower.includes('accepted')) return 'accepted';
    if (lower.includes('mitigated')) return 'mitigated';
    return 'resolved';
  }

  /**
   * Parse severity from string
   */
  private static parseSeverity(severity: string): ROAMSeverity {
    const lower = severity.toLowerCase();
    if (lower.includes('critical')) return 'critical';
    if (lower.includes('high')) return 'high';
    if (lower.includes('medium')) return 'medium';
    if (lower.includes('low')) return 'low';
    return 'low';
  }
}

// ============================================================================
// RUNBOOK VALIDATOR
// ============================================================================

/**
 * RunbookValidator - Validate runbook structure and content
 */
export class RunbookValidator {
  /**
   * Validate runbook
   */
  static validate(runbook: Runbook): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!runbook.id || runbook.id.trim() === '') {
      errors.push('Missing or empty ID field');
    }

    if (!runbook.title || runbook.title.trim() === '') {
      errors.push('Missing or empty title field');
    }

    if (!runbook.roam_id || runbook.roam_id.trim() === '') {
      errors.push('Missing or empty roam_id field');
    }

    if (!runbook.description || runbook.description.trim() === '') {
      errors.push('Missing or empty description field');
    }

    if (!runbook.resolution_steps || runbook.resolution_steps.length === 0) {
      errors.push('Missing or empty resolution_steps field');
    }

    if (!runbook.created_at) {
      errors.push('Missing created_at field');
    }

    if (!runbook.updated_at) {
      errors.push('Missing updated_at field');
    }

    // Validate category
    const validCategories: ROAMCategory[] = ['resolved', 'owned', 'accepted', 'mitigated'];
    if (!validCategories.includes(runbook.category)) {
      errors.push(`Invalid category: ${runbook.category}`);
    }

    // Validate severity
    const validSeverities: ROAMSeverity[] = ['critical', 'high', 'medium', 'low'];
    if (!validSeverities.includes(runbook.severity)) {
      errors.push(`Invalid severity: ${runbook.severity}`);
    }

    // Validate ISO 8601 dates
    if (runbook.created_at && !this.isValidISODate(runbook.created_at)) {
      errors.push(`Invalid created_at format: ${runbook.created_at}`);
    }

    if (runbook.updated_at && !this.isValidISODate(runbook.updated_at)) {
      errors.push(`Invalid updated_at format: ${runbook.updated_at}`);
    }

    // Validate resolution steps
    for (let i = 0; i < runbook.resolution_steps.length; i++) {
      const step = runbook.resolution_steps[i];
      if (!step.action || step.action.trim() === '') {
        errors.push(`Step ${i + 1} has empty action`);
      }
    }

    // Warnings for best practices
    if (runbook.prerequisites.length === 0) {
      warnings.push('No prerequisites specified');
    }

    if (runbook.success_criteria.length === 0) {
      warnings.push('No success criteria specified');
    }

    if (runbook.resolution_steps.length < 2) {
      warnings.push('Runbook has fewer than 2 steps, may be incomplete');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate ISO 8601 date format
   */
  private static isValidISODate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString === date.toISOString();
  }
}

// ============================================================================
// RETRO COACH MAIN CLASS
// ============================================================================

/**
 * RetroCoach - Main orchestrator for runbook generation and management
 */
export class RetroCoach {
  private docsDir: string;

  constructor(docsDir?: string) {
    this.docsDir = docsDir || path.join(__dirname, '../../../docs');
  }

  /**
   * Generate runbooks from all RESOLVED ROAM entries
   */
  async generateRunbooks(): Promise<{ generated: number; updated: number; errors: string[] }> {
    console.log('[RETRO-COACH] Starting runbook generation...');
    
    const results = {
      generated: 0,
      updated: 0,
      errors: [] as string[]
    };

    try {
      // Find all ROAM markdown files
      const files = await fs.readdir(this.docsDir);
      const roamFiles = files.filter(f => 
        f.toLowerCase().includes('roam') && f.endsWith('.md')
      );

      console.log(`[RETRO-COACH] Found ${roamFiles.length} ROAM files`);

      // Parse each ROAM file
      for (const file of roamFiles) {
        const filePath = path.join(this.docsDir, file);
        console.log(`[RETRO-COACH] Processing: ${file}`);
        
        try {
          const entries = await ROAMParser.parseMarkdown(filePath);
          const resolvedEntries = entries.filter(e => 
            e.category === 'resolved' || e.status.toLowerCase().includes('resolved')
          );

          console.log(`[RETRO-COACH] Found ${resolvedEntries.length} RESOLVED entries in ${file}`);

          // Generate runbooks for resolved entries
          for (const entry of resolvedEntries) {
            try {
              const runbook = RunbookGenerator.generateFromROAM(entry);
              
              // Check if runbook already exists
              const existingRunbooks = await RunbookStorage.listAll();
              const existing = existingRunbooks.find(rb => rb.roam_id === runbook.roam_id);
              
              if (existing) {
                // Update existing runbook
                await RunbookStorage.update(runbook);
                results.updated++;
                console.log(`[RETRO-COACH] Updated runbook for ${entry.id}`);
              } else {
                // Create new runbook
                await RunbookStorage.save(runbook);
                results.generated++;
                console.log(`[RETRO-COACH] Generated runbook for ${entry.id}`);
              }
            } catch (error) {
              const errorMsg = `Failed to generate runbook for ${entry.id}: ${error}`;
              results.errors.push(errorMsg);
              console.error(`[RETRO-COACH] ${errorMsg}`);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process ${file}: ${error}`;
          results.errors.push(errorMsg);
          console.error(`[RETRO-COACH] ${errorMsg}`);
        }
      }

      console.log(`[RETRO-COACH] Generation complete: ${results.generated} generated, ${results.updated} updated, ${results.errors.length} errors`);
    } catch (error) {
      const errorMsg = `Failed to generate runbooks: ${error}`;
      results.errors.push(errorMsg);
      console.error(`[RETRO-COACH] ${errorMsg}`);
    }

    return results;
  }

  /**
   * List all runbooks
   */
  async listRunbooks(): Promise<Runbook[]> {
    return await RunbookStorage.listAll();
  }

  /**
   * Validate all runbooks
   */
  async validateRunbooks(): Promise<{ valid: number; invalid: number; results: ValidationResult[] }> {
    const runbooks = await RunbookStorage.listAll();
    const results: ValidationResult[] = [];

    for (const runbook of runbooks) {
      const validation = RunbookValidator.validate(runbook);
      results.push(validation);
    }

    const valid = results.filter(r => r.valid).length;
    const invalid = results.filter(r => !r.valid).length;

    console.log(`[RETRO-COACH] Validation complete: ${valid} valid, ${invalid} invalid`);

    return { valid, invalid, results };
  }

  /**
   * Get runbook by ROAM ID
   */
  async getRunbookByROAMId(roamId: string): Promise<Runbook | null> {
    const runbooks = await RunbookStorage.listAll();
    return runbooks.find(rb => rb.roam_id === roamId) || null;
  }

  /**
   * Delete runbook by filename
   */
  async deleteRunbook(filename: string): Promise<void> {
    await RunbookStorage.delete(filename);
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

/**
 * CLI interface for Retro Coach
 */
export class RetroCoachCLI {
  private coach: RetroCoach;

  constructor(coach?: RetroCoach) {
    this.coach = coach || new RetroCoach();
  }

  /**
   * Main CLI entry point
   */
  async run(args: string[]): Promise<void> {
    const command = args[0] || 'help';

    switch (command) {
      case 'generate':
        await this.generate();
        break;
      case 'list':
        await this.list();
        break;
      case 'validate':
        await this.validate();
        break;
      case 'help':
      default:
        this.showHelp();
        break;
    }
  }

  /**
   * Generate runbooks
   */
  private async generate(): Promise<void> {
    console.log('\n📚 Generating runbooks from RESOLVED ROAM entries...\n');
    const results = await this.coach.generateRunbooks();
    
    console.log('\n' + '='.repeat(60));
    console.log('GENERATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Generated: ${results.generated}`);
    console.log(`🔄 Updated:   ${results.updated}`);
    console.log(`❌ Errors:    ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
    console.log('\n');
  }

  /**
   * List runbooks
   */
  private async list(): Promise<void> {
    console.log('\n📋 Listing all runbooks...\n');
    const runbooks = await this.coach.listRunbooks();
    
    if (runbooks.length === 0) {
      console.log('No runbooks found.\n');
      return;
    }

    console.log('='.repeat(80));
    console.log(`${runbooks.length} Runbooks Found`);
    console.log('='.repeat(80));
    console.log('\n');

    for (const runbook of runbooks) {
      console.log(`ID:        ${runbook.id}`);
      console.log(`ROAM ID:   ${runbook.roam_id}`);
      console.log(`Title:      ${runbook.title}`);
      console.log(`Category:   ${runbook.category}`);
      console.log(`Severity:    ${runbook.severity}`);
      console.log(`Duration:    ${runbook.estimated_duration}`);
      console.log(`Updated:    ${runbook.updated_at}`);
      console.log('-'.repeat(80));
    }

    console.log(`\nTotal: ${runbooks.length} runbooks\n`);
  }

  /**
   * Validate runbooks
   */
  private async validate(): Promise<void> {
    console.log('\n✓ Validating runbooks...\n');
    const results = await this.coach.validateRunbooks();
    
    console.log('='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Valid:   ${results.valid}`);
    console.log(`❌ Invalid: ${results.invalid}`);
    
    if (results.invalid > 0) {
      console.log('\nInvalid Runbooks:');
      
      for (let i = 0; i < results.results.length; i++) {
        const result = results.results[i];
        if (!result.valid) {
          const runbook = await this.coach.listRunbooks();
          if (runbook[i]) {
            console.log(`\n  ${runbook[i].title} (${runbook[i].roam_id}):`);
            console.log('    Errors:');
            result.errors.forEach(err => console.log(`      - ${err}`));
            if (result.warnings.length > 0) {
              console.log('    Warnings:');
              result.warnings.forEach(warn => console.log(`      - ${warn}`));
            }
          }
        }
      }
    }
    
    console.log('\n');
  }

  /**
   * Show help
   */
  private showHelp(): void {
    console.log(`
Retro Coach - Auto-Generate Runbooks from RESOLVED ROAM Items

USAGE:
  npx ts-node agentic-flow-core/src/agents/retro_coach.ts <command>

COMMANDS:
  generate    Generate runbooks from all RESOLVED ROAM entries
  list        List all generated runbooks
  validate     Validate all runbooks for completeness
  help         Show this help message

EXAMPLES:
  npx ts-node agentic-flow-core/src/agents/retro_coach.ts generate
  npx ts-node agentic-flow-core/src/agents/retro_coach.ts list
  npx ts-node agentic-flow-core/src/agents/retro_coach.ts validate

OUTPUT:
  Runbooks are stored in docs/runbooks/ directory
  Filename format: {roam_id}_{category}_{title_slug}.md
`);
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

/**
 * Main entry point when run as CLI
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new RetroCoachCLI();
  await cli.run(process.argv.slice(2));
}
