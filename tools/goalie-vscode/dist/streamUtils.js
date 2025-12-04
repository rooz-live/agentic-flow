"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStreamSocketPath = resolveStreamSocketPath;
const path = require("path");
function resolveStreamSocketPath(goalieDir, overridePath) {
    const trimmedOverride = overridePath === null || overridePath === void 0 ? void 0 : overridePath.trim();
    if (trimmedOverride) {
        return trimmedOverride;
    }
    if (!goalieDir) {
        return undefined;
    }
    return path.join(goalieDir, 'af_stream.sock');
}
//# sourceMappingURL=streamUtils.js.map