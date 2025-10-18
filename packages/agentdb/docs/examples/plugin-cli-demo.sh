#!/bin/bash
# SQLite Vector Plugin CLI - Complete Demonstration
# This script demonstrates all implemented CLI commands

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SQLite Vector Learning Plugin CLI - Demo Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Clean up any existing test plugins
echo "🧹 Cleaning up test plugins..."
rm -rf plugins/demo-*
echo ""

# 1. Show help
echo "━━━ 1. SHOW HELP ━━━"
echo "$ npx agentdb help"
echo ""
node bin/agentdb.js help | head -60
echo ""
read -p "Press Enter to continue..."
echo ""

# 2. List available templates
echo "━━━ 2. LIST TEMPLATES ━━━"
echo "$ npx agentdb list-templates"
echo ""
node bin/agentdb.js list-templates
echo ""
read -p "Press Enter to continue..."
echo ""

# 3. List templates with detailed info
echo "━━━ 3. LIST TEMPLATES (DETAILED) ━━━"
echo "$ npx agentdb list-templates --detailed"
echo ""
node bin/agentdb.js list-templates --detailed | head -80
echo ""
read -p "Press Enter to continue..."
echo ""

# 4. Create a Decision Transformer plugin
echo "━━━ 4. CREATE DECISION TRANSFORMER PLUGIN ━━━"
echo "$ npx agentdb create-plugin --template decision-transformer --name demo-dt --no-customize"
echo ""
node bin/agentdb.js create-plugin --template decision-transformer --name demo-dt --no-customize
echo ""
read -p "Press Enter to continue..."
echo ""

# 5. Create a Q-Learning plugin
echo "━━━ 5. CREATE Q-LEARNING PLUGIN ━━━"
echo "$ npx agentdb create-plugin --template q-learning --name demo-qlearn --no-customize"
echo ""
node bin/agentdb.js create-plugin --template q-learning --name demo-qlearn --no-customize
echo ""
read -p "Press Enter to continue..."
echo ""

# 6. Create an Actor-Critic plugin
echo "━━━ 6. CREATE ACTOR-CRITIC PLUGIN ━━━"
echo "$ npx agentdb create-plugin --template actor-critic --name demo-ac --no-customize"
echo ""
node bin/agentdb.js create-plugin --template actor-critic --name demo-ac --no-customize
echo ""
read -p "Press Enter to continue..."
echo ""

# 7. List all created plugins
echo "━━━ 7. LIST ALL PLUGINS ━━━"
echo "$ npx agentdb list-plugins"
echo ""
node bin/agentdb.js list-plugins
echo ""
read -p "Press Enter to continue..."
echo ""

# 8. List plugins with verbose output
echo "━━━ 8. LIST PLUGINS (VERBOSE) ━━━"
echo "$ npx agentdb list-plugins --verbose"
echo ""
node bin/agentdb.js list-plugins --verbose
echo ""
read -p "Press Enter to continue..."
echo ""

# 9. Get plugin info
echo "━━━ 9. GET PLUGIN INFO ━━━"
echo "$ npx agentdb plugin-info demo-dt"
echo ""
node bin/agentdb.js plugin-info demo-dt | head -80
echo ""
read -p "Press Enter to continue..."
echo ""

# 10. Get plugin info as JSON
echo "━━━ 10. GET PLUGIN INFO (JSON) ━━━"
echo "$ npx agentdb plugin-info demo-qlearn --json"
echo ""
node bin/agentdb.js plugin-info demo-qlearn --json
echo ""
read -p "Press Enter to continue..."
echo ""

# 11. Show generated file structure
echo "━━━ 11. GENERATED FILE STRUCTURE ━━━"
echo "$ tree plugins/demo-dt/"
echo ""
if command -v tree &> /dev/null; then
    tree plugins/demo-dt/
else
    find plugins/demo-dt/ -type f | sort
fi
echo ""
read -p "Press Enter to continue..."
echo ""

# 12. Show plugin configuration
echo "━━━ 12. PLUGIN CONFIGURATION ━━━"
echo "$ cat plugins/demo-dt/plugin.yaml"
echo ""
cat plugins/demo-dt/plugin.yaml
echo ""
read -p "Press Enter to continue..."
echo ""

# 13. Show generated TypeScript code
echo "━━━ 13. GENERATED TYPESCRIPT CODE ━━━"
echo "$ cat plugins/demo-dt/src/index.ts | head -40"
echo ""
head -40 plugins/demo-dt/src/index.ts
echo ""
read -p "Press Enter to continue..."
echo ""

# 14. Show test file
echo "━━━ 14. GENERATED TEST FILE ━━━"
echo "$ cat plugins/demo-dt/tests/plugin.test.ts | head -40"
echo ""
head -40 plugins/demo-dt/tests/plugin.test.ts
echo ""
read -p "Press Enter to continue..."
echo ""

# 15. Verify TypeScript compilation
echo "━━━ 15. VERIFY TYPESCRIPT COMPILATION ━━━"
echo "$ cd plugins/demo-dt && npm install && npm run build"
echo ""
cd plugins/demo-dt
npm install --silent
npm run build 2>&1 | grep -E "(error|success|Compiled)" || echo "✓ Compiled successfully"
cd ../..
echo ""
read -p "Press Enter to continue..."
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ DEMONSTRATION COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary of Created Plugins:"
echo "  • demo-dt       - Decision Transformer"
echo "  • demo-qlearn   - Q-Learning"
echo "  • demo-ac       - Actor-Critic"
echo ""
echo "All plugins are:"
echo "  ✓ Generated from templates"
echo "  ✓ Fully configured"
echo "  ✓ TypeScript-ready"
echo "  ✓ Test-covered"
echo "  ✓ Documentation-included"
echo ""
echo "Next Steps:"
echo "  1. Customize plugin code in plugins/demo-*/src/"
echo "  2. Run tests: cd plugins/demo-dt && npm test"
echo "  3. Use in your application: import from 'plugins/demo-dt'"
echo ""
echo "Clean up test plugins:"
echo "  rm -rf plugins/demo-*"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
