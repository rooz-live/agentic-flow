/**
 * Citation Verification Tool
 * Verifies medical citations against trusted sources
 */
import type { Citation, MCPToolResponse } from '../types';
export declare class CitationVerifyTool {
    private readonly validator;
    constructor();
    /**
     * Verify citations
     */
    execute(args: {
        citations: Citation[];
        strictMode?: boolean;
    }): Promise<MCPToolResponse>;
    /**
     * Generate verification summary
     */
    private generateSummary;
    /**
     * Format verification report
     */
    private formatVerificationReport;
}
//# sourceMappingURL=citation-verify.d.ts.map