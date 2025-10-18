# Plugin System Documentation

Plugin system architecture and API documentation for AgentDB.

## 📋 Available Documentation

- **[API.md](./API.md)** - Complete plugin API reference
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide for plugin development
- **[DESIGN.md](./DESIGN.md)** - Plugin system design and architecture
- **[IMPLEMENTATIONS.md](./IMPLEMENTATIONS.md)** - Plugin implementations reference
- **[SYSTEM_ANALYSIS.md](./SYSTEM_ANALYSIS.md)** - In-depth system analysis
- **[CLI_IMPLEMENTATION.md](./CLI_IMPLEMENTATION.md)** - CLI plugin integration
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation overview
- **[VALIDATION_REPORT.md](./VALIDATION_REPORT.md)** - Plugin validation results

## 🚀 Quick Start

```typescript
import { Plugin } from '@agentdb/core';

const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  hooks: {
    beforeQuery: async (query) => {
      // Transform query
      return query;
    }
  }
};
```

See [QUICKSTART.md](./QUICKSTART.md) for complete plugin development guide.
