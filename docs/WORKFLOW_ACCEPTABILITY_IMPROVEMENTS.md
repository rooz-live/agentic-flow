# Workflow Acceptability Improvements: ay yo & ay prod

## Current State Analysis

### Strengths ✅
1. **`ay yo` is well-designed** - Single command, muscle memory friendly
2. **`ay prod` has production safety** - Pre-flight checks, learning modes
3. **Hook integration exists** - Ceremony hooks, observability tracking

### Critical Issues 🔴

#### 1. **Cognitive Overload** - Too Many Options
```bash
# Current: User must remember subcommands
./scripts/ay-yo prod-cycle --circles orchestrator --ceremony standup
./scripts/ay-yo prod-cycle --wsjf
./scripts/ay-yo prod-cycle --balance 10
./scripts/ay-yo prod-cycle --iterate 3

# Problem: Not muscle memory friendly
```

#### 2. **Workflow Friction** - Multiple Entry Points
```bash
# Three different commands for similar tasks:
./scripts/ay-yo              # Learning cycles
./scripts/ay-prod.sh         # Production ceremonies  
./scripts/ay-yo prod-cycle   # Also production ceremonies

# User confusion: Which one to use?
```

#### 3. **Missing Feedback Loop** - Silent Execution
```bash
$ ./scripts/ay-yo
# Runs but provides minimal real-time feedback
# User doesn't know what's happening

# No progress indicators
# No success/failure summary
# No next-step suggestions
```

#### 4. **Production Acceptance Barriers**
- No clear "production-ready" signal
- Learning mode requires manual confirmation (friction)
- Adaptive mode not the default
- No automated validation post-execution

## Proposed Improvements

### Phase 1: Simplify Command Surface (Week 1)

#### Unified Command Pattern
```bash
# Single command: ay
# Everything flows through one entry point

./ay                    # Default: 10 learning cycles (current ay-yo)
./ay learn 20           # Explicit learning cycles
./ay prod [options]     # Production ceremonies (consolidate ay-prod + prod-cycle)
./ay status             # Show system status, last run, metrics
./ay validate           # Run pre-flight checks only
```

#### Implementation
```bash
# Create: scripts/ay (master dispatcher)
#!/usr/bin/env bash
# ay - Unified agentic workflow command

case "${1:-learn}" in
  learn)     exec "$0-yo" "${@:2}" ;;
  prod)      exec "$0-prod-unified" "${@:2}" ;;
  status)    exec "$0-status" ;;
  validate)  exec "$0-validate" ;;
  *)         exec "$0-yo" "$@" ;;
esac
```

### Phase 2: Intelligent Defaults (Week 1)

#### Make Adaptive Mode Default
```bash
# Current: ay prod orchestrator standup
#          ^^ safe mode (too conservative)

# Improved: ay prod orchestrator standup
#           ^^ adaptive mode by default
#           ^^ safe mode requires --safe flag
```

#### Auto-Learning After Validation
```bash
# Current: Manual confirmation required for learning
if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit; fi

# Improved: Auto-enable learning after N successful adaptive runs
if [[ $(get_successful_runs) -gt 10 ]]; then
  enable_learning_mode_automatically
fi
```

### Phase 3: Rich Feedback (Week 2)

#### Real-Time Progress Indicators
```bash
#!/usr/bin/env bash
# Add to ay-yo

show_progress() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Execution Progress${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo
  echo -e "  Cycle: ${GREEN}$current${NC}/$total"
  echo -e "  Circle: ${CYAN}$circle${NC}"
  echo -e "  Ceremony: ${YELLOW}$ceremony${NC}"
  echo -e "  Elapsed: ${elapsed}s"
  echo
}

# Call after each iteration
show_progress
```

#### Execution Summary
```bash
show_summary() {
  local success=$1
  local total=$2
  local failed=$3
  local duration=$4
  
  echo
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Execution Summary${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo
  echo -e "  ✓ Completed: ${GREEN}$success${NC}/$total ceremonies"
  echo -e "  ✗ Failed: ${RED}$failed${NC}"
  echo -e "  ⏱ Duration: ${duration}s"
  echo -e "  📊 Success Rate: $(( success * 100 / total ))%"
  echo
  
  if [[ $failed -eq 0 ]]; then
    echo -e "${GREEN}✨ All ceremonies completed successfully!${NC}"
    echo
    echo -e "${CYAN}Next steps:${NC}"
    echo -e "  • Review metrics: ${BOLD}./ay status${NC}"
    echo -e "  • Run production: ${BOLD}./ay prod [options]${NC}"
  else
    echo -e "${YELLOW}⚠ Some ceremonies failed. Check logs for details.${NC}"
    echo -e "  • View errors: ${BOLD}cat .goalie/ceremony_errors.log${NC}"
  fi
  echo
}
```

### Phase 4: Production Confidence (Week 2)

#### Auto-Validation Mode
```bash
#!/usr/bin/env bash
# scripts/ay-prod-unified

main() {
  local mode="adaptive"  # Default: adaptive (was "safe")
  
  # Auto-validation before execution
  echo -e "${CYAN}Running pre-flight checks...${NC}"
  if ! validate_silently; then
    echo -e "${RED}Pre-flight failed. Run './ay validate' for details.${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Pre-flight passed${NC}"
  echo
  
  # Execute
  execute_ceremony "$@"
  
  # Auto-post-validation
  echo
  echo -e "${CYAN}Running post-execution validation...${NC}"
  if validate_execution; then
    echo -e "${GREEN}✓ Execution validated${NC}"
    record_success
  else
    echo -e "${YELLOW}⚠ Validation warnings detected${NC}"
    show_warnings
  fi
}
```

#### Success Tracking & Auto-Promotion
```bash
#!/usr/bin/env bash
# Track consecutive successful runs

METRICS_FILE=".goalie/production_metrics.json"

record_success() {
  local current=$(jq -r '.consecutive_successes // 0' "$METRICS_FILE")
  local new=$((current + 1))
  
  jq ".consecutive_successes = $new" "$METRICS_FILE" > tmp && mv tmp "$METRICS_FILE"
  
  # Auto-promote to learning mode after 10 successes
  if [[ $new -eq 10 ]] && [[ "$ENABLE_LEARNING" != "1" ]]; then
    echo
    echo -e "${GREEN}🎉 Milestone: 10 consecutive successful runs!${NC}"
    echo -e "${CYAN}Automatically enabling learning mode for continuous improvement.${NC}"
    echo -e "  (Disable with: export ENABLE_AUTO_LEARNING=0)"
    echo
    
    # Enable learning mode
    export ENABLE_LEARNING=1
    echo "ENABLE_LEARNING=1" >> .env
  fi
}
```

### Phase 5: Documentation & Discoverability (Week 3)

#### Contextual Help
```bash
#!/usr/bin/env bash
# Add to ay-yo and ay-prod-unified

show_contextual_help() {
  local last_error=$(get_last_error)
  
  if [[ -n "$last_error" ]]; then
    echo -e "${YELLOW}Tip:${NC} Last run failed with: ${RED}$last_error${NC}"
    echo -e "     Try: ${BOLD}./ay validate${NC} to diagnose"
    echo
  fi
  
  local runs=$(get_total_runs)
  if [[ $runs -lt 5 ]]; then
    echo -e "${CYAN}Getting started?${NC}"
    echo -e "  1. Run learning cycles: ${BOLD}./ay${NC} or ${BOLD}./ay learn${NC}"
    echo -e "  2. Check status: ${BOLD}./ay status${NC}"
    echo -e "  3. When ready: ${BOLD}./ay prod --wsjf${NC}"
    echo
  fi
}
```

#### Quick Reference Card
```bash
# Create: scripts/ay-help

Usage: ./ay [command] [options]

Commands:
  (default)              Run 10 learning cycles (muscle memory)
  learn [n] [analyze]    Run N learning cycles (default: 10)
  prod [options]         Execute production ceremonies
    --wsjf               Run WSJF prioritization
    --circles <c>        Execute specific circle
    --balance <n>        Balance all circles
    --iterate <n>        Execute top N priorities
  status                 Show system health, metrics, last run
  validate               Run pre-flight checks only
  help                   Show this help

Examples:
  ./ay                   # Daily practice (10 cycles)
  ./ay 50 analyze        # Deep work session
  ./ay prod --wsjf       # Production WSJF
  ./ay status            # Check health

Quick Start:
  1. Run: ./ay
  2. Review: ./ay status
  3. Iterate!
```

## Implementation Plan

### Week 1: Core Simplification
**Goals:**
- [x] Create unified `./ay` dispatcher
- [x] Make adaptive mode the default
- [x] Consolidate ay-prod + prod-cycle logic
- [x] Add auto-learning promotion (10 successes)

**Deliverables:**
- `scripts/ay` (new master command)
- `scripts/ay-prod-unified` (consolidates ay-prod.sh + prod-cycle logic)
- Updated `AY_YO_FINAL.md` with new patterns

### Week 2: Feedback & Validation
**Goals:**
- [ ] Add real-time progress indicators
- [ ] Implement execution summaries
- [ ] Add auto-validation (pre & post)
- [ ] Create success tracking system

**Deliverables:**
- Progress bar/indicator module
- Summary display templates
- Validation framework
- Metrics tracking (`.goalie/production_metrics.json`)

### Week 3: Polish & Documentation
**Goals:**
- [ ] Contextual help system
- [ ] Quick reference card
- [ ] Error recovery suggestions
- [ ] User onboarding flow

**Deliverables:**
- `scripts/ay-help` (comprehensive help)
- `docs/AY_QUICKSTART.md` (5-minute guide)
- Error message improvements
- Onboarding tips for first 5 runs

## Success Metrics

### Adoption Metrics
- **Command Recall**: Users type correct command on first try (target: >90%)
- **Time to First Success**: New users complete first workflow (target: <5 min)
- **Friction Points**: Number of --help invocations per session (target: <1)

### Production Confidence
- **Consecutive Successes**: Runs before manual intervention (target: >50)
- **Auto-Learning Adoption**: % of users reaching 10-success milestone (target: >70%)
- **Validation Pass Rate**: Pre-flight + post-execution (target: >95%)

### User Satisfaction
- **Workflow Clarity**: User understands what command to use (target: 10/10)
- **Feedback Quality**: User knows what's happening during execution (target: 9/10)
- **Production Readiness**: User confidence deploying to prod (target: 9/10)

## Quick Wins (Implement This Week)

### 1. Symlink for Convenience
```bash
cd ~/Documents/code/investing/agentic-flow
ln -sf scripts/ay-yo ay         # Create ./ay symlink
ln -sf scripts/ay-prod.sh prod  # Create ./prod symlink
```

Usage:
```bash
./ay         # Instead of ./scripts/ay-yo
./prod       # Instead of ./scripts/ay-prod.sh
```

### 2. Add Progress to Existing ay-yo
```bash
# Edit scripts/ay-yo, add after line 150:

echo -e "${CYAN}Progress: ${current}/${total} ceremonies completed${NC}"
```

### 3. Make Adaptive Default in ay-prod.sh
```bash
# Edit scripts/ay-prod.sh, line 154:
# Change from:
local mode="safe"
# To:
local mode="adaptive"
```

### 4. Add Summary to ay-yo
```bash
# Add at end of scripts/ay-prod-learn-loop.sh:

echo
echo -e "${GREEN}✓ Completed $ITERATIONS learning cycles${NC}"
echo -e "  Next: ${BOLD}./scripts/ay-yo status${NC} to review metrics"
```

## Migration Guide

### Current Workflow → Improved Workflow

| Current | Improved | Benefit |
|---------|----------|---------|
| `./scripts/ay-yo` | `./ay` | Shorter, top-level |
| `./scripts/ay-prod.sh` | `./prod` or `./ay prod` | Consistent naming |
| `./scripts/ay-yo prod-cycle --wsjf` | `./ay prod --wsjf` | Less nesting |
| `./scripts/ay-yo-enhanced.sh insights` | `./ay status` | Clearer intent |
| Multiple --help commands | Single `./ay help` | One place for docs |

### Backward Compatibility
```bash
# Keep old commands working via symlinks
ln -sf ay scripts/ay-yo-v2
ln -sf ay-prod-unified scripts/ay-prod-v2

# Update PATH for system-wide access
echo 'export PATH="$PATH:~/Documents/code/investing/agentic-flow"' >> ~/.bashrc
```

Now:
```bash
ay              # Works from anywhere!
ay prod --wsjf  # Works from anywhere!
```

## Testing Checklist

Before deploying improvements:

- [ ] **Muscle Memory Test**: Can you type command without thinking?
- [ ] **Error Recovery**: Do error messages suggest solutions?
- [ ] **Progress Visibility**: Do you know what's happening during execution?
- [ ] **Success Feedback**: Is success clearly communicated?
- [ ] **Next Steps**: Are next actions obvious?
- [ ] **Production Safety**: Are safety checks automatic?
- [ ] **Learning Progression**: Does system guide you to advanced features?
- [ ] **Documentation**: Can new user succeed in <5 minutes?

## Rollout Strategy

### Phase 0: Preparation (Now)
1. Back up current scripts
2. Create test environment
3. Implement symlinks (Quick Win #1)

### Phase 1: Soft Launch (Week 1)
1. Deploy simplified commands
2. Keep old commands working
3. Add deprecation warnings
4. Gather user feedback

### Phase 2: Feedback Integration (Week 2)
1. Add progress indicators
2. Improve error messages
3. Implement auto-validation
4. Track success metrics

### Phase 3: Full Adoption (Week 3)
1. Update all documentation
2. Remove old commands (or mark deprecated)
3. System-wide PATH integration
4. Celebrate success! 🎉

---

## Next Steps

**Immediate (Today):**
1. Create symlinks: `./ay` and `./prod`
2. Make adaptive mode default
3. Add progress indicator to ay-yo

**This Week:**
1. Build unified dispatcher
2. Consolidate ay-prod logic
3. Add execution summaries

**This Month:**
1. Complete feedback system
2. Launch auto-validation
3. Document everything

---

**Goal**: Make `ay yo` and `ay prod` workflows so intuitive that users **never need to think** about which command to run.

**Measure**: Command recall rate > 90%, time to first success < 5 minutes.
