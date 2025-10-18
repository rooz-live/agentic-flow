/**
 * Type definitions for MCP Learning Integration
 */

export interface ExecutionContext {
  userId: string;
  sessionId: string;
  taskType: 'coding' | 'research' | 'debugging' | 'general';
  timestamp: number;
  isTerminal: boolean;
  metadata?: Record<string, any>;
}

export interface State {
  taskDescription: string;
  availableTools: string[];
  previousActions: Action[];
  constraints?: Record<string, any>;
  context?: Record<string, any>;
  embedding?: Float32Array;
}

export interface Action {
  tool: string;
  params: Record<string, any>;
  timestamp?: number;
}

export interface Experience {
  state: State;
  action: Action;
  reward: number;
  nextState: State;
  done: boolean;
  timestamp: number;
  metadata: {
    userId: string;
    sessionId: string;
    taskType: string;
    actionId?: string;
    [key: string]: any;
  };
}

export interface Outcome {
  success: boolean;
  result: any;
  error?: Error;
  executionTime: number;
  tokensUsed?: number;
  metadata?: Record<string, any>;
}

export interface Reward {
  automatic: number;
  userFeedback?: number;
  objective: number;
  combined: number;
  dimensions: {
    success: number;
    efficiency: number;
    quality: number;
    cost: number;
  };
}

export interface ActionPrediction {
  recommendedAction: {
    tool: string;
    params: Record<string, any>;
    confidence: number;
    reasoning: string;
  };
  alternatives: Array<{
    tool: string;
    params?: Record<string, any>;
    confidence: number;
    reasoning: string;
  }>;
}

export interface TrainingOptions {
  batchSize?: number;
  epochs?: number;
  learningRate?: number;
  minExperiences?: number;
}

export interface TrainingMetrics {
  loss: number;
  accuracy: number;
  experiencesProcessed: number;
  trainingTime: number;
  improvements: {
    taskCompletionTime: string;
    tokenEfficiency: string;
    successRate: string;
  };
}

export interface LearningSession {
  sessionId: string;
  userId: string;
  sessionType: 'coding' | 'research' | 'debugging' | 'general';
  plugin: string;
  status: 'active' | 'ended' | 'paused';
  startTime: number;
  endTime?: number;
  experienceCount: number;
  currentPolicy?: any;
  config: Record<string, any>;
}

export interface FeedbackInput {
  success: boolean;
  rating: number;
  comments?: string;
  dimensions?: {
    speed?: number;
    accuracy?: number;
    completeness?: number;
  };
}

export interface LearningMetrics {
  period: 'session' | 'day' | 'week' | 'month' | 'all';
  totalExperiences: number;
  averageReward: number;
  successRate: number;
  learningProgress: {
    initial: number;
    current: number;
    improvement: string;
  };
  topActions: Array<{
    tool: string;
    successRate: number;
    avgReward: number;
    count: number;
  }>;
}

export interface TransferMetrics {
  sourceTask: string;
  targetTask: string;
  similarity: number;
  transferSuccess: boolean;
  performanceGain: number;
  experiencesTransferred: number;
}
