export class ValidationCheck {
    constructor(
        public readonly name: string,
        public readonly passed: boolean,
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

    get score(): number {
        if (this.checks.length === 0) return 0;
        const passed = this.checks.filter(c => c.passed).length;
        return Math.round((passed / this.checks.length) * 100);
    }

    get verdict(): 'PASS' | 'FAIL' {
        return this.score >= 80 ? 'PASS' : 'FAIL';
    }

    toJSON() {
        return {
            file: this.filePath,
            score: this.score,
            verdict: this.verdict,
            checks: this.checks.map(c => ({
                name: c.name,
                passed: c.passed,
                details: c.details
            }))
        };
    }
}

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

// Application Service
export class ValidationAppService {
    constructor(private featureFlagOn: boolean = true) {}

    async validateEmail(filePath: string): Promise<ValidationReport> {
        if (!this.featureFlagOn) {
            throw new Error("Validation Feature Disabled - EXIT CODE 1 (Blocker) / HTTP 403");
        }

        const event = new ValidationRequested(filePath);
        const report = new ValidationReport(filePath);
        
        // Simulate domain logic
        report.addCheck(new ValidationCheck('PlaceholderCheck', true, 'No placeholders found'));
        report.addCheck(new ValidationCheck('SignatureCheck', true, 'Valid Pro Se signature'));
        report.addCheck(new ValidationCheck('AttachmentCheck', true, 'No missing attachments'));

        const completedEvent = new ValidationCompleted(report);
        
        return report;
    }
}
