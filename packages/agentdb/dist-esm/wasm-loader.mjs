/**
 * WASM module loader for Node.js and browser environments
 * Handles sql.js initialization and provides unified interface
 */
import initSqlJs from 'sql.js';
let sqlJs = null;
let initialized = false;
/**
 * Initialize sql.js WASM module
 * Automatically detects Node.js vs browser environment
 */
export async function initWasm(options) {
    if (initialized) {
        return;
    }
    try {
        // Initialize sql.js with appropriate configuration
        sqlJs = await initSqlJs({
            locateFile: options?.locateFile || ((file) => {
                // Default locator: Use bundled WASM in browser, node_modules in Node.js
                if (typeof window !== 'undefined') {
                    // Use bundled WASM files from npm package
                    // Falls back to CDN if bundled files not found
                    const bundledPath = `./node_modules/agentdb/dist/wasm/${file}`;
                    return bundledPath;
                }
                // In Node.js, sql.js package includes the WASM file
                return `node_modules/sql.js/dist/${file}`;
            })
        });
        initialized = true;
    }
    catch (error) {
        throw new Error(`Failed to initialize sql.js WASM module: ${error instanceof Error ? error.message : String(error)}\n` +
            'Make sure sql.js is installed: npm install sql.js');
    }
}
/**
 * Get initialized sql.js module
 * Throws if not initialized
 */
export function getWasm() {
    if (!initialized || !sqlJs) {
        throw new Error('WASM module not initialized. Call initWasm() first.');
    }
    return sqlJs;
}
/**
 * Check if WASM is initialized
 */
export function isInitialized() {
    return initialized;
}
/**
 * Reset initialization state (mainly for testing)
 */
export function resetWasm() {
    sqlJs = null;
    initialized = false;
}
/**
 * Initialize sql.js and return the module (convenience function)
 */
export async function initSQL(options) {
    await initWasm(options);
    return getWasm();
}
