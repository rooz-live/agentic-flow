/**
 * Risk Assessment Types
 */

export interface RiskMetric {
  id: string;
  name: string;
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface RiskAssessment {
  overallScore: number;
  metrics: RiskMetric[];
  recommendations: string[];
}

export interface RiskConfig {
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  categories: string[];
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
