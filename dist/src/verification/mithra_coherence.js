/**
 * Mithra Coherence Validation System
 *
 * Implements three-way alignment checking between:
 * - Intention (PR description, commit messages)
 * - Documentation (README, comments, docstrings)
 * - Implementation (actual code changes)
 *
 * Named after Mithra - the binding coherence between thought, word, and deed.
 */
const MITHRA_THRESHOLD = 0.7;
/**
 * Extract key concepts from text using simple keyword extraction
 */
function extractConcepts(text) {
    const concepts = new Set();
    // Extract function/class names
    const functionMatches = text.match(/\b(function|class|interface|type|const|def)\s+(\w+)/gi) || [];
    functionMatches.forEach(match => {
        if (typeof match === 'string') {
            const parts = match.split(/\s+/);
            const name = parts[1];
            if (name && typeof name === 'string' && name.length > 2) {
                concepts.add(name.toLowerCase());
            }
        }
    });
    // Extract action verbs
    const actionVerbs = text.match(/\b(add|remove|fix|implement|update|refactor|optimize|create|delete|modify)\w*/gi) || [];
    actionVerbs.forEach(verb => {
        if (typeof verb === 'string') {
            concepts.add(verb.toLowerCase());
        }
    });
    // Extract technical terms
    const techTerms = text.match(/\b(api|database|authentication|authorization|validation|cache|queue|webhook|endpoint)\b/gi) || [];
    techTerms.forEach(term => {
        if (typeof term === 'string') {
            concepts.add(term.toLowerCase());
        }
    });
    return concepts;
}
/**
 * Calculate Jaccard similarity between two concept sets
 */
function calculateSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0)
        return 1;
    if (setA.size === 0 || setB.size === 0)
        return 0;
    const arrA = Array.from(setA);
    const arrB = Array.from(setB);
    const intersection = arrA.filter(x => setB.has(x));
    const unionSize = new Set(arrA.concat(arrB)).size;
    return intersection.length / unionSize;
}
/**
 * Measure coherence between PR description, code changes, and commit messages
 */
export function measureCoherence(context) {
    const intentionText = `${context.description} ${context.commitMessages.join(' ')}`;
    const codeText = context.codeChanges.map(c => [...c.additions, ...c.deletions].join(' ')).join(' ');
    const docsText = context.documentationChanges.join(' ');
    const intentionConcepts = extractConcepts(intentionText);
    const codeConcepts = extractConcepts(codeText);
    const docsConcepts = extractConcepts(docsText);
    const intentionToCode = calculateSimilarity(intentionConcepts, codeConcepts);
    const intentionToDocs = docsConcepts.size > 0 ? calculateSimilarity(intentionConcepts, docsConcepts) : 1;
    const codeToDocumentation = docsConcepts.size > 0 ? calculateSimilarity(codeConcepts, docsConcepts) : 1;
    // Weighted average (intention-code alignment is most critical)
    const score = intentionToCode * 0.5 + intentionToDocs * 0.25 + codeToDocumentation * 0.25;
    const passed = score >= MITHRA_THRESHOLD;
    const misalignments = [];
    const recommendations = [];
    if (intentionToCode < 0.5) {
        const claimedConcepts = Array.from(intentionConcepts).slice(0, 5).join(', ');
        const actualConcepts = Array.from(codeConcepts).slice(0, 5).join(', ');
        misalignments.push({
            type: 'intention-code',
            severity: intentionToCode < 0.3 ? 'high' : 'medium',
            description: 'PR description does not match code changes',
            evidence: {
                claimed: claimedConcepts || '(no concepts extracted)',
                actual: actualConcepts || '(no concepts extracted)',
            },
        });
        recommendations.push('Update PR description to accurately reflect the code changes.');
    }
    if (intentionToDocs < 0.5 && docsConcepts.size > 0) {
        misalignments.push({
            type: 'intention-docs',
            severity: 'medium',
            description: 'Documentation changes do not align with stated intention',
            evidence: {
                claimed: Array.from(intentionConcepts).slice(0, 3).join(', '),
                actual: Array.from(docsConcepts).slice(0, 3).join(', '),
            },
        });
        recommendations.push('Ensure documentation reflects the stated purpose of the PR.');
    }
    if (codeToDocumentation < 0.5 && docsConcepts.size > 0) {
        misalignments.push({
            type: 'code-docs',
            severity: 'low',
            description: 'Code changes and documentation changes address different concepts',
            evidence: {
                claimed: Array.from(codeConcepts).slice(0, 3).join(', '),
                actual: Array.from(docsConcepts).slice(0, 3).join(', '),
            },
        });
        recommendations.push('Consider adding documentation for the code changes made.');
    }
    return {
        score,
        passed,
        alignment: {
            intentionToCode,
            intentionToDocs,
            codeToDocumentation,
        },
        misalignments,
        recommendations,
    };
}
/**
 * Request human review if coherence is below threshold
 */
export function requestCoherenceReview(context) {
    const result = measureCoherence(context);
    if (!result.passed) {
        const misalignmentSummary = result.misalignments
            .map(m => `[${m.severity.toUpperCase()}] ${m.description}`)
            .join('\n');
        return {
            needsReview: true,
            message: `Misalignment detected between stated intention and implementation (score: ${(result.score * 100).toFixed(1)}%).\n\n` +
                `Manual review required to verify thought-word-deed consistency.\n\n` +
                `Issues:\n${misalignmentSummary}\n\n` +
                `Recommendations:\n${result.recommendations.map(r => `- ${r}`).join('\n')}`,
        };
    }
    return {
        needsReview: false,
        message: `Coherence check passed (score: ${(result.score * 100).toFixed(1)}%)`,
    };
}
//# sourceMappingURL=mithra_coherence.js.map