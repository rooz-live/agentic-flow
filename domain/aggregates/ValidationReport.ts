/**
 * ValidationReport Aggregate
 * Enables trial exhibit validation (rent calculations, dates, citations)
 */
export class ValidationReport {
  constructor(
    public readonly id: string,
    public readonly documentPath: string,
    public readonly wsjfScore: number,
    public readonly roamCategory: 'resolved' | 'owned' | 'accepted' | 'mitigated',
    public readonly checks: ValidationCheck[],
    public readonly createdAt: Date
  ) {}
  
  get isValid(): boolean {
    return this.checks.every(c => c.passed);
  }
  
  get criticalFailures(): ValidationCheck[] {
    return this.checks.filter(c => !c.passed && c.severity === 'critical');
  }
}
