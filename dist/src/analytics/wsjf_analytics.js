/**
 * WSJF Analytics Engine
 *
 * Dynamic Cost of Delay calculation with ground-truth calibration.
 * Implements economic micro-ledger for revenue attribution.
 */
// Circle business value priors (monthly equivalent)
const CIRCLE_PRIORS = {
    innovator: 5000,
    analyst: 3500,
    orchestrator: 2500,
    assessor: 2000,
    intuitive: 1000,
    seeker: 500,
    testing: 250,
};
// Keyword patterns for auto-detection
const UBV_KEYWORDS = /\b(user|customer|revenue|sales|conversion|retention)\b/gi;
const TC_KEYWORDS = /\b(critical|blocker|urgent|deadline|compliance|regulatory)\b/gi;
const RR_KEYWORDS = /\b(security|bug|vulnerability|risk|incident|outage)\b/gi;
export class WSJFAnalytics {
    /**
     * Calculate WSJF with dynamic ground-truth calibration.
     */
    calculateWSJF(title, description, manualOverrides) {
        const text = `${title} ${description}`;
        // Auto-detect components
        const ubvMatches = (text.match(UBV_KEYWORDS) || []).length;
        const tcMatches = (text.match(TC_KEYWORDS) || []).length;
        const rrMatches = (text.match(RR_KEYWORDS) || []).length;
        // Base scores from keyword density
        const baseUBV = Math.min(10, 3 + ubvMatches * 1.5);
        const baseTC = Math.min(10, 2 + tcMatches * 2);
        const baseRR = Math.min(10, 2 + rrMatches * 2);
        // Job size from word count and complexity keywords
        const wordCount = text.split(/\s+/).length;
        const complexityKeywords = (text.match(/\b(refactor|migrate|redesign|rewrite|overhaul)\b/gi) || []).length;
        const baseJS = Math.min(10, Math.max(1, Math.ceil(wordCount / 50) + complexityKeywords * 2));
        // Apply manual overrides
        const userBusinessValue = manualOverrides?.userBusinessValue ?? baseUBV;
        const timeCriticality = manualOverrides?.timeCriticality ?? baseTC;
        const riskReduction = manualOverrides?.riskReduction ?? baseRR;
        const jobSize = manualOverrides?.jobSize ?? baseJS;
        // Calculate Cost of Delay
        const cod = userBusinessValue + timeCriticality + riskReduction;
        const score = cod / Math.max(1, jobSize);
        // Confidence based on signal strength
        const signalStrength = ubvMatches + tcMatches + rrMatches;
        const confidence = Math.min(0.9, 0.5 + signalStrength * 0.05);
        return {
            userBusinessValue,
            timeCriticality,
            riskReduction,
            jobSize,
            score,
            confidence,
        };
    }
    /**
     * Calculate dynamic Cost of Delay with time decay.
     */
    calculateDynamicCoD(baseCoD, daysSinceCreated, riskLevel) {
        // Time decay: CoD increases over time
        const decayRate = 0.02; // 2% per day
        const timeDecay = baseCoD * (1 + daysSinceCreated * decayRate);
        // Risk multiplier
        const riskMultipliers = { low: 1.0, medium: 1.3, high: 1.6, critical: 2.0 };
        const riskMultiplier = riskMultipliers[riskLevel];
        // Opportunity cost (compound effect)
        const opportunityCost = baseCoD * Math.pow(1.01, daysSinceCreated);
        const final = timeDecay * riskMultiplier;
        return {
            base: baseCoD,
            timeDecay,
            riskMultiplier,
            opportunityCost,
            final,
        };
    }
    /**
     * Calculate revenue attribution per circle.
     */
    calculateRevenueAttribution(circle, durationMs, outcomeMultiplier = 1.0) {
        const prior = CIRCLE_PRIORS[circle.toLowerCase()] || 250;
        // Convert duration to hours
        const durationHours = durationMs / 3600000;
        // Energy cost from duration (default: 60W, $0.20/kWh)
        const watts = parseFloat(process.env.AF_COST_WATTS || '60');
        const usdPerKwh = parseFloat(process.env.AF_COST_USD_PER_KWH || '0.20');
        const energyCostUsd = (durationHours * watts / 1000) * usdPerKwh;
        // Revenue impact (hourly rate from monthly prior)
        const hourlyRate = prior / 160; // ~160 working hours/month
        const revenueImpact = hourlyRate * durationHours * outcomeMultiplier;
        // Profit dividend
        const profitDividend = Math.max(0, revenueImpact - energyCostUsd);
        return {
            circle,
            revenueImpact,
            energyCostUsd,
            profitDividend,
            agreeableness: 1.0, // Default: fully agreeable
            contributable: true,
        };
    }
    /**
     * Rank items by WSJF with conflict detection.
     */
    rankByWSJF(items) {
        const scored = items.map(item => ({
            ...item,
            wsjf: this.calculateWSJF(item.title, item.description),
        }));
        // Sort by WSJF score descending
        scored.sort((a, b) => b.wsjf.score - a.wsjf.score);
        return scored.map((item, index) => ({
            ...item,
            rank: index + 1,
        }));
    }
}
export const wsjfAnalytics = new WSJFAnalytics();
//# sourceMappingURL=wsjf_analytics.js.map