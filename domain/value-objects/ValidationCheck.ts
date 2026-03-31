/**
 * ValidationCheck Value Object
 * Represents a single validation rule check
 */
export interface ValidationCheck {
  rule: string;
  passed: boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  metadata?: Record<string, any>;
}
