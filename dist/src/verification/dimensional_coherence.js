/**
 * Dimensional Coherence Validator
 *
 * Implements Manthra-Yasna-Mithra alignment for ethical calibration.
 *
 * - Manthra: Directed thought-power (not casual thinking)
 * - Yasna: Alignment through practice (not performance)
 * - Mithra: Binding force keeping thought, word, deed together
 *
 * Addresses: "capacity to detect misalignment not degrade faster than
 * conditions that require it"
 */
// Drift indicators: "moral language detached from consequence"
const DRIFT_PATTERNS = {
    moral_detachment: [
        /\b(we believe in|committed to|dedicated to)\b.*\b(without|but)\b/gi,
        /\b(values|principles|ethics)\b.*\b(however|although|despite)\b/gi,
    ],
    confidence_outpacing_capacity: [
        /\b(guaranteed|always|never|100%|zero risk)\b/gi,
        /\b(perfectly|completely|absolutely)\b.*\b(safe|secure|reliable)\b/gi,
    ],
    dissent_as_threat: [
        /\b(concerns? (are|were) (noted|acknowledged) but)\b/gi,
        /\b(dissent|disagreement|objection).*\b(addressed|handled|managed)\b/gi,
    ],
    suffering_narrativized: [
        /\b(learning experience|growth opportunity)\b.*\b(failure|loss|harm)\b/gi,
        /\b(necessary|acceptable|unavoidable)\b.*\b(cost|sacrifice|tradeoff)\b/gi,
    ],
};
// Alignment indicators: calibrated judgment
const ALIGNMENT_PATTERNS = {
    consequence_awareness: [
        /\b(because|therefore|as a result|consequently)\b/gi,
        /\b(measured|tracked|validated|verified)\b/gi,
    ],
    epistemic_humility: [
        /\b(uncertain|unclear|more research|investigation needed)\b/gi,
        /\b(tradeoff|limitation|constraint|caveat)\b/gi,
    ],
    responsibility_clarity: [
        /\b(owner|responsible|accountable|will)\b/gi,
        /\b(deadline|by|before|target|milestone)\b/gi,
    ],
};
export class DimensionalCoherenceValidator {
    driftHistory = [];
    /**
     * Assess dimensional coherence across thought, word, deed.
     */
    assessCoherence(intention, documentation, implementation) {
        // Manthra: Is the thought clear and directed?
        const manthra = this.assessManthra(intention);
        // Yasna: Does the documentation align with intention?
        const yasna = this.assessYasna(intention, documentation);
        // Mithra: Does the implementation bind thought to deed?
        const mithra = this.assessMithra(intention, documentation, implementation);
        // Detect misalignments
        const misalignments = this.detectMisalignments(intention, documentation, implementation);
        // Calculate collapse risk
        const collapseRisk = this.calculateCollapseRisk(misalignments, manthra, yasna, mithra);
        // Overall score (weighted)
        const overallScore = (manthra.clarity * 0.25 +
            yasna.alignment * 0.35 +
            mithra.coherence * 0.40);
        return {
            overallScore,
            dimensional: { manthra, yasna, mithra },
            misalignments,
            collapseRisk,
            recommendations: this.generateRecommendations(misalignments, collapseRisk),
        };
    }
    assessManthra(intention) {
        const words = intention.split(/\s+/).length;
        const actionVerbs = (intention.match(/\b(implement|create|fix|improve|remove|add)\b/gi) || []).length;
        const clarity = Math.min(1, actionVerbs / Math.max(1, words / 20));
        return {
            clarity,
            direction: actionVerbs > 0 ? 'constructive' : 'neutral',
            focusScore: words < 100 ? 1 : Math.max(0.3, 1 - (words - 100) / 500),
        };
    }
    assessYasna(intention, documentation) {
        const intentionConcepts = this.extractConcepts(intention);
        const docConcepts = this.extractConcepts(documentation);
        const overlap = intentionConcepts.filter(c => docConcepts.some(d => d.toLowerCase().includes(c.toLowerCase()))).length;
        const alignment = intentionConcepts.length > 0
            ? overlap / intentionConcepts.length
            : 0.5;
        // Detect performative language (ritual without substance)
        const performativeMatches = DRIFT_PATTERNS.moral_detachment
            .reduce((c, p) => c + (documentation.match(p) || []).length, 0);
        return {
            alignment,
            performative: performativeMatches > 2,
            ritualIntegrity: Math.max(0, 1 - performativeMatches * 0.15),
        };
    }
    assessMithra(intention, documentation, implementation) {
        const intentionConcepts = this.extractConcepts(intention);
        const implConcepts = this.extractConcepts(implementation);
        const binding = intentionConcepts.filter(c => implConcepts.some(i => i.toLowerCase().includes(c.toLowerCase()))).length;
        const coherence = intentionConcepts.length > 0
            ? binding / intentionConcepts.length
            : 0.5;
        // Detect drift between documentation and implementation
        const docConcepts = this.extractConcepts(documentation);
        const docImplOverlap = docConcepts.filter(d => implConcepts.some(i => i.toLowerCase().includes(d.toLowerCase()))).length;
        const driftDetected = docConcepts.length > 0 &&
            (docImplOverlap / docConcepts.length) < 0.5;
        return {
            coherence,
            driftDetected,
            bindingStrength: coherence * (driftDetected ? 0.7 : 1.0),
        };
    }
    extractConcepts(text) {
        const words = text.match(/\b[A-Z][a-z]+[A-Z]\w*|\b[a-z]+_[a-z]+\b|\b[A-Z]{2,}\b/g) || [];
        const functions = text.match(/\b(function|class|interface|const|let|var)\s+(\w+)/g) || [];
        return Array.from(new Set([...words, ...functions]));
    }
    detectMisalignments(intention, documentation, implementation) {
        const signals = [];
        const combined = `${intention} ${documentation} ${implementation}`;
        // Check each drift pattern category
        for (const [category, patterns] of Object.entries(DRIFT_PATTERNS)) {
            for (const pattern of patterns) {
                const matches = combined.match(pattern);
                if (matches && matches.length > 0) {
                    signals.push({
                        dimension: this.categoryToDimension(category),
                        severity: matches.length > 2 ? 'high' : 'medium',
                        pattern: category,
                        evidence: matches.slice(0, 3).join(', '),
                        remediationPath: this.getRemediationPath(category),
                    });
                }
            }
        }
        return signals;
    }
    categoryToDimension(category) {
        if (category.includes('confidence') || category.includes('moral'))
            return 'yasna';
        if (category.includes('dissent') || category.includes('suffering'))
            return 'mithra';
        return 'manthra';
    }
    getRemediationPath(category) {
        const paths = {
            moral_detachment: 'Reconnect stated values to measurable outcomes',
            confidence_outpacing_capacity: 'Add uncertainty quantification and caveats',
            dissent_as_threat: 'Treat dissent as signal, not threat',
            suffering_narrativized: 'Acknowledge costs directly without euphemism',
        };
        return paths[category] || 'Review alignment between intention and action';
    }
    calculateCollapseRisk(misalignments, manthra, yasna, mithra) {
        const criticalCount = misalignments.filter(m => m.severity === 'critical').length;
        const highCount = misalignments.filter(m => m.severity === 'high').length;
        const baseRisk = criticalCount * 0.3 + highCount * 0.15;
        const coherenceDeficit = 1 - mithra.coherence;
        const driftPenalty = mithra.driftDetected ? 0.2 : 0;
        const performativePenalty = yasna.performative ? 0.15 : 0;
        return Math.min(1, baseRisk + coherenceDeficit * 0.3 + driftPenalty + performativePenalty);
    }
    generateRecommendations(misalignments, collapseRisk) {
        const recs = [];
        if (collapseRisk > 0.7) {
            recs.push('CRITICAL: High collapse risk. Pause and realign before proceeding.');
        }
        const byDimension = misalignments.reduce((acc, m) => {
            acc[m.dimension] = (acc[m.dimension] || 0) + 1;
            return acc;
        }, {});
        if ((byDimension.manthra || 0) > 1) {
            recs.push('Manthra: Clarify intention with specific, measurable goals');
        }
        if ((byDimension.yasna || 0) > 1) {
            recs.push('Yasna: Align documentation with actual capability and constraints');
        }
        if ((byDimension.mithra || 0) > 1) {
            recs.push('Mithra: Close the gap between stated goals and implementation');
        }
        return recs;
    }
}
export const coherenceValidator = new DimensionalCoherenceValidator();
//# sourceMappingURL=dimensional_coherence.js.map