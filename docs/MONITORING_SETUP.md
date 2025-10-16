# Monitoring Setup for Risk Analytics P0 Gates

## Real-Time Monitoring Components

### Heartbeat Monitoring
- **Database**: /tmp/heartbeat_monitor.db
- **Dashboard**: `./heartbeat_monitor.py --dashboard`
- **Real-time**: Heartbeat processing <1s latency

### Key Metrics Tracked
1. **P0 Gate Performance**
   - Success/failure rates
   - Response times
   - False-positive detection

2. **Device Health (24460)**
   - Connectivity status via SSH tunnel
   - System resource utilization
   - Service availability

3. **System Performance**
   - Token usage optimization
   - MCP server performance
   - Database response times

### Alert Configuration
```json
{
    "p0_failure_rate_threshold": 0.05,
    "override_frequency_threshold": 1,
    "response_time_threshold": 2.0,
    "availability_threshold": 0.995,
    "correlation_id": "consciousness-1760636633",
    "device_id": "24460",
    "created_at": "2025-10-16T17:43:54Z"
}
```

### Dashboard Access
```bash
# View real-time dashboard
./heartbeat_monitor.py --dashboard

# Component-specific monitoring
./heartbeat_monitor.py --dashboard --component=gate_validator

# Start continuous monitoring
./heartbeat_monitor.py --monitor &
```
