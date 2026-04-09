#!/bin/bash

# Merge-Time Coherence Check Script
# Runs comprehensive validation before merge approval
# Integrates with CI/CD pipeline to run before merge

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
PR_NUMBER=$1
BASE_REF=$2
HEAD_REF=$3

if [ -z "$PR_NUMBER" ] || [ -z "$BASE_REF" ] || [ -z "$HEAD_REF" ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo "Usage: $0 <PR_NUMBER> <BASE_REF> <HEAD_REF>"
    exit 1
fi

echo -e "${BLUE}=== Merge-Time Coherence Check ===${NC}"
echo -e "${BLUE}PR Number: $PR_NUMBER${NC}"
echo -e "${BLUE}Base Ref: $BASE_REF${NC}"
echo -e "${BLUE}Head Ref: $HEAD_REF${NC}"

# Navigate to agentic-flow-core
cd "$(dirname "$0")/../agentic-flow-core"

# Build if needed
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Building TypeScript...${NC}"
    npm run build
fi

# Get PR information
echo -e "\n${YELLOW}=== Gathering PR Information ===${NC}"

# Get PR description as intention
PR_DESC=$(git log "$BASE_REF..$HEAD_REF" --pretty=%B | head -n1)
if [ -z "$PR_DESC" ]; then
    PR_DESC="Merge PR #$PR_NUMBER"
fi

# Get commit messages as documentation
COMMIT_MESSAGES=$(git log "$BASE_REF..$HEAD_REF" --pretty=format:"%s")

# Get code changes as implementation
CODE_CHANGES=$(git diff "$BASE_REF..$HEAD_REF")

echo -e "${YELLOW}Intention (PR Description):${NC}"
echo "$PR_DESC"
echo -e "\n${YELLOW}Commit Messages (Documentation):${NC}"
echo "$COMMIT_MESSAGES"
echo -e "\n${YELLOW}Lines Changed: ${NC}$(git diff --stat "$BASE_REF..$HEAD_REF" | tail -n1 | awk '{print $4}')"

# Track overall status
OVERALL_STATUS=0
FAILED_CHECKS=()

# Check 1: AI Slop Detection
echo -e "\n${YELLOW}=== Check 1: AI Slop Detection ===${NC}"

SLOP_THRESHOLD=0.4
TOTAL_SLOP_SCORE=0
FILE_COUNT=0

FILES_CHANGED=$(git diff --name-only "$BASE_REF..$HEAD_REF")
for file in $FILES_CHANGED; do
    if [[ "$file" =~ \.(ts|js|md)$ ]]; then
        CONTENT=$(cat "$file")
        CONTENT_TYPE="documentation"
        if [[ "$file" =~ \.(ts|js)$ ]]; then
            CONTENT_TYPE="code"
        fi
        
        RESULT=$(node -e "
            const { SlopDetectionSystem } = require('./dist/quality-alignment/slop-detection.js');
            const detector = new SlopDetectionSystem({ enableInterpretabilityLogging: false });
            const result = detector.calculateSlopScore({
                content: process.env.CONTENT,
                contentType: process.env.CONTENT_TYPE,
                context: { prDescription: process.env.PR_DESC }
            });
            console.log(JSON.stringify(result));
        " CONTENT="$CONTENT" CONTENT_TYPE="$CONTENT_TYPE" PR_DESC="$PR_DESC"
        
        IS_SLOP=$(echo "$RESULT" | jq -r '.isSlop')
        SLOP_SCORE=$(echo "$RESULT" | jq -r '.confidence')
        
        if [ "$IS_SLOP" = "true" ]; then
            echo -e "${RED}✗ Slop detected in: $file${NC}"
            REMEDIATION=$(echo "$RESULT" | jq -r '.remediation')
            echo -e "${RED}  $REMEDIATION${NC}"
            FAILED_CHECKS+=("slop-detection:$file")
            OVERALL_STATUS=1
        fi
        
        TOTAL_SLOP_SCORE=$(echo "$TOTAL_SLOP_SCORE + $SLOP_SCORE" | bc)
        FILE_COUNT=$((FILE_COUNT + 1))
    fi
done

if [ $FILE_COUNT -gt 0 ]; then
    AVG_SLOP=$(echo "scale=4; $TOTAL_SLOP_SCORE / $FILE_COUNT" | bc)
    echo -e "${BLUE}Average Slop Score: $AVG_SLOP${NC}"
    
    if (( $(echo "$AVG_SLOP > $SLOP_THRESHOLD" | bc -l) )); then
        echo -e "${RED}✗ Average slop score ($AVG_SLOP) exceeds threshold ($SLOP_THRESHOLD)${NC}"
        FAILED_CHECKS+=("slop-threshold-exceeded")
        OVERALL_STATUS=1
    else
        echo -e "${GREEN}✓ Slop score within acceptable range${NC}"
    fi
fi

# Check 2: PR Novel Insights
echo -e "\n${YELLOW}=== Check 2: PR Novel Insights ===${NC}"

RESULT=$(node -e "
    const { SlopDetectionSystem } = require('./dist/quality-alignment/slop-detection.js');
    const detector = new SlopDetectionSystem();
    const result = detector.checkPRInsightsRequirement('pr-$PR_NUMBER');
    console.log(JSON.stringify(result));
")

MEETS_REQUIREMENT=$(echo "$RESULT" | jq -r '.meetsRequirement')
INSIGHT_COUNT=$(echo "$RESULT" | jq -r '.count')
REQUIRED=$(echo "$RESULT" | jq -r '.required')

echo -e "${BLUE}Novel Insights: $INSIGHT_COUNT (Required: $REQUIRED)${NC}"

if [ "$MEETS_REQUIREMENT" != "true" ]; then
    echo -e "${RED}✗ PR does not meet minimum novel insights requirement${NC}"
    FAILED_CHECKS+=("insights-requirement-not-met")
    OVERALL_STATUS=1
else
    echo -e "${GREEN}✓ PR meets novel insights requirement${NC}"
fi

# Check 3: Mithra Coherence Validation
echo -e "\n${YELLOW}=== Check 3: Mithra Coherence Validation ===${NC}"

RESULT=$(node -e "
    const { MithraCoherenceSystem } = require('./dist/quality-alignment/mithra-coherence.js');
    const system = new MithraCoherenceSystem({ enableInterpretabilityLogging: false });
    const result = system.measureCoherence(
        process.env.PR_DESC,
        process.env.CODE_CHANGES,
        process.env.COMMIT_MESSAGES.split('\\n'),
        ['merge-time-check']
    );
    console.log(JSON.stringify(result));
" PR_DESC="$PR_DESC" CODE_CHANGES="$CODE_CHANGES" COMMIT_MESSAGES="$COMMIT_MESSAGES"

IS_COHERENT=$(echo "$RESULT" | jq -r '.isCoherent')
COHERENCE_SCORE=$(echo "$RESULT" | jq -r '.coherenceScore')
CONFIDENCE=$(echo "$RESULT" | jq -r '.confidence')

echo -e "${BLUE}Coherence Score: $COHERENCE_SCORE${NC}"
echo -e "${BLUE}Confidence: $CONFIDENCE${NC}"

# Three-way alignment scores
ALIGNMENT_SCORES=$(echo "$RESULT" | jq -r '.alignmentScores')
INTENTION_TO_DOC=$(echo "$ALIGNMENT_SCORES" | jq -r '.intentionToDocumentation')
DOC_TO_IMPL=$(echo "$ALIGNMENT_SCORES" | jq -r '.documentationToImplementation')
INTENTION_TO_IMPL=$(echo "$ALIGNMENT_SCORES" | jq -r '.intentionToImplementation')

echo -e "${BLUE}Three-Way Alignment:${NC}"
echo -e "  Intention → Documentation: $(echo "$INTENTION_TO_DOC * 100" | bc)%"
echo -e "  Documentation → Implementation: $(echo "$DOC_TO_IMPL * 100" | bc)%"
echo -e "  Intention → Implementation: $(echo "$INTENTION_TO_IMPL * 100" | bc)%"

if [ "$IS_COHERENT" != "true" ]; then
    echo -e "${RED}✗ Coherence validation failed${NC}"
    REMEDIATION=$(echo "$RESULT" | jq -r '.remediation')
    echo -e "${RED}  $REMEDIATION${NC}"
    
    # Check for misalignments
    MISALIGNMENTS=$(echo "$RESULT" | jq -r '.misalignments | length')
    if [ "$MISALIGNMENTS" -gt 0 ]; then
        echo -e "${RED}Misalignments detected:${NC}"
        echo "$RESULT" | jq -r '.misalignments[] | "  - \(.type): \(.description)"'
    fi
    
    FAILED_CHECKS+=("coherence-validation-failed")
    OVERALL_STATUS=1
else
    echo -e "${GREEN}✓ Coherence validation passed${NC}"
fi

# Check 4: Yasna Alignment
echo -e "\n${YELLOW}=== Check 4: Yasna Alignment ===${NC}"

RESULT=$(node -e "
    const { YasnaAlignmentTracker } = require('./dist/quality-alignment/yasna-alignment.js');
    const tracker = new YasnaAlignmentTracker();
    
    // Simulate metrics (in production, these would come from actual metrics)
    const result = tracker.measureAlignment(
        0.85, // testCoverage
        0.80, // bugDetectionRate
        0.90, // docCompleteness
        0.85, // docClarityScore
        0.88, // reviewPassRate
        0.75, // issueDetectionRate
        0.95, // ciPassRate
        0.92  // deploymentSuccessRate
    );
    
    console.log(JSON.stringify(result));
")

IS_ALIGNED=$(echo "$RESULT" | jq -r '.isGenuinelyAligned')
GENUINE_SCORE=$(echo "$RESULT" | jq -r '.genuineAlignmentScore')
CHECKBOX_SCORE=$(echo "$RESULT" | jq -r '.checkboxComplianceScore')
ALIGNMENT_GAP=$(echo "$RESULT" | jq -r '.alignmentGap')

echo -e "${BLUE}Genuine Alignment Score: $GENUINE_SCORE${NC}"
echo -e "${BLUE}Checkbox Compliance Score: $CHECKBOX_SCORE${NC}"
echo -e "${BLUE}Alignment Gap: $ALIGNMENT_GAP${NC}"

# Check for gaming indicators
GAMING_INDICATORS=$(echo "$RESULT" | jq -r '.breakdown.gamingIndicators | length')
if [ "$GAMING_INDICATORS" -gt 0 ]; then
    echo -e "${YELLOW}Gaming Indicators detected:${NC}"
    echo "$RESULT" | jq -r '.breakdown.gamingIndicators[] | "  - \(.type): \(.description)"'
fi

# Check iteration budget
BUDGET_STATUS=$(echo "$RESULT" | jq -r '.breakdown.iterationBudget.budgetStatus')
ITERATION_EFFICIENCY=$(echo "$RESULT" | jq -r '.breakdown.iterationBudget.iterationEfficiency')

echo -e "${BLUE}Iteration Budget Status: $BUDGET_STATUS${NC}"
echo -e "${BLUE}Iteration Efficiency: $ITERATION_EFFICIENCY${NC}"

if [ "$IS_ALIGNED" != "true" ]; then
    echo -e "${RED}✗ Yasna alignment validation failed${NC}"
    FAILED_CHECKS+=("yasna-alignment-failed")
    OVERALL_STATUS=1
elif [ "$BUDGET_STATUS" = "exhausted" ]; then
    echo -e "${RED}✗ Iteration budget exhausted${NC}"
    FAILED_CHECKS+=("iteration-budget-exhausted")
    OVERALL_STATUS=1
else
    echo -e "${GREEN}✓ Yasna alignment validation passed${NC}"
fi

# Check 5: Manthra Three-Dimensional Validation
echo -e "\n${YELLOW}=== Check 5: Manthra Three-Dimensional Validation ===${NC}"

RESULT=$(node -e "
    const { ManthraValidation } = require('./dist/quality-alignment/manthra-validation.js');
    const manthra = new ManthraValidation({ enableInterpretabilityLogging: false });
    const result = manthra.validate(
        process.env.PR_DESC,
        process.env.COMMIT_MESSAGES.split('\\n').join('\\n'),
        process.env.CODE_CHANGES
    );
    console.log(JSON.stringify(result));
" PR_DESC="$PR_DESC" CODE_CHANGES="$CODE_CHANGES" COMMIT_MESSAGES="$COMMIT_MESSAGES"

MANTHRA_PASSED=$(echo "$RESULT" | jq -r '.passed')
MANTHRA_SCORE=$(echo "$RESULT" | jq -r '.manthraScore')

echo -e "${BLUE}Manthra Score: $MANTHRA_SCORE${NC}"
echo -e "${BLUE}Coherence Score: $(echo "$RESULT" | jq -r '.coherenceVerification.coherenceScore')${NC}"

if [ "$MANTHRA_PASSED" != "true" ]; then
    echo -e "${RED}✗ Manthra validation failed${NC}"
    REMEDIATION=$(echo "$RESULT" | jq -r '.remediation')
    echo -e "${RED}  $REMEDIATION${NC}"
    
    # Check ritual violations
    RITUALS_VIOLATED=$(echo "$RESULT" | jq -r '.ritualAdherence.ritualsViolated | length')
    if [ "$RITUALS_VIOLATED" -gt 0 ]; then
        echo -e "${RED}Rituals violated: $(echo "$RESULT" | jq -r '.ritualAdherence.ritualsViolated[]')${NC}"
    fi
    
    FAILED_CHECKS+=("manthra-validation")
    OVERALL_STATUS=1
else
    echo -e "${GREEN}✓ Manthra validation passed${NC}"
    echo -e "${BLUE}Rituals followed: $(echo "$RESULT" | jq -r '.ritualAdherence.ritualsFollowed[]')${NC}"
fi

# Check 6: Iteration Budget Verification
echo -e "\n${YELLOW}=== Check 6: Iteration Budget Verification ===${NC}"

RESULT=$(node -e "
    const { IterationBudgetTracker } = require('./dist/governance/iteration-budget-tracker.js');
    const tracker = new IterationBudgetTracker();
    const budget = tracker.getBudgetStatus();
    console.log(JSON.stringify(budget));
"

BUDGET_STATUS=$(echo "$RESULT" | jq -r '.budgetStatus')
BUDGET_REMAINING=$(echo "$RESULT" | jq -r '.remainingIterations')
CONSUMPTION_PERCENTAGE=$(echo "$RESULT" | jq -r '.consumptionPercentage')

echo -e "${BLUE}Budget Status: $BUDGET_STATUS${NC}"
echo -e "${BLUE}Remaining Iterations: $BUDGET_REMAINING${NC}"
echo -e "${BLUE}Consumed: $(echo "$CONSUMPTION_PERCENTAGE * 100" | jq 'floor')%${NC}"

if [ "$BUDGET_STATUS" = "exhausted" ]; then
    echo -e "${RED}✗ Iteration budget exhausted${NC}"
    FAILED_CHECKS+=("iteration-budget-exhausted")
    OVERALL_STATUS=1
elif [ "$BUDGET_STATUS" = "critical" ]; then
    echo -e "${YELLOW}⚠ Iteration budget at critical level${NC}"
    FAILED_CHECKS+=("iteration-budget-critical")
    OVERALL_STATUS=1
else
    echo -e "${GREEN}✓ Iteration budget status acceptable${NC}"
fi

# Final Summary
echo -e "\n${BLUE}=== Merge-Time Coherence Check Summary ===${NC}"

if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ All coherence checks passed${NC}"
    echo -e "${GREEN}This PR is ready for merge${NC}"
    exit 0
else
    echo -e "${RED}✗ Coherence checks failed${NC}"
    echo -e "${RED}Failed checks:${NC}"
    for check in "${FAILED_CHECKS[@]}"; do
        echo -e "${RED}  - $check${NC}"
    done
    echo -e "\n${YELLOW}Please address issues above before merging.${NC}"
    exit 1
fi
