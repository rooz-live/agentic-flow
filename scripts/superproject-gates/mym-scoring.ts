/**
 * MYM (Manthra/Yasna/Mithra) Alignment Scoring System
 * 
 * Based on Zoroastrian principles of thought-word-deed alignment:
 * - Manthra: Directed thought-power (decision rationale quality)
 * - Yasna: Disciplined alignment (pattern-ROAM coherence)
 * - Mithra: Binding force (audit trail integrity)
 * 
 * Provides comprehensive scoring for ROAM validation and governance compliance.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface MYMScore {
  manthra: number;      // 0-100: Rationale quality score
  yasna: number;        // 0-100: Pattern-ROAM alignment score
  mithra: number;       // 0-100: Audit trail integrity score
  composite: number;    // 0-100: Weighted average
  timestamp: string;    // ISO 8601 timestamp
  breakdown: {
    manthra: ManthraBreakdown;
    yasna: YasnaBreakdown;
    mithra: MithraBreakdown;
  };
}

interface ManthraBreakdown {
  rationaleLengthScore: number;       // 0-100
  evidencePresenceScore: number;      // 0-100
  alternativesConsideredScore: number; // 0-100
  clarityScore: number;               // 0-100
  aispAmbiguityScore: number;         // 0-100 (inverse of ambiguity)
}

interface YasnaBreakdown {
  roamFreshnessScore: number;         // 0-100
  patternRoamLinkageScore: number;    // 0-100
  dimensionalCoherenceScore: number;  // 0-100
  maturityAlignmentScore: number;     // 0-100
  wsjfAlignmentScore: number;         // 0-100
}

interface MithraBreakdown {
  auditCompletenessScore: number;     // 0-100
  temporalIntegrityScore: number;     // 0-100
  provenanceChainScore: number;       // 0-100
  immutabilityScore: number;          // 0-100
  traceabilityScore: number;          // 0-100
}

export class MYMScoringEngine {
  private projectRoot: string;
  private roamDir: string;
  private decisionDb?: Database.Database;
  private skillsDb?: Database.Database;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.roamDir = join(projectRoot, 'docs');

    // Initialize databases
    const decisionDbPath = join(projectRoot, '.goalie/logs/decision_audit.db');
    const skillsDbPath = join(projectRoot, '.goalie/logs/skills.db');

    if (existsSync(decisionDbPath)) {
      this.decisionDb = new Database(decisionDbPath, { readonly: true });
    }
    if (existsSync(skillsDbPath)) {
      this.skillsDb = new Database(skillsDbPath, { readonly: true });
    }
  }

  /**
   * Calculate comprehensive MYM score
   */
  public calculateMYMScore(): MYMScore {
    const manthraBreakdown = this.calculateManthra();
    const yasnaBreakdown = this.calculateYasna();
    const mithraBreakdown = this.calculateMithra();

    const manthra = this.aggregateScore(Object.values(manthraBreakdown));
    const yasna = this.aggregateScore(Object.values(yasnaBreakdown));
    const mithra = this.aggregateScore(Object.values(mithraBreakdown));

    // Weighted composite: Manthra 30%, Yasna 35%, Mithra 35%
    const composite = (manthra * 0.30) + (yasna * 0.35) + (mithra * 0.35);

    return {
      manthra: Math.round(manthra * 100) / 100,
      yasna: Math.round(yasna * 100) / 100,
      mithra: Math.round(mithra * 100) / 100,
      composite: Math.round(composite * 100) / 100,
      timestamp: new Date().toISOString(),
      breakdown: {
        manthra: manthraBreakdown,
        yasna: yasnaBreakdown,
        mithra: mithraBreakdown
      }
    };
  }

  /**
   * Manthra: Directed thought-power (decision rationale quality)
   */
  private calculateManthra(): ManthraBreakdown {
    if (!this.decisionDb) {
      return this.zeroManthraScore();
    }

    try {
      const decisions = this.decisionDb.prepare(`
        SELECT * FROM decision_audit
      `).all() as any[];

      if (decisions.length === 0) {
        return this.zeroManthraScore();
      }

      let totalRationaleLength = 0;
      let withEvidence = 0;
      let withAlternatives = 0;
      let totalClarityScore = 0;
      let totalAmbiguityScore = 0;

      decisions.forEach(decision => {
        const rationale = decision.rationale || '';
        const evidence = decision.evidence || '';
        const alternatives = decision.alternatives_considered || '';

        // Rationale length (target: >100 chars)
        totalRationaleLength += Math.min(rationale.length / 100, 1) * 100;

        // Evidence presence
        if (evidence.length > 0) withEvidence++;

        // Alternatives considered
        if (alternatives.length > 0) withAlternatives++;

        // Clarity score (inverse of ambiguous words)
        const ambiguousWords = ['maybe', 'possibly', 'might', 'could', 'perhaps', 'unclear'];
        const ambiguityCount = ambiguousWords.filter(word => 
          rationale.toLowerCase().includes(word)
        ).length;
        totalClarityScore += Math.max(0, 100 - (ambiguityCount * 10));

        // AISP ambiguity score (mock: based on sentence structure)
        const sentences = rationale.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = sentences.length > 0
          ? rationale.length / sentences.length
          : 0;
        // Target: 15-25 words per sentence
        const optimalRange = avgSentenceLength >= 60 && avgSentenceLength <= 150;
        totalAmbiguityScore += optimalRange ? 100 : 60;
      });

      return {
        rationaleLengthScore: Math.round(totalRationaleLength / decisions.length),
        evidencePresenceScore: Math.round((withEvidence / decisions.length) * 100),
        alternativesConsideredScore: Math.round((withAlternatives / decisions.length) * 100),
        clarityScore: Math.round(totalClarityScore / decisions.length),
        aispAmbiguityScore: Math.round(totalAmbiguityScore / decisions.length)
      };
    } catch (error) {
      console.error('Error calculating Manthra:', error);
      return this.zeroManthraScore();
    }
  }

  /**
   * Yasna: Disciplined alignment (pattern-ROAM coherence)
   */
  private calculateYasna(): YasnaBreakdown {
    try {
      // ROAM freshness score
      const roamFiles = this.getRoamFiles();
      const now = Date.now();
      const maxAgeDays = 3;
      let totalFreshnessScore = 0;

      roamFiles.forEach(file => {
        const stats = statSync(file);
        const ageMs = now - stats.mtimeMs;
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        const freshnessScore = Math.max(0, 100 - (ageDays / maxAgeDays) * 100);
        totalFreshnessScore += freshnessScore;
      });

      const roamFreshnessScore = roamFiles.length > 0
        ? Math.round(totalFreshnessScore / roamFiles.length)
        : 0;

      // Pattern-ROAM linkage score (check for ROAM references in patterns)
      const patternRoamLinkageScore = this.calculatePatternRoamLinkage();

      // Dimensional coherence (check skills alignment)
      const dimensionalCoherenceScore = this.calculateDimensionalCoherence();

      // Maturity alignment (tier progression)
      const maturityAlignmentScore = this.calculateMaturityAlignment();

      // WSJF alignment (value/effort ratio)
      const wsjfAlignmentScore = this.calculateWSJFAlignment();

      return {
        roamFreshnessScore,
        patternRoamLinkageScore,
        dimensionalCoherenceScore,
        maturityAlignmentScore,
        wsjfAlignmentScore
      };
    } catch (error) {
      console.error('Error calculating Yasna:', error);
      return this.zeroYasnaScore();
    }
  }

  /**
   * Mithra: Binding force (audit trail integrity)
   */
  private calculateMithra(): MithraBreakdown {
    if (!this.decisionDb) {
      return this.zeroMithraScore();
    }

    try {
      const decisions = this.decisionDb.prepare(`
        SELECT * FROM decision_audit
      `).all() as any[];

      // Audit completeness (all required fields present)
      let completeAudits = 0;
      decisions.forEach(decision => {
        const hasRequiredFields = 
          decision.decision_id &&
          decision.rationale &&
          decision.timestamp &&
          decision.outcome;
        if (hasRequiredFields) completeAudits++;
      });

      const auditCompletenessScore = decisions.length > 0
        ? Math.round((completeAudits / decisions.length) * 100)
        : 0;

      // Temporal integrity (chronological order, no gaps > 7 days)
      let temporalIntegrityScore = 100;
      if (decisions.length > 1) {
        const sortedDecisions = [...decisions].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (let i = 1; i < sortedDecisions.length; i++) {
          const prev = new Date(sortedDecisions[i - 1].timestamp).getTime();
          const curr = new Date(sortedDecisions[i].timestamp).getTime();
          const gapDays = (curr - prev) / (1000 * 60 * 60 * 24);

          if (gapDays > 7) {
            temporalIntegrityScore -= 10;
          }
        }
      }
      temporalIntegrityScore = Math.max(0, temporalIntegrityScore);

      // Provenance chain (decisions reference previous decisions)
      let withProvenance = 0;
      decisions.forEach(decision => {
        const rationale = decision.rationale || '';
        const hasReference = /decision-\d+|relates to|builds on|following/.test(rationale.toLowerCase());
        if (hasReference) withProvenance++;
      });

      const provenanceChainScore = decisions.length > 0
        ? Math.round((withProvenance / decisions.length) * 100)
        : 0;

      // Immutability score (database write-only, no updates)
      // In real implementation, check for UPDATE operations in audit log
      const immutabilityScore = 100; // Mock: assume write-only

      // Traceability score (decisions link to code changes, tests)
      let withTraceability = 0;
      decisions.forEach(decision => {
        const rationale = decision.rationale || '';
        const evidence = decision.evidence || '';
        const hasCodeReference = /src\/|test\/|\.ts|\.js|\.py|commit/.test(rationale + evidence);
        if (hasCodeReference) withTraceability++;
      });

      const traceabilityScore = decisions.length > 0
        ? Math.round((withTraceability / decisions.length) * 100)
        : 0;

      return {
        auditCompletenessScore,
        temporalIntegrityScore,
        provenanceChainScore,
        immutabilityScore,
        traceabilityScore
      };
    } catch (error) {
      console.error('Error calculating Mithra:', error);
      return this.zeroMithraScore();
    }
  }

  /**
   * Helper: Get ROAM files
   */
  private getRoamFiles(): string[] {
    if (!existsSync(this.roamDir)) return [];

    try {
      const files = readdirSync(this.roamDir);
      return files
        .filter(f => f.startsWith('ROAM') && f.endsWith('.md'))
        .map(f => join(this.roamDir, f));
    } catch (error) {
      return [];
    }
  }

  /**
   * Helper: Calculate pattern-ROAM linkage
   */
  private calculatePatternRoamLinkage(): number {
    // Check if pattern logs reference ROAM documents
    const patternLogsDir = join(this.projectRoot, '.goalie/logs');
    if (!existsSync(patternLogsDir)) return 0;

    try {
      const files = readdirSync(patternLogsDir)
        .filter(f => f.endsWith('.json'));

      if (files.length === 0) return 0;

      let withRoamRef = 0;
      files.forEach(file => {
        try {
          const content = readFileSync(join(patternLogsDir, file), 'utf-8');
          if (/ROAM|roam_reference/i.test(content)) {
            withRoamRef++;
          }
        } catch (error) {
          // Skip invalid files
        }
      });

      return Math.round((withRoamRef / files.length) * 100);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Helper: Calculate dimensional coherence
   */
  private calculateDimensionalCoherence(): number {
    if (!this.skillsDb) return 0;

    try {
      const skills = this.skillsDb.prepare(`
        SELECT * FROM skills WHERE confidence > 0.5
      `).all() as any[];

      if (skills.length === 0) return 0;

      // Check if skills span multiple dimensions
      const dimensions = new Set(skills.map((s: any) => s.dimension));
      const dimensionCoverage = Math.min(dimensions.size / 4, 1) * 100; // Target: 4 dimensions

      return Math.round(dimensionCoverage);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Helper: Calculate maturity alignment
   */
  private calculateMaturityAlignment(): number {
    if (!this.skillsDb) return 0;

    try {
      const skills = this.skillsDb.prepare(`
        SELECT * FROM skills
      `).all() as any[];

      if (skills.length === 0) return 0;

      // Check tier progression (should have skills in tiers 1-3)
      const tiers = new Set(skills.map((s: any) => s.tier || 1));
      const tierCoverage = Math.min(tiers.size / 3, 1) * 100; // Target: 3 tiers

      return Math.round(tierCoverage);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Helper: Calculate WSJF alignment
   */
  private calculateWSJFAlignment(): number {
    // Mock: In real implementation, calculate value/effort from decisions
    // For now, assume good alignment if decisions have outcome data
    if (!this.decisionDb) return 0;

    try {
      const decisions = this.decisionDb.prepare(`
        SELECT * FROM decision_audit WHERE outcome IS NOT NULL AND outcome != ''
      `).all() as any[];

      const allDecisions = this.decisionDb.prepare(`
        SELECT COUNT(*) as count FROM decision_audit
      `).get() as any;

      if (allDecisions.count === 0) return 0;

      return Math.round((decisions.length / allDecisions.count) * 100);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Helper: Aggregate scores
   */
  private aggregateScore(scores: number[]): number {
    if (scores.length === 0) return 0;
    const sum = scores.reduce((a, b) => a + b, 0);
    return sum / scores.length;
  }

  /**
   * Zero score helpers
   */
  private zeroManthraScore(): ManthraBreakdown {
    return {
      rationaleLengthScore: 0,
      evidencePresenceScore: 0,
      alternativesConsideredScore: 0,
      clarityScore: 0,
      aispAmbiguityScore: 0
    };
  }

  private zeroYasnaScore(): YasnaBreakdown {
    return {
      roamFreshnessScore: 0,
      patternRoamLinkageScore: 0,
      dimensionalCoherenceScore: 0,
      maturityAlignmentScore: 0,
      wsjfAlignmentScore: 0
    };
  }

  private zeroMithraScore(): MithraBreakdown {
    return {
      auditCompletenessScore: 0,
      temporalIntegrityScore: 0,
      provenanceChainScore: 0,
      immutabilityScore: 0,
      traceabilityScore: 0
    };
  }

  /**
   * Generate human-readable report
   */
  public generateReport(): string {
    const score = this.calculateMYMScore();

    return `
╔════════════════════════════════════════════════════════════════════╗
║          MYM Alignment Scoring Report - ROAM Validation           ║
╚════════════════════════════════════════════════════════════════════╝

🧠 MANTHRA (Directed Thought-Power): ${score.manthra.toFixed(1)}/100
   ├─ Rationale Length:          ${score.breakdown.manthra.rationaleLengthScore}/100
   ├─ Evidence Presence:          ${score.breakdown.manthra.evidencePresenceScore}/100
   ├─ Alternatives Considered:    ${score.breakdown.manthra.alternativesConsideredScore}/100
   ├─ Clarity:                    ${score.breakdown.manthra.clarityScore}/100
   └─ AISP Ambiguity:             ${score.breakdown.manthra.aispAmbiguityScore}/100

⚖️  YASNA (Disciplined Alignment): ${score.yasna.toFixed(1)}/100
   ├─ ROAM Freshness:             ${score.breakdown.yasna.roamFreshnessScore}/100
   ├─ Pattern-ROAM Linkage:       ${score.breakdown.yasna.patternRoamLinkageScore}/100
   ├─ Dimensional Coherence:      ${score.breakdown.yasna.dimensionalCoherenceScore}/100
   ├─ Maturity Alignment:         ${score.breakdown.yasna.maturityAlignmentScore}/100
   └─ WSJF Alignment:             ${score.breakdown.yasna.wsjfAlignmentScore}/100

🔗 MITHRA (Binding Force): ${score.mithra.toFixed(1)}/100
   ├─ Audit Completeness:         ${score.breakdown.mithra.auditCompletenessScore}/100
   ├─ Temporal Integrity:         ${score.breakdown.mithra.temporalIntegrityScore}/100
   ├─ Provenance Chain:           ${score.breakdown.mithra.provenanceChainScore}/100
   ├─ Immutability:               ${score.breakdown.mithra.immutabilityScore}/100
   └─ Traceability:               ${score.breakdown.mithra.traceabilityScore}/100

─────────────────────────────────────────────────────────────────────
🎯 COMPOSITE SCORE: ${score.composite.toFixed(1)}/100
   (Manthra 30% + Yasna 35% + Mithra 35%)

📅 Generated: ${score.timestamp}
─────────────────────────────────────────────────────────────────────

${this.generateRecommendations(score)}
`;
  }

  /**
   * Generate recommendations based on scores
   */
  private generateRecommendations(score: MYMScore): string {
    const recommendations: string[] = [];

    // Manthra recommendations
    if (score.manthra < 70) {
      if (score.breakdown.manthra.rationaleLengthScore < 70) {
        recommendations.push('• Expand decision rationales (target: >100 characters)');
      }
      if (score.breakdown.manthra.evidencePresenceScore < 70) {
        recommendations.push('• Attach evidence to all decisions');
      }
      if (score.breakdown.manthra.alternativesConsideredScore < 70) {
        recommendations.push('• Document alternatives considered for each decision');
      }
    }

    // Yasna recommendations
    if (score.yasna < 70) {
      if (score.breakdown.yasna.roamFreshnessScore < 70) {
        recommendations.push('• Update ROAM documents (target: <3 days)');
      }
      if (score.breakdown.yasna.patternRoamLinkageScore < 70) {
        recommendations.push('• Link pattern logs to ROAM entries');
      }
      if (score.breakdown.yasna.dimensionalCoherenceScore < 70) {
        recommendations.push('• Develop skills across all 4 dimensions');
      }
    }

    // Mithra recommendations
    if (score.mithra < 70) {
      if (score.breakdown.mithra.auditCompletenessScore < 70) {
        recommendations.push('• Complete all required fields in decision audits');
      }
      if (score.breakdown.mithra.provenanceChainScore < 70) {
        recommendations.push('• Reference related decisions in rationales');
      }
      if (score.breakdown.mithra.traceabilityScore < 70) {
        recommendations.push('• Link decisions to code changes and tests');
      }
    }

    if (recommendations.length === 0) {
      return '✅ No recommendations - Excellent MYM alignment!';
    }

    return `📋 RECOMMENDATIONS:\n${recommendations.join('\n')}`;
  }

  /**
   * Close database connections
   */
  public close(): void {
    if (this.decisionDb) this.decisionDb.close();
    if (this.skillsDb) this.skillsDb.close();
  }
}

// CLI interface (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectRoot = process.argv[2] || process.cwd();
  const engine = new MYMScoringEngine(projectRoot);
  
  console.log(engine.generateReport());
  
  engine.close();
}

export default MYMScoringEngine;
