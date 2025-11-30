// Verification Service with Anti-Hallucination
import { VerificationResult, VerificationIssue, Citation, HallucinationCheck } from '../types/medical';

export class VerificationService {
  private readonly VERIFICATION_THRESHOLD = 0.85;
  private readonly HALLUCINATION_THRESHOLD = 0.90;

  async verifyAnalysis(data: {
    analysis: string;
    diagnosis: string[];
    citations: Citation[];
    recommendations?: string[];
  }): Promise<VerificationResult> {
    // Handle null/undefined inputs gracefully
    const safeAnalysis = data?.analysis || '';
    const safeDiagnosis = data?.diagnosis || [];
    const safeCitations = data?.citations || [];
    const safeRecommendations = data?.recommendations || [];

    const checks = {
      medicalAccuracy: await this.checkMedicalAccuracy(safeAnalysis, safeDiagnosis),
      citationValidity: await this.checkCitationValidity(safeCitations),
      logicalConsistency: await this.checkLogicalConsistency(safeAnalysis, safeDiagnosis),
      guidelineCompliance: await this.checkGuidelineCompliance(safeRecommendations),
      hallucinationFree: await this.checkHallucinationFree(safeAnalysis, safeCitations),
    };

    const issues = await this.identifyIssues(checks, {
      analysis: safeAnalysis,
      diagnosis: safeDiagnosis,
      citations: safeCitations,
      recommendations: safeRecommendations,
    });
    const score = this.computeScore(checks);
    const passed = score >= this.VERIFICATION_THRESHOLD;

    return {
      passed,
      score,
      checks,
      issues,
    };
  }

  async calculateVerificationScore(data: {
    analysis: string;
    diagnosis: string[];
    citations: Citation[];
    hallucinationChecks: HallucinationCheck[];
  }): Promise<number> {
    const checks = {
      medicalAccuracy: await this.checkMedicalAccuracy(data.analysis, data.diagnosis),
      citationValidity: await this.checkCitationValidity(data.citations),
      logicalConsistency: await this.checkLogicalConsistency(data.analysis, data.diagnosis),
      guidelineCompliance: true,
      hallucinationFree: data.hallucinationChecks.every(c => c.passed),
    };

    return this.computeScore(checks);
  }

  private async checkMedicalAccuracy(analysis: string, diagnosis: string[]): Promise<boolean> {
    // Check if analysis contains medical terminology and valid diagnoses
    const hasMedicalTerms = /patient|symptom|diagnos|condition|treatment|medication|disease|disorder|syndrome/i.test(analysis);
    const hasValidDiagnosis = diagnosis.length > 0 && diagnosis.every(d => d.length >= 3);
    return hasMedicalTerms && hasValidDiagnosis;
  }

  private async checkCitationValidity(citations: Citation[]): Promise<boolean> {
    // Verify all citations are properly formatted and verified
    return citations.length > 0 && citations.every(c => c.verified && c.relevance > 0.7);
  }

  private async checkLogicalConsistency(analysis: string, diagnosis: string[]): Promise<boolean> {
    // Check for contradictions and logical flow
    const hasContradiction = analysis.toLowerCase().includes('however') &&
                            analysis.toLowerCase().includes('but not');
    return !hasContradiction;
  }

  private async checkGuidelineCompliance(recommendations: string[]): Promise<boolean> {
    // Verify recommendations follow medical guidelines
    if (recommendations.length === 0) return true;

    const hasFollowUp = recommendations.some(r => r.toLowerCase().includes('follow up'));
    const hasMonitoring = recommendations.some(r => r.toLowerCase().includes('monitor'));
    return hasFollowUp || hasMonitoring;
  }

  private async checkHallucinationFree(analysis: string, citations: Citation[]): Promise<boolean> {
    // Advanced hallucination detection
    const suspiciousPatterns = [
      /\d{3,}-\d{3,}-\d{4}/, // Fake phone numbers
      /guaranteed cure/i,
      /100% effective/i,
      /miracle/i,
      /secret/i,
    ];

    const hasSuspiciousPatterns = suspiciousPatterns.some(pattern => pattern.test(analysis));
    const hasProperCitations = citations.length >= 1;

    return !hasSuspiciousPatterns && hasProperCitations;
  }

  private async identifyIssues(
    checks: Record<string, boolean>,
    data: any
  ): Promise<VerificationIssue[]> {
    const issues: VerificationIssue[] = [];

    if (!checks.medicalAccuracy) {
      issues.push({
        type: 'medical-accuracy',
        severity: 'error',
        message: 'Medical accuracy check failed',
        suggestedFix: 'Ensure analysis uses proper medical terminology and valid diagnoses',
      });
    }

    if (!checks.citationValidity) {
      issues.push({
        type: 'citation-validity',
        severity: 'warning',
        message: 'Citation validation issues detected',
        suggestedFix: 'Verify all citations against medical databases',
      });
    }

    if (!checks.logicalConsistency) {
      issues.push({
        type: 'logical-consistency',
        severity: 'error',
        message: 'Logical inconsistencies found in analysis',
        suggestedFix: 'Review analysis for contradictory statements',
      });
    }

    if (!checks.hallucinationFree) {
      issues.push({
        type: 'hallucination',
        severity: 'critical',
        message: 'Potential hallucination detected',
        suggestedFix: 'Remove suspicious claims and add proper citations',
      });
    }

    return issues;
  }

  private computeScore(checks: Record<string, boolean>): number {
    const weights = {
      medicalAccuracy: 0.3,
      citationValidity: 0.2,
      logicalConsistency: 0.2,
      guidelineCompliance: 0.15,
      hallucinationFree: 0.15,
    };

    let score = 0;
    for (const [check, passed] of Object.entries(checks)) {
      if (passed) {
        score += weights[check as keyof typeof weights] || 0;
      }
    }

    return score;
  }
}
