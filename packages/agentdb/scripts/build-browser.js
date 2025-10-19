#!/usr/bin/env node

/**
 * Build browser bundle for AgentDB
 * Creates dist/agentdb.min.js for CDN usage
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const buildBrowser = async () => {
  console.log('📦 Building browser bundle for AgentDB...\n');

  try {
    // Build minified browser bundle
    await esbuild.build({
      entryPoints: ['src/index.browser.ts'],
      bundle: true,
      minify: true,
      sourcemap: true,
      format: 'esm',
      target: 'es2020',
      platform: 'browser',
      outfile: 'dist/agentdb.min.js',
      external: [
        'better-sqlite3', // Node-only
        '@modelcontextprotocol/sdk', // MCP server is Node-only
        'fs', 'path', 'crypto', 'node:*', // Node built-ins
        './native-backend', // Node-only backend
        './native-backend.js', // Node-only backend
        '../core/native-backend', // Node-only backend
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      banner: {
        js: `/**
 * AgentDB v1.0.7 - Browser Bundle
 * Ultra-fast agent memory and vector database
 * Built with sql.js WASM backend for browser support
 * @license MIT OR Apache-2.0
 */`,
      },
    });

    // Also build non-minified version for debugging
    await esbuild.build({
      entryPoints: ['src/index.browser.ts'],
      bundle: true,
      minify: false,
      sourcemap: true,
      format: 'esm',
      target: 'es2020',
      platform: 'browser',
      outfile: 'dist/agentdb.js',
      external: [
        'better-sqlite3',
        '@modelcontextprotocol/sdk',
        'fs', 'path', 'crypto', 'node:*',
        './native-backend',
        './native-backend.js',
        '../core/native-backend',
      ],
      define: {
        'process.env.NODE_ENV': '"development"',
      },
    });

    const minifiedSize = fs.statSync('dist/agentdb.min.js').size;
    const unminifiedSize = fs.statSync('dist/agentdb.js').size;

    console.log('✅ Browser bundles created:');
    console.log(`   dist/agentdb.min.js    ${(minifiedSize / 1024).toFixed(2)} KB (minified)`);
    console.log(`   dist/agentdb.js        ${(unminifiedSize / 1024).toFixed(2)} KB (development)`);
    console.log(`   dist/agentdb.min.js.map (source map)`);
    console.log(`   dist/agentdb.js.map     (source map)`);
    console.log('');
    console.log('📚 Usage:');
    console.log('   <script type="module">');
    console.log('     import { SQLiteVectorDB } from "https://unpkg.com/agentdb@1.0.7/dist/agentdb.min.js";');
    console.log('     const db = new SQLiteVectorDB({ memoryMode: true, backend: "wasm" });');
    console.log('     await db.initializeAsync();');
    console.log('   </script>');
    console.log('');

  } catch (error) {
    console.error('❌ Browser bundle build failed:', error);
    process.exit(1);
  }
};

buildBrowser();
