/**
 * ════════════════════════════════════════════════════════════════════════════
 * yo.life WSJF Prioritization Module
 * Integrates with agentic-flow for intelligent service prioritization
 * ════════════════════════════════════════════════════════════════════════════
 */
import { Circle } from '../core/orchestration-framework.js';
export type ServiceType = 'osint' | 'flm' | 'life_mapping' | 'holistic_assessment';
export type Dimension = 'temporal' | 'spatial' | 'demographic' | 'psychological' | 'economic';
export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';
export interface YoLifeGoal {
    userValue: number;
    timeCriticality: number;
    riskReduction: number;
    jobSize: number;
    serviceType: ServiceType;
    dimension: Dimension;
    securityLevel: SecurityLevel;
    clientId: string;
    description: string;
    deadline?: Date;
    wsjfScore: number;
    circle?: Circle;
}
export interface WSJFAnalysis {
    goal: YoLifeGoal;
    recommendedCircle: Circle;
    workflow: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    estimatedDuration: number;
}
export declare class WSJFPrioritizer {
    /**
     * Calculate WSJF score for a goal
     * Formula: (User Value + Time Criticality + Risk Reduction) / Job Size
     */
    static calculateWSJF(goal: Omit<YoLifeGoal, 'wsjfScore' | 'circle'>): YoLifeGoal;
    /**
     * Prioritize multiple goals by WSJF score
     */
    static prioritizeGoals(goals: YoLifeGoal[]): YoLifeGoal[];
    /**
     * Map goal to agentic-flow circle and workflow
     */
    static mapToAgenticFlow(goal: YoLifeGoal): WSJFAnalysis;
}
export declare const YoLifeServiceTemplates: {
    /**
     * OSINT / Geolocation Intelligence
     * High priority, security-focused
     */
    osintThreatIntel: () => Omit<YoLifeGoal, "clientId" | "description" | "wsjfScore">;
    /**
     * Flourishing Life Model (FLM)
     * Medium priority, personal development
     */
    flmCareerTransition: () => Omit<YoLifeGoal, "clientId" | "description" | "wsjfScore">;
    /**
     * Life Mapping
     * Medium-high priority, life decisions
     */
    lifeMappingMajorDecision: () => Omit<YoLifeGoal, "clientId" | "description" | "wsjfScore">;
    /**
     * Holistic Assessment
     * Medium priority, comprehensive analysis
     */
    holisticHealthAssessment: () => Omit<YoLifeGoal, "clientId" | "description" | "wsjfScore">;
};
export declare const exampleGoals: YoLifeGoal[];
export declare class YoLifeWSJFService {
    private goals;
    /**
     * Add new goal to prioritization queue
     */
    addGoal(goal: Omit<YoLifeGoal, 'wsjfScore' | 'circle'>): YoLifeGoal;
    /**
     * Get prioritized list of all goals
     */
    getPrioritizedGoals(): YoLifeGoal[];
    /**
     * Get next highest priority goal
     */
    getNextGoal(): YoLifeGoal | undefined;
    /**
     * Get analysis for a specific goal
     */
    analyzeGoal(goalId: string): WSJFAnalysis | undefined;
    /**
     * Get goals by priority level
     */
    getGoalsByPriority(priority: 'critical' | 'high' | 'medium' | 'low'): WSJFAnalysis[];
    /**
     * Get goals assigned to a specific circle
     */
    getGoalsByCircle(circle: Circle): WSJFAnalysis[];
    /**
     * Remove completed goal
     */
    completeGoal(clientId: string): void;
    /**
     * Get dashboard statistics
     */
    getStatistics(): {
        totalGoals: number;
        byPriority: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        byServiceType: {
            osint: number;
            flm: number;
            life_mapping: number;
            holistic_assessment: number;
        };
        averageWSJF: number;
        totalEstimatedHours: number;
    };
}
export declare function runDemo(): void;
export default YoLifeWSJFService;
//# sourceMappingURL=wsjf-prioritizer.d.ts.map