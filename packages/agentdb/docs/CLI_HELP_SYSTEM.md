# AgentDB CLI Help System

## Overview

The AgentDB CLI features a concise, hierarchical help system with:
- **Main help** - Brief overview of all commands
- **Command-specific help** - Detailed usage for each command
- **Multiple access patterns** - `help <command>` or `<command> --help`

## Usage Patterns

### Main Help
```bash
npx agentdb help
npx agentdb --help
npx agentdb -h
```

### Command-Specific Help
```bash
npx agentdb help <command>
npx agentdb <command> --help
npx agentdb <command> -h
```

## Available Commands

### Core Commands
- `init` - Initialize vector database
- `mcp` - Start MCP server for Claude Code
- `benchmark` - Run performance benchmarks
- `version` - Show version information

### Plugin Commands
- `create-plugin` - Create learning plugin (interactive wizard)
- `list-plugins` - List available plugins
- `list-templates` - List plugin templates
- `plugin-info` - Show plugin details

### Database Commands
- `import` - Import vectors from file
- `export` - Export vectors to file
- `query` - Query vector database
- `stats` - Show database statistics

## Help Content Structure

Each command help page includes:
1. **Command name**
2. **Brief description**
3. **Usage syntax**
4. **Arguments** (required parameters)
5. **Options** (optional flags)
6. **Examples** (practical usage)
7. **Additional context** (when applicable)

## Examples

### Quick Reference
```bash
# Create a plugin
npx agentdb create-plugin

# Initialize database
npx agentdb init ./agents.db

# Get help on specific command
npx agentdb init --help
```

### Detailed Command Help
```bash
# See all options for create-plugin
npx agentdb help create-plugin

# Get database import options
npx agentdb import --help

# View MCP server configuration
npx agentdb mcp --help
```

## Implementation Details

### File Location
- Main CLI: `/bin/agentdb.js`
- Comprehensive help (legacy): `/src/cli/help.ts`

### Help Functions
- `showHelp(subcommand)` - Main help or subcommand help
- `showCommandHelp(command)` - Detailed command-specific help

### Design Principles
1. **Concise main help** - Overview fits in one screen
2. **Detailed subhelp** - Each command has dedicated help page
3. **Consistent formatting** - All help follows same structure
4. **Practical examples** - Every command shows real usage
5. **Easy discovery** - Multiple ways to access help

## Website Reference

Homepage: https://agentdb.ruv.io
