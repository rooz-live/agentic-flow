#!/bin/bash
set -e

echo "🔧 Fixing TypeScript errors..."

# Fix 1: affiliate/index.ts - Use export type for type-only exports
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

# Fix 2: main.tsx - Remove .tsx extension
sed -i '' "s|import App from './App.tsx'|import App from './App'|g" src/main.tsx

# Fix 3: discord/index.ts - Remove duplicate export type
sed -i '' '/^export type { DiscordBotSystem };$/d' src/discord/index.ts

# Fix 4: Fix z.record() calls - need two arguments
sed -i '' 's/z\.record(z\.number())/z.record(z.string(), z.number())/g' src/mcp/transports/sse.ts
sed -i '' 's/z\.record(z\.unknown())/z.record(z.string(), z.unknown())/g' src/ontology/dreamlab_adapter.ts

# Fix 5: Fix async/await issues in monitoring
sed -i '' 's/private handleServiceFailure(failure: any): void {/private async handleServiceFailure(failure: any): Promise<void> {/g' src/monitoring/automation-self-healing.ts
sed -i '' 's/private handleSystemEvent(event: any): void {/private async handleSystemEvent(event: any): Promise<void> {/g' src/monitoring/automation-self-healing.ts

# Fix 6: Fix 'arguments' reserved keyword
sed -i '' 's/arguments: string\[\]/args: string[]/g' src/monitoring/automation-self-healing.ts

# Fix 7: Fix FormData type issue in cpanel-client.ts
sed -i '' 's/body: formData/body: formData as any/g' src/deployment/cpanel-client.ts

# Fix 8: Fix server.listen signature
sed -i '' 's/server.listen(PORT, HOST,/server.listen(PORT,/g' src/api/swarm-api-server.ts

# Fix 9: getLLMObservatory typo
sed -i '' 's/getLLMObservatory/getLLMObservability/g' src/services/local-llm/glm-reap-client.ts

echo "✅ TypeScript fixes applied"
