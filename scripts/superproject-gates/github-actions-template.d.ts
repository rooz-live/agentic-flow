/**
 * GitHub Actions Workflow Template Generator
 *
 * Phase 4 Implementation - CI/CD Pipeline GitHub Actions Integration
 *
 * Generates GitHub Actions workflow YAML files for the Manthra/Yasna/Mithra
 * alignment-preserving CI/CD pipeline.
 *
 * @module alignment-cicd/github-actions-template
 */
import { AlignmentPipelineConfig } from './types.js';
/**
 * Generate a complete GitHub Actions workflow for the alignment pipeline
 * @param config - Pipeline configuration
 * @returns YAML workflow content
 */
export declare function generateGitHubActionsWorkflow(config?: AlignmentPipelineConfig): string;
/**
 * Generate and save the workflow file
 * @param config - Pipeline configuration
 * @param outputPath - Path to save the workflow file
 * @returns The generated YAML content
 */
export declare function generateAndSaveWorkflow(config?: AlignmentPipelineConfig, outputPath?: string): {
    yaml: string;
    path: string;
};
/**
 * Generate a minimal workflow for quick testing
 * @returns YAML workflow content
 */
export declare function generateMinimalWorkflow(): string;
/**
 * Generate a strict workflow for production
 * @returns YAML workflow content
 */
export declare function generateStrictWorkflow(): string;
//# sourceMappingURL=github-actions-template.d.ts.map