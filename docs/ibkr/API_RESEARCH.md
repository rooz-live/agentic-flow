# Interactive Brokers API Research & Integration Strategy

Comprehensive analysis of IBKR API options for automated trading integration.

## Executive Summary

**Recommended Approach:** Client Portal Web API + ib_insync Python library

**Rationale:**
- REST-based, easier to integrate and test
- Better suited for automated/algorithmic trading
- No Java/C++ dependencies
- Better error handling and resilience
- Supports containerization (Docker Swarm)

## API Options Comparison

### 1. TWS API (Trader Workstation API)

**Description:** Native C++/Java API requiring TWS or IB Gateway running locally.

**Pros:**
- Most comprehensive feature set
- Real-time streaming data
- Lowest latency
- Direct connection to IB infrastructure
- Well-documented with mature ecosystem

**Cons:**
- Requires TWS/Gateway to be running (resource overhead)
- Complex connection management
- Socket-based protocol (harder to containerize)
- Java or C++ dependencies
- Manual session management
- Requires GUI interaction for 2FA

**Technical Details:**
```
Protocol: Socket-based binary protocol
Ports: 7496 (TWS), 7497 (TWS Paper), 4001 (Gateway), 4002 (Gateway Paper)
Authentication: Username/password via TWS/Gateway
Rate Limits: 50 messages/second
Connection: Single persistent connection
Language Support: Java, C++, Python (via wrapper)
```

**Best For:**
- High-frequency trading
- Professional trading desks
- Windows/desktop environments
- Applications requiring lowest latency

### 2. Client Portal Web API (CP API)

**Description:** RESTful HTTP API with OAuth authentication.

**Pros:**
- REST/HTTP based (easy integration)
- No TWS/Gateway dependency
- Better for cloud/containerized deployments
- OAuth 2.0 authentication
- Stateless design
- Better error handling
- JSON request/response format
- WebSocket support for streaming

**Cons:**
- Higher latency than TWS API
- Limited historical data access
- Requires Client Portal Gateway
- Less comprehensive documentation
- Newer, less mature ecosystem

**Technical Details:**
```
Protocol: REST over HTTPS + WebSocket
Port: 5000 (default, configurable)
Authentication: OAuth 2.0 (live session required)
Rate Limits: 
  - 10 requests/second per endpoint
  - 100 orders/minute
  - 1000 order updates/minute
Connection: Stateless HTTP requests
Language Support: Any HTTP client (curl, Python requests, etc.)
```

**Endpoints:**
```
GET  /v1/api/portfolio/accounts          # List accounts
GET  /v1/api/portfolio/{accountId}/positions  # Get positions
POST /v1/api/iserver/account/orders      # Submit orders
GET  /v1/api/md/snapshot                 # Market data snapshot
WS   /v1/api/ws                          # WebSocket streaming
```

**Best For:**
- Automated/algorithmic trading systems
- Cloud-based deployments
- Microservices architecture
- CI/CD pipelines
- Docker Swarm (our use case)

### 3. FIX/CTCI (FIX Protocol / Continuous Trading Client Interface)

**Description:** Financial Information eXchange (FIX) protocol for institutional clients.

**Pros:**
- Industry standard protocol
- High performance
- Suitable for institutional trading
- Multi-asset support
- Order routing capabilities

**Cons:**
- Requires institutional account
- Complex setup and certification
- Expensive (additional fees)
- Steep learning curve
- Limited to trading operations

**Technical Details:**
```
Protocol: FIX 4.2/4.4
Authentication: Digital certificates
Minimum Account: $10M+ (institutional)
Fees: $300-500/month + per-message fees
Connection: Dedicated FIX session
```

**Best For:**
- Institutional clients
- Prime brokers
- High-volume trading operations
- Multi-broker routing

## Recommended Integration Architecture

### Primary: Client Portal Web API

```
┌─────────────────────────────────────────────────────┐
│                 Trading Platform                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────────┐                           │
│  │   Trading Service    │                           │
│  │   (Rust/Python)      │                           │
│  └──────────┬───────────┘                           │
│             │                                         │
│             │ HTTP/REST                               │
│             │                                         │
│  ┌──────────▼───────────┐     ┌─────────────────┐  │
│  │   IBKR Client        │     │   WebSocket     │  │
│  │   (ib_insync)        │◄────┤   Streaming     │  │
│  └──────────┬───────────┘     └─────────────────┘  │
│             │                                         │
└─────────────┼─────────────────────────────────────┘
              │
              │ HTTPS
              │
    ┌─────────▼──────────┐
    │   Client Portal    │
    │   Gateway          │
    │   (Port 5000)      │
    └─────────┬──────────┘
              │
              │ Secure Connection
              │
    ┌─────────▼──────────┐
    │   Interactive      │
    │   Brokers          │
    │   Servers          │
    └────────────────────┘
```

### Implementation Strategy

**Phase 1: Basic Integration (Week 1)**
- Set up CP Gateway in Docker container
- Implement authentication flow
- Test account data retrieval
- Verify sandbox connectivity

**Phase 2: Core Trading Functions (Week 2-3)**
- Order placement and management
- Position tracking
- Market data subscription
- Error handling and retry logic

**Phase 3: Advanced Features (Week 4+)**
- Real-time streaming via WebSocket
- Complex order types (bracket, trailing stop)
- Risk management checks
- Performance optimization

## Python Library Recommendation: ib_insync

**GitHub:** https://github.com/erdewit/ib_insync

**Why ib_insync:**
- Modern async/await Python API
- Works with both TWS API and CP API
- Excellent abstraction layer
- Active development and community
- Comprehensive documentation
- Built-in event handling
- Jupyter notebook integration

**Installation:**
```bash
pip install ib_insync
```

**Basic Usage:**
```python
from ib_insync import *

# Connect to Client Portal
ib = IB()
ib.connect('127.0.0.1', 5000, clientId=1)

# Get account summary
account = ib.accountSummary()
print(account)

# Get positions
positions = ib.positions()
for position in positions:
    print(f"{position.contract.symbol}: {position.position}")

# Place market order
contract = Stock('AAPL', 'SMART', 'USD')
order = MarketOrder('BUY', 100)
trade = ib.placeOrder(contract, order)

# Monitor order status
trade.filledEvent += lambda trade: print(f"Order filled: {trade}")

# Disconnect
ib.disconnect()
```

## Authentication & Security

### Client Portal OAuth Flow

1. **Initial Setup:**
   - Install CP Gateway
   - Configure credentials in `conf.yaml`
   - Start gateway: `docker run -p 5000:5000 ibkr-gateway`

2. **Authentication:**
   ```bash
   # Authenticate (one-time or periodic)
   POST /v1/api/iserver/auth/ssodh/init
   
   # Response includes session token
   # Token stored in gateway, auto-refreshed
   ```

3. **Session Management:**
   - Sessions last 24 hours (configurable)
   - Auto-reauthentication on expiry
   - 2FA challenge handling

4. **Credentials Storage:**
   ```yaml
   # Use Docker secrets
   secrets:
     ibkr_credentials:
       username: your_username
       password: your_password
       trading_mode: paper  # or live
   ```

## Rate Limits & Best Practices

### API Rate Limits

```
General Requests:     10/second per endpoint
Order Submission:     100/minute
Order Modifications:  1000/minute
Market Data:          50/second (snapshot)
Historical Data:      60 requests/10 minutes
```

### Best Practices

1. **Connection Management:**
   - Use connection pooling
   - Implement exponential backoff for retries
   - Handle disconnections gracefully
   - Monitor connection health

2. **Error Handling:**
   ```python
   from ib_insync import IB, Contract, Order
   import asyncio
   
   async def place_order_with_retry(ib, contract, order, max_retries=3):
       for attempt in range(max_retries):
           try:
               trade = ib.placeOrder(contract, order)
               return trade
           except Exception as e:
               if attempt < max_retries - 1:
                   await asyncio.sleep(2 ** attempt)  # Exponential backoff
               else:
                   raise
   ```

3. **Order Validation:**
   - Pre-validate orders before submission
   - Check account balance and buying power
   - Verify contract details
   - Implement risk limits

4. **Logging & Monitoring:**
   - Log all API calls with timestamps
   - Monitor rate limit usage
   - Track order lifecycle events
   - Alert on errors and anomalies

## Data Models

### Position
```python
@dataclass
class Position:
    account: str
    contract: Contract
    position: float
    avg_cost: float
    market_price: float
    market_value: float
    unrealized_pnl: float
    realized_pnl: float
```

### Order
```python
@dataclass
class Order:
    order_id: int
    client_id: int
    perm_id: int
    action: str  # BUY/SELL
    total_quantity: float
    order_type: str  # MKT, LMT, STP, etc.
    lmt_price: Optional[float]
    aux_price: Optional[float]
    tif: str  # DAY, GTC, IOC, GTD
    status: str  # PreSubmitted, Submitted, Filled, Cancelled
```

### Trade
```python
@dataclass
class Trade:
    contract: Contract
    order: Order
    order_status: OrderStatus
    fills: List[Fill]
    log: List[TradeLogEntry]
```

## Testing Strategy

### 1. Unit Tests
- Mock IBKR API responses
- Test data model serialization
- Validate order construction

### 2. Integration Tests
- Use paper trading account
- Test full order lifecycle
- Verify error handling
- Test reconnection logic

### 3. Sandbox Testing
```python
# Test configuration
TEST_CONFIG = {
    'host': 'localhost',
    'port': 5000,
    'client_id': 1,
    'account': 'DU1234567',  # Paper account
    'paper_trading': True
}
```

## Deployment Considerations

### Docker Configuration

```dockerfile
# Dockerfile.ibkr-gateway
FROM python:3.11-slim

# Install Client Portal Gateway
WORKDIR /app
COPY clientportal.gw.zip .
RUN unzip clientportal.gw.zip

# Configure
COPY conf.yaml /app/conf.yaml

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:5000/v1/api/iserver/auth/status || exit 1

# Start gateway
CMD ["./bin/run.sh", "root/conf.yaml"]
```

### Kubernetes/Swarm Considerations
- Use persistent volumes for session state
- Implement liveness/readiness probes
- Configure resource limits (1 CPU, 512MB RAM)
- Set up log rotation
- Use secrets for credentials

## Cost Analysis

### IBKR Account Requirements

```
Paper Trading:   Free (no data subscriptions needed)
Live Trading:    $0 minimum, $10/month data fees (optional)
API Access:      Free (included with all accounts)
Market Data:     $0-$30/month per exchange
```

### Recommended Setup for Development

1. **Paper Trading Account** (Free)
   - Test all functionality
   - No financial risk
   - Full API access
   - Real-time market data (delayed 15min)

2. **Live Account** (Production)
   - Minimum $0 funding
   - Pay-as-you-go commissions
   - Optional market data subscriptions
   - Production API access

## Next Steps

1. **Immediate:**
   - Set up IBKR paper trading account
   - Install ib_insync library
   - Test basic connectivity
   - Implement authentication

2. **Short-term:**
   - Build order management system
   - Implement position tracking
   - Add risk management checks
   - Create monitoring dashboard

3. **Long-term:**
   - Optimize for performance
   - Add advanced order types
   - Implement strategy backtesting
   - Deploy to production

## References

- IBKR Web API Documentation: https://interactivebrokers.github.io/cpwebapi/
- ib_insync Documentation: https://ib-insync.readthedocs.io/
- TWS API Guide: https://interactivebrokers.github.io/tws-api/
- IBKR API Forum: https://groups.io/g/twsapi
