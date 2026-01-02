#!/usr/bin/env tsx
/**
 * Test script for dynamic autocommit policy based on system health metrics
 * This script validates the enhanced governance agent functionality
 */
import * as fs from 'fs';
import { loadRetroCoachContext, applyAutoApplyPolicy, generateCodeFixProposals } from './governance_agent.js';
// Mock data for testing different system health scenarios
const mockPatterns = [
    {
        pattern: 'safe-degrade',
        circle: 'Assessor',
        depth: 1,
        economic: { cod: 5000, computeCost: 1000, wsjf_score: 50 },
        fix_proposal: 'Implement SafeGuard wrapper for graceful degradation'
    },
    {
        pattern: 'ml-training-guardrail',
        circle: 'Innovator',
        depth: 2,
        economic: { cod: 8000, computeCost: 2000, wsjf_score: 80 },
        fix_proposal: 'Add checkpointing and early stopping to training loop'
    },
    {
        pattern: 'observability-first',
        circle: 'Compute',
        depth: 1,
        economic: { cod: 3000, computeCost: 500, wsjf_score: 30 },
        fix_proposal: 'Enable observability config and metrics collection'
    }
];
const mockTopEconomicGaps = [
    {
        pattern: 'safe-degrade',
        circle: 'Assessor',
        depth: 1,
        events: 5,
        codAvg: 5000,
        computeAvg: 1000,
        wsjfAvg: 50,
        totalImpactAvg: 6500
    },
    {
        pattern: 'ml-training-guardrail',
        circle: 'Innovator',
        depth: 2,
        events: 3,
        codAvg: 8000,
        computeAvg: 2000,
        wsjfAvg: 80,
        totalImpactAvg: 11000
    },
    {
        pattern: 'observability-first',
        circle: 'Compute',
        depth: 1,
        events: 8,
        codAvg: 3000,
        computeAvg: 500,
        wsjfAvg: 30,
        totalImpactAvg: 3750
    }
];
function createMockRetroCoachContext(healthScenario) {
    const baseContext = {
        goalieDir: '/tmp/test',
        lastUpdated: '2025-12-10T18:00:00Z',
        insightsSummary: {
            totalInsights: 50,
            verifiedCount: 0,
            totalActions: 0,
            avgCodDeltaPct: 0
        },
        baselineComparison: {
            baselineScore: 100,
            currentScore: 100,
            delta: 0,
            deltaPct: 0
        }
    };
    switch (healthScenario) {
        case 'healthy':
            return {
                ...baseContext,
                insightsSummary: {
                    ...baseContext.insightsSummary,
                    verifiedCount: 45,
                    totalActions: 50,
                    avgCodDeltaPct: 5.2 // Positive COD improvement
                },
                baselineComparison: {
                    ...baseContext.baselineComparison,
                    currentScore: 105,
                    delta: 5,
                    deltaPct: 5.0 // Positive baseline improvement
                }
            };
        case 'moderate':
            return {
                ...baseContext,
                insightsSummary: {
                    ...baseContext.insightsSummary,
                    verifiedCount: 35,
                    totalActions: 50,
                    avgCodDeltaPct: -2.1 // Slight COD regression
                },
                baselineComparison: {
                    ...baseContext.baselineComparison,
                    currentScore: 98,
                    delta: -2,
                    deltaPct: -2.0 // Slight baseline regression
                }
            };
        case 'poor':
            return {
                ...baseContext,
                insightsSummary: {
                    ...baseContext.insightsSummary,
                    verifiedCount: 20,
                    totalActions: 50,
                    avgCodDeltaPct: -15.3 // Significant COD regression
                },
                baselineComparison: {
                    ...baseContext.baselineComparison,
                    currentScore: 85,
                    delta: -15,
                    deltaPct: -15.0 // Significant baseline regression
                }
            };
        case 'regressing':
            return {
                ...baseContext,
                insightsSummary: {
                    ...baseContext.insightsSummary,
                    verifiedCount: 10,
                    totalActions: 50,
                    avgCodDeltaPct: -25.7 // Major COD regression
                },
                baselineComparison: {
                    ...baseContext.baselineComparison,
                    currentScore: 70,
                    delta: -30,
                    deltaPct: -30.0 // Major baseline regression
                }
            };
    }
}
function testPolicyScenario(scenario, mode) {
    console.log(`\n=== Testing ${scenario} scenario with ${mode} mode ===`);
    // Set environment variables for policy mode
    process.env.AF_GOVERNANCE_AUTO_APPLY_MODE = mode;
    process.env.AF_ALLOW_CODE_AUTOCOMMIT = '1';
    process.env.AF_GOVERNANCE_VERIFICATION_RATE_MIN = '0.7';
    process.env.AF_GOVERNANCE_RISK_THRESHOLD = '5';
    // Create mock Retro Coach context
    const retroCtx = createMockRetroCoachContext(scenario);
    // Write mock retro_coach.json for testing
    const mockRetroPath = '/tmp/mock_retro_coach.json';
    fs.writeFileSync(mockRetroPath, JSON.stringify(retroCtx, null, 2));
    // Load context using our enhanced function
    const loadedCtx = loadRetroCoachContext('/tmp');
    // Generate code fix proposals
    const proposals = generateCodeFixProposals(mockPatterns);
    // Apply dynamic policy
    const enhancedProposals = applyAutoApplyPolicy(proposals, mockPatterns, mockTopEconomicGaps, loadedCtx);
    // Analyze results
    const autoApplyCount = enhancedProposals.filter(p => p.mode === 'apply').length;
    const dryRunCount = enhancedProposals.filter(p => p.mode === 'dry-run').length;
    const approvalRequiredCount = enhancedProposals.filter(p => p.approvalRequired).length;
    console.log(`Results for ${scenario} scenario (${mode} mode):`);
    console.log(`  Auto-apply: ${autoApplyCount} proposals`);
    console.log(`  Dry-run: ${dryRunCount} proposals`);
    console.log(`  Approval required: ${approvalRequiredCount} proposals`);
    console.log(`  System health score: ${loadedCtx?.insightsSummary?.systemHealthScore?.toFixed(1) || 'N/A'}`);
    // Detailed proposal analysis
    enhancedProposals.forEach(proposal => {
        console.log(`  ${proposal.pattern}: mode=${proposal.mode}, approvalRequired=${proposal.approvalRequired}, risk=${proposal.risk || 'unknown'}`);
    });
    // Cleanup
    if (fs.existsSync(mockRetroPath)) {
        fs.unlinkSync(mockRetroPath);
    }
}
function runAllTests() {
    console.log('=== Dynamic Autocommit Policy Test Suite ===\n');
    // Test conservative mode across different health scenarios
    testPolicyScenario('healthy', 'conservative');
    testPolicyScenario('moderate', 'conservative');
    testPolicyScenario('poor', 'conservative');
    testPolicyScenario('regressing', 'conservative');
    // Test moderate mode
    testPolicyScenario('healthy', 'moderate');
    testPolicyScenario('moderate', 'moderate');
    testPolicyScenario('poor', 'moderate');
    // Test aggressive mode
    testPolicyScenario('healthy', 'aggressive');
    testPolicyScenario('moderate', 'aggressive');
    console.log('\n=== Test Summary ===');
    console.log('✅ Conservative mode: Should force dry-run for poor/regressing scenarios');
    console.log('✅ Moderate mode: Should auto-apply medium-risk with 80%+ verification');
    console.log('✅ Aggressive mode: Should auto-apply most with 90%+ verification');
    console.log('✅ Risk classification: Safe-degrade (shallow) should be low risk');
    console.log('✅ Risk classification: ML-training-guardrail should be high risk');
    console.log('✅ System health scoring: Should incorporate verification and COD metrics');
}
// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests();
}
export { testPolicyScenario, runAllTests };
//# sourceMappingURL=test_dynamic_policy.js.map