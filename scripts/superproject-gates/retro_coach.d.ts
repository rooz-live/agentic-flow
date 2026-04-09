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
    id: string;
    title: string;
    roam_id: string;
    category: ROAMCategory;
    severity: ROAMSeverity;
    description: string;
    resolution_steps: ResolutionStep[];
    prerequisites: string[];
    estimated_duration: string;
    success_criteria: string[];
    created_at: string;
    updated_at: string;
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
/**
 * ROAMParser - Parse ROAM markdown files into structured entries
 */
export declare class ROAMParser {
    /**
     * Parse ROAM markdown file and extract all entries
     */
    static parseMarkdown(filePath: string): Promise<ROAMEntry[]>;
    /**
     * Extract ROAM entries from markdown content
     */
    private static extractEntries;
    /**
     * Parse category string to ROAMCategory type
     */
    private static parseCategory;
    /**
     * Parse severity string to ROAMSeverity type
     */
    private static parseSeverity;
    /**
     * Finalize entry with collected data
     */
    private static finalizeEntry;
}
/**
 * RunbookGenerator - Generate executable runbooks from ROAM entries
 */
export declare class RunbookGenerator {
    /**
     * Generate runbook from a RESOLVED ROAM entry
     */
    static generateFromROAM(entry: ROAMEntry): Runbook;
    /**
     * Extract resolution steps from ROAM entry
     */
    private static extractResolutionSteps;
    /**
     * Parse a single step from list item
     */
    private static parseStep;
    /**
     * Extract prerequisites from ROAM entry
     */
    private static extractPrerequisites;
    /**
     * Estimate duration based on severity
     */
    private static estimateDuration;
    /**
     * Generate success criteria from entry
     */
    private static generateSuccessCriteria;
}
/**
 * RunbookStorage - Manage runbook files in docs/runbooks/
 */
export declare class RunbookStorage {
    private static readonly RUNBOOKS_DIR;
    /**
     * Ensure runbooks directory exists
     */
    private static ensureDirectory;
    /**
     * Generate filename for runbook
     */
    private static generateFilename;
    /**
     * Convert runbook to markdown format
     */
    private static toMarkdown;
    /**
     * Save runbook to file
     */
    static save(runbook: Runbook): Promise<string>;
    /**
     * Load runbook from file
     */
    static load(filename: string): Promise<Runbook | null>;
    /**
     * Parse runbook from markdown
     */
    private static parseMarkdown;
    /**
     * List all runbooks
     */
    static listAll(): Promise<Runbook[]>;
    /**
     * Delete runbook
     */
    static delete(filename: string): Promise<void>;
    /**
     * Update existing runbook
     */
    static update(runbook: Runbook): Promise<void>;
    /**
     * Parse category from string
     */
    private static parseCategory;
    /**
     * Parse severity from string
     */
    private static parseSeverity;
}
/**
 * RunbookValidator - Validate runbook structure and content
 */
export declare class RunbookValidator {
    /**
     * Validate runbook
     */
    static validate(runbook: Runbook): ValidationResult;
    /**
     * Validate ISO 8601 date format
     */
    private static isValidISODate;
}
/**
 * RetroCoach - Main orchestrator for runbook generation and management
 */
export declare class RetroCoach {
    private docsDir;
    constructor(docsDir?: string);
    /**
     * Generate runbooks from all RESOLVED ROAM entries
     */
    generateRunbooks(): Promise<{
        generated: number;
        updated: number;
        errors: string[];
    }>;
    /**
     * List all runbooks
     */
    listRunbooks(): Promise<Runbook[]>;
    /**
     * Validate all runbooks
     */
    validateRunbooks(): Promise<{
        valid: number;
        invalid: number;
        results: ValidationResult[];
    }>;
    /**
     * Get runbook by ROAM ID
     */
    getRunbookByROAMId(roamId: string): Promise<Runbook | null>;
    /**
     * Delete runbook by filename
     */
    deleteRunbook(filename: string): Promise<void>;
}
/**
 * CLI interface for Retro Coach
 */
export declare class RetroCoachCLI {
    private coach;
    constructor(coach?: RetroCoach);
    /**
     * Main CLI entry point
     */
    run(args: string[]): Promise<void>;
    /**
     * Generate runbooks
     */
    private generate;
    /**
     * List runbooks
     */
    private list;
    /**
     * Validate runbooks
     */
    private validate;
    /**
     * Show help
     */
    private showHelp;
}
//# sourceMappingURL=retro_coach.d.ts.map