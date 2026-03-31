/**
 * AI Slop Detection System
 *
 * Implements semantic quality gates to prevent low-quality automated outputs.
 * Detects:
 * - Low substantive content ratio
 * - Insufficient novel insights
 * - High circular/self-referential content
 * - Unverifiable claims
 */

export interface SlopDetectionConfig {
  /** Minimum ratio of novel/substantive content (default: 0.3 = 30%) */
  substantive_content_ratio: number;

  /** Minimum number of new concepts per PR (default: 2) */
  novel_insight_count: number;

  /** Minimum ratio of verifiable claims (default: 0.8 = 80%) */
  cross_reference_validity: number;

  /** Maximum ratio of self-referential content (default: 0.2 = 20%) */
  circular_reference_threshold: number;
}

export interface SlopAnalysisResult {
  score: number;
  passed: boolean;
  metrics: {
    substantiveRatio: number;
    novelInsights: number;
    crossReferenceValidity: number;
    circularReferenceRatio: number;
  };
  details: string[];
  recommendations: string[];
}

const DEFAULT_CONFIG: SlopDetectionConfig = {
  substantive_content_ratio: 0.3,
  novel_insight_count: 2,
  cross_reference_validity: 0.8,
  circular_reference_threshold: 0.2,
};

const SLOP_THRESHOLD = 0.5;

/**
 * Patterns indicating low-quality "slop" content
 */
const SLOP_PATTERNS = [
  /\b(as mentioned above|as discussed|as stated|as noted)\b/gi,
  /\b(obviously|clearly|simply|just|basically)\b/gi,
  /\b(etc\.?|and so on|and more|among others)\b/gi,
  /\b(in order to|due to the fact that|at this point in time)\b/gi,
  /\b(it is important to note|it should be noted|it goes without saying)\b/gi,
];

/**
 * Hedging language patterns - epistemic humility failures
 * "confidence rising faster than corrective capacity"
 */
const HEDGING_PATTERNS = [
  /\b(might|maybe|perhaps|possibly|potentially|arguably)\b/gi,
  /\b(in some cases|under certain conditions|depending on)\b/gi,
  /\b(generally|typically|usually|often|sometimes)\b/gi,
];

/**
 * Collapse-resistance patterns - institutional decay signals
 * "moral language detached from consequence"
 */
const COLLAPSE_PATTERNS = [
  // Confidence outpacing capacity
  /\b(guaranteed|always|never|100%|zero risk|completely safe)\b/gi,
  // Dissent as threat
  /\b(concerns? (are|were) (noted|acknowledged) but)\b/gi,
  // Suffering narrativized
  /\b(learning experience|growth opportunity)\b.*\b(failure|loss|harm)\b/gi,
  // Authority replacing insight
  /\b(policy requires|mandate|compliance)\b.*\b(regardless|despite)\b/gi,
];

/**
 * Patterns indicating substantive content
 */
const SUBSTANTIVE_PATTERNS = [
  /\b(implements?|fixes?|adds?|removes?|refactors?|optimizes?)\b/gi,
  /\b(because|therefore|however|although|whereas)\b/gi,
  /\b(test|spec|benchmark|validate|verify)\b/gi,
  /\b(function|class|interface|type|const|let|var)\b/gi,
  /\b(import|export|require|module)\b/gi,
];

export function calculateSlopScore(content: string, config: SlopDetectionConfig = DEFAULT_CONFIG): SlopAnalysisResult {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  const totalChars = content.length;

  // Calculate substantive content ratio
  const substantiveMatches = SUBSTANTIVE_PATTERNS.reduce((count, pattern) => {
    const matches = content.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);

  const slopMatches = SLOP_PATTERNS.reduce((count, pattern) => {
    const matches = content.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);

  const totalIndicators = substantiveMatches + slopMatches;
  const substantiveRatio = totalIndicators > 0 ? substantiveMatches / totalIndicators : 0.5;

  // Estimate novel insights (unique concepts introduced)
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  const functionDefs = content.match(/\b(function|class|interface|const)\s+\w+/g) || [];
  const novelInsights = new Set([...functionDefs]).size + codeBlocks.length;

  // Calculate circular reference ratio (self-referential language)
  const selfRefPatterns = [
    /\b(this (file|code|implementation|module))\b/gi,
    /\b(above|below|here|following)\b/gi,
    /\b(as we|as I|we can see)\b/gi,
  ];

  const selfRefMatches = selfRefPatterns.reduce((count, pattern) => {
    const matches = content.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);

  const circularReferenceRatio = lines.length > 0 ? selfRefMatches / lines.length : 0;

  // Cross-reference validity (presence of file paths, links, concrete references)
  const concreteRefs = content.match(/(file:\/\/|https?:\/\/|\.ts|\.py|\.js|\.md|\w+\.\w+:\d+)/g) || [];
  const crossReferenceValidity = lines.length > 0 ? Math.min(concreteRefs.length / (lines.length * 0.1), 1) : 0.5;

  // Calculate final score (0 = pure slop, 1 = pure substance)
  const weights = {
    substantive: 0.35,
    novelty: 0.25,
    crossRef: 0.20,
    circular: 0.20,
  };

  const noveltyScore = Math.min(novelInsights / config.novel_insight_count, 1);
  const circularScore = 1 - Math.min(circularReferenceRatio / config.circular_reference_threshold, 1);

  const score = (
    (substantiveRatio >= config.substantive_content_ratio ? substantiveRatio : substantiveRatio * 0.5) * weights.substantive +
    noveltyScore * weights.novelty +
    (crossReferenceValidity >= config.cross_reference_validity ? 1 : crossReferenceValidity) * weights.crossRef +
    circularScore * weights.circular
  );

  const passed = score >= SLOP_THRESHOLD;

  const details: string[] = [];
  const recommendations: string[] = [];

  if (substantiveRatio < config.substantive_content_ratio) {
    details.push(`Low substantive content ratio: ${(substantiveRatio * 100).toFixed(1)}% (threshold: ${config.substantive_content_ratio * 100}%)`);
    recommendations.push('Add more concrete implementation details, function definitions, or specific technical content.');
  }

  if (novelInsights < config.novel_insight_count) {
    details.push(`Insufficient novel insights: ${novelInsights} (minimum: ${config.novel_insight_count})`);
    recommendations.push('Include more unique concepts, new functions/classes, or distinct code examples.');
  }

  if (circularReferenceRatio > config.circular_reference_threshold) {
    details.push(`High circular reference ratio: ${(circularReferenceRatio * 100).toFixed(1)}% (max: ${config.circular_reference_threshold * 100}%)`);
    recommendations.push('Reduce self-referential language. Be more direct and specific.');
  }

  return {
    score,
    passed,
    metrics: {
      substantiveRatio,
      novelInsights,
      crossReferenceValidity,
      circularReferenceRatio,
    },
    details,
    recommendations,
  };
}

export function blockMergeOnSlop(prDiff: string, config?: SlopDetectionConfig): { blocked: boolean; message: string } {
  const result = calculateSlopScore(prDiff, config);

  if (!result.passed) {
    return {
      blocked: true,
      message: `High slop score detected (${(result.score * 100).toFixed(1)}%). Human review required.\n\n` +
               `Issues:\n${result.details.map(d => `- ${d}`).join('\n')}\n\n` +
               `Recommendations:\n${result.recommendations.map(r => `- ${r}`).join('\n')}`,
    };
  }

  return {
    blocked: false,
    message: `Slop check passed (score: ${(result.score * 100).toFixed(1)}%)`,
  };
}
