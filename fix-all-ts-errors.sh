#!/bin/bash
set -e
echo "🔧 Fixing all TypeScript errors..."

# Fix 1: affiliate/index.ts
cat > src/affiliate/index.ts << 'EOF'
/**
 * Affiliate Affinity System - Module Exports
 * @module affiliate
 */

// Core class
export { AffiliateStateTracker } from './AffiliateStateTracker';
export type { AffiliateStateTrackerConfig } from './AffiliateStateTracker';

// Types
export type {
  // State types
  AffiliateStatus,
  AffiliateTier,
  AffiliateState,
  CreateAffiliateInput,
  UpdateAffiliateInput,
  
  // Activity types
  ActivityType,
  ActivitySource,
  AffiliateActivity,
  CreateActivityInput,
  
  // Risk types
  RiskType,
  RiskSeverity,
  RoamStatus,
  AffiliateRisk,
  CreateRiskInput,
  
  // Affinity types
  RelationshipType,
  AffiliateAffinity,
  CreateAffinityInput,
  
  // Event types
  AffiliateEventType,
  AffiliateEvent,
  AffiliateEventHandler,
  
  // State machine
  StateTransition,
} from './types';

export { STATE_TRANSITIONS } from './types';
EOF

# Fix 2: main.tsx
if [ -f src/main.tsx ]; then
sed -i.bak "s|import App from './App.tsx'|import App from './App'|g" src/main.tsx && rm src/main.tsx.bak
fi

# Fix 3: discord/index.ts duplicate export
if [ -f src/discord/index.ts ]; then
sed -i.bak '/^export type { DiscordBotSystem };$/d' src/discord/index.ts && rm src/discord/index.ts.bak
fi

# Fix 4: z.record() calls
if [ -f src/mcp/transports/sse.ts ]; then
sed -i.bak 's/z\.record(z\.number())/z.record(z.string(), z.number())/g' src/mcp/transports/sse.ts && rm src/mcp/transports/sse.ts.bak
fi
if [ -f src/ontology/dreamlab_adapter.ts ]; then
sed -i.bak 's/z\.record(z\.unknown())/z.record(z.string(), z.unknown())/g' src/ontology/dreamlab_adapter.ts && rm src/ontology/dreamlab_adapter.ts.bak
fi

# Fix 5: async/await in monitoring
if [ -f src/monitoring/automation-self-healing.ts ]; then
sed -i.bak 's/private handleServiceFailure(failure: any): void {/private async handleServiceFailure(failure: any): Promise<void> {/g' src/monitoring/automation-self-healing.ts
sed -i.bak 's/private handleSystemEvent(event: any): void {/private async handleSystemEvent(event: any): Promise<void> {/g' src/monitoring/automation-self-healing.ts
sed -i.bak 's/runScript(scriptPath: string, arguments: string\[\])/runScript(scriptPath: string, args: string[])/g' src/monitoring/automation-self-healing.ts
rm src/monitoring/automation-self-healing.ts.bak
fi

# Fix 6: FormData
if [ -f src/deployment/cpanel-client.ts ]; then
sed -i.bak 's/body: formData$/body: formData as any/g' src/deployment/cpanel-client.ts && rm src/deployment/cpanel-client.ts.bak
fi

# Fix 7: server.listen
if [ -f src/api/swarm-api-server.ts ]; then
sed -i.bak 's/server\.listen(PORT, HOST,/server.listen(PORT,/g' src/api/swarm-api-server.ts && rm src/api/swarm-api-server.ts.bak
fi

# Fix 8: getLLMObservatory typo
if [ -f src/services/local-llm/glm-reap-client.ts ]; then
sed -i.bak 's/getLLMObservatory/getLLMObservability/g' src/services/local-llm/glm-reap-client.ts && rm src/services/local-llm/glm-reap-client.ts.bak
fi

echo "✅ All TypeScript fixes applied!"
