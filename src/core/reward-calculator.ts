/**
 * Reward Calculator
 *
 * Maps WSJF/PI targets to explicit user handles to establish
 * strict accountability for single-threaded commits.
 */

export interface AccountabilityMap {
    [role: string]: string; // e.g., 'orchestrator_circle': '@rooz-live'
}

export class RewardCalculator {
    private accountability: AccountabilityMap;

    constructor() {
        this.accountability = {
            'orchestrator_circle': '@rooz-live',
            'analyst_circle': '@rooz-live',
            'seeker_circle': '@rooz-live',
            'ai_circle': '@rooz-live',
            'security_circle': '@rooz-live'
        };
    }

    public getOwnerHandle(circle: string): string {
        return this.accountability[circle] || '@unassigned';
    }

    /**
     * Calculates the explicit economic reward factor for a single commit
     * based on its WSJF isolation and blast radius containment.
     */
    public calculateVerifiableReward(wsjfScore: number, isolatedDelta: boolean): number {
        if (!isolatedDelta) {
            console.warn("[WARNING] Cognitive Drift Detected: PR contains mixed concerns. Reward nullified.");
            return 0;
        }
        return wsjfScore * 1.5; // Premium multiplier for single-threaded isolation
    }
}
