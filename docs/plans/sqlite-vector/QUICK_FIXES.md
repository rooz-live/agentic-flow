# SQLiteVector Quick Fixes - 30 Minutes to Build Success

**Status**: These fixes will enable TypeScript compilation
**Time Required**: 30 minutes
**Impact**: Package will build successfully (except WASM)

---

## Fix 1: Nullable Metadata Types (10 minutes)

### File: `src/reasoning/experience-curator.ts`

**Line 167**:
```typescript
// Before:
const metadata = result.metadata;

// After:
const metadata = result.metadata || {};
```

### File: `src/reasoning/memory-optimizer.ts`

**Line 333**:
```typescript
// Before:
const metadata = result.metadata;

// After:
const metadata = result.metadata || {};
```

### File: `src/reasoning/pattern-matcher.ts`

**Line 123**:
```typescript
// Before:
const patternData = result.metadata;

// After:
const patternData = result.metadata || {};
```

---

## Fix 2: QUIC Import Path (15 minutes)

### File: `src/sync/quic-sync.ts`

**Lines 7-8**:
```typescript
// Before:
import { QuicTransport } from '../../../src/transport/quic';
import type { AgentMessage } from '../../../src/transport/quic';

// After: Create local interface (temporary fix)
interface QuicTransportConfig {
  serverName?: string;
  maxIdleTimeoutMs?: number;
  maxConcurrentStreams?: number;
  enable0Rtt?: boolean;
}

interface AgentMessage {
  id: string;
  type: string;
  payload: any;
  metadata?: Record<string, any>;
}

interface PoolStatistics {
  active: number;
  idle: number;
  created: number;
  closed: number;
}

class QuicTransport {
  static async create(config: QuicTransportConfig): Promise<QuicTransport> {
    throw new Error('QUIC transport not available - install @agentic-flow/core');
  }
  
  async send(address: string, message: AgentMessage): Promise<void> {
    throw new Error('QUIC transport not available');
  }
  
  async receive(address: string): Promise<AgentMessage> {
    throw new Error('QUIC transport not available');
  }
  
  async getStats(): Promise<PoolStatistics> {
    return { active: 0, idle: 0, created: 0, closed: 0 };
  }
  
  async close(): Promise<void> {}
}
```

---

## Fix 3: WebAssembly Namespace (5 minutes)

### File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM", "WebAssembly"],  // Add WebAssembly
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node", "jest"]
  }
}
```

### File: `tsconfig.esm.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ES2020",
    "outDir": "./dist",
    "lib": ["ES2020", "DOM", "WebAssembly"]  // Add WebAssembly
  }
}
```

---

## Apply All Fixes (Automated Script)

```bash
#!/bin/bash
cd /workspaces/agentic-flow/packages/sqlite-vector

# Fix 1: Nullable metadata
sed -i '167s/const metadata = result.metadata;/const metadata = result.metadata || {};/' src/reasoning/experience-curator.ts
sed -i '333s/const metadata = result.metadata;/const metadata = result.metadata || {};/' src/reasoning/memory-optimizer.ts
sed -i '123s/const patternData = result.metadata;/const patternData = result.metadata || {};/' src/reasoning/pattern-matcher.ts

# Fix 3: Add WebAssembly to tsconfig
# (Manual edit required - see above)

echo "✅ Fixes applied!"
echo "⚠️  Manual fix required for src/sync/quic-sync.ts (see QUICK_FIXES.md)"
echo "⚠️  Manual fix required for tsconfig.json (add WebAssembly to lib)"
```

---

## Verification

After applying fixes:

```bash
cd /workspaces/agentic-flow/packages/sqlite-vector
npm run build
```

**Expected Result**:
```
✅ TypeScript compilation successful
⚠️  WASM build skipped (expected - requires separate fix)
```

---

## Next Steps

After these quick fixes, the remaining issue is WASM compilation. See `WASM_FIX_GUIDE.md` for the 4-8 hour solution.
