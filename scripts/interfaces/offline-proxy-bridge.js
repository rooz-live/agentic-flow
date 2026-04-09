/**
 * @business-context WSJF-100: Local Interface Proxy (Cycle 40)
 * @adr ADR-042: Bypassing cloud interfaces.
 * Offline Proxy Bridge for Telegram/Discord
 */
const { execSync } = require('child_process');

function routeToOpencode(prompt) {
  try {
    // Force OPENCODE_DISABLE_DEFAULT_PLUGINS limit
    console.log(`[Offline Proxy] Routing parameter to opencode: ${prompt}`);
    const result = execSync(`OPENCODE_DISABLE_DEFAULT_PLUGINS=true opencode --eval "${prompt}"`, { encoding: 'utf-8' });
    return result;
  } catch (err) {
    return `[Error] Offline Bridge failed: ${err.message}`;
  }
}

module.exports = { routeToOpencode };
