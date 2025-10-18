# test-plugin

Model-free value-based learning

**Version:** 1.0.0
**Author:** Unknown
**Algorithm:** q_learning

## Installation

```bash
npm install
```

## Usage

```typescript
import { PluginRegistry } from 'agentdb/plugins';

// Load plugin
const plugin = await PluginRegistry.load('test-plugin');

// Initialize
await plugin.initialize(config);

// Use in your application
const action = await plugin.selectAction(state);
```

## Configuration

See `plugin.yaml` for complete configuration options.

## Testing

```bash
npm test
```

## License

MIT
