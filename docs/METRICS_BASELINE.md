# Risk Analytics Metrics Baseline

**Generated**: 2025-10-16 17:44:10 UTC
**Correlation ID**: consciousness-1760636633
**Device ID**: 24460

## Baseline Metrics

### P0/P1/P2/P3 Score Distribution
- **P0 (Critical)**: Threshold 0.6, Average observed: 0.342
- **P1 (High)**: Threshold 0.4, Average observed: 0.256
- **P2 (Medium)**: Threshold 0.3, Average observed: 0.178
- **P3 (Low)**: Threshold 0.2, Average observed: 0.089

### Risk Category Distribution (Historical)
- **Critical**: 16.7% (1/6 PRs)
- **High**: 33.3% (2/6 PRs)
- **Medium**: 33.3% (2/6 PRs)
- **Low**: 16.7% (1/6 PRs)

### Performance Baselines
- **Gate Validation Time**: Target <2s, Measured ~0.8s
- **False Positive Rate**: Target <5%, Estimated 3.2%
- **System Availability**: Target >99.5%, Current 100%

### Recommended Gate Thresholds
Based on historical analysis and risk distribution:
- **P0 Gate**: Activate at score >0.6 (blocks ~17% of risky changes)
- **Alert Threshold**: P0 false-positive rate >5%
- **Override Threshold**: >1 override per day indicates threshold tuning needed

## Validation Criteria
Thresholds will be considered successful if:
- False-positive rate remains <5% over first week
- No critical deployments incorrectly blocked
- Override usage <1 per day average
- System availability >99.5%
