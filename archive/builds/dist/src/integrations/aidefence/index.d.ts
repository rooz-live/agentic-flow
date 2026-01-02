/**
 * Mock implementation of aidefence
 * In a real scenario, this would import from the actual 'aidefence' package.
 */
export interface ValidationResult {
    valid: boolean;
    violations: string[];
    metadata: {
        checkedAt: string;
        rules: string[];
    };
}
export interface GuardrailOptions {
    rules: ('pci-dss' | 'gdpr' | 'financial-advice')[];
    strict: boolean;
}
export declare class AiDefence {
    /**
     * Validates content against specified regulatory rules.
     */
    static validate(content: string, options: GuardrailOptions): Promise<ValidationResult>;
}
//# sourceMappingURL=index.d.ts.map