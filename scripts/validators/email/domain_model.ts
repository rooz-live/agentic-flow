import { readFileSync } from 'fs';

// ─── Value Objects ───────────────────────────────────────────────────────────

export class ValidationCheck {
    constructor(
        public readonly name: string,
        public readonly passed: boolean,
        public readonly severity: 'BLOCKER' | 'WARNING' | 'INFO' = 'INFO',
        public readonly details?: string
    ) {}
}

export class ValidationReport {
    private checks: ValidationCheck[] = [];
    public readonly filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    addCheck(check: ValidationCheck) {
        this.checks.push(check);
    }

    get blockers(): ValidationCheck[] {
        return this.checks.filter(c => !c.passed && c.severity === 'BLOCKER');
    }

    get warnings(): ValidationCheck[] {
        return this.checks.filter(c => !c.passed && c.severity === 'WARNING');
    }

    get score(): number {
        if (this.checks.length === 0) return 0;
        const passed = this.checks.filter(c => c.passed).length;
        return Math.round((passed / this.checks.length) * 100);
    }

    get verdict(): 'PASS' | 'FAIL' | 'WARN' {
        if (this.blockers.length > 0) return 'FAIL';
        if (this.warnings.length > 0) return 'WARN';
        return 'PASS';
    }

    toJSON() {
        return {
            file: this.filePath,
            score: this.score,
            verdict: this.verdict,
            blockerCount: this.blockers.length,
            warningCount: this.warnings.length,
            checks: this.checks.map(c => ({
                name: c.name,
                passed: c.passed,
                severity: c.severity,
                details: c.details
            }))
        };
    }
}

// ─── Domain Events ───────────────────────────────────────────────────────────

export class ValidationRequested {
    constructor(
        public readonly filePath: string,
        public readonly timestamp: Date = new Date()
    ) {}
}

export class ValidationCompleted {
    constructor(
        public readonly report: ValidationReport,
        public readonly timestamp: Date = new Date()
    ) {}
}

// ─── Domain Checks (parity with email-gate-lean.sh) ─────────────────────────

/** Domain-specific byte limits (parity: email-gate-lean.sh check_ddd_connectome_bounds) */
function getDomainBounds(filePath: string): { maxBytes: number; domain: string } {
    const lc = filePath.toLowerCase();
    if (lc.includes('bhopti-legal') || lc.includes('court-filings'))
        return { maxBytes: 64000, domain: 'Legal' };
    if (lc.includes('utilities') || lc.includes('movers'))
        return { maxBytes: 16000, domain: 'Utilities' };
    if (lc.includes('income') || lc.includes('job'))
        return { maxBytes: 24000, domain: 'Income' };
    return { maxBytes: 32000, domain: 'General' };
}

/** Check 0: Domain bounds (parity: email-gate-lean.sh check_ddd_connectome_bounds) */
export function checkBounds(filePath: string, content: string): ValidationCheck {
    const { maxBytes, domain } = getDomainBounds(filePath);
    const size = Buffer.byteLength(content, 'utf-8');
    if (size > maxBytes) {
        return new ValidationCheck(
            'BoundsCheck', false, 'BLOCKER',
            `${domain} domain payload too large (${size}B > ${maxBytes}B)`
        );
    }
    return new ValidationCheck('BoundsCheck', true, 'INFO', `${domain} bounds OK (${size}B)`);
}

/** Check 1: Placeholder detection (parity: email-gate-lean.sh check_placeholders) */
export function checkPlaceholders(content: string): ValidationCheck {
    const patterns = [
        /@example\.com/i,
        /\[YOUR_EMAIL\]/i,
        /\[YOUR_PHONE\]/i,
        /\[AMANDA_EMAIL\]/i,
        /\[AMANDA_PHONE\]/i,
        /shahrooz@example\.com/i,
        /gary@example\.com/i,
    ];
    const found = patterns.filter(p => p.test(content));
    if (found.length > 0) {
        return new ValidationCheck(
            'PlaceholderCheck', false, 'BLOCKER',
            `Placeholders found: ${found.map(p => p.source).join(', ')}`
        );
    }
    return new ValidationCheck('PlaceholderCheck', true, 'INFO', 'No placeholders');
}

/** Check 2: Contact info presence (parity: email-gate-lean.sh check_contact_info) */
export function checkContactInfo(content: string, filePath: string): ValidationCheck {
    const isLegal = /26CV\d{6}/i.test(content);
    const hasContact = /\(\d{3}\) \d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{3}-[A-Z]{5}-\d{2}|\*{10,}|s@rooz\.live|shahrooz@bhopti\.com/i.test(content);
    if (hasContact) {
        return new ValidationCheck('ContactInfoCheck', true, 'INFO', 'Contact info present');
    }
    if (isLegal) {
        return new ValidationCheck(
            'ContactInfoCheck', false, 'BLOCKER',
            'Legal email missing contact info'
        );
    }
    return new ValidationCheck(
        'ContactInfoCheck', false, 'WARNING',
        'Contact info not detected (non-legal)'
    );
}

/** Check 3: Pro Se signature for legal emails (parity: email-gate-lean.sh check_pro_se) */
export function checkProSe(content: string): ValidationCheck {
    const isLegal = /26CV\d{6}/i.test(content);
    if (!isLegal) {
        return new ValidationCheck('ProSeCheck', true, 'INFO', 'Skipped (non-legal)');
    }
    const hasProSe = /pro\s+se|self[- ]represented|appearing without (an )?attorney/i.test(content);
    if (hasProSe) {
        return new ValidationCheck('ProSeCheck', true, 'INFO', 'Pro Se signature present');
    }
    return new ValidationCheck(
        'ProSeCheck', false, 'BLOCKER',
        'Legal email missing Pro Se / self-represented designation'
    );
}

// ─── Application Service ─────────────────────────────────────────────────────

export class ValidationAppService {
    constructor(private featureFlagOn: boolean = true) {}

    /**
     * Validate an email file.
     * Runs all checks in parity with email-gate-lean.sh.
     * Accepts either a file path (reads from disk) or raw content string.
     */
    async validateEmail(filePath: string, rawContent?: string): Promise<ValidationReport> {
        if (!this.featureFlagOn) {
            throw new Error("Validation Feature Disabled - EXIT CODE 1 (Blocker) / HTTP 403");
        }

        const _event = new ValidationRequested(filePath);
        const report = new ValidationReport(filePath);

        const content = rawContent ?? readFileSync(filePath, 'utf-8');

        report.addCheck(checkBounds(filePath, content));
        report.addCheck(checkPlaceholders(content));
        report.addCheck(checkContactInfo(content, filePath));
        report.addCheck(checkProSe(content));

        const _completed = new ValidationCompleted(report);

        return report;
    }
}
