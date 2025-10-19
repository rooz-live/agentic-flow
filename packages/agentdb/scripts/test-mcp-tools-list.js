#!/usr/bin/env node

/**
 * Test script to list all MCP tools exposed by AgentDB
 */

const { spawn } = require('child_process');

// Spawn the MCP server
const server = spawn('node', ['bin/agentdb.js', 'mcp'], {
  cwd: __dirname + '/..',
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

server.stdout.on('data', (data) => {
  stdout += data.toString();
});

server.stderr.on('data', (data) => {
  stderr += data.toString();
  console.error('Server:', data.toString());
});

// Wait for server to start
setTimeout(() => {
  // Send listTools request
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  server.stdin.write(JSON.stringify(request) + '\n');

  // Wait for response
  setTimeout(() => {
    try {
      const lines = stdout.split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.result && response.result.tools) {
            console.log('\n📋 MCP Tools Available:');
            console.log('=' .repeat(60));
            response.result.tools.forEach((tool, i) => {
              console.log(`\n${i + 1}. ${tool.name}`);
              console.log(`   ${tool.description.substring(0, 80)}...`);
            });
            console.log('\n' + '='.repeat(60));
            console.log(`Total tools: ${response.result.tools.length}`);

            // Check for learning tools
            const learningTools = response.result.tools.filter(t => t.name.startsWith('learning_') || t.name === 'experience_record' || t.name === 'reward_signal');
            console.log(`Learning tools: ${learningTools.length}`);
            console.log(`\nLearning tools found:`);
            learningTools.forEach(t => console.log(`  - ${t.name}`));
          }
        } catch (e) {
          // Skip non-JSON lines
        }
      }
    } catch (error) {
      console.error('Error parsing response:', error);
    }

    server.kill();
    process.exit(0);
  }, 500);
}, 1000);

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout waiting for server response');
  server.kill();
  process.exit(1);
}, 5000);
