# Feature Backlog - Priority Features

## Source
User requested features on 2026-01-12

---

## High Priority Features

### 1. Provider SLO Dashboard
**Description**: Dashboard showing uptime, latency, and failure reasons for providers  
**Value**: Operational visibility into provider health  
**Effort**: Medium (2-3 days)  

**Requirements**:
- Uptime tracking per provider
- P50/P95/P99 latency metrics
- Failure categorization (timeout, auth, rate limit, etc.)
- Time-series visualization
- Alert thresholds

**Implementation Notes**:
- Could extend existing `./scripts/ay-yo-enhanced.sh insights`
- Store metrics in `.goalie/provider_metrics.jsonl`
- Create dashboard view in `scripts/af_dashboard.py`

---

### 2. Auto-restart/Self-heal Federation
**Description**: Automatic recovery for failed federation components  
**Value**: Improved reliability and reduced manual intervention  
**Effort**: Medium (2-3 days)

**Requirements**:
- Health check for federation nodes
- Automatic restart on failure
- Circuit breaker pattern
- Graceful degradation
- Recovery logging

**Implementation Notes**:
- Add to `scripts/ay-prod-cycle.sh`
- Implement retry logic with exponential backoff
- Log recovery attempts to `.goalie/federation_recovery.log`

---

### 3. Cache Last-known-good Context
**Description**: Cache and reuse last successful context when providers fail  
**Value**: Resilience against provider outages  
**Effort**: Low (1 day)

**Requirements**:
- Store last successful context per circle/ceremony
- TTL for cached context (e.g., 24 hours)
- Fallback mechanism
- Cache invalidation strategy

**Implementation Notes**:
- Store in `.goalie/context_cache/`
- Add to `scripts/ay-prod-cycle.sh`
- Use JSON format with timestamp

---

### 4. Missing Test Suites Creation
**Description**: Automatically identify and create missing test suites  
**Value**: Improved test coverage and quality  
**Effort**: Medium (2 days)

**Requirements**:
- Scan codebase for untested modules
- Generate test skeletons
- Identify edge cases
- Integration with existing test framework

**Implementation Notes**:
- Create `scripts/generate-tests.sh`
- Use AST parsing for code analysis
- Template-based test generation
- Output to `tests/generated/`

---

## Medium Priority Features

### 5. Dimensional UI with Temporal/Spatial Pivots
**Description**: Multi-dimensional data visualization with time and space pivots  
**Value**: Better data exploration and analysis  
**Effort**: High (5-7 days)

**Requirements**:
- Temporal pivot (by day/week/month)
- Spatial pivot (by circle/ceremony/depth)
- Interactive filtering
- Drill-down capability
- Export functionality

**Implementation Notes**:
- Extend `scripts/af_dashboard.py`
- Use Plotly for visualizations
- Store pivot configurations
- Add to `./ay status` (future unified command)

---

### 6. Expandable/Collapsible Menu System
**Description**: Hierarchical navigation with expand/collapse functionality  
**Value**: Better UX for complex dashboards  
**Effort**: Low (1 day)

**Requirements**:
- Tree-style menu structure
- Remember expansion state
- Keyboard navigation
- Search within menu

**Implementation Notes**:
- Update `scripts/af_dashboard.py`
- Use curses for terminal UI
- Store state in `.goalie/ui_state.json`

---

### 7. ROAM Exposure Dashboard
**Description**: Visualize ROAM (Risks, Obstacles, Assumptions, Mitigation) exposure  
**Value**: Risk visibility and management  
**Effort**: Medium (2-3 days)

**Requirements**:
- Risk heatmap by circle
- Trend analysis
- Mitigation tracking
- Alert on high exposure

**Implementation Notes**:
- Query from AgentDB ROAM tables
- Create `scripts/roam-dashboard.sh`
- Integrate with existing dashboard
- Add to WSJF prioritization

---

### 8. Manthra/Yasna/Mithra Metrics
**Description**: Intent coverage, close rate, and drift metrics  
**Value**: Track ceremony effectiveness  
**Effort**: Medium (3 days)

**Requirements**:
- **Manthra**: Intent coverage (% of intended outcomes achieved)
- **Yasna**: Close rate (% of ceremonies completed successfully)
- **Mithra**: Drift (deviation from expected behavior)
- Historical tracking
- Visualization

**Implementation Notes**:
- Add metrics collection to `scripts/ay-prod-cycle.sh`
- Store in `.goalie/ceremony_effectiveness.jsonl`
- Create report: `./scripts/ay-yo-enhanced.sh manthra-report`
- Add to execution summary

---

## Implementation Roadmap

### Week 1 (Quick Wins)
- [x] Make adaptive mode default
- [x] Add progress indicators
- [x] Add execution summaries
- [ ] Cache last-known-good context
- [ ] Expandable/collapsible menu system

### Week 2 (Reliability)
- [ ] Auto-restart/self-heal federation
- [ ] Provider SLO dashboard
- [ ] ROAM exposure dashboard

### Week 3 (Quality & Metrics)
- [ ] Missing test suites creation
- [ ] Manthra/Yasna/Mithra metrics
- [ ] Dimensional UI

---

## Prioritization Criteria

| Feature | Value | Effort | Priority |
|---------|-------|--------|----------|
| Cache last-known-good context | High | Low | 🔴 High |
| Provider SLO Dashboard | High | Medium | 🔴 High |
| Auto-restart/self-heal | High | Medium | 🔴 High |
| Manthra/Yasna/Mithra metrics | Medium | Medium | 🟡 Medium |
| Missing test suites | Medium | Medium | 🟡 Medium |
| ROAM exposure dashboard | Medium | Medium | 🟡 Medium |
| Dimensional UI | Medium | High | 🟢 Low |
| Expandable menu | Low | Low | 🟢 Low |

---

## Dependencies

```
Cache Context
    └─> Provider SLO (monitoring)
         └─> Auto-restart (uses SLO data)

Dimensional UI
    └─> Manthra/Yasna/Mithra (data source)
    └─> ROAM Dashboard (integrated view)

Missing Test Suites
    └─> (independent)
```

---

## Next Steps

1. **Review & Prioritize**: Confirm priority order with team
2. **Spike**: 1-day investigation for Dimensional UI complexity
3. **Start with Quick Wins**: Cache context & expandable menu
4. **Weekly Demos**: Show progress every Friday

---

## Notes

- All features should integrate with existing `./ay` and `./prod` commands
- Maintain backward compatibility
- Follow established patterns (hooks, metrics, logging)
- Document in `QUICK_START.md` as features are added

---

**Status**: Backlog created 2026-01-12  
**Owner**: TBD  
**Next Review**: Weekly standup
