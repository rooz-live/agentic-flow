# yo.life API Server

REST API for the yo.life digital cockpit, providing circle equity tracking, episode management, ROAM metrics, and authentication.

## 🚀 Quick Start

```bash
# Start the API server
./scripts/start-api-server.sh

# Test all endpoints
./scripts/test-api.sh
```

The server runs on **port 3001** by default.

## 📚 API Endpoints

### Authentication

#### `POST /api/auth/login`
Login and receive a JWT token.

**Request Body:**
```json
{
  "email": "admin@yo.life",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-1",
    "email": "admin@yo.life",
    "role": "admin",
    "circles": ["orchestrator", "assessor", "innovator", "analyst", "seeker", "intuitive"]
  }
}
```

**Default Users:**
- `admin@yo.life` / `admin123` - Full access to all circles
- `orchestrator@yo.life` / `orch123` - Access to orchestrator circle only

### Circle Data

#### `GET /api/circles/equity`
Get circle equity distribution (optional authentication).

**Response (200):**
```json
{
  "timestamp": 1736000000000,
  "totalEpisodes": 42,
  "circles": [
    {
      "name": "orchestrator",
      "color": "#3b82f6",
      "episodes": 12,
      "percentage": 29,
      "lastActivity": "2026-01-07T12:00:00.000Z"
    }
  ]
}
```

#### `GET /api/circles/:circleName/episodes`
Get episodes for a specific circle (requires authentication + circle access).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "circle": "orchestrator",
  "count": 12,
  "episodes": [
    {
      "timestamp": 1736000000,
      "circle": "orchestrator",
      "ceremony": "standup",
      "state": "...",
      "action": "...",
      "reward": 0.85
    }
  ]
}
```

### ROAM Metrics

#### `GET /api/roam/metrics`
Get current ROAM exposure metrics.

**Response (200):**
```json
{
  "risk": 23,
  "obstacle": 15,
  "assumption": 31,
  "mitigation": 18,
  "exposureScore": 6.2,
  "entities": 1247,
  "relationships": 3891,
  "timestamp": 1736000000000
}
```

### System Status

#### `GET /api/health`
Health check endpoint (public).

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": 1736000000000,
  "uptime": 1234.56
}
```

#### `GET /api/system/status`
Get system component status.

**Response (200):**
```json
{
  "mcpServer": "online",
  "agentdb": "connected",
  "episodeStore": "ready",
  "timestamp": 1736000000000
}
```

## 🔒 Authentication

The API supports **JWT-based authentication** with Bearer tokens.

### Using Authentication

1. Login to get a token:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yo.life","password":"admin123"}'
```

2. Use the token in subsequent requests:
```bash
TOKEN="<your-jwt-token>"
curl http://localhost:3001/api/circles/orchestrator/episodes \
  -H "Authorization: Bearer $TOKEN"
```

### Authorization Levels

- **Public**: No authentication required
  - `/api/health`
  - `/api/system/status`
  - `/api/roam/metrics`
  
- **Optional Auth**: Works with or without token
  - `/api/circles/equity` (logged users may see additional data)
  
- **Protected**: Requires valid JWT token
  - `/api/circles/:circleName/episodes`

### Role-Based Access

- **admin**: Full access to all circles
- **circle_lead**: Access to specific circles only
- **service**: API key access for system-to-system calls

## 🔧 Configuration

Environment variables:

```bash
# Server
NODE_ENV=development       # development | production
PORT=3001                  # API server port

# Authentication
JWT_SECRET=your-secret     # JWT signing secret (CHANGE IN PRODUCTION!)
API_KEYS=key1,key2         # Comma-separated API keys for service auth
```

## 📁 Data Sources

### Episode Files
Located in `.episodes/` directory:
```
.episodes/
  orchestrator_standup_1736000000.json
  assessor_wsjf_1736000100.json
  ...
```

### Equity Cache
Located in `.equity/circle_equity.json`:
```json
{
  "timestamp": 1736000000000,
  "total_episodes": 42,
  "circles": {
    "orchestrator": { "count": 12, "percentage": 29 },
    ...
  }
}
```

## 🧪 Testing

Run the test suite:
```bash
./scripts/test-api.sh
```

Tests include:
- Health check
- Authentication (valid/invalid credentials)
- Circle equity (with/without auth)
- Circle episodes (protected endpoint)
- ROAM metrics
- System status
- Error handling (404)

## 🔄 WebSocket Support

For real-time ROAM updates, see:
- `src/services/ROAMWebSocketServer.ts` (server)
- `src/hooks/useROAMWebSocket.ts` (React client hook)

WebSocket server runs on **port 8080** and broadcasts:
- ROAM metric updates
- Circle events
- Heartbeat (every 30s)

## 🚧 Development

### Adding New Endpoints

1. Add route handler in `src/api/server.ts`
2. Apply appropriate middleware (`authenticate`, `optionalAuthenticate`, etc.)
3. Update this README with the new endpoint
4. Add test case in `scripts/test-api.sh`

### Middleware Chain

```typescript
app.get('/api/example', 
  authenticate,           // Require valid JWT
  requireRole('admin'),   // Require admin role
  requireCircleAccess,    // Check circle access
  async (req, res) => {
    // Handler
  }
);
```

## 📊 Circle Colors

```typescript
orchestrator: '#3b82f6'  // Blue
assessor:     '#22c55e'  // Green
innovator:    '#ec4899'  // Pink
analyst:      '#06b6d4'  // Cyan
seeker:       '#eab308'  // Yellow
intuitive:    '#ef4444'  // Red
```

## 🔗 Related Components

- **CLI Scripts**: `scripts/ay-prod-cycle.sh`, `scripts/ay-yo-enhanced.sh`
- **React UI**: `src/components/yolife/`
- **WebSocket**: `src/services/ROAMWebSocketServer.ts`
- **Auth Middleware**: `src/api/middleware/auth.ts`

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill $(lsof -t -i:3001)
```

### JWT Token Expired
Tokens expire after **24 hours**. Login again to get a new token.

### Circle Access Denied
Ensure your user has access to the requested circle. Admins can access all circles.

## 🔮 Future Improvements

- [ ] Database migration (from file-based to SQLite/PostgreSQL)
- [ ] Rate limiting
- [ ] API versioning (/api/v1/...)
- [ ] OpenAPI/Swagger documentation
- [ ] bcrypt password hashing
- [ ] Refresh token support
- [ ] WebSocket authentication
- [ ] Metrics and monitoring (Prometheus)
