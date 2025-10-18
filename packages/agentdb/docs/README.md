# AgentDB Documentation

Welcome to the AgentDB documentation. This directory contains comprehensive documentation for the AgentDB vector database system.

## 📚 Documentation Structure

### Core Documentation

- **[CLI](./cli/)** - Command-line interface documentation
  - Help guides and usage instructions
  - Command reference
  - Plugin system integration
  - Database commands

- **[Plugins](./plugins/)** - Plugin system documentation
  - API reference
  - Quickstart guide
  - Design and architecture
  - Implementation details

- **[Integration](./integration/)** - Third-party integrations
  - [MCP Server](./integration/mcp/) - Model Context Protocol integration

- **[Validation](./validation/)** - Testing and verification
  - Build verification
  - Docker validation
  - Security audit reports

### Feature Documentation

- **[Features](./features/)** - Feature-specific documentation
  - Query Builder
  - ReasoningBank
  - QUIC Sync
  - Decision Transformer
  - Reinforcement Learning

- **[Examples](./examples/)** - Code examples and demos
  - Binary quantization examples
  - Query builder examples
  - CLI usage demonstrations

### Technical Documentation

- **[Quantization](./quantization/)** - Vector quantization methods
  - Binary quantization
  - Scalar quantization
  - Accuracy analysis

- **[Optimization](./optimization/)** - Performance optimization
  - HNSW optimization results
  - Performance reports
  - Complete optimization guides

- **[Guides](./guides/)** - User and deployment guides
  - Database locations
  - Deployment instructions
  - NPM package distribution

### Project Management

- **[Planning](./planning/)** - Future roadmap and enhancements
- **[Summaries](./summaries/)** - Implementation and validation reports
- **[Archive](./archive/)** - Historical documentation and deprecated features

## 🚀 Quick Start

1. **Installation**: See [Guides > NPM Package Ready](./guides/NPM_PACKAGE_READY.md)
2. **CLI Usage**: See [CLI > Help Guide](./cli/HELP_GUIDE.md)
3. **Plugin Development**: See [Plugins > Quickstart](./plugins/QUICKSTART.md)
4. **MCP Integration**: See [Integration > MCP > Quick Start](./integration/mcp/QUICK_START.md)

## 📖 Common Tasks

- **Using the CLI**: [CLI Commands](./cli/COMMANDS.md)
- **Building Queries**: [Query Builder](./features/QUERY-BUILDER.md)
- **Performance Tuning**: [Optimization Guide](./optimization/COMPLETE_OPTIMIZATION_GUIDE.md)
- **Security**: [Security Audit](./validation/SECURITY_AUDIT.md)

## 🔍 Find Documentation

| Topic | Location |
|-------|----------|
| CLI Help | [cli/HELP_GUIDE.md](./cli/HELP_GUIDE.md) |
| Plugin API | [plugins/API.md](./plugins/API.md) |
| MCP Server | [integration/mcp/SERVER.md](./integration/mcp/SERVER.md) |
| Deployment | [guides/DEPLOYMENT.md](./guides/DEPLOYMENT.md) |
| Performance | [optimization/PERFORMANCE_REPORT.md](./optimization/PERFORMANCE_REPORT.md) |
| Security | [validation/SECURITY_AUDIT.md](./validation/SECURITY_AUDIT.md) |

## 📝 Contributing

When adding new documentation:
1. Place files in the appropriate category directory
2. Use UPPERCASE naming for consistency (e.g., `NEW_FEATURE.md`)
3. Update the relevant category README
4. Add cross-references to related documentation

## 📊 Documentation Statistics

- **Total Categories**: 13
- **Total Files**: ~80 markdown files
- **Code Examples**: TypeScript, Shell scripts
- **Last Reorganized**: October 2025
