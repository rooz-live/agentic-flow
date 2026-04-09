/**
 * ════════════════════════════════════════════════════════════════════════════
 * yo.life WSJF Prioritization Module
 * Integrates with agentic-flow for intelligent service prioritization
 * ════════════════════════════════════════════════════════════════════════════
 */

import { Circle } from '../core/orchestration-framework.js';

// ════════════════════════════════════════════════════════════════════════════
// Type Definitions
// ════════════════════════════════════════════════════════════════════════════

export type ServiceType = 'osint' | 'flm' | 'life_mapping' | 'holistic_assessment';
export type Dimension = 'temporal' | 'spatial' | 'demographic' | 'psychological' | 'economic';
export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface YoLifeGoal {
  // Core WSJF Components
  userValue: number;        // 1-10: Client's perceived value
  timeCriticality: number;  // 1-10: Urgency (temporal dimension)
  riskReduction: number;    // 1-10: Security/opportunity cost
  jobSize: number;          // 1-10: Effort required
  
  // yo.life Specific Fields
  serviceType: ServiceType;
  dimension: Dimension;
  securityLevel: SecurityLevel;
  
  // Client Information
  clientId: string;
  description: string;
  deadline?: Date;
  
  // Computed
  wsjfScore: number;
  circle?: Circle;          // Assigned agentic-flow circle
}

export interface WSJFAnalysis {
  goal: YoLifeGoal;
  recommendedCircle: Circle;
  workflow: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedDuration: number; // in hours
}

// ════════════════════════════════════════════════════════════════════════════
// WSJF Calculator
// ════════════════════════════════════════════════════════════════════════════

export class WSJFPrioritizer {
  /**
   * Calculate WSJF score for a goal
   * Formula: (User Value + Time Criticality + Risk Reduction) / Job Size
   */
  static calculateWSJF(goal: Omit<YoLifeGoal, 'wsjfScore' | 'circle'>): YoLifeGoal {
    const wsjfScore = (goal.userValue + goal.timeCriticality + goal.riskReduction) / goal.jobSize;
    
    return {
      ...goal,
      wsjfScore: Number(wsjfScore.toFixed(2))
    };
  }
  
  /**
   * Prioritize multiple goals by WSJF score
   */
  static prioritizeGoals(goals: YoLifeGoal[]): YoLifeGoal[] {
    return goals
      .map(g => this.calculateWSJF(g))
      .sort((a, b) => b.wsjfScore - a.wsjfScore);
  }
  
  /**
   * Map goal to agentic-flow circle and workflow
   */
  static mapToAgenticFlow(goal: YoLifeGoal): WSJFAnalysis {
    // Determine circle based on service type and security level
    let circle: Circle;
    let workflow: string;
    
    if (goal.securityLevel === 'critical' || goal.serviceType === 'osint') {
      circle = 'assessor';
      workflow = 'assessment_focused';
    } else if (goal.serviceType === 'life_mapping') {
      circle = 'seeker';
      workflow = 'seeker_driven';
    } else if (goal.serviceType === 'flm') {
      circle = 'innovator';
      workflow = 'innovator_driven';
    } else {
      circle = 'analyst';
      workflow = 'analyst_driven';
    }
    
    // Determine priority level
    let priority: 'critical' | 'high' | 'medium' | 'low';
    if (goal.wsjfScore >= 7) priority = 'critical';
    else if (goal.wsjfScore >= 5) priority = 'high';
    else if (goal.wsjfScore >= 3) priority = 'medium';
    else priority = 'low';
    
    // Estimate duration based on job size and service type
    const baseHours: Record<ServiceType, number> = {
      osint: 2,
      life_mapping: 4,
      flm: 8,
      holistic_assessment: 6
    };
    
    const estimatedDuration = baseHours[goal.serviceType] * (goal.jobSize / 5);
    
    return {
      goal,
      recommendedCircle: circle,
      workflow,
      priority,
      estimatedDuration
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Pre-defined yo.life Service Templates
// ════════════════════════════════════════════════════════════════════════════

export const YoLifeServiceTemplates = {
  /**
   * OSINT / Geolocation Intelligence
   * High priority, security-focused
   */
  osintThreatIntel: (): Omit<YoLifeGoal, 'clientId' | 'description' | 'wsjfScore'> => ({
    userValue: 9,           // High: Client needs threat intelligence
    timeCriticality: 10,    // Urgent: Active security threat
    riskReduction: 9,       // High: Prevents data breach
    jobSize: 3,             // Small: Use existing geolocation tools
    serviceType: 'osint',
    dimension: 'spatial',
    securityLevel: 'critical'
  }),
  
  /**
   * Flourishing Life Model (FLM)
   * Medium priority, personal development
   */
  flmCareerTransition: (): Omit<YoLifeGoal, 'clientId' | 'description' | 'wsjfScore'> => ({
    userValue: 7,           // Medium-High: Career transition
    timeCriticality: 4,     // Medium: 6-month timeline
    riskReduction: 5,       // Medium: Prevents burnout
    jobSize: 8,             // Large: Multiple sessions required
    serviceType: 'flm',
    dimension: 'psychological',
    securityLevel: 'low'
  }),
  
  /**
   * Life Mapping
   * Medium-high priority, life decisions
   */
  lifeMappingMajorDecision: (): Omit<YoLifeGoal, 'clientId' | 'description' | 'wsjfScore'> => ({
    userValue: 8,           // High: Major life decision
    timeCriticality: 7,     // High: Decision deadline approaching
    riskReduction: 6,       // Medium-High: Avoids regret
    jobSize: 5,             // Medium: 2-3 mapping sessions
    serviceType: 'life_mapping',
    dimension: 'temporal',
    securityLevel: 'low'
  }),
  
  /**
   * Holistic Assessment
   * Medium priority, comprehensive analysis
   */
  holisticHealthAssessment: (): Omit<YoLifeGoal, 'clientId' | 'description' | 'wsjfScore'> => ({
    userValue: 6,           // Medium: Wellness improvement
    timeCriticality: 3,     // Low-Medium: No urgent deadline
    riskReduction: 4,       // Medium: Prevents health issues
    jobSize: 7,             // Medium-Large: Comprehensive assessment
    serviceType: 'holistic_assessment',
    dimension: 'economic',
    securityLevel: 'medium'
  })
};

// ════════════════════════════════════════════════════════════════════════════
// Real-world Examples
// ════════════════════════════════════════════════════════════════════════════

export const exampleGoals: YoLifeGoal[] = [
  {
    clientId: 'client-001',
    description: 'Active geolocation threat - unauthorized access from foreign IP',
    ...YoLifeServiceTemplates.osintThreatIntel(),
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    wsjfScore: 0 // Will be calculated
  },
  {
    clientId: 'client-002',
    description: 'Career transition from corporate to freelance consulting',
    ...YoLifeServiceTemplates.flmCareerTransition(),
    deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    wsjfScore: 0
  },
  {
    clientId: 'client-003',
    description: 'Major life decision: relocate to new city or stay',
    ...YoLifeServiceTemplates.lifeMappingMajorDecision(),
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    wsjfScore: 0
  }
];

// ════════════════════════════════════════════════════════════════════════════
// API Interface for Integration
// ════════════════════════════════════════════════════════════════════════════

export class YoLifeWSJFService {
  private goals: YoLifeGoal[] = [];
  
  /**
   * Add new goal to prioritization queue
   */
  addGoal(goal: Omit<YoLifeGoal, 'wsjfScore' | 'circle'>): YoLifeGoal {
    const calculatedGoal = WSJFPrioritizer.calculateWSJF(goal);
    this.goals.push(calculatedGoal);
    return calculatedGoal;
  }
  
  /**
   * Get prioritized list of all goals
   */
  getPrioritizedGoals(): YoLifeGoal[] {
    return WSJFPrioritizer.prioritizeGoals(this.goals);
  }
  
  /**
   * Get next highest priority goal
   */
  getNextGoal(): YoLifeGoal | undefined {
    const prioritized = this.getPrioritizedGoals();
    return prioritized[0];
  }
  
  /**
   * Get analysis for a specific goal
   */
  analyzeGoal(goalId: string): WSJFAnalysis | undefined {
    const goal = this.goals.find(g => g.clientId === goalId);
    if (!goal) return undefined;
    
    return WSJFPrioritizer.mapToAgenticFlow(goal);
  }
  
  /**
   * Get goals by priority level
   */
  getGoalsByPriority(priority: 'critical' | 'high' | 'medium' | 'low'): WSJFAnalysis[] {
    return this.goals
      .map(g => WSJFPrioritizer.mapToAgenticFlow(g))
      .filter(analysis => analysis.priority === priority);
  }
  
  /**
   * Get goals assigned to a specific circle
   */
  getGoalsByCircle(circle: Circle): WSJFAnalysis[] {
    return this.goals
      .map(g => WSJFPrioritizer.mapToAgenticFlow(g))
      .filter(analysis => analysis.recommendedCircle === circle);
  }
  
  /**
   * Remove completed goal
   */
  completeGoal(clientId: string): void {
    this.goals = this.goals.filter(g => g.clientId !== clientId);
  }
  
  /**
   * Get dashboard statistics
   */
  getStatistics() {
    const analyses = this.goals.map(g => WSJFPrioritizer.mapToAgenticFlow(g));
    
    return {
      totalGoals: this.goals.length,
      byPriority: {
        critical: analyses.filter(a => a.priority === 'critical').length,
        high: analyses.filter(a => a.priority === 'high').length,
        medium: analyses.filter(a => a.priority === 'medium').length,
        low: analyses.filter(a => a.priority === 'low').length
      },
      byServiceType: {
        osint: this.goals.filter(g => g.serviceType === 'osint').length,
        flm: this.goals.filter(g => g.serviceType === 'flm').length,
        life_mapping: this.goals.filter(g => g.serviceType === 'life_mapping').length,
        holistic_assessment: this.goals.filter(g => g.serviceType === 'holistic_assessment').length
      },
      averageWSJF: this.goals.reduce((sum, g) => sum + g.wsjfScore, 0) / this.goals.length || 0,
      totalEstimatedHours: analyses.reduce((sum, a) => sum + a.estimatedDuration, 0)
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CLI Usage Example (commented out for ES modules)
// ════════════════════════════════════════════════════════════════════════════
// Run with: node -e "import('./dist/yo-life/wsjf-prioritizer.js').then(m => m.runDemo())"

export function runDemo() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 yo.life WSJF Prioritization Demo');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const service = new YoLifeWSJFService();
  
  // Add example goals
  exampleGoals.forEach(goal => service.addGoal(goal));
  
  // Display prioritized goals
  const prioritized = service.getPrioritizedGoals();
  console.log('📊 Prioritized Goals (by WSJF Score):\n');
  
  prioritized.forEach((goal, index) => {
    const analysis = WSJFPrioritizer.mapToAgenticFlow(goal);
    console.log(`${index + 1}. [${analysis.priority.toUpperCase()}] ${goal.description}`);
    console.log(`   WSJF: ${goal.wsjfScore} | Circle: ${analysis.recommendedCircle} | Est: ${analysis.estimatedDuration}h`);
    console.log(`   Service: ${goal.serviceType} | Security: ${goal.securityLevel}\n`);
  });
  
  // Display statistics
  const stats = service.getStatistics();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 Statistics:');
  console.log(`   Total Goals: ${stats.totalGoals}`);
  console.log(`   Average WSJF: ${stats.averageWSJF.toFixed(2)}`);
  console.log(`   Total Hours: ${stats.totalEstimatedHours}h`);
  console.log(`   Critical: ${stats.byPriority.critical} | High: ${stats.byPriority.high}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

export default YoLifeWSJFService;
