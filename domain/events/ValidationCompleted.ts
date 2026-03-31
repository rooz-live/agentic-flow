export interface ValidationCompleted {
  type: 'ValidationCompleted';
  aggregateId: string;
  passed: boolean;
  criticalFailures: number;
  timestamp: Date;
}
