# User Study Framework: Alert Icon Effectiveness

**Date**: 2025-11-20  
**Status**: 📋 FRAMEWORK READY  
**Purpose**: Assess the effectiveness of alert icons in driving action on "Guardrail Locks" and "Safe Degrade" patterns

---

## Overview

This framework provides a systematic approach to studying user behavior and measuring the effectiveness of alert icons in the Goalie VS Code extension. The study focuses on two key patterns:

1. **Guardrail Locks**: Patterns that indicate missing guardrails (e.g., tests not running before merge)
2. **Safe Degrade**: Patterns that indicate missing graceful degradation strategies

---

## Research Questions

1. **Primary Question**: Do alert icons effectively drive user action on Guardrail Locks and Safe Degrade patterns?
2. **Secondary Questions**:
   - What is the conversion rate from alert view to action taken?
   - How long does it take users to act after seeing an alert?
   - Which alert designs (icons, colors, tooltips) are most effective?
   - Are there differences in effectiveness between Guardrail Locks and Safe Degrade patterns?

---

## Study Design

### Phase 1: Baseline Measurement (Week 1-2)

**Objective**: Establish baseline metrics before introducing alert icons

**Metrics**:
- Number of Guardrail Locks patterns detected
- Number of Safe Degrade patterns detected
- Action rate (actions taken / patterns detected)
- Time to action (time from pattern detection to action taken)

**Data Collection**:
- Pattern detection events from `pattern_metrics.jsonl`
- Action completion events from `KANBAN_BOARD.yaml`
- User interaction logs (if available)

### Phase 2: Alert Icon Introduction (Week 3-4)

**Objective**: Introduce alert icons and measure impact

**Implementation**:
- Add alert icons to Goalie Gaps view for Guardrail Locks and Safe Degrade patterns
- Use distinct icon designs (e.g., `shield` for Guardrail Locks, `alert` for Safe Degrade)
- Add color coding (e.g., red for high priority, orange for medium priority)
- Enhance tooltips with actionable guidance

**Metrics**:
- Same as Phase 1, plus:
  - Alert view count (number of times alerts are displayed)
  - Alert click-through rate (clicks on alerts / alert views)
  - Alert-to-action conversion rate (actions taken / alert clicks)

### Phase 3: A/B Testing (Week 5-8)

**Objective**: Compare different alert designs

**Variants**:
- **Variant A**: Icon-only alerts
- **Variant B**: Icon + text alerts
- **Variant C**: Icon + text + action button alerts

**Metrics**:
- Conversion rate for each variant
- User preference (if survey is conducted)
- Time to action for each variant

---

## Data Collection

### Event Tracking

Track the following events:

1. **Pattern Detection**:
   ```json
   {
     "ts": "2025-11-20T12:00:00Z",
     "type": "pattern_detected",
     "pattern": "guardrail-lock",
     "circle": "Analyst",
     "depth": 2,
     "cod": 5000.0
   }
   ```

2. **Alert Display**:
   ```json
   {
     "ts": "2025-11-20T12:00:01Z",
     "type": "alert_displayed",
     "pattern": "guardrail-lock",
     "alert_variant": "icon_text_button",
     "user_id": "user_123" // anonymized
   }
   ```

3. **Alert Interaction**:
   ```json
   {
     "ts": "2025-11-20T12:00:05Z",
     "type": "alert_clicked",
     "pattern": "guardrail-lock",
     "interaction_type": "click" | "hover" | "tooltip_view"
   }
   ```

4. **Action Taken**:
   ```json
   {
     "ts": "2025-11-20T12:05:00Z",
     "type": "action_taken",
     "pattern": "guardrail-lock",
     "action_type": "code_fix" | "observability_action" | "manual_fix",
     "time_to_action_sec": 300
   }
   ```

### Implementation

Create a tracking module in the VS Code extension:

```typescript
// tools/goalie-vscode/src/tracking.ts
export interface TrackingEvent {
  ts: string;
  type: string;
  pattern?: string;
  [key: string]: any;
}

export class UserStudyTracker {
  private events: TrackingEvent[] = [];
  private outputPath: string;

  constructor(outputPath: string) {
    this.outputPath = outputPath;
  }

  track(event: TrackingEvent): void {
    event.ts = new Date().toISOString();
    this.events.push(event);
    this.flush();
  }

  private flush(): void {
    // Append to tracking log file
    const line = JSON.stringify(this.events[this.events.length - 1]) + '\n';
    fs.appendFileSync(this.outputPath, line, 'utf8');
  }
}
```

---

## Metrics and KPIs

### Primary Metrics

1. **Action Rate**: Actions taken / Patterns detected
   - **Target**: > 30% (baseline: ~10-15%)
   - **Measurement**: Weekly aggregation

2. **Time to Action**: Average time from pattern detection to action taken
   - **Target**: < 24 hours (baseline: ~3-5 days)
   - **Measurement**: Per-action calculation

3. **Alert Conversion Rate**: Actions taken / Alert clicks
   - **Target**: > 50%
   - **Measurement**: Per-alert calculation

### Secondary Metrics

1. **Alert View Rate**: Alert views / Pattern detections
   - **Target**: > 80% (users see alerts)
   - **Measurement**: Daily aggregation

2. **Alert Click-Through Rate**: Alert clicks / Alert views
   - **Target**: > 20%
   - **Measurement**: Daily aggregation

3. **Pattern-Specific Metrics**:
   - Guardrail Locks action rate
   - Safe Degrade action rate
   - Comparison between patterns

---

## Analysis Plan

### Statistical Analysis

1. **Baseline vs. Intervention Comparison**:
   - Use t-test or Mann-Whitney U test to compare action rates
   - Compare time to action distributions

2. **A/B Testing Analysis**:
   - Use chi-square test for conversion rates
   - Use ANOVA for time to action across variants

3. **Pattern-Specific Analysis**:
   - Compare Guardrail Locks vs. Safe Degrade effectiveness
   - Identify patterns with highest/lowest conversion rates

### Qualitative Analysis

1. **User Interviews** (optional):
   - Interview 5-10 users about their experience with alerts
   - Questions:
     - Did you notice the alert icons?
     - Did the alerts prompt you to take action?
     - What would make the alerts more effective?

2. **Survey** (optional):
   - Short survey after Phase 2
   - Questions about alert visibility, clarity, and actionability

---

## Implementation Checklist

### Phase 1: Baseline (Week 1-2)

- [ ] Set up event tracking infrastructure
- [ ] Deploy tracking to VS Code extension
- [ ] Collect baseline data for 2 weeks
- [ ] Analyze baseline metrics

### Phase 2: Alert Introduction (Week 3-4)

- [ ] Implement alert icons in Goalie Gaps view
- [ ] Add tracking for alert displays and interactions
- [ ] Deploy to users
- [ ] Collect data for 2 weeks
- [ ] Compare to baseline

### Phase 3: A/B Testing (Week 5-8)

- [ ] Implement A/B testing framework
- [ ] Create alert variants
- [ ] Deploy to users (random assignment)
- [ ] Collect data for 4 weeks
- [ ] Analyze results

### Phase 4: Reporting (Week 9)

- [ ] Compile results
- [ ] Create report with findings
- [ ] Make recommendations for alert design
- [ ] Document learnings

---

## Success Criteria

### Minimum Viable Success

- **Action Rate**: Increase from baseline by at least 10 percentage points
- **Time to Action**: Reduce by at least 50%
- **Alert Conversion Rate**: > 40%

### Target Success

- **Action Rate**: Increase from baseline by at least 20 percentage points
- **Time to Action**: Reduce by at least 75%
- **Alert Conversion Rate**: > 50%

### Stretch Goals

- **Action Rate**: Increase from baseline by at least 30 percentage points
- **Time to Action**: Reduce by at least 90%
- **Alert Conversion Rate**: > 60%

---

## Ethical Considerations

1. **User Privacy**:
   - Anonymize user IDs in tracking data
   - Only track interaction events, not code content
   - Provide opt-out mechanism

2. **Informed Consent**:
   - Inform users about the study
   - Explain what data is being collected
   - Provide clear opt-in/opt-out options

3. **Data Security**:
   - Encrypt tracking data in transit and at rest
   - Limit access to tracking data
   - Follow data retention policies

---

## Reporting Template

### Study Report Structure

1. **Executive Summary**
   - Key findings
   - Recommendations
   - Next steps

2. **Methodology**
   - Study design
   - Data collection methods
   - Analysis approach

3. **Results**
   - Baseline metrics
   - Intervention results
   - A/B testing results
   - Pattern-specific analysis

4. **Discussion**
   - Interpretation of results
   - Limitations
   - Implications for design

5. **Recommendations**
   - Alert design recommendations
   - Implementation suggestions
   - Future research directions

---

## Resources

- **Tracking Implementation**: `tools/goalie-vscode/src/tracking.ts`
- **Data Storage**: `.goalie/user_study_tracking.jsonl`
- **Analysis Scripts**: `scripts/analysis/user_study_analysis.py` (to be created)
- **Report Template**: `docs/USER_STUDY_REPORT_TEMPLATE.md` (to be created)

---

**Status**: Framework ready for implementation  
**Next Steps**: Begin Phase 1 baseline measurement  
**Owner**: UX/Research Team

