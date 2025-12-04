/**
 * Mock implementation of aidefence
 * In a real scenario, this would import from the actual 'aidefence' package.
 */
export class AiDefence {
    /**
     * Validates content against specified regulatory rules.
     */
    static async validate(content, options) {
        const violations = [];
        // 1. PCI-DSS Check (Mock: looks for credit card patterns)
        if (options.rules.includes('pci-dss')) {
            const ccRegex = /\b(?:\d[ -]*?){13,16}\b/;
            if (ccRegex.test(content)) {
                violations.push('PCI-DSS Violation: Potential credit card number detected');
            }
        }
        // 2. GDPR Check (Mock: looks for PII patterns like email)
        if (options.rules.includes('gdpr')) {
            // Very basic email regex for demonstration
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
            if (emailRegex.test(content)) {
                violations.push('GDPR Warning: Potential PII (email) detected');
            }
        }
        // 3. Financial Advice Check (Mock: looks for specific disclaimers)
        if (options.rules.includes('financial-advice')) {
            if (!content.toLowerCase().includes('not financial advice')) {
                violations.push('Compliance Violation: Missing financial advice disclaimer');
            }
        }
        return {
            valid: violations.length === 0,
            violations,
            metadata: {
                checkedAt: new Date().toISOString(),
                rules: options.rules
            }
        };
    }
}
//# sourceMappingURL=index.js.map