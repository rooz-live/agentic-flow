# AgentDB v1.0.1 Release Notes

**Release Date:** October 18, 2025
**Package:** agentdb@1.0.1
**Homepage:** https://agentdb.ruv.io

## 🎯 Release Summary

Point release with critical browser WASM bundling, improved CLI help system, and updated branding.

## 📦 What's New

### Browser WASM Support
- **WASM files now bundled** - No external CDN dependencies
- **Offline-first** - All 10 browser examples work without internet
- **Version consistency** - Eliminates mismatch between package and CDN versions
- **1.7MB WASM bundle** - Includes production and debug variants

### CLI Improvements
- **80% smaller main help** - Concise overview that fits one screen
- **Command-specific subhelp** - Detailed help for 11 commands
- **Multiple access patterns** - `--help`, `-h`, `help <command>` all work
- **Better discoverability** - Hierarchical help system

### Branding Updates
- **Homepage:** https://agentdb.ruv.io (was ruv.io)
- **Consistent branding** across all CLI outputs
- **Updated version display** - Shows v1.0.1 everywhere

## 🔧 Technical Changes

### Build Process
```bash
npm run build:wasm  # Now copies WASM from sql.js to dist/wasm/
```

### WASM Files Included
- `dist/wasm/sql-wasm.wasm` (645KB) - Production
- `dist/wasm/sql-wasm.js` (48KB) - JS wrapper
- `dist/wasm/sql-wasm-debug.wasm` (723KB) - Debug build
- `dist/wasm/sql-wasm-debug.js` (237KB) - Debug wrapper

### Package Stats
- **Total files:** 366 (was 365)
- **Package size:** 1.2 MB
- **Unpacked size:** 4.2 MB
- **New file:** CHANGELOG.md

## 🐛 Bug Fixes

- Browser examples now work offline with bundled WASM
- CLI help commands all work consistently
- Plugin wizard path logging is accurate
- All `--help` and `-h` flags work correctly

## 📚 Documentation

### New Files
- `CHANGELOG.md` - Version history
- `docs/CLI_HELP_SYSTEM.md` - Help system documentation
- `docs/RELEASE_v1.0.1.md` - This file

### Updated Files
- `package.json` - Version, homepage, files array
- `bin/agentdb.js` - Concise help, subcommands
- `src/wasm-loader.ts` - Bundled WASM paths

## 🚀 Publishing

### Pre-publish Checklist
- [x] Version bumped to 1.0.1
- [x] CHANGELOG.md created
- [x] Build successful (all WASM files copied)
- [x] CLI help tested
- [x] npm pack verified (366 files, 1.2MB)
- [x] Homepage updated to agentdb.ruv.io
- [x] All tests pass

### Publish Command
```bash
# Dry run first
npm publish --dry-run

# Actual publish
npm publish --access public

# Verify
npm info agentdb
```

## 📋 Migration Guide

### For Existing Users

No breaking changes. Users on v1.0.0 can upgrade seamlessly:

```bash
npm update agentdb
# or
npm install agentdb@latest
```

### Browser Example Users

If you were using browser examples with CDN fallback, they now use bundled WASM automatically. No code changes needed.

### CLI Users

Help output is now more concise. Use `--help` on any command for detailed help:

```bash
npx agentdb init --help
npx agentdb create-plugin --help
npx agentdb mcp --help
```

## 🔗 Links

- **Homepage:** https://agentdb.ruv.io
- **GitHub:** https://github.com/ruvnet/agentic-flow/tree/main/packages/agentdb
- **npm:** https://www.npmjs.com/package/agentdb
- **Issues:** https://github.com/ruvnet/agentic-flow/issues
- **Changelog:** [CHANGELOG.md](../CHANGELOG.md)

## 👏 Acknowledgments

Special thanks to all contributors and users who provided feedback on v1.0.0.

## 📞 Support

- Report bugs: https://github.com/ruvnet/agentic-flow/issues
- Discussions: https://github.com/ruvnet/agentic-flow/discussions
- Website: https://agentdb.ruv.io
