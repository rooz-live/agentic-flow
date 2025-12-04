import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
function ensureSocketPath(socketPath) {
    if (socketPath.startsWith('~')) {
        return path.join(process.env.HOME || '', socketPath.slice(1));
    }
    return socketPath;
}
export function resolveStreamSocket(goalieDir) {
    const envPath = process.env.AF_STREAM_SOCKET;
    if (envPath && envPath.trim()) {
        return ensureSocketPath(envPath.trim());
    }
    if (!goalieDir) {
        return undefined;
    }
    return path.join(goalieDir, 'af_stream.sock');
}
export function isSocketAvailable(socketPath) {
    if (!socketPath) {
        return false;
    }
    try {
        const stats = fs.statSync(socketPath);
        return stats.isSocket();
    }
    catch {
        return false;
    }
}
export function publishStreamEvent(socketPath, payload) {
    return new Promise((resolve, reject) => {
        if (!socketPath) {
            resolve();
            return;
        }
        const resolved = ensureSocketPath(socketPath);
        const client = net.createConnection({ path: resolved }, () => {
            const message = JSON.stringify({
                ...payload,
                timestamp: payload.timestamp ?? new Date().toISOString(),
            });
            client.write(message);
            client.end();
        });
        client.on('error', err => {
            client.destroy();
            reject(err);
        });
        client.on('close', () => resolve());
    });
}
//# sourceMappingURL=streamPublisher.js.map