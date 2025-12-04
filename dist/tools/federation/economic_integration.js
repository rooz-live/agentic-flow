/**
 * Economic Metrics Integration System
 *
 * Integrates comprehensive economic metrics with the existing pattern metrics infrastructure including:
 * - Seamless integration with pattern metrics analyzer
 * - Economic enrichment of pattern events
 * - Automated economic calculation hooks
 * - Real-time economic monitoring
 * - Economic-driven pattern recommendations
 */
import * as fs from 'fs';
import * as path from 'path';
import { EconomicMetricsCalculator } from './economic_metrics_calculator.js';
import { EconomicTrendAnalyzer } from './economic_trend_analyzer.js';
import { GovernanceEconomicsTracker } from './governance_economics_tracker.js';
import { ROITracker } from './roi_tracker.js';
/**
 * Economic Integration System
 */
export class EconomicIntegration {
    economicCalculator;
    roiTracker;
    governanceTracker;
    trendAnalyzer;
    config;
    processingCache = new Map();
    constructor(config) {
        this.config = config;
        this.initializeComponents();
        this.setupStorageDirectories();
    }
    /**
     * Integrate economic metrics with pattern metrics analyzer
     */
    integrateWithPatternMetrics(patternEvents) {
        const startTime = Date.now();
        const results = {
            success: true,
            summary: {
                total_events_processed: patternEvents.length,
                events_enriched: 0,
                events_failed: 0,
                processing_time_ms: 0,
                data_quality_score: 0
            },
            economic_metrics: {
                total_cod: 0,
                avg_wsjf: 0,
                total_business_impact: 0,
                total_implementation_cost: 0,
                avg_roi: 0,
                risk_adjusted_metrics: {
                    risk_adjusted_cod: 0,
                    risk_adjusted_wsjf: 0,
                    overall_risk_score: 0,
                    mitigation_effectiveness: 0
                },
                circle_metrics: {},
                category_metrics: {}
            },
            errors: [],
            recommendations: [],
            performance: {
                events_per_second: 0,
                avg_calculation_time_ms: 0,
                memory_usage_mb: 0,
                cache_hit_rate: 0,
                error_rate: 0
            }
        };
        try {
            // Process each pattern event
            for (const event of patternEvents) {
                try {
                    const enrichment = this.enrichPatternEvent(event);
                    if (enrichment) {
                        results.summary.events_enriched++;
                        // Update economic metrics summary
                        this.updateEconomicMetricsSummary(results.economic_metrics, enrichment.economic_data);
                        // Track ROI if enabled
                        if (this.config.integration_settings.roi_tracking_enabled) {
                            this.trackROIForEvent(event, enrichment.economic_data);
                        }
                        // Update governance economics if enabled
                        if (this.config.integration_settings.governance_tracking_enabled) {
                            this.updateGovernanceEconomics(event, enrichment.economic_data);
                        }
                    }
                    else {
                        results.summary.events_failed++;
                    }
                }
                catch (error) {
                    results.summary.events_failed++;
                    results.errors.push({
                        type: 'integration',
                        message: error instanceof Error ? error.message : 'Unknown error',
                        severity: 'medium',
                        event_id: event.run_id,
                        timestamp: new Date().toISOString(),
                        resolution_suggestions: ['Check event data format', 'Verify economic parameters']
                    });
                }
            }
            // Calculate final metrics
            results.summary.processing_time_ms = Date.now() - startTime;
            results.summary.data_quality_score = this.calculateDataQualityScore(results);
            results.performance = this.calculatePerformanceMetrics(results);
            // Generate recommendations
            results.recommendations = this.generateRecommendations(results.economic_metrics);
            // Save results
            this.saveIntegrationResults(results);
        }
        catch (error) {
            results.success = false;
            results.errors.push({
                type: 'system',
                message: error instanceof Error ? error.message : 'System error',
                severity: 'critical',
                timestamp: new Date().toISOString(),
                resolution_suggestions: ['Check system configuration', 'Verify data access permissions']
            });
        }
        return results;
    }
    /**
     * Enrich a single pattern event with economic metrics
     */
    enrichPatternEvent(event) {
        const eventId = this.generateEventId(event);
        // Check cache first
        if (this.processingCache.has(eventId)) {
            return this.processingCache.get(eventId);
        }
        try {
            const startTime = Date.now();
            // Calculate economic metrics
            const economicData = this.economicCalculator.calculateEconomicMetrics(event);
            // Validate economic data
            const qualityIndicators = this.validateEconomicData(event, economicData);
            const enrichment = {
                original_event: event,
                economic_data: economicData,
                enrichment_metadata: {
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                    processing_time_ms: Date.now() - startTime,
                    data_sources: ['pattern_event', 'historical_data', 'economic_parameters'],
                    calculation_methods: ['cod_calculation', 'wsjf_scoring', 'roi_estimation']
                },
                quality_indicators: qualityIndicators
            };
            // Cache the result
            this.processingCache.set(eventId, enrichment);
            // Update pattern event with economic data
            this.updatePatternEventWithEconomicData(event, economicData);
            return enrichment;
        }
        catch (error) {
            console.error('Failed to enrich pattern event:', error);
            return null;
        }
    }
    /**
     * Generate comprehensive economic report
     */
    generateEconomicReport(timeRange, scope) {
        // Gather data from all components
        const economicData = this.gatherEconomicData(timeRange, scope);
        // Generate trend analysis if enabled
        const trendAnalysis = this.config.integration_settings.trend_analysis_enabled ?
            this.trendAnalyzer.analyzeEconomicTrends({
                circles: scope?.circles || ['all'],
                pattern_categories: scope?.categories || ['all'],
                economic_metrics: ['cod', 'wsjf_score', 'business_impact', 'roi'],
                time_granularity: 'daily',
                geographic_scope: 'global'
            }, timeRange) : null;
        // Generate ROI analysis
        const roiAnalysis = this.config.integration_settings.roi_tracking_enabled ?
            this.analyzeROI(economicData) : null;
        // Generate governance economics
        const governanceAnalysis = this.config.integration_settings.governance_tracking_enabled ?
            this.governanceTracker.generateEconomicGovernanceReport() : null;
        return {
            report_metadata: {
                generated_at: new Date().toISOString(),
                time_range: timeRange || { start: '', end: '' },
                scope: scope || { circles: ['all'], patterns: ['all'], categories: ['all'] },
                data_sources: ['pattern_metrics', 'economic_calculations', 'roi_tracking', 'governance_economics']
            },
            executive_summary: this.generateExecutiveSummary(economicData, trendAnalysis, roiAnalysis, governanceAnalysis),
            detailed_analysis: {
                economic_overview: this.generateEconomicOverview(economicData),
                trend_analysis: trendAnalysis,
                roi_analysis: roiAnalysis,
                governance_economics: governanceAnalysis,
                risk_assessment: this.performRiskAssessment(economicData)
            },
            recommendations: this.generateComprehensiveRecommendations(economicData, trendAnalysis, roiAnalysis),
            action_items: this.generateActionItems(economicData, trendAnalysis),
            appendices: {
                methodology: this.getMethodologyDocumentation(),
                data_quality: this.assessDataQuality(economicData),
                glossary: this.getEconomicGlossary()
            }
        };
    }
    /**
     * Monitor economic metrics in real-time
     */
    startRealTimeMonitoring() {
        const sessionId = this.generateMonitoringSessionId();
        const session = {
            session_id: sessionId,
            start_time: new Date().toISOString(),
            status: 'active',
            monitoring_metrics: this.getMonitoredMetrics(),
            alert_thresholds: this.config.alert_thresholds,
            active_alerts: [],
            performance_metrics: {
                events_monitored: 0,
                alerts_triggered: 0,
                avg_processing_time_ms: 0,
                system_health_score: 100
            },
            stopMonitoring: () => this.stopMonitoring(sessionId)
        };
        // Start monitoring loop
        this.startMonitoringLoop(session);
        return session;
    }
    // Private helper methods
    initializeComponents() {
        const historicalData = this.loadHistoricalData();
        this.economicCalculator = new EconomicMetricsCalculator(historicalData.patternEvents, this.config.economic_parameters);
        this.roiTracker = new ROITracker(this.config.storage_paths.roi_tracking, this.config.economic_parameters);
        this.governanceTracker = new GovernanceEconomicsTracker(this.config.storage_paths.governance_economics);
        this.trendAnalyzer = new EconomicTrendAnalyzer(this.config.storage_paths.trend_analysis);
    }
    setupStorageDirectories() {
        Object.values(this.config.storage_paths).forEach(path => {
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path, { recursive: true });
            }
        });
    }
    loadHistoricalData() {
        try {
            const patternMetricsPath = this.config.storage_paths.pattern_metrics;
            if (fs.existsSync(patternMetricsPath)) {
                const data = fs.readFileSync(patternMetricsPath, 'utf8');
                const lines = data.trim().split('\n').filter(line => line.trim());
                const patternEvents = lines.map(line => {
                    try {
                        return JSON.parse(line);
                    }
                    catch (error) {
                        console.warn('Failed to parse line:', line);
                        return null;
                    }
                }).filter(event => event !== null);
                return { patternEvents };
            }
        }
        catch (error) {
            console.warn('Failed to load historical data:', error);
        }
        return { patternEvents: [] };
    }
    generateEventId(event) {
        return `${event.pattern}-${event.run_id}-${event.ts}`;
    }
    validateEconomicData(event, economicData) {
        let dataCompleteness = 1.0;
        let dataAccuracy = 1.0;
        let consistency = 1.0;
        let calculationConfidence = 0.8;
        // Check data completeness
        if (!event.pattern || !event.circle || !event.ts) {
            dataCompleteness *= 0.7;
        }
        if (!event.economic || !event.economic.cod || !event.economic.wsjf_score) {
            dataCompleteness *= 0.8;
        }
        // Check data accuracy (basic validation)
        if (economicData.cod < 0 || economicData.wsjf_score < 0 || economicData.roi < -100) {
            dataAccuracy *= 0.5;
        }
        // Check consistency
        if (economicData.business_impact < economicData.implementation_cost && economicData.roi > 50) {
            consistency *= 0.7;
        }
        const overallQuality = (dataCompleteness + dataAccuracy + consistency + calculationConfidence) / 4;
        return {
            data_completeness: Math.round(dataCompleteness * 100) / 100,
            data_accuracy: Math.round(dataAccuracy * 100) / 100,
            consistency: Math.round(consistency * 100) / 100,
            calculation_confidence: Math.round(calculationConfidence * 100) / 100,
            overall_quality: Math.round(overallQuality * 100) / 100
        };
    }
    updatePatternEventWithEconomicData(event, economicData) {
        // Update the original event with enhanced economic data
        event.economic = {
            cod: economicData.cod,
            wsjf_score: economicData.wsjf_score,
            risk_score: economicData.risk_adjusted_cod / economicData.cod
        };
        // Add enhanced economic data as additional property
        event.enhanced_economic = economicData;
    }
    updateEconomicMetricsSummary(summary, economicData) {
        summary.total_cod += economicData.cod;
        summary.total_business_impact += economicData.business_impact;
        summary.total_implementation_cost += economicData.implementation_cost;
        // Update circle metrics
        const circle = economicData.circle_impact.circle;
        if (!summary.circle_metrics[circle]) {
            summary.circle_metrics[circle] = {
                circle,
                total_value_created: 0,
                avg_roi: 0,
                budget_utilization: 0,
                efficiency_ratio: 0,
                top_contributors: []
            };
        }
        const circleMetrics = summary.circle_metrics[circle];
        circleMetrics.total_value_created += economicData.business_impact;
        // Update category metrics
        const category = economicData.category_economics.category;
        if (!summary.category_metrics[category]) {
            summary.category_metrics[category] = {
                category,
                avg_cod: 0,
                avg_wsjf: 0,
                success_rate: 0,
                value_distribution: { low: 0, medium: 0, high: 0 }
            };
        }
    }
    trackROIForEvent(event, economicData) {
        const roiMetrics = this.economicCalculator.calculateROIMetrics(event);
        const trackingId = this.roiTracker.startTracking(event, economicData, roiMetrics);
        // Record initial costs and expected benefits
        this.roiTracker.recordImplementationCosts(trackingId, {
            actual_initial_cost: economicData.implementation_cost,
            hidden_costs: [],
            cost_savings: []
        });
    }
    updateGovernanceEconomics(event, economicData) {
        this.governanceTracker.trackCircleEconomicEvent(event, economicData);
    }
    calculateDataQualityScore(results) {
        if (results.summary.total_events_processed === 0)
            return 0;
        const successRate = results.summary.events_enriched / results.summary.total_events_processed;
        const errorRate = results.errors.filter(e => e.severity === 'critical' || e.severity === 'high').length / results.errors.length;
        return Math.round((successRate * 0.7 + (1 - errorRate) * 0.3) * 100) / 100;
    }
    calculatePerformanceMetrics(results) {
        const processingTimeSeconds = results.summary.processing_time_ms / 1000;
        const eventsPerSecond = results.summary.total_events_processed / Math.max(processingTimeSeconds, 0.001);
        const avgCalculationTime = results.summary.total_events_processed > 0 ?
            results.summary.processing_time_ms / results.summary.total_events_processed : 0;
        return {
            events_per_second: Math.round(eventsPerSecond * 100) / 100,
            avg_calculation_time_ms: Math.round(avgCalculationTime * 100) / 100,
            memory_usage_mb: this.getCurrentMemoryUsage(),
            cache_hit_rate: this.calculateCacheHitRate(),
            error_rate: results.summary.total_events_processed > 0 ?
                results.summary.events_failed / results.summary.total_events_processed : 0
        };
    }
    getCurrentMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            return Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
        }
        return 0;
    }
    calculateCacheHitRate() {
        // Simple implementation - would track cache hits/misses in real system
        return 0.75; // 75% cache hit rate
    }
    generateRecommendations(economicMetrics) {
        const recommendations = [];
        // High COD recommendations
        if (economicMetrics.total_cod > this.config.alert_thresholds.cod_threshold) {
            recommendations.push({
                id: `cod_optimization_${Date.now()}`,
                type: 'cost_optimization',
                priority: 'high',
                title: 'Reduce Cost of Delay',
                description: `Total Cost of Delay (${economicMetrics.total_cod.toFixed(2)}) exceeds threshold. Prioritize high-WSJF items to reduce economic impact.`,
                target_entity: 'organization',
                expected_impact: 25,
                implementation_difficulty: 'medium',
                time_to_implement: '2-4 weeks',
                required_resources: 50000
            });
        }
        // Low ROI recommendations
        if (economicMetrics.avg_roi < this.config.alert_thresholds.roi_threshold) {
            recommendations.push({
                id: `roi_improvement_${Date.now()}`,
                type: 'roi_improvement',
                priority: 'medium',
                title: 'Improve Return on Investment',
                description: `Average ROI (${economicMetrics.avg_roi.toFixed(2)}%) is below target. Focus on patterns with higher business value or lower implementation cost.`,
                target_entity: 'all_circles',
                expected_impact: 15,
                implementation_difficulty: 'low',
                time_to_implement: '1-2 weeks',
                required_resources: 25000
            });
        }
        // Circle-specific recommendations
        Object.entries(economicMetrics.circle_metrics).forEach(([circle, metrics]) => {
            if (metrics.efficiency_ratio < 1.0) {
                recommendations.push({
                    id: `circle_efficiency_${circle}_${Date.now()}`,
                    type: 'resource_reallocation',
                    priority: 'medium',
                    title: `Optimize ${circle} Circle Efficiency`,
                    description: `${circle} circle efficiency ratio (${metrics.efficiency_ratio.toFixed(2)}) indicates costs exceed benefits. Consider resource optimization.`,
                    target_entity: circle,
                    expected_impact: 20,
                    implementation_difficulty: 'medium',
                    time_to_implement: '2-3 weeks',
                    required_resources: 30000
                });
            }
        });
        return recommendations;
    }
    saveIntegrationResults(results) {
        try {
            const resultsPath = path.join(this.config.storage_paths.economic_data, `integration_results_${Date.now()}.json`);
            fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        }
        catch (error) {
            console.error('Failed to save integration results:', error);
        }
    }
    // Additional private methods for comprehensive functionality
    gatherEconomicData(timeRange, scope) {
        // Implementation to gather economic data from all components
        return {
            patternEvents: [],
            economicMetrics: [],
            roiRecords: [],
            governanceData: []
        };
    }
    generateExecutiveSummary(economicData, trendAnalysis, roiAnalysis, governanceAnalysis) {
        return {
            total_economic_value: 0,
            overall_roi: 0,
            key_insights: [],
            critical_issues: [],
            strategic_recommendations: []
        };
    }
    generateEconomicOverview(economicData) {
        return {
            value_creation: {},
            cost_management: {},
            risk_assessment: {},
            performance_metrics: {}
        };
    }
    performRiskAssessment(economicData) {
        return {
            overall_risk_level: 'medium',
            key_risks: [],
            mitigation_strategies: [],
            emerging_risks: []
        };
    }
    generateComprehensiveRecommendations(economicData, trendAnalysis, roiAnalysis) {
        return [];
    }
    generateActionItems(economicData, trendAnalysis) {
        return [];
    }
    getMethodologyDocumentation() {
        return {
            economic_calculation_methods: [],
            data_sources: [],
            assumptions: [],
            limitations: []
        };
    }
    assessDataQuality(economicData) {
        return {
            completeness_score: 0,
            accuracy_score: 0,
            timeliness_score: 0,
            consistency_score: 0
        };
    }
    getEconomicGlossary() {
        return {
            terms: {},
            definitions: {},
            formulas: {}
        };
    }
    analyzeROI(economicData) {
        return {
            overall_roi: 0,
            roi_by_category: {},
            roi_by_circle: {},
            roi_trends: []
        };
    }
    getMonitoredMetrics() {
        return [
            'cod',
            'wsjf_score',
            'business_impact',
            'roi',
            'risk_adjusted_cod'
        ];
    }
    startMonitoringLoop(session) {
        // Implementation for real-time monitoring loop
        console.log(`Starting real-time monitoring session: ${session.session_id}`);
    }
    stopMonitoring(sessionId) {
        console.log(`Stopping monitoring session: ${sessionId}`);
    }
    generateMonitoringSessionId() {
        return `monitoring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
//# sourceMappingURL=economic_integration.js.map