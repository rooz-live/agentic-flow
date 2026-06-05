/**
 * Neural Trading Risk Management System Types
 * 
 * Comprehensive type definitions for risk management, trading analytics,
 * portfolio management, and compliance frameworks
 */

// Core Risk Management Types
export interface RiskAssessment {
  id: string;
  timestamp: Date;
  portfolioId: string;
  strategyId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  riskFactors: RiskFactor[];
  recommendations: RiskRecommendation[];
  confidence: number;
  methodology: string;
}

export interface RiskFactor {
  id: string;
  category: RiskCategory;
  name: string;
  description: string;
  weight: number;
  currentImpact: number;
  potentialImpact: number;
  probability: number;
  mitigation: string;
}

export type RiskCategory = 
  | 'market_risk'
  | 'credit_risk'
  | 'operational_risk'
  | 'liquidity_risk'
  | 'counterparty_risk'
  | 'regulatory_risk'
  | 'systemic_risk'
  | 'model_risk';

export interface RiskRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  expectedReduction: number;
  implementationCost: number;
  timeframe: string;
  dependencies: string[];
}

// Trading Strategy Types
export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  parameters: StrategyParameters;
  performance: StrategyPerformance;
  riskProfile: RiskProfile;
  constraints: TradingConstraints;
  status: 'active' | 'inactive' | 'testing' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

export type StrategyType = 
  | 'momentum'
  | 'mean_reversion'
  | 'arbitrage'
  | 'market_making'
  | 'trend_following'
  | 'statistical_arbitrage'
  | 'neural_network'
  | 'reinforcement_learning'
  | 'ensemble';

export interface StrategyParameters {
  [key: string]: any;
  lookbackPeriod: number;
  riskLimit: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  maxDrawdown: number;
  leverage: number;
}

export interface StrategyPerformance {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface RiskProfile {
  volatility: number;
  beta: number;
  valueAtRisk: number;
  expectedShortfall: number;
  correlation: number;
  concentration: number;
  leverage: number;
}

export interface TradingConstraints {
  maxPositionSize: number;
  maxLeverage: number;
  maxDrawdown: number;
  minLiquidity: number;
  allowedAssets: string[];
  prohibitedAssets: string[];
  tradingHours: TradingHours;
}

export interface TradingHours {
  marketOpen: string;
  marketClose: string;
  tradingDays: string[];
  holidays: string[];
}

// Portfolio Management Types
export interface Portfolio {
  id: string;
  name: string;
  description: string;
  owner: string;
  assets: PortfolioAsset[];
  positions: PortfolioPosition[];
  cash: number;
  totalValue: number;
  performance: PortfolioPerformance;
  riskMetrics: PortfolioRiskMetrics;
  allocation: AssetAllocation;
  constraints: PortfolioConstraints;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioAsset {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  currency: string;
  sector: string;
  marketCap: number;
  price: number;
  volume: number;
  lastUpdate: Date;
}

export type AssetClass = 
  | 'equity'
  | 'fixed_income'
  | 'commodity'
  | 'currency'
  | 'derivative'
  | 'crypto'
  | 'real_estate'
  | 'alternative';

export interface PortfolioPosition {
  id: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  weight: number;
  entryDate: Date;
  lastUpdate: Date;
}

export interface PortfolioPerformance {
  totalReturn: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  yearlyReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  alpha: number;
  beta: number;
  trackingError: number;
  informationRatio: number;
}

export interface PortfolioRiskMetrics {
  valueAtRisk: number;
  expectedShortfall: number;
  volatility: number;
  correlation: number;
  concentration: number;
  liquidityRisk: number;
  creditRisk: number;
  operationalRisk: number;
}

export interface AssetAllocation {
  byAssetClass: Record<AssetClass, number>;
  bySector: Record<string, number>;
  byGeography: Record<string, number>;
  byCurrency: Record<string, number>;
  targetAllocation: Record<string, number>;
  deviation: Record<string, number>;
}

export interface PortfolioConstraints {
  maxConcentration: number;
  maxSectorWeight: number;
  maxGeographyWeight: number;
  maxCurrencyWeight: number;
  minDiversification: number;
  liquidityRequirement: number;
  riskLimits: RiskLimits;
}

export interface RiskLimits {
  maxVaR: number;
  maxDrawdown: number;
  maxVolatility: number;
  maxLeverage: number;
  maxCorrelation: number;
  maxConcentration: number;
}

// Market Data Types
export interface MarketData {
  symbol: string;
  timestamp: Date;
  price: number;
  volume: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  changePercent: number;
}

export interface MarketIndicators {
  symbol: string;
  timestamp: Date;
  indicators: {
    sma: number[];
    ema: number[];
    rsi: number;
    macd: MACD;
    bollingerBands: BollingerBands;
    stochastic: Stochastic;
    atr: number;
    adx: number;
    cci: number;
    williamsR: number;
  };
}

export interface MACD {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export interface Stochastic {
  k: number;
  d: number;
}

// Order Management Types
export interface Order {
  id: string;
  portfolioId: string;
  strategyId: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: TimeInForce;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  executedAt?: Date;
  filledQuantity: number;
  averagePrice: number;
  commission: number;
  fees: number;
  metadata: OrderMetadata;
}

export type OrderType = 
  | 'market'
  | 'limit'
  | 'stop'
  | 'stop_limit'
  | 'trailing_stop'
  | 'iceberg'
  | 'algo';

export type OrderSide = 'buy' | 'sell';

export type TimeInForce = 
  | 'day'
  | 'gtc'
  | 'ioc'
  | 'fok'
  | 'opg'
  | 'cls';

export type OrderStatus = 
  | 'new'
  | 'pending'
  | 'partial'
  | 'filled'
  | 'cancelled'
  | 'rejected'
  | 'expired';

export interface OrderMetadata {
  reason: string;
  confidence: number;
  riskScore: number;
  expectedPnL: number;
  maxLoss: number;
  timeHorizon: number;
  correlation: number;
  hedging: boolean;
}

// Compliance Types
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: ComplianceCategory;
  regulation: string;
  condition: ComplianceCondition;
  action: ComplianceAction;
  severity: ComplianceSeverity;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ComplianceCategory = 
  | 'trading_restrictions'
  | 'position_limits'
  | 'reporting_requirements'
  | 'capital_requirements'
  | 'risk_limits'
  | 'market_manipulation'
  | 'insider_trading'
  | 'aml_kyc';

export interface ComplianceCondition {
  field: string;
  operator: ComplianceOperator;
  value: any;
  timeWindow?: number;
  aggregation?: ComplianceAggregation;
}

export type ComplianceOperator = 
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'regex';

export type ComplianceAggregation = 
  | 'sum'
  | 'avg'
  | 'max'
  | 'min'
  | 'count'
  | 'distinct';

export type ComplianceAction = 
  | 'alert'
  | 'block'
  | 'require_approval'
  | 'report'
  | 'escalate'
  | 'auto_correct';

export type ComplianceSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ComplianceAlert {
  id: string;
  ruleId: string;
  portfolioId: string;
  strategyId: string;
  severity: ComplianceSeverity;
  message: string;
  details: any;
  timestamp: Date;
  status: 'open' | 'acknowledged' | 'resolved' | 'escalated';
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Analytics Types
export interface TradingAnalytics {
  portfolioId: string;
  strategyId: string;
  period: AnalyticsPeriod;
  metrics: AnalyticsMetrics;
  insights: AnalyticsInsight[];
  recommendations: AnalyticsRecommendation[];
  generatedAt: Date;
}

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface AnalyticsMetrics {
  performance: PerformanceMetrics;
  risk: RiskMetrics;
  efficiency: EfficiencyMetrics;
  quality: QualityMetrics;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  informationRatio: number;
  trackingError: number;
  beta: number;
  alpha: number;
}

export interface RiskMetrics {
  valueAtRisk: number;
  expectedShortfall: number;
  downsideDeviation: number;
  upsideCapture: number;
  downsideCapture: number;
  correlation: number;
  concentration: number;
  leverage: number;
  liquidityRisk: number;
}

export interface EfficiencyMetrics {
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  recoveryFactor: number;
  varReturnRatio: number;
  tailRatio: number;
  gainToPainRatio: number;
  kellyCriterion: number;
}

export interface QualityMetrics {
  dataQuality: number;
  modelAccuracy: number;
  predictionConfidence: number;
  backtestQuality: number;
  overfittingRisk: number;
  robustness: number;
  stability: number;
}

export interface AnalyticsInsight {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  impact: InsightImpact;
  confidence: number;
  evidence: any[];
  recommendations: string[];
}

export type InsightCategory = 
  | 'performance'
  | 'risk'
  | 'efficiency'
  | 'opportunity'
  | 'anomaly'
  | 'trend'
  | 'correlation'
  | 'regime_change';

export type InsightImpact = 'low' | 'medium' | 'high' | 'critical';

export interface AnalyticsRecommendation {
  id: string;
  type: RecommendationType;
  description: string;
  expectedImpact: number;
  confidence: number;
  priority: RecommendationPriority;
  timeframe: string;
  effort: RecommendationEffort;
  dependencies: string[];
}

export type RecommendationType = 
  | 'strategy_adjustment'
  | 'risk_mitigation'
  | 'portfolio_rebalance'
  | 'parameter_optimization'
  | 'model_retraining'
  | 'data_improvement'
  | 'process_enhancement';

export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

export type RecommendationEffort = 'low' | 'medium' | 'high';

// Neural Network Types
export interface NeuralNetworkModel {
  id: string;
  name: string;
  type: ModelType;
  architecture: ModelArchitecture;
  parameters: ModelParameters;
  performance: ModelPerformance;
  training: ModelTraining;
  deployment: ModelDeployment;
  createdAt: Date;
  updatedAt: Date;
}

export type ModelType = 
  | 'feedforward'
  | 'cnn'
  | 'rnn'
  | 'lstm'
  | 'gru'
  | 'transformer'
  | 'attention'
  | 'autoencoder'
  | 'gan'
  | 'reinforcement_learning';

export interface ModelArchitecture {
  layers: ModelLayer[];
  activation: string;
  optimizer: string;
  lossFunction: string;
  metrics: string[];
}

export interface ModelLayer {
  type: string;
  units: number;
  activation: string;
  dropout: number;
  parameters: any;
}

export interface ModelParameters {
  learningRate: number;
  batchSize: number;
  epochs: number;
  validationSplit: number;
  earlyStopping: boolean;
  regularization: string;
  dropoutRate: number;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  mse: number;
  mae: number;
  rmse: number;
  validationLoss: number;
  trainingLoss: number;
}

export interface ModelTraining {
  status: 'training' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  epochs: number;
  currentEpoch: number;
  bestEpoch: number;
  trainingHistory: TrainingHistory[];
}

export interface TrainingHistory {
  epoch: number;
  loss: number;
  accuracy: number;
  validationLoss: number;
  validationAccuracy: number;
  timestamp: Date;
}

export interface ModelDeployment {
  status: 'deployed' | 'staged' | 'failed' | 'rollback';
  version: string;
  endpoint?: string;
  environment: string;
  deployedAt?: Date;
  rollbackVersion?: string;
}

// Event Types
export interface TradingEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  data: any;
  severity: EventSeverity;
  metadata: any;
}

export type EventType = 
  | 'order_created'
  | 'order_filled'
  | 'order_cancelled'
  | 'position_opened'
  | 'position_closed'
  | 'risk_alert'
  | 'compliance_violation'
  | 'model_retrained'
  | 'strategy_activated'
  | 'strategy_deactivated'
  | 'portfolio_rebalanced';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
  requestId: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

// Configuration Types
export interface RiskManagementConfig {
  riskLimits: RiskLimits;
  compliance: ComplianceConfig;
  analytics: AnalyticsConfig;
  models: ModelConfig;
  integrations: IntegrationConfig;
  monitoring: MonitoringConfig;
}

export interface ComplianceConfig {
  enabled: boolean;
  rules: string[];
  reporting: ReportingConfig;
  alerts: AlertConfig;
}

export interface ReportingConfig {
  frequency: string;
  recipients: string[];
  format: string;
  template: string;
}

export interface AlertConfig {
  enabled: boolean;
  channels: string[];
  thresholds: any;
  escalation: EscalationConfig;
}

export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  level: number;
  delay: number;
  recipients: string[];
  actions: string[];
}

export interface AnalyticsConfig {
  enabled: boolean;
  insights: boolean;
  recommendations: boolean;
  backtesting: boolean;
  optimization: boolean;
}

export interface ModelConfig {
  retraining: RetrainingConfig;
  validation: ValidationConfig;
  deployment: DeploymentConfig;
}

export interface RetrainingConfig {
  enabled: boolean;
  frequency: string;
  triggers: string[];
  dataWindow: number;
}

export interface ValidationConfig {
  enabled: boolean;
  backtesting: boolean;
  crossValidation: boolean;
  outOfSampleTesting: boolean;
}

export interface DeploymentConfig {
  enabled: boolean;
  autoDeployment: boolean;
  rollback: boolean;
  monitoring: boolean;
}

export interface IntegrationConfig {
  brokers: BrokerConfig[];
  dataProviders: DataProviderConfig[];
  paymentProcessors: PaymentProcessorConfig[];
}

export interface BrokerConfig {
  name: string;
  enabled: boolean;
  apiKey: string;
  secret: string;
  sandbox: boolean;
  endpoints: any;
}

export interface DataProviderConfig {
  name: string;
  enabled: boolean;
  apiKey: string;
  endpoints: any;
  dataTypes: string[];
}

export interface PaymentProcessorConfig {
  name: string;
  enabled: boolean;
  apiKey: string;
  webhookSecret: string;
  supportedCurrencies: string[];
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: string[];
  alerts: string[];
  dashboards: string[];
  retention: number;
}