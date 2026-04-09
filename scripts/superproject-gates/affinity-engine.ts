/**
 * Affinity Engine
 * 
 * AI-powered user affinity scoring and recommendation system
 * that learns from user behavior and provides personalized recommendations
 */

import { EventEmitter } from 'events';
import {
  UserAffinity,
  AffinityScore,
  ScoreFactor,
  UserPreferences,
  UserBehavior,
  Recommendation,
  RecommendationType,
  RecommendationContent,
  Affiliate,
  Customer,
  BrowsingEvent,
  PurchaseEvent,
  ClickEvent,
  SearchEvent,
  TimePattern,
  DeviceUsage
} from '../types';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFScoringService } from '../../wsjf/scoring-service';

export interface AffinityConfig {
  scoringWeights: ScoringWeights;
  recommendationThresholds: RecommendationThresholds;
  learningRate: number;
  decayRate: number;
  maxRecommendations: number;
  refreshInterval: number; // minutes
}

export interface ScoringWeights {
  category: number;
  price: number;
  brand: number;
  features: number;
  behavior: number;
  social: number;
  temporal: number;
  device: number;
  location: number;
}

export interface RecommendationThresholds {
  minimumScore: number;
  minimumConfidence: number;
  diversityFactor: number;
  noveltyFactor: number;
  popularityFactor: number;
}

export class AffinityEngine extends EventEmitter {
  private userAffinities: Map<string, UserAffinity> = new Map();
  private behaviorBuffer: Map<string, UserBehavior[]> = new Map();
  private recommendationCache: Map<string, Recommendation[]> = new Map();

  constructor(
    private orchestration: OrchestrationFramework,
    private wsjfService: WSJFScoringService,
    private config: AffinityConfig
  ) {
    super();
    this.setupOrchestrationIntegration();
    this.startPeriodicRefresh();
  }

  /**
   * Setup integration with orchestration framework
   */
  private setupOrchestrationIntegration(): void {
    // Create purpose for affinity optimization
    const affinityPurpose = this.orchestration.createPurpose({
      name: 'User Affinity Optimization',
      description: 'Optimize user affinity scoring and recommendation accuracy',
      objectives: [
        'Maximize recommendation accuracy and relevance',
        'Enhance user engagement and conversion',
        'Optimize affiliate-user matching',
        'Continuously improve learning algorithms'
      ],
      keyResults: [
        '95%+ recommendation accuracy',
        '30%+ increase in conversion rates',
        '90%+ user satisfaction',
        'Real-time affinity updates'
      ]
    });

    // Create domain for AI operations
    const aiDomain = this.orchestration.createDomain({
      name: 'AI and Analytics',
      purpose: 'Manage AI-powered analytics, scoring, and recommendation systems',
      boundaries: [
        'Affinity scoring algorithms',
        'Recommendation engines',
        'Behavioral analysis',
        'Machine learning models'
      ],
      accountabilities: [
        'Algorithm accuracy and performance',
        'User privacy and data protection',
        'Model training and optimization',
        'Recommendation quality and relevance'
      ]
    });

    console.log('[AFFINITY-ENGINE] Integrated with orchestration framework');
  }

  /**
   * Start periodic refresh of affinity scores
   */
  private startPeriodicRefresh(): void {
    setInterval(() => {
      this.refreshAllAffinityScores();
    }, this.config.refreshInterval * 60 * 1000);
  }

  /**
   * Update user behavior with new event
   */
  public async updateUserBehavior(
    userId: string,
    tenantId: string,
    event: BrowsingEvent | PurchaseEvent | ClickEvent | SearchEvent
  ): Promise<void> {
    try {
      // Get or create user behavior buffer
      let behaviorData = this.behaviorBuffer.get(userId);
      if (!behaviorData) {
        behaviorData = this.createInitialBehavior();
        this.behaviorBuffer.set(userId, behaviorData);
      }

      // Add event to appropriate behavior array
      if ('productId' in event || 'category' in event) {
        behaviorData.browsingHistory.push(event as BrowsingEvent);
      } else if ('productId' in event && 'amount' in event) {
        behaviorData.purchaseHistory.push(event as PurchaseEvent);
      } else if ('target' in event) {
        behaviorData.clickEvents.push(event as ClickEvent);
      } else if ('query' in event) {
        behaviorData.searchEvents.push(event as SearchEvent);
      }

      // Update time patterns
      this.updateTimePattern(behaviorData, new Date());

      // Trigger affinity recalculation if significant behavior change
      if (this.shouldRecalculateAffinity(behaviorData)) {
        await this.calculateUserAffinity(userId, tenantId);
      }

      console.log(`[AFFINITY-ENGINE] Updated behavior for user: ${userId}`);

    } catch (error) {
      console.error(`[AFFINITY-ENGINE] Failed to update user behavior: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate user affinity scores
   */
  public async calculateUserAffinity(
    userId: string,
    tenantId: string
  ): Promise<UserAffinity> {
    try {
      const behavior = this.behaviorBuffer.get(userId) || this.createInitialBehavior();
      const existingAffinity = this.userAffinities.get(userId);

      // Calculate affinity scores for different categories
      const scores = await this.calculateAffinityScores(behavior, existingAffinity);

      // Extract user preferences from behavior
      const preferences = this.extractUserPreferences(behavior);

      // Create user affinity object
      const userAffinity: UserAffinity = {
        id: existingAffinity?.id || this.generateId('affinity'),
        userId,
        tenantId,
        scores,
        preferences,
        behavior,
        recommendations: [],
        lastCalculated: new Date(),
        version: (existingAffinity?.version || 0) + 1
      };

      // Store affinity
      this.userAffinities.set(userId, userAffinity);

      // Create orchestration plan for affinity calculation
      const affinityPlan = this.orchestration.createPlan({
        name: `Affinity Calculation - User ${userId}`,
        description: 'Calculate and update user affinity scores',
        objectives: [
          'Analyze user behavior patterns',
          'Calculate category and product affinities',
          'Extract user preferences',
          'Generate personalized recommendations'
        ],
        timeline: '2 hours',
        resources: [
          'Behavior analysis engine',
          'Machine learning models',
          'Recommendation algorithms',
          'User preference extractor'
        ]
      });

      // Create execution actions
      const affinityDo = this.orchestration.createDo({
        planId: affinityPlan.id,
        actions: [
          {
            id: 'behavior-analysis',
            name: 'Behavior Analysis',
            description: 'Analyze user behavior patterns and trends',
            priority: 1,
            estimatedDuration: 30,
            dependencies: []
          },
          {
            id: 'affinity-scoring',
            name: 'Affinity Scoring',
            description: 'Calculate affinity scores for categories and products',
            priority: 2,
            estimatedDuration: 45,
            dependencies: ['behavior-analysis']
          },
          {
            id: 'preference-extraction',
            name: 'Preference Extraction',
            description: 'Extract user preferences from behavior data',
            priority: 3,
            estimatedDuration: 20,
            dependencies: ['affinity-scoring']
          },
          {
            id: 'recommendation-generation',
            name: 'Recommendation Generation',
            description: 'Generate personalized recommendations',
            priority: 4,
            estimatedDuration: 25,
            dependencies: ['preference-extraction']
          }
        ],
        status: 'pending',
        metrics: {}
      });

      // Update WSJF priority for affinity calculation
      const wsjfParams = {
        userBusinessValue: 85,
        timeCriticality: 70,
        customerValue: 90,
        jobSize: 2,
        riskReduction: 50,
        opportunityEnablement: 80
      };

      const wsjfResult = this.wsjfService.calculateWSJF(
        affinityDo.id,
        wsjfParams
      );

      // Generate recommendations
      userAffinity.recommendations = await this.generateRecommendations(userAffinity);

      console.log(`[AFFINITY-ENGINE] Calculated affinity for user: ${userId} - Version: ${userAffinity.version}`);
      return userAffinity;

    } catch (error) {
      console.error(`[AFFINITY-ENGINE] Failed to calculate user affinity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate affinity scores for different categories
   */
  private async calculateAffinityScores(
    behavior: UserBehavior,
    existingAffinity?: UserAffinity
  ): Promise<AffinityScore[]> {
    const scores: AffinityScore[] = [];

    // Category affinity based on browsing and purchase history
    const categoryScores = this.calculateCategoryAffinity(behavior);
    
    // Price affinity based on purchase amounts and browsing patterns
    const priceAffinity = this.calculatePriceAffinity(behavior);
    
    // Brand affinity based on product interactions
    const brandAffinity = this.calculateBrandAffinity(behavior);
    
    // Feature affinity based on product attribute interactions
    const featureAffinity = this.calculateFeatureAffinity(behavior);
    
    // Behavioral affinity based on interaction patterns
    const behaviorAffinity = this.calculateBehavioralAffinity(behavior);
    
    // Temporal affinity based on time patterns
    const temporalAffinity = this.calculateTemporalAffinity(behavior);
    
    // Device affinity based on usage patterns
    const deviceAffinity = this.calculateDeviceAffinity(behavior);

    // Combine all scores
    const allScores = [
      ...categoryScores,
      priceAffinity,
      ...brandAffinity,
      ...featureAffinity,
      behaviorAffinity,
      temporalAffinity,
      deviceAffinity
    ];

    // Apply decay to existing scores and merge with new ones
    for (const score of allScores) {
      const existingScore = existingAffinity?.scores.find(s => s.category === score.category);
      
      if (existingScore) {
        // Apply decay and merge
        const decayedScore = existingScore.score * (1 - this.config.decayRate);
        const mergedScore = (decayedScore + score.score) / 2;
        
        scores.push({
          ...score,
          score: mergedScore,
          factors: this.mergeScoreFactors(existingScore.factors, score.factors)
        });
      } else {
        scores.push(score);
      }
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate category affinity
   */
  private calculateCategoryAffinity(behavior: UserBehavior): AffinityScore[] {
    const categoryInteractions = new Map<string, number>();

    // Count interactions by category
    behavior.browsingHistory.forEach(event => {
      if (event.category) {
        categoryInteractions.set(
          event.category,
          (categoryInteractions.get(event.category) || 0) + 1
        );
      }
    });

    behavior.purchaseHistory.forEach(event => {
      // Extract category from product metadata
      const category = event.metadata?.category || 'unknown';
      categoryInteractions.set(
        category,
        (categoryInteractions.get(category) || 0) + 2 // Weight purchases higher
      );
    });

    // Convert to affinity scores
    const scores: AffinityScore[] = [];
    const totalInteractions = Array.from(categoryInteractions.values()).reduce((sum, count) => sum + count, 0);

    categoryInteractions.forEach((interactions, category) => {
      const score = (interactions / totalInteractions) * 100;
      
      scores.push({
        category,
        score,
        confidence: Math.min(interactions / 10, 1), // Confidence based on interaction count
        factors: [
          {
            name: 'browsing_interactions',
            value: interactions * 0.6,
            source: 'browsing_history',
            weight: this.config.scoringWeights.category
          },
          {
            name: 'purchase_interactions',
            value: interactions * 0.4,
            source: 'purchase_history',
            weight: this.config.scoringWeights.category
          }
        ],
        weight: this.config.scoringWeights.category,
        calculatedAt: new Date()
      });
    });

    return scores;
  }

  /**
   * Calculate price affinity
   */
  private calculatePriceAffinity(behavior: UserBehavior): AffinityScore {
    const prices = behavior.purchaseHistory.map(event => event.amount);
    
    if (prices.length === 0) {
      return {
        category: 'price_range',
        score: 50,
        confidence: 0,
        factors: [],
        weight: this.config.scoringWeights.price,
        calculatedAt: new Date()
      };
    }

    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceRange = this.getPriceRange(avgPrice);

    return {
      category: 'price_range',
      score: priceRange.score,
      confidence: Math.min(prices.length / 5, 1),
      factors: [
        {
          name: 'average_purchase_price',
          value: avgPrice,
          source: 'purchase_history',
          weight: this.config.scoringWeights.price
        },
        {
          name: 'price_variance',
          value: this.calculatePriceVariance(prices),
          source: 'purchase_history',
          weight: this.config.scoringWeights.price
        }
      ],
      weight: this.config.scoringWeights.price,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate brand affinity
   */
  private calculateBrandAffinity(behavior: UserBehavior): AffinityScore[] {
    const brandInteractions = new Map<string, number>();

    // Count brand interactions
    behavior.browsingHistory.forEach(event => {
      const brand = event.metadata?.brand;
      if (brand) {
        brandInteractions.set(brand, (brandInteractions.get(brand) || 0) + 1);
      }
    });

    behavior.purchaseHistory.forEach(event => {
      const brand = event.metadata?.brand;
      if (brand) {
        brandInteractions.set(brand, (brandInteractions.get(brand) || 0) + 3);
      }
    });

    // Convert to affinity scores
    const scores: AffinityScore[] = [];
    const totalInteractions = Array.from(brandInteractions.values()).reduce((sum, count) => sum + count, 0);

    brandInteractions.forEach((interactions, brand) => {
      const score = (interactions / totalInteractions) * 100;
      
      scores.push({
        category: `brand_${brand}`,
        score,
        confidence: Math.min(interactions / 5, 1),
        factors: [
          {
            name: 'brand_interactions',
            value: interactions,
            source: 'behavior_history',
            weight: this.config.scoringWeights.brand
          }
        ],
        weight: this.config.scoringWeights.brand,
        calculatedAt: new Date()
      });
    });

    return scores;
  }

  /**
   * Calculate feature affinity
   */
  private calculateFeatureAffinity(behavior: UserBehavior): AffinityScore[] {
    const featureInteractions = new Map<string, number>();

    // Extract features from browsing and purchase events
    [...behavior.browsingHistory, ...behavior.purchaseHistory].forEach(event => {
      const features = event.metadata?.features || [];
      features.forEach((feature: string) => {
        featureInteractions.set(feature, (featureInteractions.get(feature) || 0) + 1);
      });
    });

    // Convert to affinity scores
    const scores: AffinityScore[] = [];
    const totalInteractions = Array.from(featureInteractions.values()).reduce((sum, count) => sum + count, 0);

    featureInteractions.forEach((interactions, feature) => {
      const score = (interactions / totalInteractions) * 100;
      
      scores.push({
        category: `feature_${feature}`,
        score,
        confidence: Math.min(interactions / 3, 1),
        factors: [
          {
            name: 'feature_interactions',
            value: interactions,
            source: 'behavior_history',
            weight: this.config.scoringWeights.features
          }
        ],
        weight: this.config.scoringWeights.features,
        calculatedAt: new Date()
      });
    });

    return scores;
  }

  /**
   * Calculate behavioral affinity
   */
  private calculateBehavioralAffinity(behavior: UserBehavior): AffinityScore {
    const totalEvents = behavior.browsingHistory.length + 
                     behavior.clickEvents.length + 
                     behavior.searchEvents.length;

    const clickThroughRate = behavior.browsingHistory.length > 0 
      ? behavior.clickEvents.length / behavior.browsingHistory.length 
      : 0;

    const searchConversionRate = behavior.searchEvents.length > 0
      ? behavior.browsingHistory.filter(b => 
          behavior.searchEvents.some(s => b.metadata?.searchId === s.id)
        ).length / behavior.searchEvents.length
      : 0;

    return {
      category: 'behavioral_pattern',
      score: (clickThroughRate + searchConversionRate) * 50,
      confidence: Math.min(totalEvents / 20, 1),
      factors: [
        {
          name: 'click_through_rate',
          value: clickThroughRate,
          source: 'behavior_analysis',
          weight: this.config.scoringWeights.behavior
        },
        {
          name: 'search_conversion_rate',
          value: searchConversionRate,
          source: 'behavior_analysis',
          weight: this.config.scoringWeights.behavior
        }
      ],
      weight: this.config.scoringWeights.behavior,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate temporal affinity
   */
  private calculateTemporalAffinity(behavior: UserBehavior): AffinityScore {
    if (behavior.timePatterns.length === 0) {
      return {
        category: 'temporal_pattern',
        score: 50,
        confidence: 0,
        factors: [],
        weight: this.config.scoringWeights.temporal,
        calculatedAt: new Date()
      };
    }

    // Find most active time period
    const periodCounts = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    };

    behavior.timePatterns.forEach(pattern => {
      periodCounts[pattern.period]++;
    });

    const maxCount = Math.max(...Object.values(periodCounts));
    const dominantPeriod = Object.keys(periodCounts).find(
      period => periodCounts[period as keyof typeof periodCounts] === maxCount
    ) as string;

    return {
      category: 'temporal_pattern',
      score: (maxCount / behavior.timePatterns.length) * 100,
      confidence: Math.min(behavior.timePatterns.length / 7, 1),
      factors: [
        {
          name: 'dominant_period',
          value: dominantPeriod,
          source: 'time_pattern_analysis',
          weight: this.config.scoringWeights.temporal
        }
      ],
      weight: this.config.scoringWeights.temporal,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate device affinity
   */
  private calculateDeviceAffinity(behavior: UserBehavior): AffinityScore {
    if (behavior.deviceUsage.length === 0) {
      return {
        category: 'device_preference',
        score: 50,
        confidence: 0,
        factors: [],
        weight: this.config.scoringWeights.device,
        calculatedAt: new Date()
      };
    }

    // Find most used device
    const maxUsage = Math.max(...behavior.deviceUsage.map(d => d.usagePercentage));
    const primaryDevice = behavior.deviceUsage.find(d => d.usagePercentage === maxUsage);

    return {
      category: 'device_preference',
      score: maxUsage,
      confidence: Math.min(behavior.deviceUsage.length / 3, 1),
      factors: [
        {
          name: 'primary_device',
          value: primaryDevice?.device || 'unknown',
          source: 'device_usage_analysis',
          weight: this.config.scoringWeights.device
        }
      ],
      weight: this.config.scoringWeights.device,
      calculatedAt: new Date()
    };
  }

  /**
   * Extract user preferences from behavior
   */
  private extractUserPreferences(behavior: UserBehavior): UserPreferences {
    // Extract preferred categories
    const categoryScores = this.calculateCategoryAffinity(behavior);
    const topCategories = categoryScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(score => score.category);

    // Extract price preferences
    const prices = behavior.purchaseHistory.map(event => event.amount);
    const priceRange = prices.length > 0 
      ? {
          min: Math.min(...prices) * 0.8,
          max: Math.max(...prices) * 1.2,
          currency: 'USD'
        }
      : { min: 0, max: 1000, currency: 'USD' };

    // Extract brand preferences
    const brandScores = this.calculateBrandAffinity(behavior);
    const topBrands = brandScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(score => score.category.replace('brand_', ''));

    return {
      categories: topCategories,
      priceRange,
      brands: topBrands,
      features: [], // Would be extracted from feature affinity
      communicationChannel: 'email', // Default, would be learned
      frequency: 'medium' // Default, would be learned
    };
  }

  /**
   * Generate personalized recommendations
   */
  public async generateRecommendations(userAffinity: UserAffinity): Promise<Recommendation[]> {
    try {
      const recommendations: Recommendation[] = [];
      const existingRecommendations = this.recommendationCache.get(userAffinity.userId) || [];

      // Generate different types of recommendations
      const productRecommendations = await this.generateProductRecommendations(userAffinity);
      const affiliateRecommendations = await this.generateAffiliateRecommendations(userAffinity);
      const contentRecommendations = await this.generateContentRecommendations(userAffinity);

      // Combine and score recommendations
      const allRecommendations = [
        ...productRecommendations,
        ...affiliateRecommendations,
        ...contentRecommendations
      ];

      // Apply diversity and novelty factors
      const scoredRecommendations = allRecommendations.map(rec => {
        const diversityScore = this.calculateDiversityScore(rec, existingRecommendations);
        const noveltyScore = this.calculateNoveltyScore(rec, userAffinity);
        const popularityScore = this.calculatePopularityScore(rec);

        const finalScore = (
          rec.score * 0.5 +
          diversityScore * 0.2 +
          noveltyScore * 0.2 +
          popularityScore * 0.1
        );

        return {
          ...rec,
          score: finalScore,
          confidence: Math.min(rec.confidence + (diversityScore + noveltyScore) / 2, 1)
        };
      });

      // Filter and sort recommendations
      const filteredRecommendations = scoredRecommendations
        .filter(rec => 
          rec.score >= this.config.recommendationThresholds.minimumScore &&
          rec.confidence >= this.config.recommendationThresholds.minimumConfidence
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.maxRecommendations);

      // Cache recommendations
      this.recommendationCache.set(userAffinity.userId, filteredRecommendations);

      // Update user affinity with new recommendations
      userAffinity.recommendations = filteredRecommendations;

      console.log(`[AFFINITY-ENGINE] Generated ${filteredRecommendations.length} recommendations for user: ${userAffinity.userId}`);
      return filteredRecommendations;

    } catch (error) {
      console.error(`[AFFINITY-ENGINE] Failed to generate recommendations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate product recommendations
   */
  private async generateProductRecommendations(userAffinity: UserAffinity): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const topCategories = userAffinity.scores
      .filter(score => score.category.startsWith('category_') || score.category.includes('category'))
      .slice(0, 3);

    for (const categoryScore of topCategories) {
      const category = categoryScore.category.replace('category_', '');
      
      recommendations.push({
        id: this.generateId('recommendation'),
        userId: userAffinity.userId,
        type: 'product',
        content: {
          title: `Recommended ${category} Products`,
          description: `Personalized ${category} product recommendations based on your preferences`,
          metadata: {
            category,
            affinityScore: categoryScore.score,
            confidence: categoryScore.confidence
          }
        },
        score: categoryScore.score,
        confidence: categoryScore.confidence,
        reason: `High affinity score (${categoryScore.score.toFixed(1)}) for ${category} category`,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Generate affiliate recommendations
   */
  private async generateAffiliateRecommendations(userAffinity: UserAffinity): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // This would integrate with affiliate network to find matching affiliates
    // For now, create mock recommendations
    recommendations.push({
      id: this.generateId('recommendation'),
      userId: userAffinity.userId,
      type: 'affiliate',
      content: {
        title: 'Recommended Affiliate Program',
        description: 'Join affiliate programs that match your interests',
        metadata: {
          categories: userAffinity.preferences.categories,
          matchScore: 85
        }
      },
      score: 85,
      confidence: 0.8,
      reason: 'Based on your browsing and purchase patterns',
      status: 'pending',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      createdAt: new Date()
    });

    return recommendations;
  }

  /**
   * Generate content recommendations
   */
  private async generateContentRecommendations(userAffinity: UserAffinity): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Generate content recommendations based on user interests
    userAffinity.preferences.categories.forEach(category => {
      recommendations.push({
        id: this.generateId('recommendation'),
        userId: userAffinity.userId,
        type: 'content',
        content: {
          title: `${category} Guide`,
          description: `Learn more about ${category} with our comprehensive guide`,
          metadata: {
            category,
            contentType: 'guide',
            estimatedReadTime: '5 minutes'
          }
        },
        score: 70,
        confidence: 0.7,
        reason: `Educational content for your interested category: ${category}`,
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: new Date()
      });
    });

    return recommendations;
  }

  /**
   * Helper methods
   */
  private createInitialBehavior(): UserBehavior {
    return {
      browsingHistory: [],
      purchaseHistory: [],
      clickEvents: [],
      searchEvents: [],
      timePatterns: [],
      deviceUsage: []
    };
  }

  private shouldRecalculateAffinity(behavior: UserBehavior): boolean {
    const totalEvents = behavior.browsingHistory.length + 
                     behavior.purchaseHistory.length + 
                     behavior.clickEvents.length + 
                     behavior.searchEvents.length;
    
    return totalEvents >= 10 || totalEvents % 5 === 0;
  }

  private updateTimePattern(behavior: UserBehavior, timestamp: Date): void {
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    
    let period: TimePattern['period'];
    if (hour >= 6 && hour < 12) period = 'morning';
    else if (hour >= 12 && hour < 18) period = 'afternoon';
    else if (hour >= 18 && hour < 22) period = 'evening';
    else period = 'night';

    const existingPattern = behavior.timePatterns.find(p => p.hour === hour && p.dayOfWeek === dayOfWeek);
    
    if (existingPattern) {
      existingPattern.activity++;
    } else {
      behavior.timePatterns.push({
        hour,
        dayOfWeek,
        activity: 1,
        period
      });
    }
  }

  private getPriceRange(avgPrice: number): { score: number; range: string } {
    if (avgPrice < 50) return { score: 20, range: 'budget' };
    if (avgPrice < 100) return { score: 40, range: 'economy' };
    if (avgPrice < 250) return { score: 60, range: 'mid-range' };
    if (avgPrice < 500) return { score: 80, range: 'premium' };
    return { score: 100, range: 'luxury' };
  }

  private calculatePriceVariance(prices: number[]): number {
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  private mergeScoreFactors(existing: ScoreFactor[], newFactors: ScoreFactor[]): ScoreFactor[] {
    const merged = new Map<string, ScoreFactor>();
    
    [...existing, ...newFactors].forEach(factor => {
      const existingFactor = merged.get(factor.name);
      if (existingFactor) {
        merged.set(factor.name, {
          name: factor.name,
          value: (existingFactor.value + factor.value) / 2,
          source: `${existingFactor.source}+${factor.source}`,
          weight: Math.max(existingFactor.weight, factor.weight)
        });
      } else {
        merged.set(factor.name, factor);
      }
    });

    return Array.from(merged.values());
  }

  private calculateDiversityScore(rec: Recommendation, existing: Recommendation[]): number {
    if (existing.length === 0) return 1;
    
    const typeDiversity = !existing.some(e => e.type === rec.type) ? 1 : 0.5;
    const categoryDiversity = !existing.some(e => 
      e.content.metadata?.category === rec.content.metadata?.category
    ) ? 1 : 0.5;
    
    return (typeDiversity + categoryDiversity) / 2;
  }

  private calculateNoveltyScore(rec: Recommendation, userAffinity: UserAffinity): number {
    const categoryScore = userAffinity.scores.find(s => s.category === rec.content.metadata?.category);
    return categoryScore ? Math.min(1 - categoryScore.confidence, 0.5) : 0.8;
  }

  private calculatePopularityScore(rec: Recommendation): number {
    // This would integrate with actual popularity data
    return Math.random() * 0.5 + 0.5; // Mock implementation
  }

  private refreshAllAffinityScores(): void {
    console.log('[AFFINITY-ENGINE] Refreshing all affinity scores');
    
    for (const [userId, userAffinity] of this.userAffinities) {
      this.calculateUserAffinity(userId, userAffinity.tenantId)
        .catch(error => {
          console.error(`[AFFINITY-ENGINE] Failed to refresh affinity for user ${userId}: ${error.message}`);
        });
    }
  }

  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  // Public getter methods
  public getUserAffinity(userId: string): UserAffinity | undefined {
    return this.userAffinities.get(userId);
  }

  public getUserBehavior(userId: string): UserBehavior | undefined {
    return this.behaviorBuffer.get(userId);
  }

  public getRecommendations(userId: string): Recommendation[] {
    return this.recommendationCache.get(userId) || [];
  }

  public updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): void {
    const userAffinity = this.userAffinities.get(userId);
    if (userAffinity) {
      userAffinity.preferences = { ...userAffinity.preferences, ...preferences };
      userAffinity.lastCalculated = new Date();
      userAffinity.version++;
    }
  }
}