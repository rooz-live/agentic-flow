/**
 * Domain Events for Validation
 * 
 * Purpose: Event sourcing for audit trail in arbitration testimony
 * Context: April 16, 2026 arbitration requires traceable validation timeline
 */

/**
 * ValidationRequestedEvent
 * Emitted when validation process starts
 */
export class ValidationRequestedEvent {
  public readonly eventType = 'VALIDATION_REQUESTED';
  public readonly version = '1.0';
  
  constructor(
    public readonly reportId: string,
    public readonly timestamp: Date,
    public readonly filePath?: string
  ) {}
  
  toJSON() {
    return {
      eventType: this.eventType,
      version: this.version,
      reportId: this.reportId,
      timestamp: this.timestamp.toISOString(),
      filePath: this.filePath
    };
  }
}

/**
 * ValidationCompletedEvent
 * Emitted when validation process finishes
 */
export class ValidationCompletedEvent {
  public readonly eventType = 'VALIDATION_COMPLETED';
  public readonly version = '1.0';
  
  constructor(
    public readonly reportId: string,
    public readonly status: 'PASS' | 'FAIL' | 'WARNING',
    public readonly timestamp: Date,
    public readonly checksCount: number,
    public readonly filePath?: string
  ) {}
  
  toJSON() {
    return {
      eventType: this.eventType,
      version: this.version,
      reportId: this.reportId,
      status: this.status,
      timestamp: this.timestamp.toISOString(),
      checksCount: this.checksCount,
      filePath: this.filePath
    };
  }
}

/**
 * WsjfRiskEscalatedEvent
 * Emitted when WSJF score triggers escalation to ROAM matrix
 */
export class WsjfRiskEscalatedEvent {
  public readonly eventType = 'WSJF_RISK_ESCALATED';
  public readonly version = '1.0';
  
  constructor(
    public readonly filePath: string,
    public readonly wsjfScore: number,
    public readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    public readonly timestamp: Date,
    public readonly swarmName?: string
  ) {}
  
  toJSON() {
    return {
      eventType: this.eventType,
      version: this.version,
      filePath: this.filePath,
      wsjfScore: this.wsjfScore,
      riskLevel: this.riskLevel,
      timestamp: this.timestamp.toISOString(),
      swarmName: this.swarmName
    };
  }
}
