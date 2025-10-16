# Risk Analytics Troubleshooting Guide

## Common Issues & Solutions

### SSH Connectivity Issues
**Problem**: Cannot connect to device #24460
**Solution**:
```bash
# Try direct IP connection
ssh -i /Users/shahroozbhopti/pem/rooz.pem ubuntu@23.92.79.2

# Check SSH key permissions
chmod 600 /Users/shahroozbhopti/pem/rooz.pem

# Test with verbose output
ssh -v -i /Users/shahroozbhopti/pem/rooz.pem ubuntu@23.92.79.2
```

### High False-Positive Rate
**Problem**: P0 gate blocking legitimate deployments
**Solution**:
1. Check calibration data quality
2. Adjust thresholds based on recent patterns
3. Use override procedure with proper approval
4. Consider emergency disable if rate >20%

### Performance Degradation  
**Problem**: Gate validation taking >5 seconds
**Solution**:
1. Check database performance and indexes
2. Restart heartbeat monitoring services
3. Clear temporary files and logs
4. Monitor resource utilization

### Override Not Working
**Problem**: Gate override procedure fails
**Solution**:
1. Verify audit trail logging is functional
2. Check approval workflow permissions
3. Test end-to-end override process
4. Review emergency rollback procedure
