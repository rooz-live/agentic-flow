/**
 * ROI Tracker for Pattern Implementation Economic Analysis
 *
 * Provides comprehensive ROI tracking including:
 * - Time-based ROI calculations with compounding effects
 * - Pattern implementation lifecycle ROI tracking
 * - Risk-adjusted ROI with confidence intervals
 * - ROI attribution by pattern category and governance circle
 * - ROI forecasting and sensitivity analysis
 */
import * as fs from 'fs';
/**
 * ROI Tracker Class
 */
export class ROITracker {
    storagePath;
    trackingRecords = new Map();
    economicParameters;
    constructor(storagePath, economicParameters) {
        this.storagePath = storagePath;
        this.economicParameters = economicParameters || {
            discount_rate: 0.08,
            risk_free_rate: 0.02,
            market_risk_premium: 0.06,
            time_horizon: 90,
            inflation_rate: 0.025,
            opportunity_cost_rate: 0.10
        };
        this.loadTrackingRecords();
    }
    /**
     * Start tracking ROI for a pattern implementation
     */
    startTracking(patternEvent, economicData, roiMetrics) {
        const trackingId = this.generateTrackingId(patternEvent);
        const trackingRecord = {
            id: trackingId,
            pattern_event: patternEvent,
            economic_data: economicData,
            roi_metrics: roiMetrics,
            actual_costs: this.initializeImplementationCosts(economicData),
            realized_benefits: this.initializeRealizedBenefits(),
            risk_adjustments: this.initializeRiskAdjustments(economicData),
            confidence_intervals: this.calculateInitialConfidenceIntervals(economicData, roiMetrics),
            attribution: this.initializeAttribution(economicData),
            forecast_accuracy: this.initializeForecastAccuracy(economicData, roiMetrics),
            tracking_metadata: {
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: 'active',
                tracking_frequency: 'daily',
                data_sources: ['pattern-events', 'economic-calculations', 'system-metrics'],
                quality_indicators: {
                    data_completeness: 1.0,
                    data_accuracy: 1.0,
                    timeliness: 1.0,
                    consistency: 1.0,
                    overall_quality: 1.0
                },
                audit_trail: [{
                        timestamp: new Date().toISOString(),
                        action: 'tracking_started',
                        actor: 'system',
                        changes: {},
                        reason: 'Initial ROI tracking setup'
                    }]
            }
        };
        this.trackingRecords.set(trackingId, trackingRecord);
        this.saveTrackingRecords();
        return trackingId;
    }
    /**
     * Record actual implementation costs
     */
    recordImplementationCosts(trackingId, costs) {
        const record = this.trackingRecords.get(trackingId);
        if (!record) {
            throw new Error(`Tracking record not found: ${trackingId}`);
        }
        // Update costs
        if (costs.actual_initial_cost !== undefined) {
            record.actual_costs.actual_initial_cost = costs.actual_initial_cost;
        }
        if (costs.ongoing_costs) {
            record.actual_costs.ongoing_costs.push(...costs.ongoing_costs);
        }
        if (costs.hidden_costs) {
            record.actual_costs.hidden_costs.push(...costs.hidden_costs);
        }
        if (costs.cost_savings) {
            record.actual_costs.cost_savings.push(...costs.cost_savings);
        }
        // Recalculate total actual cost and variance
        this.recalculateTotalCosts(record);
        // Update tracking metadata
        this.updateTrackingMetadata(record, 'implementation_costs_recorded', {
            costs_updated: Object.keys(costs)
        });
        this.saveTrackingRecords();
    }
    /**
     * Record realized benefits
     */
    recordRealizedBenefits(trackingId, benefits) {
        const record = this.trackingRecords.get(trackingId);
        if (!record) {
            throw new Error(`Tracking record not found: ${trackingId}`);
        }
        // Add new benefits
        record.realized_benefits.time_series_benefits.push(...benefits);
        // Recalculate benefit metrics
        this.recalculateBenefits(record);
        // Update tracking metadata
        this.updateTrackingMetadata(record, 'benefits_recorded', {
            benefits_count: benefits.length,
            categories: benefits.map(b => b.category)
        });
        this.saveTrackingRecords();
    }
    /**
     * Update risk adjustments
     */
    updateRiskAdjustments(trackingId, riskFactors) {
        const record = this.trackingRecords.get(trackingId);
        if (!record) {
            throw new Error(`Tracking record not found: ${trackingId}`);
        }
        record.risk_adjustments.risk_factors = riskFactors;
        // Recalculate risk-adjusted metrics
        this.recalculateRiskAdjustments(record);
        this.updateTrackingMetadata(record, 'risk_adjustments_updated', {
            risk_factors_count: riskFactors.length
        });
        this.saveTrackingRecords();
    }
    /**
     * Get current ROI metrics for a tracking record
     */
    getCurrentROI(trackingId) {
        return this.trackingRecords.get(trackingId) || null;
    }
    /**
     * Generate comprehensive ROI report
     */
    generateROIReport(timeRange) {
        const records = Array.from(this.trackingRecords.values());
        // Filter by time range if provided
        let filteredRecords = records;
        if (timeRange) {
            const startTime = new Date(timeRange.start).getTime();
            const endTime = new Date(timeRange.end).getTime();
            filteredRecords = records.filter(record => {
                const recordTime = new Date(record.pattern_event.ts).getTime();
                return recordTime >= startTime && recordTime <= endTime;
            });
        }
        const summary = this.calculateROISummary(filteredRecords);
        const trends = this.analyzeROITrends(filteredRecords);
        const attribution = this.analyzeROIAttribution(filteredRecords);
        const forecasts = this.generateROIForecasts(filteredRecords);
        const recommendations = this.generateROIRecommendations(summary, trends);
        return {
            summary,
            trends,
            attribution,
            forecasts,
            recommendations,
            records_analyzed: filteredRecords.length,
            report_generated_at: new Date().toISOString()
        };
    }
    /**
     * Calculate ROI effectiveness by pattern category
     */
    getCategoryROIEffectiveness() {
        const categoryRecords = {};
        // Group records by category
        this.trackingRecords.forEach(record => {
            const tags = record.pattern_event.tags || [];
            const category = tags.find(tag => ['ML', 'HPC', 'Stats', 'Device/Web', 'General'].includes(tag)) || 'General';
            if (!categoryRecords[category]) {
                categoryRecords[category] = [];
            }
            categoryRecords[category].push(record);
        });
        // Calculate effectiveness for each category
        const effectiveness = {};
        Object.entries(categoryRecords).forEach(([category, records]) => {
            effectiveness[category] = this.calculateCategoryEffectiveness(category, records);
        });
        return effectiveness;
    }
    /**
     * Predict future ROI based on historical patterns
     */
    predictFutureROI(patternEvent, timeHorizon = 30) {
        // Find similar historical patterns
        const similarPatterns = this.findSimilarPatterns(patternEvent);
        // Calculate prediction based on similar patterns
        const predictedROI = this.calculatePredictedROI(patternEvent, similarPatterns, timeHorizon);
        // Generate confidence intervals
        const confidenceInterval = this.calculatePredictionConfidence(similarPatterns);
        // Identify prediction factors
        const predictionFactors = this.identifyPredictionFactors(patternEvent, similarPatterns);
        return {
            pattern_event: patternEvent,
            time_horizon: timeHorizon,
            predicted_roi: predictedROI,
            confidence_interval: confidenceInterval,
            prediction_factors: predictionFactors,
            similar_patterns_used: similarPatterns.length,
            prediction_confidence: this.calculatePredictionConfidence(similarPatterns)
        };
    }
    // Private helper methods
    generateTrackingId(patternEvent) {
        const pattern = patternEvent.pattern;
        const runId = patternEvent.run_id;
        const timestamp = patternEvent.ts;
        return `${pattern}-${runId}-${timestamp.replace(/[:.]/g, '-')}`;
    }
    initializeImplementationCosts(economicData) {
        return {
            estimated_cost: economicData.implementation_cost,
            actual_initial_cost: economicData.implementation_cost, // Initially assume estimate is accurate
            ongoing_costs: [],
            hidden_costs: [],
            cost_savings: [],
            total_actual_cost: economicData.implementation_cost,
            cost_variance_pct: 0
        };
    }
    initializeRealizedBenefits() {
        return {
            time_series_benefits: [],
            benefit_variance: {
                expected_total: 0,
                actual_total: 0,
                variance_amount: 0,
                variance_pct: 0,
                variance_reasons: []
            },
            cumulative_benefits: 0,
            realization_rate: 0,
            peak_benefit_period: {
                start_date: '',
                end_date: '',
                peak_amount: 0,
                peak_average: 0,
                contributing_factors: []
            }
        };
    }
    initializeRiskAdjustments(economicData) {
        return {
            risk_factors: [],
            risk_multipliers: {
                business_risk: 1.0,
                technical_risk: 1.0,
                operational_risk: 1.0
            },
            risk_adjusted_roi: economicData.roi,
            confidence_score: 0.8,
            sensitivity_analysis: {
                parameter_sensitivity: [],
                best_case: economicData.roi * 1.5,
                worst_case: economicData.roi * 0.5,
                most_likely: economicData.roi,
                scenario_probabilities: {
                    optimistic: 0.2,
                    realistic: 0.6,
                    pessimistic: 0.2
                }
            }
        };
    }
    calculateInitialConfidenceIntervals(economicData, roiMetrics) {
        const roi = roiMetrics.roi_rate;
        const roiVariability = 0.3; // 30% initial variability assumption
        return {
            roi_interval: [roi * (1 - roiVariability), roi * (1 + roiVariability)],
            benefit_interval: [
                economicData.business_impact * 0.8,
                economicData.business_impact * 1.2
            ],
            cost_interval: [
                economicData.implementation_cost * 0.8,
                economicData.implementation_cost * 1.2
            ],
            confidence_level: 0.8,
            methodology: 'analytical'
        };
    }
    initializeAttribution(economicData) {
        const category = economicData.category_economics.category;
        const circle = economicData.circle_impact.circle;
        const pattern = ''; // Will be populated when pattern event is available
        return {
            by_category: {
                [category]: {
                    category,
                    attributed_roi: economicData.roi,
                    contribution_pct: 100,
                    efficiency_ratio: economicData.business_impact / economicData.implementation_cost,
                    risk_adjusted_contribution: economicData.roi * 0.9
                }
            },
            by_circle: {
                [circle]: {
                    circle,
                    attributed_roi: economicData.roi,
                    contribution_pct: 100,
                    resource_efficiency: 1.0,
                    collaboration_multiplier: 1.0
                }
            },
            by_pattern: {},
            cross_attribution: []
        };
    }
    initializeForecastAccuracy(economicData, roiMetrics) {
        return {
            original_forecast: {
                roi: roiMetrics.roi_rate,
                benefits: economicData.business_impact,
                costs: economicData.implementation_cost,
                timeframe: roiMetrics.payback_period
            },
            actual_results: {
                roi: 0, // Will be updated as actual results come in
                benefits: 0,
                costs: 0,
                timeframe: 0
            },
            accuracy_metrics: {
                roi_accuracy_pct: 0,
                benefit_accuracy_pct: 0,
                cost_accuracy_pct: 0,
                timeframe_accuracy_pct: 0
            },
            forecast_errors: [],
            lessons_learned: []
        };
    }
    recalculateTotalCosts(record) {
        const costs = record.actual_costs;
        // Calculate total actual cost
        let totalCost = costs.actual_initial_cost;
        // Add ongoing costs
        costs.ongoing_costs.forEach(ongoing => {
            const periods = this.calculateOngoingCostPeriods(ongoing);
            totalCost += ongoing.amount * periods;
        });
        // Add hidden costs
        totalCost += costs.hidden_costs.reduce((sum, hidden) => sum + hidden.amount, 0);
        // Subtract cost savings
        totalCost -= costs.cost_savings.reduce((sum, saving) => sum + saving.amount, 0);
        costs.total_actual_cost = Math.max(0, totalCost);
        // Calculate variance
        costs.cost_variance_pct = ((costs.total_actual_cost - costs.estimated_cost) / costs.estimated_cost) * 100;
    }
    calculateOngoingCostPeriods(ongoing) {
        const start = new Date(ongoing.start_date);
        const end = ongoing.end_date ? new Date(ongoing.end_date) : new Date();
        const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        switch (ongoing.frequency) {
            case 'daily': return Math.max(1, daysDiff);
            case 'weekly': return Math.max(1, Math.floor(daysDiff / 7));
            case 'monthly': return Math.max(1, Math.floor(daysDiff / 30));
            case 'quarterly': return Math.max(1, Math.floor(daysDiff / 90));
            case 'annually': return Math.max(1, Math.floor(daysDiff / 365));
            default: return 1;
        }
    }
    recalculateBenefits(record) {
        const benefits = record.realized_benefits;
        // Calculate cumulative benefits
        benefits.cumulative_benefits = benefits.time_series_benefits.reduce((sum, benefit) => sum + benefit.amount, 0);
        // Calculate benefit variance
        const expectedTotal = record.economic_data.business_impact;
        benefits.benefit_variance.expected_total = expectedTotal;
        benefits.benefit_variance.actual_total = benefits.cumulative_benefits;
        benefits.benefit_variance.variance_amount = benefits.cumulative_benefits - expectedTotal;
        benefits.benefit_variance.variance_pct = (benefits.benefit_variance.variance_amount / expectedTotal) * 100;
        // Calculate realization rate
        const timeElapsed = this.getTimeElapsed(record);
        const expectedProgress = Math.min(timeElapsed / record.roi_metrics.payback_period, 1);
        benefits.realization_rate = expectedProgress > 0 ? benefits.cumulative_benefits / (expectedTotal * expectedProgress) : 0;
        // Identify peak benefit period
        this.identifyPeakBenefitPeriod(benefits);
    }
    getTimeElapsed(record) {
        const start = new Date(record.pattern_event.ts);
        const now = new Date();
        return (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24); // Days
    }
    identifyPeakBenefitPeriod(benefits) {
        if (benefits.time_series_benefits.length < 2)
            return;
        // Sort benefits by timestamp
        const sortedBenefits = benefits.time_series_benefits.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        // Find 30-day window with maximum average benefit
        let maxAverage = 0;
        let peakWindow = null;
        for (let i = 0; i < sortedBenefits.length - 1; i++) {
            const windowStart = new Date(sortedBenefits[i].timestamp);
            const windowEnd = new Date(windowStart.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
            const windowBenefits = sortedBenefits.filter(b => {
                const benefitTime = new Date(b.timestamp);
                return benefitTime >= windowStart && benefitTime <= windowEnd;
            });
            if (windowBenefits.length > 0) {
                const average = windowBenefits.reduce((sum, b) => sum + b.amount, 0) / windowBenefits.length;
                if (average > maxAverage) {
                    maxAverage = average;
                    peakWindow = {
                        start: windowStart.toISOString(),
                        end: windowEnd.toISOString(),
                        average
                    };
                }
            }
        }
        if (peakWindow) {
            benefits.peak_benefit_period = {
                start_date: peakWindow.start,
                end_date: peakWindow.end,
                peak_amount: Math.max(...sortedBenefits.map(b => b.amount)),
                peak_average: peakWindow.average,
                contributing_factors: this.identifyPeakContributingFactors(sortedBenefits)
            };
        }
    }
    identifyPeakContributingFactors(benefits) {
        const categoryCounts = {};
        benefits.forEach(benefit => {
            categoryCounts[benefit.category] = (categoryCounts[benefit.category] || 0) + 1;
        });
        return Object.entries(categoryCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([category]) => category);
    }
    recalculateRiskAdjustments(record) {
        const adjustments = record.risk_adjustments;
        // Calculate risk-adjusted ROI
        let totalRiskMultiplier = 1.0;
        adjustments.risk_factors.forEach(factor => {
            const factorMultiplier = 1 - (factor.probability * factor.impact * 0.5);
            adjustments.risk_multipliers[factor.name] = factorMultiplier;
            totalRiskMultiplier *= factorMultiplier;
        });
        adjustments.risk_adjusted_roi = record.economic_data.roi * totalRiskMultiplier;
        adjustments.confidence_score = Math.max(0.1, 1.0 - (adjustments.risk_factors.length * 0.1));
    }
    updateTrackingMetadata(record, action, details) {
        record.tracking_metadata.updated_at = new Date().toISOString();
        record.tracking_metadata.audit_trail.push({
            timestamp: new Date().toISOString(),
            action,
            actor: 'system',
            changes: details,
            reason: 'Automatic update'
        });
        // Keep audit trail manageable
        if (record.tracking_metadata.audit_trail.length > 100) {
            record.tracking_metadata.audit_trail = record.tracking_metadata.audit_trail.slice(-50);
        }
    }
    loadTrackingRecords() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = fs.readFileSync(this.storagePath, 'utf8');
                const records = JSON.parse(data);
                this.trackingRecords = new Map(Object.entries(records));
            }
        }
        catch (error) {
            console.warn('Failed to load ROI tracking records:', error);
        }
    }
    saveTrackingRecords() {
        try {
            const records = Object.fromEntries(this.trackingRecords);
            fs.writeFileSync(this.storagePath, JSON.stringify(records, null, 2));
        }
        catch (error) {
            console.error('Failed to save ROI tracking records:', error);
        }
    }
    // Additional private methods for comprehensive ROI analysis
    calculateROISummary(records) {
        const totalInvestment = records.reduce((sum, r) => sum + r.actual_costs.total_actual_cost, 0);
        const totalBenefits = records.reduce((sum, r) => sum + r.realized_benefits.cumulative_benefits, 0);
        const totalROI = totalInvestment > 0 ? ((totalBenefits - totalInvestment) / totalInvestment) * 100 : 0;
        return {
            total_records: records.length,
            total_investment: totalInvestment,
            total_benefits: totalBenefits,
            overall_roi: totalROI,
            average_roi_per_record: records.length > 0 ? totalROI / records.length : 0,
            best_performing_record: this.findBestPerformingRecord(records),
            worst_performing_record: this.findWorstPerformingRecord(records)
        };
    }
    findBestPerformingRecord(records) {
        return records.reduce((best, current) => {
            const bestROI = best?.risk_adjustments.risk_adjusted_roi || -Infinity;
            const currentROI = current.risk_adjustments.risk_adjusted_roi;
            return currentROI > bestROI ? current : best;
        }, null);
    }
    findWorstPerformingRecord(records) {
        return records.reduce((worst, current) => {
            const worstROI = worst?.risk_adjustments.risk_adjusted_roi || Infinity;
            const currentROI = current.risk_adjustments.risk_adjusted_roi;
            return currentROI < worstROI ? current : worst;
        }, null);
    }
    analyzeROITrends(records) {
        const sortedRecords = records.sort((a, b) => new Date(a.pattern_event.ts).getTime() - new Date(b.pattern_event.ts).getTime());
        const roiOverTime = sortedRecords.map(r => r.risk_adjustments.risk_adjusted_roi);
        return {
            trend_direction: this.calculateTrendDirection(roiOverTime),
            trend_strength: this.calculateTrendStrength(roiOverTime),
            seasonal_patterns: this.identifySeasonalPatterns(sortedRecords),
            correlation_factors: this.calculateROICorrelations(sortedRecords)
        };
    }
    calculateTrendDirection(values) {
        if (values.length < 2)
            return 'stable';
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const change = (secondAvg - firstAvg) / firstAvg;
        if (change > 0.05)
            return 'increasing';
        if (change < -0.05)
            return 'decreasing';
        return 'stable';
    }
    calculateTrendStrength(values) {
        if (values.length < 3)
            return 0;
        // Simple linear regression to calculate trend strength
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const y = values;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        // Calculate R-squared as trend strength indicator
        const yMean = sumY / n;
        const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
        const ssRes = y.reduce((sum, yi, i) => {
            const predicted = slope * x[i] + intercept;
            return sum + Math.pow(yi - predicted, 2);
        }, 0);
        return Math.max(0, 1 - (ssRes / ssTot));
    }
    identifySeasonalPatterns(records) {
        // Group by month to identify seasonal patterns
        const monthlyData = {};
        records.forEach(record => {
            const month = new Date(record.pattern_event.ts).toISOString().slice(0, 7); // YYYY-MM
            if (!monthlyData[month])
                monthlyData[month] = [];
            monthlyData[month].push(record.risk_adjustments.risk_adjusted_roi);
        });
        const patterns = [];
        Object.entries(monthlyData).forEach(([month, rois]) => {
            if (rois.length > 1) {
                const avg = rois.reduce((a, b) => a + b, 0) / rois.length;
                patterns.push({
                    period: month,
                    average_roi: avg,
                    roi_count: rois.length,
                    variance: this.calculateVariance(rois)
                });
            }
        });
        return patterns;
    }
    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }
    calculateROICorrelations(records) {
        const correlations = {};
        // ROI vs Implementation Cost correlation
        const costs = records.map(r => r.actual_costs.total_actual_cost);
        const rois = records.map(r => r.risk_adjustments.risk_adjusted_roi);
        correlations['implementation_cost'] = this.calculateCorrelation(costs, rois);
        // ROI vs Time to Complete correlation
        const durations = records.map(r => this.getTimeElapsed(r));
        correlations['implementation_duration'] = this.calculateCorrelation(durations, rois);
        // ROI vs Circle correlation
        correlations['circle_efficiency'] = this.calculateCircleEfficiencyCorrelation(records);
        return correlations;
    }
    calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length < 2)
            return 0;
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        return denominator === 0 ? 0 : numerator / denominator;
    }
    calculateCircleEfficiencyCorrelation(records) {
        const circleEfficiency = {};
        records.forEach(record => {
            const circle = record.pattern_event.circle;
            if (!circleEfficiency[circle])
                circleEfficiency[circle] = [];
            circleEfficiency[circle].push(record.risk_adjustments.risk_adjusted_roi);
        });
        const efficiencies = Object.values(circleEfficiency).map(rois => rois.reduce((a, b) => a + b, 0) / rois.length);
        // Return variance of circle efficiencies as correlation measure
        return this.calculateVariance(efficiencies);
    }
    findSimilarPatterns(patternEvent, limit = 10) {
        const records = Array.from(this.trackingRecords.values());
        // Calculate similarity scores and sort
        const similarities = records.map(record => ({
            record,
            score: this.calculatePatternSimilarity(patternEvent, record.pattern_event)
        }));
        return similarities
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(s => s.record);
    }
    calculatePatternSimilarity(event1, event2) {
        let score = 0;
        let factors = 0;
        // Pattern similarity
        if (event1.pattern === event2.pattern)
            score += 3;
        factors++;
        // Circle similarity
        if (event1.circle === event2.circle)
            score += 2;
        factors++;
        // Tag overlap
        const tags1 = new Set(event1.tags || []);
        const tags2 = new Set(event2.tags || []);
        const tagOverlap = [...tags1].filter(tag => tags2.has(tag)).length;
        score += tagOverlap;
        factors++;
        // Depth similarity
        const depthDiff = Math.abs((event1.depth || 0) - (event2.depth || 0));
        score += Math.max(0, 4 - depthDiff);
        factors++;
        // Mode similarity
        if (event1.mode === event2.mode)
            score += 1;
        factors++;
        return factors > 0 ? score / factors : 0;
    }
    calculatePredictedROI(patternEvent, similarPatterns, timeHorizon) {
        if (similarPatterns.length === 0)
            return 0;
        // Weight patterns by similarity and recency
        const weights = similarPatterns.map(record => {
            const similarity = this.calculatePatternSimilarity(patternEvent, record.pattern_event);
            const recency = this.calculateRecencyWeight(record);
            return similarity * recency;
        });
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        // Calculate weighted average ROI
        const weightedROI = similarPatterns.reduce((sum, record, index) => {
            const normalizedWeight = weights[index] / totalWeight;
            return sum + (record.risk_adjustments.risk_adjusted_roi * normalizedWeight);
        }, 0);
        // Apply time horizon adjustment
        const timeAdjustment = Math.min(1, timeHorizon / 90); // Normalize to 90-day baseline
        return weightedROI * timeAdjustment;
    }
    calculateRecencyWeight(record) {
        const daysSinceEvent = this.getTimeElapsed(record);
        // More recent events have higher weights, exponential decay
        return Math.exp(-daysSinceEvent / 90); // Half-life of 90 days
    }
    calculatePredictionConfidence(similarPatterns) {
        if (similarPatterns.length === 0) {
            return { lower: 0, upper: 0, confidence: 0 };
        }
        const rois = similarPatterns.map(r => r.risk_adjustments.risk_adjusted_roi);
        const mean = rois.reduce((a, b) => a + b, 0) / rois.length;
        const variance = this.calculateVariance(rois);
        const stdDev = Math.sqrt(variance);
        // 95% confidence interval (approximately 2 standard deviations)
        const confidence = similarPatterns.length > 5 ? 0.95 : 0.8;
        const multiplier = confidence === 0.95 ? 2 : 1.5;
        return {
            lower: Math.max(0, mean - (multiplier * stdDev)),
            upper: mean + (multiplier * stdDev),
            confidence
        };
    }
    identifyPredictionFactors(patternEvent, similarPatterns) {
        const factors = [];
        // Pattern-specific factor
        const patternRecords = similarPatterns.filter(r => r.pattern_event.pattern === patternEvent.pattern);
        if (patternRecords.length > 0) {
            const avgROI = patternRecords.reduce((sum, r) => sum + r.risk_adjustments.risk_adjusted_roi, 0) / patternRecords.length;
            factors.push({
                factor: 'pattern_specificity',
                influence: avgROI,
                confidence: patternRecords.length / similarPatterns.length,
                description: `Historical ROI for ${patternEvent.pattern} pattern`
            });
        }
        // Circle-specific factor
        const circleRecords = similarPatterns.filter(r => r.pattern_event.circle === patternEvent.circle);
        if (circleRecords.length > 0) {
            const avgROI = circleRecords.reduce((sum, r) => sum + r.risk_adjustments.risk_adjusted_roi, 0) / circleRecords.length;
            factors.push({
                factor: 'circle_efficiency',
                influence: avgROI,
                confidence: circleRecords.length / similarPatterns.length,
                description: `Historical ROI for ${patternEvent.circle} circle`
            });
        }
        // Tag-based factors
        const tags = patternEvent.tags || [];
        tags.forEach(tag => {
            const tagRecords = similarPatterns.filter(r => r.pattern_event.tags?.includes(tag));
            if (tagRecords.length > 0) {
                const avgROI = tagRecords.reduce((sum, r) => sum + r.risk_adjustments.risk_adjusted_roi, 0) / tagRecords.length;
                factors.push({
                    factor: `tag_${tag}`,
                    influence: avgROI,
                    confidence: tagRecords.length / similarPatterns.length,
                    description: `Historical ROI for ${tag} category`
                });
            }
        });
        return factors;
    }
    calculateCategoryEffectiveness(category, records) {
        const rois = records.map(r => r.risk_adjustments.risk_adjusted_roi);
        const avgROI = rois.reduce((a, b) => a + b, 0) / rois.length;
        const roiVariance = this.calculateVariance(rois);
        const successRate = records.filter(r => r.risk_adjustments.risk_adjusted_roi > 0).length / records.length;
        return {
            category,
            total_records: records.length,
            average_roi: avgROI,
            roi_variance: roiVariance,
            success_rate: successRate,
            best_performing_pattern: this.findBestPerformingPattern(records),
            roi_trend: this.calculateTrendDirection(rois)
        };
    }
    findBestPerformingPattern(records) {
        const patternROIs = {};
        records.forEach(record => {
            const pattern = record.pattern_event.pattern;
            if (!patternROIs[pattern])
                patternROIs[pattern] = [];
            patternROIs[pattern].push(record.risk_adjustments.risk_adjusted_roi);
        });
        let bestPattern = '';
        let bestAvgROI = -Infinity;
        Object.entries(patternROIs).forEach(([pattern, rois]) => {
            const avgROI = rois.reduce((a, b) => a + b, 0) / rois.length;
            if (avgROI > bestAvgROI) {
                bestAvgROI = avgROI;
                bestPattern = pattern;
            }
        });
        return bestPattern;
    }
}
//# sourceMappingURL=roi_tracker.js.map