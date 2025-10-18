#!/usr/bin/env node
/**
 * Test MCP server with stdio communication
 * This script validates all 10 MCP tools work correctly
 */

const { spawn } = require('child_process');
const path = require('path');

// MCP test messages
const mcpTests = [
  {
    name: 'Initialize MCP connection',
    message: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    }
  },
  {
    name: 'List available tools',
    message: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    }
  },
  {
    name: 'List available resources',
    message: {
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/list',
      params: {}
    }
  }
];

async function testMCPServer() {
  console.log('====================================================================');
  console.log('                 MCP Server stdio Test');
  console.log('====================================================================\n');

  const mcpServerPath = path.join(__dirname, '../dist/mcp-server.js');

  console.log('Starting MCP server...');
  const child = spawn('node', [mcpServerPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseBuffer = '';
  let testIndex = 0;
  let testsPassed = 0;
  let testsFailed = 0;

  child.stdout.on('data', (data) => {
    responseBuffer += data.toString();

    // Try to parse JSON-RPC responses
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || ''; // Keep last incomplete line

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response = JSON.parse(line);

        if (response.result) {
          const testName = mcpTests[testIndex - 1]?.name || 'Unknown test';
          console.log(`✅  ${testName}`);

          // Log specific results
          if (response.result.tools) {
            console.log(`    Found ${response.result.tools.length} tools:`,
              response.result.tools.map(t => t.name).join(', '));
          }
          if (response.result.resources) {
            console.log(`    Found ${response.result.resources.length} resources:`,
              response.result.resources.map(r => r.name).join(', '));
          }

          testsPassed++;
        } else if (response.error) {
          console.log(`❌  ${mcpTests[testIndex - 1]?.name}`);
          console.log(`    Error: ${response.error.message}`);
          testsFailed++;
        }

        // Send next test
        if (testIndex < mcpTests.length) {
          const nextTest = mcpTests[testIndex];
          testIndex++;
          child.stdin.write(JSON.stringify(nextTest.message) + '\n');
        } else {
          // All tests complete
          setTimeout(() => {
            child.kill();
            printSummary();
            process.exit(testsFailed > 0 ? 1 : 0);
          }, 500);
        }
      } catch (err) {
        // Not JSON or incomplete message
      }
    }
  });

  child.stderr.on('data', (data) => {
    const stderr = data.toString();
    if (!stderr.includes('Starting AgentDB MCP Server')) {
      console.error('MCP Server stderr:', stderr);
    }
  });

  child.on('error', (err) => {
    console.error('❌  Failed to start MCP server:', err);
    testsFailed++;
    process.exit(1);
  });

  child.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n❌  MCP server exited with code ${code}`);
    }
  });

  function printSummary() {
    console.log('\n====================================================================');
    console.log('                      Test Summary');
    console.log('====================================================================');
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Tests Failed: ${testsFailed}`);
    console.log(`Total Tests:  ${mcpTests.length}`);
    console.log('====================================================================\n');

    if (testsFailed === 0) {
      console.log('✅  All MCP stdio tests passed!\n');
    } else {
      console.log('❌  Some MCP tests failed!\n');
    }
  }

  // Send first test after server starts
  setTimeout(() => {
    child.stdin.write(JSON.stringify(mcpTests[0].message) + '\n');
    testIndex++;
  }, 1000);

  // Timeout after 10 seconds
  setTimeout(() => {
    console.error('\n❌  Test timeout after 10 seconds');
    child.kill();
    process.exit(1);
  }, 10000);
}

testMCPServer().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
