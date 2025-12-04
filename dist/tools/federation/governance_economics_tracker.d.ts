/**
 * Governance Economics Tracker
 *
 * Provides comprehensive economic analysis and tracking across governance circles including:
 * - Circle-specific economic performance metrics
 * - Cross-circle collaboration economics
 * - Economic efficiency and resource allocation analysis
 * - Circle value contribution and cost attribution
 * - Economic governance and budget optimization
 */
import type { PatternEvent } from './shared_utils.js';
import type { EnhancedEconomicData } from './economic_metrics_calculator.js';
import type { ROITrackingRecord } from './roi_tracker.js';
export interface CircleEconomicProfile {
    /** Circle name */
    circle: string;
    /** Economic responsibilities */
    responsibilities: CircleResponsibilities;
    /** Resource allocation */
    resource_allocation: ResourceAllocation;
    /** Economic performance metrics */
    performance: CirclePerformance;
    /** Collaboration economics */
    collaboration: CollaborationEconomics;
    /** Budget and financials */
    financials: CircleFinancials;
    /** Economic governance policies */
    governance: CircleGovernance;
    /** Historical economic data */
    historical: CircleHistoricalData;
    /** Future economic projections */
    projections: CircleProjections;
}
export interface CircleResponsibilities {
    /** Primary economic responsibilities */
    primary_responsibilities: string[];
    /** Secondary economic responsibilities */
    secondary_responsibilities: string[];
    /** Economic decision authority level */
    decision_authority: 'full' | 'partial' | 'advisory' | 'none';
    /** Budgetary control scope */
    budget_control: 'full' | 'partial' | 'advisory' | 'none';
    /** Economic impact scope */
    impact_scope: 'organization' | 'department' | 'team' | 'individual';
    /** Stakeholder responsibilities */
    stakeholder_responsibilities: StakeholderResponsibility[];
}
export interface StakeholderResponsibility {
    /** Stakeholder group */
    stakeholder_group: string;
    /** Type of responsibility */
    responsibility_type: 'financial' | 'operational' | 'strategic' | 'compliance';
    /** Responsibility level */
    level: 'primary' | 'secondary' | 'supporting';
    /** Economic metrics accountable for */
    accountable_metrics: string[];
    /** Reporting frequency */
    reporting_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}
export interface ResourceAllocation {
    /** Allocated budget */
    allocated_budget: number;
    /** Budget utilization percentage */
    budget_utilization: number;
    /** Resource distribution by category */
    resource_distribution: ResourceDistribution[];
    /** Human resource allocation */
    human_resources: HumanResourceAllocation;
    /** Technology resource allocation */
    technology_resources: TechnologyResourceAllocation;
    /** External resource allocation */
    external_resources: ExternalResourceAllocation;
    /** Resource efficiency metrics */
    efficiency: ResourceEfficiency;
}
export interface ResourceDistribution {
    /** Resource category */
    category: 'personnel' | 'technology' | 'infrastructure' | 'training' | 'consulting' | 'tools';
    /** Allocated amount */
    allocated_amount: number;
    /** Utilized amount */
    utilized_amount: number;
    /** Efficiency ratio */
    efficiency_ratio: number;
    /** ROI on resource */
    roi: number;
    /** Notes or comments */
    notes?: string;
}
export interface HumanResourceAllocation {
    /** Total FTE allocated */
    total_fte: number;
    /** FTE utilization */
    fte_utilization: number;
    /** Skill distribution */
    skill_distribution: SkillDistribution[];
    /** Cost per FTE */
    cost_per_fte: number;
    /** Productivity metrics */
    productivity: ProductivityMetrics;
}
export interface SkillDistribution {
    /** Skill category */
    skill: string;
    /** Number of people with skill */
    count: number;
    /** Skill level average */
    average_level: number;
    /** Economic value per skill */
    economic_value: number;
    /** Utilization rate */
    utilization_rate: number;
}
export interface ProductivityMetrics {
    /** Output per FTE */
    output_per_fte: number;
    /** Economic value per FTE */
    economic_value_per_fte: number;
    /** Efficiency trend */
    efficiency_trend: 'improving' | 'stable' | 'declining';
    /** Benchmark comparison */
    benchmark_comparison: number;
}
export interface TechnologyResourceAllocation {
    /** Software tools budget */
    software_budget: number;
    /** Infrastructure budget */
    infrastructure_budget: number;
    /** Tool utilization rates */
    tool_utilization: Record<string, number>;
    /** Technology ROI metrics */
    technology_roi: Record<string, number>;
    /** Digital transformation impact */
    digital_transformation_impact: number;
}
export interface ExternalResourceAllocation {
    /** Consultant budget */
    consultant_budget: number;
    /** Vendor services budget */
    vendor_budget: number;
    /** Training budget */
    training_budget: number;
    /** External ROI metrics */
    external_roi: number;
    /** Knowledge transfer effectiveness */
    knowledge_transfer_effectiveness: number;
}
export interface ResourceEfficiency {
    /** Overall efficiency score */
    overall_efficiency: number;
    /** Cost efficiency */
    cost_efficiency: number;
    /** Time efficiency */
    time_efficiency: number;
    /** Quality efficiency */
    quality_efficiency: number;
    /** Innovation efficiency */
    innovation_efficiency: number;
    /** Efficiency trends */
    efficiency_trends: EfficiencyTrend[];
}
export interface EfficiencyTrend {
    /** Metric name */
    metric: string;
    /** Trend direction */
    direction: 'improving' | 'stable' | 'declining';
    /** Trend percentage */
    change_percentage: number;
    /** Time period */
    period: string;
}
export interface CirclePerformance {
    /** Key economic performance indicators */
    kpis: CircleKPIs;
    /** Economic value generated */
    value_generated: ValueGenerated;
    /** Cost optimization achieved */
    cost_optimization: CostOptimization;
    /** Risk economic impact */
    risk_economic_impact: RiskEconomicImpact;
    /** Innovation economic contribution */
    innovation_contribution: InnovationContribution;
    /** Performance targets and achievements */
    targets: PerformanceTargets;
}
export interface CircleKPIs {
    /** Economic value created */
    economic_value_created: number;
    /** Cost savings achieved */
    cost_savings_achieved: number;
    /** ROI on investments */
    roi_on_investments: number;
    /** Budget adherence percentage */
    budget_adherence: number;
    /** Resource utilization efficiency */
    resource_utilization_efficiency: number;
    /** Economic decision quality */
    economic_decision_quality: number;
    /** Stakeholder economic satisfaction */
    stakeholder_economic_satisfaction: number;
}
export interface ValueGenerated {
    /** Direct economic value */
    direct_value: number;
    /** Indirect economic value */
    indirect_value: number;
    /** Intangible economic value */
    intangible_value: number;
    /** Value by category */
    value_by_category: Record<string, number>;
    /** Value trends over time */
    value_trends: ValueTrend[];
    /** Value attribution methods */
    attribution_methods: AttributionMethod[];
}
export interface ValueTrend {
    /** Time period */
    period: string;
    /** Value amount */
    value: number;
    /** Growth rate */
    growth_rate: number;
    /** Contributing factors */
    contributing_factors: string[];
}
export interface AttributionMethod {
    /** Method name */
    method: string;
    /** Description */
    description: string;
    /** Accuracy score */
    accuracy_score: number;
    /** Usage frequency */
    usage_frequency: number;
}
export interface CostOptimization {
    /** Total cost savings */
    total_savings: number;
    /** Cost avoidance */
    cost_avoidance: number;
    /** Process optimization savings */
    process_optimization_savings: number;
    /** Technology optimization savings */
    technology_optimization_savings: number;
    /** Resource optimization savings */
    resource_optimization_savings: number;
    /** Optimization initiatives */
    optimization_initiatives: OptimizationInitiative[];
}
export interface OptimizationInitiative {
    /** Initiative name */
    name: string;
    /** Cost savings */
    cost_savings: number;
    /** Implementation cost */
    implementation_cost: number;
    /** ROI */
    roi: number;
    /** Timeline */
    timeline: string;
    /** Status */
    status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
}
export interface RiskEconomicImpact {
    /** Risk exposure in monetary terms */
    risk_exposure: number;
    /** Risk mitigation costs */
    mitigation_costs: number;
    /** Expected loss without mitigation */
    expected_loss: number;
    /** Risk-adjusted economic value */
    risk_adjusted_value: number;
    /** Risk categories and impacts */
    risk_categories: RiskCategory[];
    /** Risk mitigation effectiveness */
    mitigation_effectiveness: number;
}
export interface RiskCategory {
    /** Category name */
    category: string;
    /** Economic impact */
    economic_impact: number;
    /** Probability */
    probability: number;
    /** Risk score */
    risk_score: number;
    /** Mitigation strategies */
    mitigation_strategies: string[];
}
export interface InnovationContribution {
    /** Innovation economic value */
    innovation_value: number;
    /** Number of innovations */
    innovation_count: number;
    /** Innovation ROI */
    innovation_roi: number;
    /** Innovation success rate */
    success_rate: number;
    /** Innovation types and values */
    innovation_types: Record<string, number>;
    /** Future innovation pipeline value */
    pipeline_value: number;
}
export interface PerformanceTargets {
    /** Current period targets */
    current_targets: PerformanceTarget[];
    /** Achievement history */
    achievement_history: AchievementRecord[];
    /** Target accuracy */
    target_accuracy: number;
    /** Stretch goals */
    stretch_goals: PerformanceTarget[];
}
export interface PerformanceTarget {
    /** Target name */
    name: string;
    /** Target value */
    target_value: number;
    /** Current value */
    current_value: number;
    /** Achievement percentage */
    achievement_percentage: number;
    /** Target deadline */
    deadline: string;
    /** Priority level */
    priority: 'low' | 'medium' | 'high' | 'critical';
}
export interface AchievementRecord {
    /** Target name */
    target_name: string;
    /** Target value */
    target_value: number;
    /** Actual achieved value */
    actual_value: number;
    /** Achievement date */
    achievement_date: string;
    /** Achievement percentage */
    achievement_percentage: number;
    /** Factors affecting achievement */
    affecting_factors: string[];
}
export interface CollaborationEconomics {
    /** Cross-circle economic relationships */
    economic_relationships: EconomicRelationship[];
    /** Shared economic initiatives */
    shared_initiatives: SharedInitiative[];
    /** Economic interdependencies */
    interdependencies: EconomicInterdependency[];
    /** Collaboration ROI */
    collaboration_roi: number;
    /** Synergy value */
    synergy_value: number;
    /** Collaboration efficiency metrics */
    collaboration_efficiency: CollaborationEfficiency;
}
export interface EconomicRelationship {
    /** Partner circle */
    partner_circle: string;
    /** Relationship type */
    relationship_type: 'supplier' | 'customer' | 'partner' | 'collaborator';
    /** Economic value exchanged */
    economic_value_exchanged: number;
    /** Value flow direction */
    value_flow: 'inbound' | 'outbound' | 'bidirectional';
    /** Relationship strength */
    relationship_strength: number;
    /** Economic dependencies */
    dependencies: string[];
}
export interface SharedInitiative {
    /** Initiative name */
    name: string;
    /** Participating circles */
    participating_circles: string[];
    /** Total economic value */
    total_value: number;
    /** Circle contributions */
    circle_contributions: Record<string, number>;
    /** Initiative ROI */
    initiative_roi: number;
    /** Status */
    status: 'planning' | 'active' | 'completed' | 'cancelled';
}
export interface EconomicInterdependency {
    /** Dependent circle */
    dependent_circle: string;
    /** Dependency type */
    dependency_type: 'resource' | 'information' | 'decision' | 'output';
    /** Economic impact of dependency */
    economic_impact: number;
    /** Dependency strength */
    dependency_strength: number;
    /** Risk level */
    risk_level: 'low' | 'medium' | 'high';
    /** Mitigation strategies */
    mitigation_strategies: string[];
}
export interface CollaborationEfficiency {
    /** Overall collaboration efficiency */
    overall_efficiency: number;
    /** Communication efficiency */
    communication_efficiency: number;
    /** Decision-making efficiency */
    decision_making_efficiency: number;
    /** Resource sharing efficiency */
    resource_sharing_efficiency: number;
    /** Knowledge sharing efficiency */
    knowledge_sharing_efficiency: number;
    /** Collaboration cost savings */
    collaboration_cost_savings: number;
}
export interface CircleFinancials {
    /** Budget allocation */
    budget_allocation: BudgetAllocation;
    /** Expenditure tracking */
    expenditure_tracking: ExpenditureTracking;
    /** Revenue generation (if applicable) */
    revenue_generation: RevenueGeneration;
    /** Financial health indicators */
    financial_health: FinancialHealth;
    /** Cost center analysis */
    cost_center_analysis: CostCenterAnalysis;
    /** Financial forecasting */
    financial_forecasting: FinancialForecasting;
}
export interface BudgetAllocation {
    /** Total allocated budget */
    total_allocated: number;
    /** Budget by category */
    budget_by_category: Record<string, number>;
    /** Budget by quarter */
    budget_by_quarter: Record<string, number>;
    /** Budget approval status */
    approval_status: 'pending' | 'approved' | 'rejected' | 'modified';
    /** Budget constraints and limitations */
    constraints: BudgetConstraint[];
}
export interface BudgetConstraint {
    /** Constraint type */
    type: 'spending_limit' | 'timing_restriction' | 'approval_required' | 'category_limit';
    /** Constraint value */
    value: number;
    /** Constraint description */
    description: string;
    /** Impact level */
    impact_level: 'low' | 'medium' | 'high';
    /** Flexibility */
    flexibility: 'fixed' | 'flexible' | 'negotiable';
}
export interface ExpenditureTracking {
    /** Total expenditures */
    total_expenditure: number;
    /** Expenditure by category */
    expenditure_by_category: Record<string, number>;
    /** Expenditure trends */
    expenditure_trends: ExpenditureTrend[];
    /** Budget variance analysis */
    budget_variance: BudgetVariance;
    /** Cost optimization opportunities */
    optimization_opportunities: CostOptimization[];
}
export interface ExpenditureTrend {
    /** Time period */
    period: string;
    /** Expenditure amount */
    amount: number;
    /** Variance from budget */
    budget_variance: number;
    /** Variance percentage */
    variance_percentage: number;
    /** Explanation of variance */
    variance_explanation: string;
}
export interface BudgetVariance {
    /** Total variance amount */
    total_variance: number;
    /** Variance percentage */
    variance_percentage: number;
    /** Favorable variance */
    favorable_variance: number;
    /** Unfavorable variance */
    unfavorable_variance: number;
    /** Variance explanations */
    variance_explanations: VarianceExplanation[];
}
export interface VarianceExplanation {
    /** Category */
    category: string;
    /** Variance amount */
    variance_amount: number;
    /** Root cause */
    root_cause: string;
    /** Corrective actions */
    corrective_actions: string[];
    /** Preventive measures */
    preventive_measures: string[];
}
export interface RevenueGeneration {
    /** Total revenue generated */
    total_revenue: number;
    /** Revenue by source */
    revenue_by_source: Record<string, number>;
    /** Revenue trends */
    revenue_trends: RevenueTrend[];
    /** Revenue growth rate */
    growth_rate: number;
    /** Revenue efficiency metrics */
    efficiency_metrics: RevenueEfficiency[];
}
export interface RevenueTrend {
    /** Time period */
    period: string;
    /** Revenue amount */
    revenue: number;
    /** Growth rate */
    growth_rate: number;
    /** Contributing factors */
    contributing_factors: string[];
}
export interface RevenueEfficiency {
    /** Metric name */
    metric: string;
    /** Efficiency value */
    value: number;
    /** Industry benchmark */
    benchmark: number;
    /** Performance rating */
    performance_rating: 'excellent' | 'good' | 'average' | 'poor';
}
export interface FinancialHealth {
    /** Overall health score */
    health_score: number;
    /** Financial ratios */
    financial_ratios: FinancialRatio[];
    /** Cash flow health */
    cash_flow_health: CashFlowHealth;
    /** Economic sustainability */
    sustainability: SustainabilityMetrics;
    /** Financial risks */
    financial_risks: FinancialRisk[];
}
export interface FinancialRatio {
    /** Ratio name */
    name: string;
    /** Current value */
    current_value: number;
    /** Target value */
    target_value: number;
    /** Industry average */
    industry_average: number;
    /** Trend direction */
    trend: 'improving' | 'stable' | 'declining';
    /** Significance */
    significance: 'high' | 'medium' | 'low';
}
export interface CashFlowHealth {
    /** Cash flow status */
    status: 'healthy' | 'adequate' | 'strained' | 'critical';
    /** Cash flow amount */
    cash_flow_amount: number;
    /** Cash flow forecast */
    forecast: number;
    /** Working capital efficiency */
    working_capital_efficiency: number;
    /** Liquidity ratio */
    liquidity_ratio: number;
}
export interface SustainabilityMetrics {
    /** Economic sustainability score */
    economic_sustainability: number;
    /** Resource sustainability score */
    resource_sustainability: number;
    /** Environmental sustainability score */
    environmental_sustainability: number;
    /** Social sustainability score */
    social_sustainability: number;
    /** Long-term viability score */
    long_term_viability: number;
}
export interface FinancialRisk {
    /** Risk category */
    category: 'budget_overrun' | 'revenue_shortfall' | 'cost_inflation' | 'resource_shortage';
    /** Risk probability */
    probability: number;
    /** Economic impact */
    economic_impact: number;
    /** Risk score */
    risk_score: number;
    /** Mitigation strategies */
    mitigation_strategies: string[];
    /** Monitoring frequency */
    monitoring_frequency: 'daily' | 'weekly' | 'monthly';
}
export interface CostCenterAnalysis {
    /** Cost center name */
    cost_center_name: string;
    /** Total costs */
    total_costs: number;
    /** Cost drivers */
    cost_drivers: CostDriver[];
    /** Cost efficiency metrics */
    efficiency_metrics: CostEfficiencyMetric[];
    /** Cost optimization potential */
    optimization_potential: number;
    /** Benchmarking results */
    benchmarking: BenchmarkingResult[];
}
export interface CostDriver {
    /** Driver name */
    name: string;
    /** Driver amount */
    amount: number;
    /** Driver percentage of total */
    percentage_of_total: number;
    /** Controllability */
    controllability: 'high' | 'medium' | 'low';
    /** Trend direction */
    trend: 'increasing' | 'stable' | 'decreasing';
}
export interface CostEfficiencyMetric {
    /** Metric name */
    name: string;
    /** Current value */
    current_value: number;
    /** Target value */
    target_value: number;
    /** Efficiency rating */
    efficiency_rating: 'excellent' | 'good' | 'average' | 'poor';
    /** Improvement recommendations */
    improvement_recommendations: string[];
}
export interface BenchmarkingResult {
    /** Metric name */
    metric: string;
    /** Current performance */
    current_performance: number;
    /** Industry benchmark */
    industry_benchmark: number;
    /** Performance gap */
    performance_gap: number;
    /** Competitive position */
    competitive_position: 'leader' | 'above_average' | 'average' | 'below_average';
}
export interface FinancialForecasting {
    /** Forecast period */
    forecast_period: string;
    /** Forecasted revenue */
    forecasted_revenue: number;
    /** Forecasted costs */
    forecasted_costs: number;
    /** Forecasted profit/loss */
    forecasted_profit_loss: number;
    /** Forecast assumptions */
    assumptions: ForecastAssumption[];
    /** Confidence level */
    confidence_level: number;
    /** Scenario analysis */
    scenario_analysis: ScenarioAnalysis[];
}
export interface ForecastAssumption {
    /** Assumption name */
    name: string;
    /** Assumption value */
    value: number;
    /** Assumption justification */
    justification: string;
    /** Sensitivity level */
    sensitivity_level: 'high' | 'medium' | 'low';
    /** Alternative scenarios */
    alternative_scenarios: number[];
}
export interface ScenarioAnalysis {
    /** Scenario name */
    name: string;
    /** Scenario probability */
    probability: number;
    /** Economic outcome */
    economic_outcome: number;
    /** Key drivers */
    key_drivers: string[];
    /** Risk factors */
    risk_factors: string[];
}
export interface CircleGovernance {
    /** Economic decision-making process */
    decision_making: EconomicDecisionMaking;
    /** Financial controls */
    financial_controls: FinancialControl[];
    /** Economic compliance requirements */
    compliance: ComplianceRequirement[];
    /** Performance monitoring */
    performance_monitoring: PerformanceMonitoring;
    /** Governance effectiveness */
    governance_effectiveness: GovernanceEffectiveness;
}
export interface EconomicDecisionMaking {
    /** Decision authority levels */
    authority_levels: AuthorityLevel[];
    /** Decision approval process */
    approval_process: ApprovalProcess;
    /** Economic decision criteria */
    decision_criteria: DecisionCriteria[];
    /** Decision tracking system */
    tracking_system: DecisionTrackingSystem;
    /** Decision quality metrics */
    quality_metrics: DecisionQualityMetric[];
}
export interface AuthorityLevel {
    /** Level name */
    level: string;
    /** Monetary authority limit */
    monetary_limit: number;
    /** Types of decisions authorized */
    authorized_decisions: string[];
    /** Approval requirements */
    approval_requirements: string[];
    /** Escalation triggers */
    escalation_triggers: string[];
}
export interface ApprovalProcess {
    /** Process name */
    name: string;
    /** Process steps */
    steps: ProcessStep[];
    /** Required approvers */
    required_approvers: string[];
    /** Approval timeline */
    timeline: number;
    /** Compliance checks */
    compliance_checks: string[];
}
export interface ProcessStep {
    /** Step name */
    name: string;
    /** Step description */
    description: string;
    /** Responsible party */
    responsible_party: string;
    /** Step duration */
    duration: number;
    /** Required inputs */
    required_inputs: string[];
    /** Expected outputs */
    expected_outputs: string[];
}
export interface DecisionCriteria {
    /** Criterion name */
    name: string;
    /** Criterion weight */
    weight: number;
    /** Measurement method */
    measurement_method: string;
    /** Target value */
    target_value: number;
    /** Minimum acceptable value */
    minimum_acceptable: number;
}
export interface DecisionTrackingSystem {
    /** System type */
    system_type: 'manual' | 'automated' | 'hybrid';
    /** Tracking metrics */
    tracking_metrics: string[];
    /** Reporting frequency */
    reporting_frequency: string;
    /** Data quality measures */
    data_quality_measures: string[];
    /** Integration points */
    integration_points: string[];
}
export interface DecisionQualityMetric {
    /** Metric name */
    name: string;
    /** Current score */
    current_score: number;
    /** Target score */
    target_score: number;
    /** Trend direction */
    trend: 'improving' | 'stable' | 'declining';
    /** Improvement actions */
    improvement_actions: string[];
}
export interface FinancialControl {
    /** Control name */
    name: string;
    /** Control type */
    type: 'preventive' | 'detective' | 'corrective';
    /** Control objective */
    objective: string;
    /** Control activities */
    activities: string[];
    /** Control frequency */
    frequency: string;
    /** Effectiveness rating */
    effectiveness: 'high' | 'medium' | 'low';
}
export interface ComplianceRequirement {
    /** Requirement name */
    name: string;
    /** Requirement type */
    type: 'regulatory' | 'policy' | 'procedure' | 'standard';
    /** Compliance authority */
    authority: string;
    /** Economic impact of non-compliance */
    economic_impact: number;
    /** Current compliance status */
    compliance_status: 'compliant' | 'non-compliant' | 'partial';
    /** Remediation plan */
    remediation_plan: string[];
}
export interface PerformanceMonitoring {
    /** Monitoring frequency */
    monitoring_frequency: string;
    /** Key performance indicators */
    key_performance_indicators: string[];
    /** Performance thresholds */
    performance_thresholds: PerformanceThreshold[];
    /** Alert mechanisms */
    alert_mechanisms: AlertMechanism[];
    /** Review processes */
    review_processes: ReviewProcess[];
}
export interface PerformanceThreshold {
    /** Indicator name */
    indicator: string;
    /** Warning threshold */
    warning_threshold: number;
    /** Critical threshold */
    critical_threshold: number;
    /** Threshold actions */
    threshold_actions: ThresholdAction[];
}
export interface ThresholdAction {
    /** Threshold level */
    level: 'warning' | 'critical';
    /** Action description */
    action: string;
    /** Responsible party */
    responsible_party: string;
    /** Action timeline */
    timeline: string;
}
export interface AlertMechanism {
    /** Alert type */
    type: 'email' | 'dashboard' | 'sms' | 'system_notification';
    /** Alert conditions */
    conditions: string[];
    /** Alert recipients */
    recipients: string[];
    /** Escalation rules */
    escalation_rules: EscalationRule[];
}
export interface EscalationRule {
    /** Condition for escalation */
    condition: string;
    /** Escalation level */
    escalation_level: string;
    /** Escalation recipients */
    recipients: string[];
    /** Escalation timeline */
    timeline: string;
}
export interface ReviewProcess {
    /** Review name */
    name: string;
    /** Review frequency */
    frequency: string;
    /** Review participants */
    participants: string[];
    /** Review scope */
    scope: string[];
    /** Review outcomes */
    outcomes: string[];
}
export interface GovernanceEffectiveness {
    /** Overall effectiveness score */
    overall_effectiveness: number;
    /** Decision-making effectiveness */
    decision_making_effectiveness: number;
    /** Control effectiveness */
    control_effectiveness: number;
    /** Compliance effectiveness */
    compliance_effectiveness: number;
    /** Performance monitoring effectiveness */
    monitoring_effectiveness: number;
    /** Improvement recommendations */
    improvement_recommendations: GovernanceImprovement[];
}
export interface GovernanceImprovement {
    /** Improvement area */
    area: string;
    /** Current performance */
    current_performance: number;
    /** Target performance */
    target_performance: number;
    /** Improvement actions */
    actions: string[];
    /** Expected impact */
    expected_impact: number;
    /** Implementation timeline */
    timeline: string;
}
export interface CircleHistoricalData {
    /** Historical economic performance */
    economic_performance: HistoricalEconomicPerformance[];
    /** Budget history */
    budget_history: BudgetHistory[];
    /** Decision history */
    decision_history: DecisionHistory[];
    /** Performance trends */
    performance_trends: PerformanceTrend[];
    /** Lessons learned */
    lessons_learned: LessonLearned[];
}
export interface HistoricalEconomicPerformance {
    /** Time period */
    period: string;
    /** Economic value created */
    value_created: number;
    /** Costs incurred */
    costs_incurred: number;
    /** Net economic result */
    net_result: number;
    /** ROI achieved */
    roi_achieved: number;
    /** Key events */
    key_events: string[];
}
export interface BudgetHistory {
    /** Fiscal period */
    fiscal_period: string;
    /** Budget allocated */
    budget_allocated: number;
    /** Budget spent */
    budget_spent: number;
    /** Budget variance */
    budget_variance: number;
    /** Variance explanation */
    variance_explanation: string;
}
export interface DecisionHistory {
    /** Decision ID */
    decision_id: string;
    /** Decision date */
    decision_date: string;
    /** Decision description */
    description: string;
    /** Economic impact */
    economic_impact: number;
    /** Actual vs projected impact */
    actual_vs_projected: number;
    /** Lessons learned */
    lessons_learned: string[];
}
export interface PerformanceTrend {
    /** Metric name */
    metric: string;
    /** Trend data points */
    data_points: TrendDataPoint[];
    /** Trend direction */
    trend_direction: 'increasing' | 'decreasing' | 'stable';
    /** Trend strength */
    trend_strength: number;
    /** Seasonal patterns */
    seasonal_patterns: SeasonalPattern[];
}
export interface TrendDataPoint {
    /** Timestamp */
    timestamp: string;
    /** Value */
    value: number;
    /** Contextual factors */
    contextual_factors: string[];
}
export interface SeasonalPattern {
    /** Pattern name */
    name: string;
    /** Pattern description */
    description: string;
    /** Period of occurrence */
    period: string;
    /** Pattern strength */
    strength: number;
    /** Predictive reliability */
    predictive_reliability: number;
}
export interface LessonLearned {
    /** Lesson title */
    title: string;
    /** Lesson category */
    category: 'success' | 'failure' | 'improvement' | 'insight';
    /** Lesson description */
    description: string;
    /** Economic impact */
    economic_impact: number;
    /** Applicable contexts */
    applicable_contexts: string[];
    /** Preventive or reinforcing actions */
    actions: string[];
}
export interface CircleProjections {
    /** Short-term projections (3 months) */
    short_term: EconomicProjection;
    /** Medium-term projections (1 year) */
    medium_term: EconomicProjection;
    /** Long-term projections (3 years) */
    long_term: EconomicProjection;
    /** Projection assumptions */
    assumptions: ProjectionAssumption[];
    /** Risk factors affecting projections */
    risk_factors: ProjectionRisk[];
    /** Scenario planning */
    scenarios: ProjectionScenario[];
}
export interface EconomicProjection {
    /** Projection period */
    period: string;
    /** Projected economic value */
    projected_value: number;
    /** Projected costs */
    projected_costs: number;
    /** Projected ROI */
    projected_roi: number;
    /** Confidence level */
    confidence_level: number;
    /** Key drivers */
    key_drivers: string[];
    /** Projection methodology */
    methodology: string;
}
export interface ProjectionAssumption {
    /** Assumption name */
    name: string;
    /** Assumption value */
    value: number;
    /** Assumption basis */
    basis: string;
    /** Sensitivity analysis */
    sensitivity_analysis: SensitivityAnalysis[];
    /** Alternative scenarios */
    alternative_scenarios: AlternativeScenario[];
}
export interface ProjectionRisk {
    /** Risk description */
    description: string;
    /** Risk probability */
    probability: number;
    /** Economic impact */
    economic_impact: number;
    /** Risk mitigation */
    mitigation: string[];
    /** Contingency plans */
    contingency_plans: string[];
}
export interface ProjectionScenario {
    /** Scenario name */
    name: string;
    /** Scenario probability */
    probability: number;
    /** Scenario description */
    description: string;
    /** Economic outcome */
    economic_outcome: EconomicProjection;
    /** Key assumptions */
    key_assumptions: string[];
    /** Trigger conditions */
    trigger_conditions: string[];
}
/**
 * Governance Economics Tracker Class
 */
export declare class GovernanceEconomicsTracker {
    private storagePath;
    private circleProfiles;
    private economicEvents;
    private roiRecords;
    constructor(storagePath: string);
    /**
     * Track economic event for a specific circle
     */
    trackCircleEconomicEvent(event: PatternEvent, economicData: EnhancedEconomicData): void;
    /**
     * Track ROI record for a specific circle
     */
    trackCircleROIRecord(circle: string, roiRecord: ROITrackingRecord): void;
    /**
     * Get economic profile for a circle
     */
    getCircleEconomicProfile(circle: string): CircleEconomicProfile | null;
    /**
     * Generate cross-circle economic analysis
     */
    generateCrossCircleAnalysis(): CrossCircleAnalysis;
    /**
     * Generate comprehensive economic governance report
     */
    generateEconomicGovernanceReport(): EconomicGovernanceReport;
    /**
     * Optimize resource allocation across circles
     */
    optimizeResourceAllocation(): ResourceOptimizationPlan;
    private initializeCircleProfiles;
    private createDefaultCircleProfile;
    private createDefaultResponsibilities;
    private createDefaultResourceAllocation;
    private createDefaultPerformance;
    private createDefaultCollaboration;
    private createDefaultFinancials;
    private createDefaultGovernance;
    private createDefaultHistoricalData;
    private createDefaultProjections;
    private updateCircleEconomicProfile;
    private updateCircleProfileWithROI;
    private updateProjections;
    private loadStoredData;
    private saveData;
    private calculateTotalEconomicValue;
    private compareCirclePerformance;
    private analyzeCollaborationEconomics;
    private analyzeResourceAllocationEfficiency;
    private identifyEconomicSynergies;
    private identifyOptimizationOpportunities;
    private generateCrossCircleRecommendations;
    private calculateEconomicHealthScore;
    private extractKeyMetrics;
    private analyzePerformanceTrends;
    private assessCircleRisks;
    private generateCircleRecommendations;
    private assessGovernanceEffectiveness;
    private generateFutureOutlook;
    private generateActionItems;
    private getCurrentResourceAllocation;
    private identifyAllocationOptimizations;
    private createReallocationPlan;
    private calculateExpectedEconomicImpact;
    private createImplementationRoadmap;
    private createRiskMitigationStrategies;
    private defineSuccessMetrics;
    private generateExecutiveSummary;
}
export interface CrossCircleAnalysis {
    total_economic_value: number;
    circle_performance_comparison: CirclePerformanceComparison;
    collaboration_economics: CollaborationEconomics;
    resource_allocation_efficiency: ResourceAllocationEfficiency;
    economic_synergies: EconomicSynergy[];
    optimization_opportunities: OptimizationOpportunity[];
    recommendations: CrossCircleRecommendation[];
}
export interface CirclePerformanceComparison {
    ranking: string[];
    top_performer: CircleEconomicProfile;
    performance_gaps: PerformanceGap[];
    best_practices: BestPractice[];
}
export interface PerformanceGap {
    circle: string;
    gap_type: string;
    current_performance: number;
    target_performance: number;
    gap_percentage: number;
}
export interface BestPractice {
    practice: string;
    source_circle: string;
    economic_impact: number;
    applicability: string[];
}
export interface CollaborationEconomics {
    cross_circle_roi: number;
    synergy_opportunities: SynergyOpportunity[];
    collaboration_costs: number;
    efficiency_gains: EfficiencyGain[];
}
export interface SynergyOpportunity {
    circles: string[];
    synergy_type: string;
    potential_value: number;
    implementation_complexity: 'low' | 'medium' | 'high';
}
export interface EfficiencyGain {
    area: string;
    current_efficiency: number;
    potential_efficiency: number;
    economic_value: number;
}
export interface ResourceAllocationEfficiency {
    overall_efficiency: number;
    allocation_optimizations: AllocationOptimization[];
    underutilized_resources: UnderutilizedResource[];
    reallocation_opportunities: ReallocationOpportunity[];
}
export interface AllocationOptimization {
    resource_type: string;
    current_allocation: number;
    optimal_allocation: number;
    potential_savings: number;
}
export interface UnderutilizedResource {
    resource: string;
    utilization_rate: number;
    potential_value: number;
    reallocation_options: string[];
}
export interface ReallocationOpportunity {
    from_circle: string;
    to_circle: string;
    resource_type: string;
    amount: number;
    expected_impact: number;
}
export interface EconomicSynergy {
    circles: string[];
    synergy_type: string;
    economic_value: number;
    implementation_requirements: string[];
}
export interface OptimizationOpportunity {
    area: string;
    description: string;
    potential_savings: number;
    implementation_complexity: 'low' | 'medium' | 'high';
    expected_roi: number;
}
export interface CrossCircleRecommendation {
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    affected_circles: string[];
    expected_economic_impact: number;
    implementation_timeline: string;
}
export interface EconomicGovernanceReport {
    executive_summary: ExecutiveSummary;
    circle_detailed_analysis: CircleDetailedAnalysis[];
    cross_circle_analysis: CrossCircleAnalysis;
    economic_governance_effectiveness: GovernanceEffectivenessAssessment;
    future_outlook: FutureOutlook;
    action_items: ActionItem[];
}
export interface ExecutiveSummary {
    total_economic_value: number;
    overall_roi: number;
    governance_effectiveness: number;
    key_achievements: string[];
    critical_challenges: string[];
    strategic_priorities: string[];
}
export interface CircleDetailedAnalysis {
    circle: string;
    economic_health_score: number;
    key_metrics: KeyMetrics;
    performance_trends: PerformanceTrendAnalysis;
    risk_assessment: RiskAssessment;
    recommendations: CircleRecommendation[];
}
export interface KeyMetrics {
    economic_value_created: number;
    roi: number;
    budget_adherence: number;
    resource_efficiency: number;
}
export interface PerformanceTrendAnalysis {
    value_trend: 'increasing' | 'decreasing' | 'stable';
    roi_trend: 'increasing' | 'decreasing' | 'stable';
    efficiency_trend: 'increasing' | 'decreasing' | 'stable';
    growth_trajectory: 'rapid' | 'moderate' | 'slow';
}
export interface RiskAssessment {
    overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
    key_risks: string[];
    risk_mitigation_status: 'excellent' | 'adequate' | 'inadequate';
    emerging_risks: string[];
}
export interface CircleRecommendation {
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    expected_impact: number;
    implementation_timeline: string;
}
export interface GovernanceEffectivenessAssessment {
    overall_effectiveness: number;
    decision_making_quality: number;
    control_environment: number;
    compliance_level: number;
    performance_monitoring: number;
}
export interface FutureOutlook {
    economic_projections: EconomicProjection[];
    growth_opportunities: GrowthOpportunity[];
    emerging_risks: EmergingRisk[];
    strategic_recommendations: StrategicRecommendation[];
}
export interface GrowthOpportunity {
    opportunity: string;
    potential_value: number;
    time_horizon: string;
    required_investments: number;
}
export interface EmergingRisk {
    risk: string;
    probability: number;
    economic_impact: number;
    mitigation_strategies: string[];
}
export interface StrategicRecommendation {
    recommendation: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    economic_impact: number;
    implementation_complexity: 'low' | 'medium' | 'high';
}
export interface ActionItem {
    action: string;
    responsible_circle: string;
    deadline: string;
    success_criteria: string[];
    resources_required: number;
}
export interface ResourceOptimizationPlan {
    current_allocation: CurrentResourceAllocation;
    optimization_opportunities: AllocationOptimization[];
    reallocation_plan: ReallocationPlan;
    expected_economic_impact: EconomicImpact;
    implementation_roadmap: ImplementationRoadmap;
    risk_mitigation_strategies: RiskMitigationStrategy[];
    success_metrics: SuccessMetric[];
}
export interface CurrentResourceAllocation {
    total_budget: number;
    budget_distribution: Record<string, number>;
    resource_utilization: Record<string, number>;
    efficiency_metrics: Record<string, number>;
}
export interface ReallocationPlan {
    recommended_changes: ReallocationChange[];
    expected_impact: number;
    implementation_timeline: string;
    success_factors: string[];
}
export interface ReallocationChange {
    circle: string;
    resource_type: string;
    current_amount: number;
    recommended_amount: number;
    change_percentage: number;
    rationale: string;
}
export interface EconomicImpact {
    value_increase: number;
    cost_savings: number;
    roi_improvement: number;
    risk_reduction: number;
}
export interface ImplementationRoadmap {
    phases: RoadmapPhase[];
    milestones: Milestone[];
    dependencies: Dependency[];
    timeline: string;
}
export interface RoadmapPhase {
    phase: string;
    duration: string;
    activities: string[];
    deliverables: string[];
    success_criteria: string[];
}
export interface Milestone {
    milestone: string;
    deadline: string;
    responsible_party: string;
    success_criteria: string[];
}
export interface Dependency {
    dependency: string;
    type: 'technical' | 'resource' | 'process' | 'approval';
    criticality: 'high' | 'medium' | 'low';
    resolution_plan: string;
}
export interface RiskMitigationStrategy {
    risk: string;
    mitigation_approach: string;
    implementation_timeline: string;
    responsible_party: string;
    success_metrics: string[];
}
export interface SuccessMetric {
    metric: string;
    target_value: number;
    measurement_method: string;
    reporting_frequency: string;
}
//# sourceMappingURL=governance_economics_tracker.d.ts.map