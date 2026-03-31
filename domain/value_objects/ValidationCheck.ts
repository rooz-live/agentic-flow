/**
 * ValidationCheck Value Object
 * 
 * Immutable value object representing a single validation check
 * Used by ValidationReport aggregate
 */
export class ValidationCheck {
  constructor(
    public readonly name: string,
    public readonly passed: boolean,
    public readonly message: string,
    public readonly severity: 'ERROR' | 'WARNING' | 'INFO',
    public readonly checkType?: 'WSJF' | 'FILE_EXISTENCE' | 'DATE_FORMAT' | 'CITATION' | 'SIGNATURE'
  ) {
    // Value object invariants
    if (!name || name.trim().length === 0) {
      throw new Error('ValidationCheck name cannot be empty');
    }
    if (!message || message.trim().length === 0) {
      throw new Error('ValidationCheck message cannot be empty');
    }
  }
  
  /**
   * Factory: Create a passing check
   */
  static pass(name: string, message: string, checkType?: string): ValidationCheck {
    return new ValidationCheck(
      name,
      true,
      message,
      'INFO',
      checkType as any
    );
  }
  
  /**
   * Factory: Create a failing check with ERROR severity
   */
  static error(name: string, message: string, checkType?: string): ValidationCheck {
    return new ValidationCheck(
      name,
      false,
      message,
      'ERROR',
      checkType as any
    );
  }
  
  /**
   * Factory: Create a failing check with WARNING severity
   */
  static warning(name: string, message: string, checkType?: string): ValidationCheck {
    return new ValidationCheck(
      name,
      false,
      message,
      'WARNING',
      checkType as any
    );
  }
  
  /**
   * Business rule: Is this check trial-critical?
   */
  isTrialCritical(): boolean {
    return this.checkType === 'CITATION' || 
           this.checkType === 'SIGNATURE' ||
           this.checkType === 'DATE_FORMAT';
  }
  
  /**
   * Value equality
   */
  equals(other: ValidationCheck): boolean {
    return this.name === other.name &&
           this.passed === other.passed &&
           this.message === other.message &&
           this.severity === other.severity &&
           this.checkType === other.checkType;
  }
}
