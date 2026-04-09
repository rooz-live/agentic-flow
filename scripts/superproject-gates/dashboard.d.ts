/**
 * rooz.yo.life Dashboard Integration
 *
 * Private co-op subscription system for circle-based classes, events, and sports
 * Features: ROAM exposure endurance ontology graphs with real-time transmission
 *
 * Pricing: Hidden by default until requested
 */
import { EventEmitter } from 'events';
export type SubscriptionTier = 'community' | 'pro' | 'enterprise';
export interface RoozDashboard {
    userId: string;
    subscriptionTier: SubscriptionTier;
    hidePricingUntilRequested: boolean;
    circleClasses: CircleClass[];
    roamExposure: ROAMExposure;
    sportsTracking: SportsTracking;
    events: CoopEvent[];
}
export interface CircleClass {
    id: string;
    circle: 'orchestrator' | 'assessor' | 'innovator' | 'analyst' | 'seeker' | 'intuitive';
    ceremony: 'standup' | 'wsjf' | 'refine' | 'replenish' | 'review' | 'retro' | 'synthesis';
    nextSession: Date;
    capacity: number;
    enrolled: number;
    instructor: string;
    location: 'online' | 'berlin' | 'hybrid';
    durationMinutes: number;
}
export interface ROAMExposure {
    enabled: boolean;
    graphNodes: number;
    graphEdges: number;
    lastTransmission: Date;
    enduranceOntology: {
        totalSessions: number;
        avgHeartRate?: number;
        trainingLoad: number;
    };
}
export interface SportsTracking {
    currentTraining: string;
    weekProgress: string;
    healthScore: number;
    nextEvent?: {
        name: string;
        date: Date;
        distance: string;
    };
}
export interface CoopEvent {
    id: string;
    type: 'class' | 'workshop' | 'sports' | 'social';
    title: string;
    date: Date;
    circle?: string;
    capacity: number;
    enrolled: number;
}
export interface PricingTier {
    name: SubscriptionTier;
    monthlyPrice: number;
    yearlyPrice: number;
    features: string[];
    circleClassesPerMonth: number;
    roamGraphAccess: boolean;
}
export declare class RoozIntegration extends EventEmitter {
    private wsServer;
    private activeConnections;
    private readonly pricingTiers;
    private readonly ceremonyMap;
    constructor();
    /**
     * Get dashboard data for user
     */
    getDashboard(userId: string): Promise<RoozDashboard>;
    /**
     * Get pricing information (only when explicitly requested)
     */
    getPricing(requested: boolean): PricingTier[] | null;
    /**
     * Get pricing visibility state
     */
    getPricingVisibility(requested: boolean): 'hidden' | 'visible';
    /**
     * Get circle-specific class schedule
     */
    getCircleClassSchedule(circle: string): {
        circle: string;
        ceremony: string;
        upcomingSessions: CircleClass[];
    };
    /**
     * Query upcoming sessions for a circle
     */
    private queryUpcomingSessions;
    private getInstructorForCircle;
    private getUpcomingClasses;
    /**
     * Get ROAM exposure data (endurance ontology graphs)
     */
    private getROAMExposure;
    /**
     * Build endurance ontology graph from user data
     */
    buildEnduranceOntology(userId: string): Promise<{
        nodes: any[];
        edges: any[];
        metadata: any;
    }>;
    /**
     * Start WebSocket server for real-time ROAM graph transmission
     */
    startTransmissionServer(port?: number): void;
    /**
     * Transmit ROAM graph to user via WebSocket
     */
    transmitROAMGraph(userId: string): Promise<void>;
    /**
     * Schedule periodic ROAM graph updates
     */
    startPeriodicTransmission(intervalMs?: number): NodeJS.Timeout;
    private extractUserIdFromRequest;
    private getSportsTracking;
    private getUpcomingEvents;
    shutdown(): void;
}
export declare function createRoozIntegration(): RoozIntegration;
//# sourceMappingURL=dashboard.d.ts.map