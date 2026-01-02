import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
export class WSJFCalculator {
    goalieDir;
    patternsConfig;
    riskFactors = new Map();
    constructor(goalieDir) {
        this.goalieDir = goalieDir;
        this.loadPatternsConfig();
        this.initializeRiskFactors();
    }
    loadPatternsConfig() {
        const patternsPath = path.join(this.goalieDir, 'PATTERNS.yaml');
        if (fs.existsSync(patternsPath)) {
            const raw = fs.readFileSync(patternsPath, 'utf8');
            this.patternsConfig = yaml.parse(raw) || {};
        }
        else {
            this.patternsConfig = { patterns: [] };
        }
    }
    initializeRiskFactors() {
        // Initialize default risk factors by pattern category
        this.riskFactors.set('ML', 0.8);
        this.riskFactors.set('HPC', 0.9);
        this.riskFactors.set('Stats', 0.6);
        this.riskFactors.set('Device/Web', 0.5);
        this.riskFactors.set('General', 0.4);
    }
    /**
     * Calculate WSJF score for a pattern event
     */
    calculateWSJF(event, context) {
        const patternId = event.pattern || 'unknown';
        const patternConfig = this.findPatternConfig(patternId);
        // Extract or estimate WSJF parameters
        const parameters = this.extractWSJFParameters(event, patternConfig, context);
        // Calculate Cost of Delay
        const costOfDelay = parameters.userBusinessValue +
            parameters.timeCriticality +
            parameters.riskReduction;
        // Apply risk and complexity multipliers
        const riskMultiplier = parameters.riskMultiplier || 1.0;
        const complexityMultiplier = parameters.complexityMultiplier || 1.0;
        const adjustedDuration = parameters.jobDuration * complexityMultiplier;
        // Calculate WSJF score
        const wsjfScore = (costOfDelay * riskMultiplier) / adjustedDuration;
        // Assess risk
        const riskAssessment = this.assessRisk(event, patternConfig, parameters);
        // Generate recommendation
        const recommendation = this.generateRecommendation(wsjfScore, riskAssessment);
        // Generate batch recommendation
        const batchRecommendation = this.generateBatchRecommendation(wsjfScore, riskAssessment, parameters, patternConfig);
        return {
            id: this.generateId(event),
            title: this.generateTitle(event, patternConfig),
            category: patternConfig?.category || 'General',
            wsjfScore: Math.round(wsjfScore * 100) / 100,
            costOfDelay: Math.round(costOfDelay * 100) / 100,
            parameters,
            riskAssessment,
            recommendation,
            batchRecommendation
        };
    }
    /**
     * Calculate WSJF scores for multiple events and rank them
     */
    calculateAndRank(events, context) {
        const results = events.map(event => this.calculateWSJF(event, context));
        // Sort by WSJF score (descending)
        return results.sort((a, b) => b.wsjfScore - a.wsjfScore);
    }
    /**
     * Generate risk-aware batching recommendations
     */
    generateRiskAwareBatches(results) {
        const batches = [];
        // Group by priority and risk level
        const criticalItems = results.filter(r => r.recommendation === 'IMMEDIATE' && r.riskAssessment.riskLevel <= 5);
        const highItems = results.filter(r => r.recommendation === 'HIGH' && r.riskAssessment.riskLevel <= 7);
        const mediumItems = results.filter(r => r.recommendation === 'MEDIUM' && r.riskAssessment.riskLevel <= 8);
        // Create batches based on risk tolerance
        if (criticalItems.length > 0) {
            batches.push(this.createBatch(criticalItems, 'CRITICAL', 2)); // Small batches for critical
        }
        if (highItems.length > 0) {
            batches.push(this.createBatch(highItems, 'HIGH', 5)); // Medium batches for high priority
        }
        if (mediumItems.length > 0) {
            batches.push(this.createBatch(mediumItems, 'NORMAL', 8)); // Larger batches for medium priority
        }
        return batches;
    }
    findPatternConfig(patternId) {
        if (!this.patternsConfig.patterns)
            return null;
        return this.patternsConfig.patterns.find((p) => p.id === patternId);
    }
    extractWSJFParameters(event, patternConfig, context) {
        // Base values from pattern configuration
        const codThreshold = patternConfig?.cod_threshold || 6;
        const category = patternConfig?.category || 'General';
        // Extract economic data from event
        const economic = event.economic || {};
        const cod = economic.cod || codThreshold;
        // Calculate parameters based on pattern and context
        const userBusinessValue = this.calculateUserBusinessValue(event, patternConfig, cod);
        const timeCriticality = this.calculateTimeCriticality(event, patternConfig, cod);
        const riskReduction = this.calculateRiskReduction(event, patternConfig, cod);
        const jobDuration = this.calculateJobDuration(event, patternConfig);
        // Apply risk and complexity multipliers
        const riskMultiplier = this.riskFactors.get(category) || 1.0;
        const complexityMultiplier = this.calculateComplexityMultiplier(event, patternConfig);
        return {
            userBusinessValue,
            timeCriticality,
            riskReduction,
            jobDuration,
            riskMultiplier,
            complexityMultiplier
        };
    }
    calculateUserBusinessValue(event, patternConfig, cod) {
        // Higher COD indicates higher business value
        const baseValue = Math.min(cod * 2, 20);
        // Adjust based on pattern category
        const categoryMultiplier = {
            'ML': 1.2,
            'HPC': 1.1,
            'Stats': 0.9,
            'Device/Web': 0.8,
            'General': 1.0
        }[patternConfig?.category] || 1.0;
        return Math.round(baseValue * categoryMultiplier);
    }
    calculateTimeCriticality(event, patternConfig, cod) {
        // Time criticality based on pattern severity and frequency
        const severity = patternConfig?.cod_threshold || 6;
        const baseCriticality = Math.min((severity + cod) / 2, 20);
        // Boost for observability-required patterns
        if (patternConfig?.observability_required) {
            return Math.min(baseCriticality * 1.3, 20);
        }
        return Math.round(baseCriticality);
    }
    calculateRiskReduction(event, patternConfig, cod) {
        // Risk reduction based on pattern impact
        const baseRiskReduction = Math.min(cod * 1.5, 20);
        // Higher for patterns with code fixes available
        if (patternConfig?.code_fix_available) {
            return Math.min(baseRiskReduction * 1.2, 20);
        }
        return Math.round(baseRiskReduction);
    }
    calculateJobDuration(event, patternConfig) {
        // Estimate job duration based on pattern complexity
        const categoryComplexity = {
            'ML': 8,
            'HPC': 10,
            'Stats': 6,
            'Device/Web': 5,
            'General': 4
        }[patternConfig?.category] || 6;
        // Adjust based on whether code fix is available
        const fixAvailable = patternConfig?.code_fix_available ? 0.7 : 1.0;
        return Math.round(categoryComplexity * fixAvailable);
    }
    calculateComplexityMultiplier(event, patternConfig) {
        // Complexity based on frameworks and schedulers involved
        const frameworks = patternConfig?.frameworks || [];
        const schedulers = patternConfig?.schedulers || [];
        let complexity = 1.0;
        // Add complexity for multiple frameworks
        if (frameworks.length > 1)
            complexity += 0.2;
        if (frameworks.length > 3)
            complexity += 0.3;
        // Add complexity for enterprise schedulers
        if (schedulers.includes('slurm'))
            complexity += 0.2;
        if (schedulers.includes('k8s') || schedulers.includes('kubernetes'))
            complexity += 0.1;
        return Math.min(complexity, 2.0);
    }
    assessRisk(event, patternConfig, parameters) {
        const category = patternConfig?.category || 'General';
        // Calculate risk factors
        const technical = this.assessTechnicalRisk(event, patternConfig);
        const business = this.assessBusinessRisk(event, patternConfig, parameters);
        const dependency = this.assessDependencyRisk(event, patternConfig);
        const resource = this.assessResourceRisk(event, patternConfig);
        // Overall risk level (1-10)
        const riskLevel = Math.round((technical + business + dependency + resource) / 4);
        // Generate mitigation strategies
        const mitigationStrategies = this.generateMitigationStrategies(technical, business, dependency, resource, category);
        return {
            riskLevel,
            factors: { technical, business, dependency, resource },
            mitigationStrategies
        };
    }
    assessTechnicalRisk(event, patternConfig) {
        let risk = 3; // Base technical risk
        // Higher risk for complex patterns
        if (patternConfig?.frameworks?.length > 2)
            risk += 2;
        if (patternConfig?.schedulers?.includes('slurm'))
            risk += 1;
        // Higher risk for patterns without code fixes
        if (!patternConfig?.code_fix_available)
            risk += 2;
        return Math.min(risk, 10);
    }
    assessBusinessRisk(event, patternConfig, parameters) {
        // Business risk based on user business value and time criticality
        const avgValue = (parameters.userBusinessValue + parameters.timeCriticality) / 2;
        return Math.round((avgValue / 20) * 10); // Convert to 1-10 scale
    }
    assessDependencyRisk(event, patternConfig) {
        let risk = 2; // Base dependency risk
        // Higher risk for enterprise patterns
        if (patternConfig?.category === 'ML' || patternConfig?.category === 'HPC') {
            risk += 2;
        }
        // Higher risk for patterns with multiple schedulers
        if (patternConfig?.schedulers?.length > 1)
            risk += 1;
        return Math.min(risk, 10);
    }
    assessResourceRisk(event, patternConfig) {
        let risk = 2; // Base resource risk
        // Higher risk for resource-intensive categories
        if (patternConfig?.category === 'HPC')
            risk += 3;
        if (patternConfig?.category === 'ML')
            risk += 2;
        return Math.min(risk, 10);
    }
    generateMitigationStrategies(technical, business, dependency, resource, category) {
        const strategies = [];
        if (technical > 6) {
            strategies.push('Implement comprehensive testing before deployment');
            strategies.push('Use feature flags for gradual rollout');
        }
        if (business > 6) {
            strategies.push('Stakeholder approval required before execution');
            strategies.push('Implement rollback procedures');
        }
        if (dependency > 6) {
            strategies.push('Coordinate with dependent teams');
            strategies.push('Schedule during maintenance windows');
        }
        if (resource > 6) {
            strategies.push('Resource allocation verification required');
            strategies.push('Monitor resource utilization during execution');
        }
        // Category-specific strategies
        if (category === 'ML') {
            strategies.push('Model validation before production deployment');
        }
        if (category === 'HPC') {
            strategies.push('Cluster resource reservation required');
        }
        return strategies;
    }
    generateRecommendation(wsjfScore, riskAssessment) {
        // Adjust recommendation based on both WSJF score and risk
        const adjustedScore = wsjfScore * (1 - (riskAssessment.riskLevel - 1) / 20);
        if (adjustedScore >= 15)
            return 'IMMEDIATE';
        if (adjustedScore >= 10)
            return 'HIGH';
        if (adjustedScore >= 5)
            return 'MEDIUM';
        if (adjustedScore >= 2)
            return 'LOW';
        return 'DEFER';
    }
    generateBatchRecommendation(wsjfScore, riskAssessment, parameters, patternConfig) {
        const shouldBatch = riskAssessment.riskLevel <= 7 && parameters.jobDuration <= 10;
        const now = new Date();
        let batchPriority = 'NORMAL';
        let batchSize = 5;
        if (wsjfScore >= 15) {
            batchPriority = 'CRITICAL';
            batchSize = 2;
        }
        else if (wsjfScore >= 10) {
            batchPriority = 'HIGH';
            batchSize = 3;
        }
        else if (wsjfScore >= 5) {
            batchPriority = 'NORMAL';
            batchSize = 5;
        }
        else {
            batchPriority = 'LOW';
            batchSize = 8;
        }
        // Adjust batch size based on risk
        if (riskAssessment.riskLevel > 6) {
            batchSize = Math.max(1, Math.floor(batchSize / 2));
        }
        // Calculate execution window based on time criticality
        const windowHours = Math.max(1, Math.floor(24 / parameters.timeCriticality));
        const start = now.toISOString();
        const end = new Date(now.getTime() + windowHours * 60 * 60 * 1000).toISOString();
        return {
            shouldBatch,
            batchSize,
            batchPriority,
            executionWindow: { start, end },
            dependencies: [] // To be filled based on pattern analysis
        };
    }
    createBatch(items, priority, maxSize) {
        const now = new Date();
        const windowHours = priority === 'CRITICAL' ? 2 : priority === 'HIGH' ? 6 : priority === 'NORMAL' ? 24 : 72;
        return {
            shouldBatch: true,
            batchSize: Math.min(items.length, maxSize),
            batchPriority: priority,
            executionWindow: {
                start: now.toISOString(),
                end: new Date(now.getTime() + windowHours * 60 * 60 * 1000).toISOString()
            },
            dependencies: items.flatMap(item => item.batchRecommendation.dependencies)
        };
    }
    generateId(event) {
        const timestamp = event.ts || new Date().toISOString();
        const pattern = event.pattern || 'unknown';
        const hash = Buffer.from(`${pattern}-${timestamp}`).toString('base64').slice(0, 8);
        return `${pattern}-${hash}`;
    }
    generateTitle(event, patternConfig) {
        if (event.title)
            return event.title;
        if (patternConfig?.name)
            return patternConfig.name;
        if (patternConfig?.description)
            return patternConfig.description;
        return `Pattern: ${event.pattern || 'unknown'}`;
    }
}
//# sourceMappingURL=wsjf_calculator.js.map