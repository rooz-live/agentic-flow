import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
export class RiskAwareBatchingSystem {
    goalieDir;
    policies;
    executionHistory = [];
    constructor(goalieDir) {
        this.goalieDir = goalieDir;
        this.policies = new Map();
        this.loadDefaultPolicies();
    }
    /**
     * Load default batching policies
     */
    loadDefaultPolicies() {
        const defaultPolicies = [
            {
                id: 'conservative',
                name: 'Conservative Batching',
                description: 'Low-risk items in small batches with manual approval',
                riskThreshold: 3,
                maxBatchSize: 3,
                approvalRequired: true,
                applicableWorkloads: ['ML', 'HPC', 'Stats'],
                priorityLevels: ['LOW', 'MEDIUM']
            },
            {
                id: 'moderate',
                name: 'Moderate Batching',
                description: 'Medium-risk items in medium batches with team approval',
                riskThreshold: 6,
                maxBatchSize: 8,
                approvalRequired: true,
                applicableWorkloads: ['ML', 'HPC', 'Stats', 'Device/Web'],
                priorityLevels: ['MEDIUM', 'HIGH']
            },
            {
                id: 'aggressive',
                name: 'Aggressive Batching',
                description: 'Higher-risk items in larger batches with automated approval',
                riskThreshold: 8,
                maxBatchSize: 15,
                approvalRequired: false,
                applicableWorkloads: ['General'],
                priorityLevels: ['HIGH', 'IMMEDIATE']
            }
        ];
        for (const policy of defaultPolicies) {
            this.policies.set(policy.id, policy);
        }
        // Load custom policies if they exist
        this.loadCustomPolicies();
    }
    /**
     * Load custom policies from configuration
     */
    loadCustomPolicies() {
        const policiesPath = path.join(this.goalieDir, 'batching_policies.yaml');
        if (!fs.existsSync(policiesPath)) {
            return;
        }
        try {
            const raw = fs.readFileSync(policiesPath, 'utf8');
            const config = yaml.parse(raw) || {};
            const customPolicies = config.policies || [];
            for (const policy of customPolicies) {
                this.policies.set(policy.id, policy);
            }
        }
        catch (error) {
            console.warn('[risk_aware_batching] Failed to load custom policies:', error);
        }
    }
    /**
     * Determine appropriate policy for items
     */
    determinePolicy(items) {
        const maxRiskLevel = Math.max(...items.map(item => item.riskAssessment.riskLevel));
        const avgRiskLevel = items.reduce((sum, item) => sum + item.riskAssessment.riskLevel, 0) / items.length;
        // Find the most appropriate policy based on risk profile
        for (const policy of this.policies.values()) {
            if (maxRiskLevel <= policy.riskThreshold &&
                avgRiskLevel <= policy.riskThreshold + 2) {
                return policy;
            }
        }
        // Default to moderate policy
        return this.policies.get('moderate') || this.policies.get('conservative');
    }
    /**
     * Create intelligent batching plan
     */
    async createBatchingPlan(items, policyId, constraints) {
        const policy = policyId ?
            this.policies.get(policyId) : this.determinePolicy(items);
        // Filter items by policy criteria
        const eligibleItems = items.filter(item => {
            const workloadMatch = policy.applicableWorkloads.includes(item.category) ||
                policy.applicableWorkloads.includes('General');
            const riskMatch = item.riskAssessment.riskLevel <= policy.riskThreshold;
            const priorityMatch = policy.priorityLevels.includes(item.recommendation);
            return workloadMatch && riskMatch && priorityMatch;
        });
        // Sort by WSJF score (highest priority first)
        eligibleItems.sort((a, b) => b.wsjfScore - a.wsjfScore);
        // Apply constraints
        let finalItems = eligibleItems;
        if (constraints?.maxItems) {
            finalItems = eligibleItems.slice(0, constraints.maxItems);
        }
        if (constraints?.maxDuration) {
            const totalDuration = finalItems.reduce((sum, item) => sum + item.parameters.jobDuration, 0);
            if (totalDuration > constraints.maxDuration) {
                // Remove lowest priority items until within duration limit
                let currentDuration = 0;
                const filteredItems = [];
                for (const item of eligibleItems) {
                    if (currentDuration + item.parameters.jobDuration <= constraints.maxDuration) {
                        filteredItems.push(item);
                        currentDuration += item.parameters.jobDuration;
                    }
                }
                finalItems = filteredItems;
            }
        }
        // Calculate resource requirements
        const resourceRequirements = this.calculateResourceRequirements(finalItems);
        // Determine execution window
        const executionWindow = this.calculateExecutionWindow(finalItems, policy);
        // Determine approval requirements
        const requiredApprovals = this.determineApprovals(finalItems, policy);
        // Calculate estimated duration
        const estimatedDuration = finalItems.reduce((sum, item) => sum + item.parameters.jobDuration, 0);
        // Determine rollback strategy
        const rollbackStrategy = this.determineRollbackStrategy(finalItems, policy);
        const plan = {
            id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            items: finalItems,
            riskLevel: Math.max(...finalItems.map(item => item.riskAssessment.riskLevel)),
            executionWindow,
            requiredApprovals,
            resourceRequirements,
            estimatedDuration,
            rollbackStrategy
        };
        // Save plan
        await this.saveBatchPlan(plan);
        return plan;
    }
    /**
     * Calculate resource requirements for batch
     */
    calculateResourceRequirements(items) {
        const baseCPU = 2; // Base CPU per item
        const baseMemory = 4; // Base GB per item
        const baseStorage = 10; // Base GB per item
        const baseNetwork = 100; // Base Mbps per item
        // Adjust based on item characteristics
        let totalCPU = 0;
        let totalMemory = 0;
        let totalStorage = 0;
        let totalNetwork = 0;
        for (const item of items) {
            const multiplier = item.category === 'HPC' ? 2 :
                item.category === 'ML' ? 1.5 : 1;
            totalCPU += baseCPU * multiplier;
            totalMemory += baseMemory * multiplier;
            totalStorage += baseStorage * multiplier;
            totalNetwork += baseNetwork * multiplier;
        }
        return {
            cpu: totalCPU,
            memory: totalMemory,
            storage: totalStorage,
            network: totalNetwork
        };
    }
    /**
     * Calculate execution window
     */
    calculateExecutionWindow(items, policy) {
        const now = new Date();
        const totalDuration = items.reduce((sum, item) => sum + item.parameters.jobDuration, 0);
        // Base execution window starts immediately
        let start = now.toISOString();
        // Adjust based on policy and risk level
        const maxRiskLevel = Math.max(...items.map(item => item.riskAssessment.riskLevel));
        if (policy.approvalRequired || maxRiskLevel > 7) {
            // Add buffer time for approval process
            const approvalBuffer = policy.approvalRequired ? 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000; // 24h or 12h
            start = new Date(now.getTime() + approvalBuffer).toISOString();
        }
        // Calculate end time
        const executionDuration = totalDuration + (policy.approvalRequired ? 24 * 60 * 60 * 1000 : 0);
        const end = new Date(now.getTime() + executionDuration).toISOString();
        return { start, end };
    }
    /**
     * Determine approval requirements
     */
    determineApprovals(items, policy) {
        const approvals = [];
        if (!policy.approvalRequired) {
            return approvals;
        }
        // High-risk items require senior approval
        const highRiskItems = items.filter(item => item.riskAssessment.riskLevel >= 8);
        if (highRiskItems.length > 0) {
            approvals.push('Senior Engineer approval required for high-risk items');
        }
        // Medium-risk items require team lead approval
        const mediumRiskItems = items.filter(item => item.riskAssessment.riskLevel >= 5 && item.riskAssessment.riskLevel < 8);
        if (mediumRiskItems.length > 0) {
            approvals.push('Tech Lead approval required for medium-risk items');
        }
        // Critical items require stakeholder approval
        const criticalItems = items.filter(item => item.riskAssessment.riskLevel >= 9);
        if (criticalItems.length > 0) {
            approvals.push('Stakeholder approval required for critical items');
        }
        return approvals;
    }
    /**
     * Determine rollback strategy
     */
    determineRollbackStrategy(items, policy) {
        const maxRiskLevel = Math.max(...items.map(item => item.riskAssessment.riskLevel));
        if (maxRiskLevel >= 8) {
            return 'individual_rollback'; // Roll back each item individually
        }
        else if (maxRiskLevel >= 6) {
            return 'batch_rollback'; // Roll back entire batch if any item fails
        }
        else {
            return 'forward_rollback'; // Continue with remaining items if some fail
        }
    }
    /**
     * Save batch plan to file
     */
    async saveBatchPlan(plan) {
        const plansPath = path.join(this.goalieDir, 'batch_plans.json');
        try {
            let existingPlans = [];
            if (fs.existsSync(plansPath)) {
                const data = fs.readFileSync(plansPath, 'utf8');
                existingPlans = JSON.parse(data);
            }
            existingPlans.push(plan);
            fs.writeFileSync(plansPath, JSON.stringify(existingPlans, null, 2));
            console.log(`[risk_aware_batching] Batch plan saved: ${plan.id}`);
        }
        catch (error) {
            console.error('[risk_aware_batching] Failed to save batch plan:', error);
        }
    }
    /**
     * Execute batch plan
     */
    async executeBatchPlan(planId) {
        const plansPath = path.join(this.goalieDir, 'batch_plans.json');
        if (!fs.existsSync(plansPath)) {
            return {
                planId,
                status: 'failed',
                itemsExecuted: 0,
                itemsSuccessful: 0,
                itemsFailed: 0,
                actualDuration: 0,
                errors: ['Plan not found'],
            };
        }
        try {
            const plans = JSON.parse(fs.readFileSync(plansPath, 'utf8'));
            const plan = plans.find((p) => p.id === planId);
            if (!plan) {
                return {
                    planId,
                    status: 'failed',
                    itemsExecuted: 0,
                    itemsSuccessful: 0,
                    itemsFailed: 0,
                    actualDuration: 0,
                    errors: ['Plan not found'],
                };
            }
            const result = {
                planId,
                status: 'executing',
                itemsExecuted: plan.items.length,
                itemsSuccessful: 0,
                itemsFailed: 0,
                actualDuration: 0,
                errors: [],
            };
            // Update plan status
            plan.status = 'executing';
            fs.writeFileSync(plansPath, JSON.stringify(plans, null, 2));
            console.log(`[risk_aware_batching] Executing batch plan: ${planId}`);
            console.log(`  Items: ${plan.items.length}`);
            console.log(`  Risk Level: ${plan.riskLevel}/10`);
            console.log(`  Execution Window: ${plan.executionWindow.start} to ${plan.executionWindow.end}`);
            // Simulate execution (in real implementation, this would call actual execution logic)
            // For now, mark as completed for demonstration
            setTimeout(async () => {
                const updatedPlans = JSON.parse(fs.readFileSync(plansPath, 'utf8'));
                const planIndex = updatedPlans.findIndex((p) => p.id === planId);
                if (planIndex !== -1) {
                    updatedPlans[planIndex] = {
                        ...updatedPlans[planIndex],
                        status: 'completed',
                        itemsSuccessful: plan.items.length,
                        actualDuration: plan.estimatedDuration,
                        completedAt: new Date().toISOString()
                    };
                    fs.writeFileSync(plansPath, JSON.stringify(updatedPlans, null, 2));
                    console.log(`[risk_aware_batching] Completed batch plan: ${planId}`);
                }
            }, 5000); // 5 second delay for demonstration
            return result;
        }
        catch (error) {
            return {
                planId,
                status: 'failed',
                itemsExecuted: 0,
                itemsSuccessful: 0,
                itemsFailed: 0,
                actualDuration: 0,
                errors: [error.message],
            };
        }
    }
    /**
     * Get batch execution history
     */
    async getBatchHistory(limit = 10) {
        const plansPath = path.join(this.goalieDir, 'batch_plans.json');
        if (!fs.existsSync(plansPath)) {
            return [];
        }
        try {
            const plans = JSON.parse(fs.readFileSync(plansPath, 'utf8'));
            return plans
                .filter((plan) => plan.status === 'completed' || plan.status === 'failed')
                .slice(-limit)
                .map((plan) => ({
                planId: plan.id,
                status: plan.status,
                itemsExecuted: plan.itemsExecuted || 0,
                itemsSuccessful: plan.itemsSuccessful || 0,
                itemsFailed: plan.itemsFailed || 0,
                actualDuration: plan.actualDuration || 0,
                errors: plan.errors || [],
                rollbackInfo: plan.rollbackInfo
            }));
        }
        catch (error) {
            console.error('[risk_aware_batching] Failed to get batch history:', error);
            return [];
        }
    }
    /**
     * Get available policies
     */
    getAvailablePolicies() {
        return Array.from(this.policies.values());
    }
    /**
     * Add custom policy
     */
    addCustomPolicy(policy) {
        this.policies.set(policy.id, policy);
        this.saveCustomPolicies();
    }
    /**
     * Save custom policies to file
     */
    saveCustomPolicies() {
        const policiesPath = path.join(this.goalieDir, 'batching_policies.yaml');
        try {
            const policies = Array.from(this.policies.values());
            const config = { policies };
            fs.writeFileSync(policiesPath, yaml.stringify(config));
            console.log(`[risk_aware_batching] Saved ${policies.length} policies`);
        }
        catch (error) {
            console.error('[risk_aware_batching] Failed to save policies:', error);
        }
    }
    /**
     * Analyze batch performance
     */
    async analyzeBatchPerformance(days = 30) {
        const history = await this.getBatchHistory(days);
        if (history.length === 0) {
            return {
                totalBatches: 0,
                successRate: 0,
                avgDuration: 0,
                riskDistribution: {}
            };
        }
        const totalBatches = history.length;
        const successfulBatches = history.filter(h => h.status === 'completed').length;
        const successRate = totalBatches > 0 ? successfulBatches / totalBatches : 0;
        const avgDuration = history.reduce((sum, h) => sum + (h.actualDuration || 0), 0) / history.length;
        const riskDistribution = {};
        for (const batch of history) {
            const riskLevel = batch.riskLevel || 0;
            const riskCategory = riskLevel >= 8 ? 'high' :
                riskLevel >= 6 ? 'medium' :
                    riskLevel >= 4 ? 'low' : 'minimal';
            riskDistribution[riskCategory] = (riskDistribution[riskCategory] || 0) + 1;
        }
        return {
            totalBatches,
            successRate,
            avgDuration,
            riskDistribution
        };
    }
    /**
     * Generate batch optimization recommendations
     */
    async generateOptimizationRecommendations() {
        const performance = await this.analyzeBatchPerformance();
        const recommendations = [];
        if (performance.successRate < 0.8) {
            recommendations.push('Consider reducing batch size to improve success rate');
        }
        if (performance.avgDuration > performance.riskDistribution.high * 2) {
            recommendations.push('High-risk batches taking longer than expected. Consider additional risk mitigation');
        }
        if (performance.riskDistribution.high > performance.totalBatches * 0.3) {
            recommendations.push('High proportion of high-risk batches. Review policy thresholds');
        }
        return recommendations;
    }
}
//# sourceMappingURL=risk_aware_batching.js.map