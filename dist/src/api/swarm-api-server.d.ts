#!/usr/bin/env npx tsx
/**
 * Swarm Visualization API Server
 *
 * Provides REST and WebSocket endpoints for real-time swarm data:
 * - GET /api/swarm/queen - Queen aggregate state
 * - GET /api/swarm/agents - All agent metrics with ROAM data
 * - GET /api/swarm/memory - HNSW memory connections
 * - WS  /ws/execution - Real-time execution event stream
 *
 * Deploy to:
 * - swarm.stx.rooz.live (StarlingX)
 * - swarm.cpanel.rooz.live (cPanel AWS)
 * - swarm.gitlab.rooz.live (GitLab)
 */
declare const app: import("express-serve-static-core").Express;
export default app;
//# sourceMappingURL=swarm-api-server.d.ts.map