const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
};

// Parse arguments
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const verbose = args.includes('--verbose') || args.includes('-v');
const help = args.includes('--help') || args.includes('-h');

if (help) {
    console.log(`
${colors.cyan}Goalie VSIX Gap Checker${colors.reset}

Usage: node gap-check.js [options]

Options:
  --json      Output results in JSON format
  --verbose   Show detailed progress
  --help      Show this help message
`);
    process.exit(0);
}

// Assume script is run from the package root (cwd)
const packageJsonPath = path.join(process.cwd(), 'package.json');

if (verbose && !jsonMode) console.log(`${colors.blue}Checking ${packageJsonPath}...${colors.reset}`);

const results = {
    gaps: [],
    warnings: [],
    status: 'ok'
};

try {
    if (!fs.existsSync(packageJsonPath)) {
        const msg = 'package.json not found in current directory.';
        if (jsonMode) {
            console.log(JSON.stringify({ status: 'error', gaps: [msg] }));
        } else {
            console.error(`${colors.red}GAP DETECTED: ${msg}${colors.reset}`);
        }
        process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Helper to add gap
    const addGap = (msg) => {
        results.gaps.push(msg);
        results.status = 'error';
        if (verbose && !jsonMode) console.log(`${colors.red}  [GAP] ${msg}${colors.reset}`);
    };

    // Helper to add warning
    const addWarning = (msg) => {
        results.warnings.push(msg);
        if (verbose && !jsonMode) console.log(`${colors.yellow}  [WARN] ${msg}${colors.reset}`);
    };

    // 1. Basic Metadata
    if (!packageJson.name) addGap('Missing "name" field');
    if (!packageJson.displayName) addWarning('Missing "displayName" field');
    if (!packageJson.version) addGap('Missing "version" field');
    if (!packageJson.publisher) addGap('Missing "publisher" field');
    if (!packageJson.engines || !packageJson.engines.vscode) addGap('Missing "engines.vscode" field');

    // 2. Activation Events
    if (!packageJson.activationEvents) {
        addWarning('Missing "activationEvents" (might be implicit in newer VS Code)');
    } else if (Array.isArray(packageJson.activationEvents) && packageJson.activationEvents.length === 0) {
        addWarning('"activationEvents" is empty');
    }

    // 3. Contributes: Views
    if (!packageJson.contributes || !packageJson.contributes.views) {
        addGap('contributes.views is missing');
    } else {
        // Check for goalieGapsView
        let foundGoalieGapsView = false;
        const views = packageJson.contributes.views;
        for (const container in views) {
            if (views[container].some(view => view.id === 'goalieGapsView')) {
                foundGoalieGapsView = true;
                break;
            }
        }
        if (!foundGoalieGapsView) {
            addGap('goalieGapsView is missing from contributes.views');
        }
    }

    // 4. Contributes: Commands
    if (!packageJson.contributes || !packageJson.contributes.commands || !Array.isArray(packageJson.contributes.commands)) {
        addGap('contributes.commands is missing or not an array');
    } else {
        if (packageJson.contributes.commands.length === 0) {
            addWarning('contributes.commands is empty');
        }
    }

    // Output results
    if (jsonMode) {
        console.log(JSON.stringify(results, null, 2));
    } else {
        if (results.gaps.length > 0) {
            console.log(`\n${colors.red}❌ Gaps Detected:${colors.reset}`);
            results.gaps.forEach(gap => console.log(`  - ${gap}`));
        }

        if (results.warnings.length > 0) {
            console.log(`\n${colors.yellow}⚠️  Warnings:${colors.reset}`);
            results.warnings.forEach(warn => console.log(`  - ${warn}`));
        }

        if (results.gaps.length === 0) {
            console.log(`\n${colors.green}✅ NO GAPS DETECTED${colors.reset}`);
        }
    }

    process.exit(results.gaps.length > 0 ? 1 : 0);

} catch (error) {
    const msg = `Error reading or parsing package.json: ${error.message}`;
    if (jsonMode) {
        console.log(JSON.stringify({ status: 'error', gaps: [msg] }));
    } else {
        console.error(`${colors.red}GAP DETECTED: ${msg}${colors.reset}`);
    }
    process.exit(1);
}
