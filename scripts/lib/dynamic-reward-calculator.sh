#!/usr/bin/env bash
#
# dynamic-reward-calculator.sh
# Wrapper for MCP/MPP dynamic reward calculation
#

get_dynamic_reward() {
    local episode_id="$1"
    local circle="$2"
    local ceremony="$3"
    local success="${4:-1}"
    local latency_ms="${5:-0}"

    # Call AgentDB to calculate reward based on learned patterns
    local db_path="${DB_PATH:-./agentdb.db}"
    local reward=$(npx agentdb stats --json "$db_path" 2>/dev/null | \
        jq -r --arg circle "$circle" --arg ceremony "$ceremony" \
        '.rewardByCircle[$circle] // .averageReward // 0.0' 2>/dev/null || echo "0.0")

    # If no learned reward, use swarm optimizer default calculation
    if [ "$reward" == "0.0" ] || [ -z "$reward" ]; then
        # Fallback: calculate based on success + latency
        if [ "$success" == "1" ]; then
            # Base: 0.5
            # Success rate bonus: +0.2 if latency < 1000ms
            # Efficiency bonus: +0.3 if latency < 500ms
            if [ "$latency_ms" -lt 500 ]; then
                reward="0.95"
            elif [ "$latency_ms" -lt 1000 ]; then
                reward="0.75"
            else
                reward="0.55"
            fi
        else
            reward="0.0"
        fi
    fi

    echo "$reward"
}

get_reward_threshold() {
    local threshold_type="$1"  # min, warning, target

    # Query historical thresholds from AgentDB
    local db_path="${DB_PATH:-./agentdb.db}"
    case "$threshold_type" in
        min)
            # Minimum viable: 10th percentile of successful episodes
            npx agentdb stats --json "$db_path" 2>/dev/null | \
                jq -r '.rewardPercentiles.p10 // 0.6' 2>/dev/null || echo "0.6"
            ;;
        warning)
            # Warning: 25th percentile
            npx agentdb stats --json "$db_path" 2>/dev/null | \
                jq -r '.rewardPercentiles.p25 // 0.75' 2>/dev/null || echo "0.75"
            ;;
        target)
            # Target: 75th percentile
            npx agentdb stats --json "$db_path" 2>/dev/null | \
                jq -r '.rewardPercentiles.p75 // 0.85' 2>/dev/null || echo "0.85"
            ;;
        circuit_breaker)
            # Circuit breaker: lower than min but allows some failures
            npx agentdb stats --json "$db_path" 2>/dev/null | \
                jq -r '.rewardPercentiles.p05 // 0.5' 2>/dev/null || echo "0.5"
            ;;
        *)
            echo "0.0"
            ;;
    esac
}

get_expected_reward() {
    local circle="$1"
    local ceremony="$2"
    local complexity="${3:-medium}"

    # Query ReasoningBank for similar patterns
    npx ts-node -e "
    import { ReasoningBank } from './agentic-flow/src/reasoningbank';
    import { SwarmLearningOptimizer } from './agentic-flow/src/hooks/swarm-learning-optimizer';

    (async () => {
        const rb = new ReasoningBank('./agentdb.db');
        const optimizer = new SwarmLearningOptimizer(rb);

        const patterns = await rb.searchPatterns('${circle}/${ceremony}', {
            k: 10,
            minReward: 0.5,
            onlySuccesses: true
        });

        if (patterns.length === 0) {
            console.log('0.75'); // Default expected
        } else {
            const avgReward = patterns.reduce((sum, p) => sum + p.reward, 0) / patterns.length;
            console.log(avgReward.toFixed(2));
        }
    })();
    " 2>/dev/null || echo "0.75"
}

# Export functions
export -f get_dynamic_reward
export -f get_reward_threshold
export -f get_expected_reward
