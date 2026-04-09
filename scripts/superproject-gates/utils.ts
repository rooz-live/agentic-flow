/**
 * ROAM Framework Utility Functions
 * 
 * Provides utility functions for risk assessment calculations,
 * validations, and data transformations
 */

import {
  Risk,
  Opportunity,
  Action,
  MitigationStrategy,
  RiskSeverity,
  RiskProbability,
  ROAMCategory,
  RiskImpactArea,
  OpportunityCategory,
  ActionStatus,
  MitigationEffectiveness
} from './types';

/**
 * Validates risk data for completeness and correctness
 */
export function validateRisk(risk: Risk): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required field validation
  if (!risk.id || risk.id.trim() === '') {
    errors.push('Risk ID is required');
  }

  if (!risk.title || risk.title.trim() === '') {
    errors.push('Risk title is required');
  }

  if (!risk.description || risk.description.trim() === '') {
    errors.push('Risk description is required');
  }

  // Enum validation
  if (!Object.values(RiskSeverity).includes(risk.severity)) {
    errors.push(`Invalid severity: ${risk.severity}`);
  }

  if (!Object.values(RiskProbability).includes(risk.probability)) {
    errors.push(`Invalid probability: ${risk.probability}`);
  }

  if (!Object.values(ROAMCategory).includes(risk.category)) {
    errors.push(`Invalid category: ${risk.category}`);
  }

  // Impact area validation
  for (const impact of risk.impactArea) {
    if (!Object.values(RiskImpactArea).includes(impact)) {
      errors.push(`Invalid impact area: ${impact}`);
    }
  }

  // Score validation
  if (risk.score < 0 || risk.score > 100) {
    errors.push(`Risk score must be between 0 and 100: ${risk.score}`);
  }

  // Impact score validation
  const impactScores = [risk.businessImpact, risk.technicalImpact, risk.operationalImpact, risk.financialImpact];
  for (const score of impactScores) {
    if (score < 0 || score > 100) {
      errors.push(`Impact score must be between 0 and 100: ${score}`);
    }
  }

  // Date validation
  if (risk.identifiedAt > new Date()) {
    errors.push('Identified date cannot be in the future');
  }

  if (risk.lastReviewed > new Date()) {
    errors.push('Last reviewed date cannot be in the future');
  }

  if (risk.nextReviewDate <= new Date()) {
    errors.push('Next review date must be in the future');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates opportunity data for completeness and correctness
 */
export function validateOpportunity(opportunity: Opportunity): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required field validation
  if (!opportunity.id || opportunity.id.trim() === '') {
    errors.push('Opportunity ID is required');
  }

  if (!opportunity.title || opportunity.title.trim() === '') {
    errors.push('Opportunity title is required');
  }

  if (!opportunity.description || opportunity.description.trim() === '') {
    errors.push('Opportunity description is required');
  }

  // Enum validation
  if (!Object.values(OpportunityCategory).includes(opportunity.category)) {
    errors.push(`Invalid category: ${opportunity.category}`);
  }

  // Score validation
  if (opportunity.score < 0 || opportunity.score > 100) {
    errors.push(`Opportunity score must be between 0 and 100: ${opportunity.score}`);
  }

  // Value validation
  if (opportunity.value < 0) {
    errors.push(`Opportunity value must be positive: ${opportunity.value}`);
  }

  // Confidence validation
  if (opportunity.valueConfidence < 0 || opportunity.valueConfidence > 100) {
    errors.push(`Value confidence must be between 0 and 100: ${opportunity.valueConfidence}`);
  }

  // Priority validation
  if (opportunity.priority < 1 || opportunity.priority > 10) {
    errors.push(`Priority must be between 1 and 10: ${opportunity.priority}`);
  }

  // Date validation
  if (opportunity.identifiedAt > new Date()) {
    errors.push('Identified date cannot be in the future');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates action data for completeness and correctness
 */
export function validateAction(action: Action): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required field validation
  if (!action.id || action.id.trim() === '') {
    errors.push('Action ID is required');
  }

  if (!action.title || action.title.trim() === '') {
    errors.push('Action title is required');
  }

  if (!action.description || action.description.trim() === '') {
    errors.push('Action description is required');
  }

  // Enum validation
  if (!Object.values(ActionStatus).includes(action.status)) {
    errors.push(`Invalid status: ${action.status}`);
  }

  // Priority validation
  if (action.priority < 1 || action.priority > 10) {
    errors.push(`Priority must be between 1 and 10: ${action.priority}`);
  }

  // Duration validation
  if (action.estimatedDuration <= 0) {
    errors.push(`Estimated duration must be positive: ${action.estimatedDuration}`);
  }

  // Progress validation
  if (action.progress < 0 || action.progress > 100) {
    errors.push(`Progress must be between 0 and 100: ${action.progress}`);
  }

  // Date validation
  if (action.createdAt > new Date()) {
    errors.push('Created date cannot be in the future');
  }

  if (action.dueDate && action.dueDate <= new Date()) {
    errors.push('Due date must be in the future');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculates risk trend based on historical scores
 */
export function calculateRiskTrend(scores: number[]): {
  trend: 'improving' | 'stable' | 'deteriorating';
  changeRate: number;
  confidence: number;
} {
  if (scores.length < 2) {
    return {
      trend: 'stable',
      changeRate: 0,
      confidence: 0
    };
  }

  const recentScores = scores.slice(-5);
  const olderScores = scores.slice(0, -5);

  if (olderScores.length === 0) {
    return {
      trend: 'stable',
      changeRate: 0,
      confidence: 50
    };
  }

  const recentAverage = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
  const olderAverage = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;

  const changeRate = ((recentAverage - olderAverage) / olderAverage) * 100;

  let trend: 'improving' | 'stable' | 'deteriorating';
  if (Math.abs(changeRate) < 5) {
    trend = 'stable';
  } else if (changeRate > 0) {
    trend = 'deteriorating';
  } else {
    trend = 'improving';
  }

  const confidence = Math.min(100, scores.length * 10);

  return {
    trend,
    changeRate: Math.round(changeRate * 10) / 10,
    confidence
  };
}

/**
 * Calculates risk-adjusted WSJF score
 */
export function calculateRiskAdjustedWSJF(
  baseWSJF: number,
  riskScore: number,
  riskAdjustmentFactor: number = 1.5
): number {
  const riskMultiplier = 1 + (riskScore / 100) * riskAdjustmentFactor;
  return Math.round(baseWSJF * riskMultiplier);
}

/**
 * Calculates opportunity-enhanced WSJF score
 */
export function calculateOpportunityEnhancedWSJF(
  baseWSJF: number,
  opportunityValue: number,
  opportunityBonusFactor: number = 1.2
): number {
  const valueMultiplier = 1 + Math.min(opportunityValue / 100000, 1) * opportunityBonusFactor;
  return Math.round(baseWSJF * valueMultiplier);
}

/**
 * Groups risks by specified criteria
 */
export function groupRisks<T extends keyof Risk>(
  risks: Risk[],
  groupBy: T
): Record<string, Risk[]> {
  const groups: Record<string, Risk[]> = {};

  for (const risk of risks) {
    const key = String(risk[groupBy]);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(risk);
  }

  return groups;
}

/**
 * Groups opportunities by specified criteria
 */
export function groupOpportunities<T extends keyof Opportunity>(
  opportunities: Opportunity[],
  groupBy: T
): Record<string, Opportunity[]> {
  const groups: Record<string, Opportunity[]> = {};

  for (const opportunity of opportunities) {
    const key = String(opportunity[groupBy]);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(opportunity);
  }

  return groups;
}

/**
 * Groups actions by specified criteria
 */
export function groupActions<T extends keyof Action>(
  actions: Action[],
  groupBy: T
): Record<string, Action[]> {
  const groups: Record<string, Action[]> = {};

  for (const action of actions) {
    const key = String(action[groupBy]);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(action);
  }

  return groups;
}

/**
 * Filters risks based on specified criteria
 */
export function filterRisks(
  risks: Risk[],
  criteria: Partial<Risk>
): Risk[] {
  return risks.filter(risk => {
    for (const [key, value] of Object.entries(criteria)) {
      if (risk[key as keyof Risk] !== value) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Filters opportunities based on specified criteria
 */
export function filterOpportunities(
  opportunities: Opportunity[],
  criteria: Partial<Opportunity>
): Opportunity[] {
  return opportunities.filter(opportunity => {
    for (const [key, value] of Object.entries(criteria)) {
      if (opportunity[key as keyof Opportunity] !== value) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Filters actions based on specified criteria
 */
export function filterActions(
  actions: Action[],
  criteria: Partial<Action>
): Action[] {
  return actions.filter(action => {
    for (const [key, value] of Object.entries(criteria)) {
      if (action[key as keyof Action] !== value) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Sorts risks by specified field and direction
 */
export function sortRisks<T extends keyof Risk>(
  risks: Risk[],
  sortBy: T,
  direction: 'asc' | 'desc' = 'desc'
): Risk[] {
  return [...risks].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    } else if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    } else {
      return 0;
    }
  });
}

/**
 * Sorts opportunities by specified field and direction
 */
export function sortOpportunities<T extends keyof Opportunity>(
  opportunities: Opportunity[],
  sortBy: T,
  direction: 'asc' | 'desc' = 'desc'
): Opportunity[] {
  return [...opportunities].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    } else if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    } else {
      return 0;
    }
  });
}

/**
 * Sorts actions by specified field and direction
 */
export function sortActions<T extends keyof Action>(
  actions: Action[],
  sortBy: T,
  direction: 'asc' | 'desc' = 'desc'
): Action[] {
  return [...actions].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    } else if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    } else {
      return 0;
    }
  });
}

/**
 * Calculates risk exposure
 */
export function calculateRiskExposure(
  risks: Risk[]
): {
    totalExposure: number;
    byCategory: Record<ROAMCategory, number>;
    bySeverity: Record<RiskSeverity, number>;
    byImpactArea: Record<RiskImpactArea, number>;
  } {
  let totalExposure = 0;
  const byCategory: Record<ROAMCategory, number> = {
    resolved: 0,
    owned: 0,
    accepted: 0,
    mitigated: 0
  };
  const bySeverity: Record<RiskSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  const byImpactArea: Record<RiskImpactArea, number> = {
    technical: 0,
    business: 0,
    operational: 0,
    financial: 0,
    reputational: 0,
    compliance: 0
  };

  for (const risk of risks) {
    const exposure = risk.estimatedCostOfDelay || (risk.score * 1000);
    totalExposure += exposure;
    
    byCategory[risk.category] += exposure;
    bySeverity[risk.severity] += exposure;
    
    for (const impact of risk.impactArea) {
      byImpactArea[impact] += exposure;
    }
  }

  return {
    totalExposure,
    byCategory,
    bySeverity,
    byImpactArea
  };
}

/**
 * Calculates opportunity value realization
 */
export function calculateOpportunityRealization(
  opportunities: Opportunity[]
): {
    totalPotentialValue: number;
    totalRealizedValue: number;
    realizationRate: number;
    byCategory: Record<OpportunityCategory, {
      potential: number;
      realized: number;
      rate: number;
    }>;
  } {
  let totalPotentialValue = 0;
  let totalRealizedValue = 0;
  const byCategory: Record<OpportunityCategory, { potential: number; realized: number; rate: number }> = {
    cost_reduction: { potential: 0, realized: 0, rate: 0 },
    revenue_increase: { potential: 0, realized: 0, rate: 0 },
    efficiency_improvement: { potential: 0, realized: 0, rate: 0 },
    risk_reduction: { potential: 0, realized: 0, rate: 0 },
    innovation: { potential: 0, realized: 0, rate: 0 },
    strategic: { potential: 0, realized: 0, rate: 0 }
  };

  for (const opportunity of opportunities) {
    totalPotentialValue += opportunity.value;
    
    const realizedValue = opportunity.metrics.realizedValue || 0;
    totalRealizedValue += realizedValue;
    
    byCategory[opportunity.category].potential += opportunity.value;
    byCategory[opportunity.category].realized += realizedValue;
  }

  // Calculate realization rates
  for (const category of Object.keys(byCategory) as OpportunityCategory[]) {
    const categoryData = byCategory[category];
    categoryData.rate = categoryData.potential > 0 ? 
      (categoryData.realized / categoryData.potential) * 100 : 0;
  }

  const realizationRate = totalPotentialValue > 0 ? 
    (totalRealizedValue / totalPotentialValue) * 100 : 0;

  return {
    totalPotentialValue,
    totalRealizedValue,
    realizationRate,
    byCategory
  };
}

/**
 * Formats duration in human-readable format
 */
export function formatDuration(days: number): string {
  if (days < 1) {
    return `${Math.round(days * 24)} hours`;
  } else if (days < 7) {
    return `${Math.round(days)} days`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = Math.round(days % 7);
    return `${weeks}w ${remainingDays}d`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    const remainingDays = Math.round(days % 30);
    return `${months}m ${remainingDays}d`;
  } else {
    const years = Math.floor(days / 365);
    const remainingDays = Math.round(days % 365);
    return `${years}y ${remainingDays}d`;
  }
}

/**
 * Formats currency value
 */
export function formatCurrency(value: number, currency: string = '$'): string {
  return `${currency}${value.toLocaleString()}`;
}

/**
 * Formats percentage value
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Generates a unique ID
 */
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Clones an object deeply
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounces function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttles function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}