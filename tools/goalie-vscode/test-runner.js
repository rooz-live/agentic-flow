#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`, 'cyan');
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTests(testType = 'all') {
  const projectDir = path.resolve(__dirname);
  const jestConfig = path.join(projectDir, 'jest.config.js');
  
  try {
    log('\n🚀 Starting Goalie VSCode Extension Tests', 'bright');
    log('=====================================', 'blue');
    
    switch (testType) {
      case 'unit':
        log('\n📋 Running Unit Tests', 'yellow');
        await runCommand('npx', ['jest', '--config', jestConfig, 'tests/unit'], { cwd: projectDir });
        break;
        
      case 'integration':
        log('\n🔗 Running Integration Tests', 'yellow');
        await runCommand('npx', ['jest', '--config', jestConfig, 'tests/integration'], { cwd: projectDir });
        break;
        
      case 'performance':
        log('\n⚡ Running Performance Tests', 'yellow');
        await runCommand('npx', ['jest', '--config', jestConfig, 'tests/performance'], { cwd: projectDir });
        break;
        
      case 'userExperience':
        log('\n👤 Running User Experience Tests', 'yellow');
        await runCommand('npx', ['jest', '--config', jestConfig, 'tests/userExperience'], { cwd: projectDir });
        break;
        
      case 'coverage':
        log('\n📊 Running Tests with Coverage', 'yellow');
        await runCommand('npx', ['jest', '--config', jestConfig, '--coverage'], { cwd: projectDir });
        break;
        
      case 'watch':
        log('\n👀 Running Tests in Watch Mode', 'yellow');
        await runCommand('npx', ['jest', '--config', jestConfig, '--watch'], { cwd: projectDir });
        break;
        
      case 'all':
      default:
        log('\n🎯 Running All Tests', 'yellow');
        await runCommand('npx', ['jest', '--config', jestConfig], { cwd: projectDir });
        break;
    }
    
    log('\n✅ Tests completed successfully!', 'green');
    
    // Show test results summary
    if (testType === 'coverage' || testType === 'all') {
      log('\n📊 Coverage Report Available', 'cyan');
      log('Open coverage/lcov-report/index.html in your browser to view detailed coverage', 'blue');
    }
    
  } catch (error) {
    log(`\n❌ Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';

// Show usage help
if (args.includes('--help') || args.includes('-h')) {
  log('Goalie VSCode Extension Test Runner', 'bright');
  log('=====================================', 'blue');
  log('\nUsage: node test-runner.js [test-type]', 'cyan');
  log('\nAvailable test types:', 'yellow');
  log('  all           - Run all tests (default)', 'white');
  log('  unit          - Run unit tests only', 'white');
  log('  integration   - Run integration tests only', 'white');
  log('  performance   - Run performance tests only', 'white');
  log('  userExperience- Run user experience tests only', 'white');
  log('  coverage      - Run tests with coverage report', 'white');
  log('  watch         - Run tests in watch mode', 'white');
  log('\nExamples:', 'cyan');
  log('  node test-runner.js unit', 'white');
  log('  node test-runner.js coverage', 'white');
  log('  node test-runner.js watch', 'white');
  process.exit(0);
}

// Run the tests
runTests(testType);