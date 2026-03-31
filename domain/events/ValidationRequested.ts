export interface ValidationRequested {
  type: 'ValidationRequested';
  aggregateId: string;
  documentPath: string;
  timestamp: Date;
}
