"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalieTelemetry = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
class GoalieTelemetry {
    constructor(output, workspaceRoot) {
        this.output = output;
        this.afContext = process.env.AF_CONTEXT || (process.env.PROD_CYCLE === 'true' ? 'prod-cycle' : 'dev-cycle');
        if (workspaceRoot) {
            const goalieDir = path.join(workspaceRoot, '.goalie');
            try {
                fs.mkdirSync(goalieDir, { recursive: true });
                this.fallbackPath = path.join(goalieDir, 'telemetry_log.jsonl');
            }
            catch (err) {
                this.output.appendLine(`[Telemetry] Failed to ensure .goalie directory: ${String(err)}`);
            }
        }
        if (typeof vscode.env.createTelemetryLogger === 'function') {
            try {
                const sender = {
                    sendEventData: () => { },
                    sendErrorData: () => { },
                };
                this.logger = vscode.env.createTelemetryLogger(sender);
            }
            catch (err) {
                this.output.appendLine(`[Telemetry] Failed to initialize VS Code telemetry logger: ${String(err)}`);
            }
        }
    }
    log(eventName, properties, measurements) {
        const props = this.buildProperties(properties, measurements);
        void this.writeFallback(eventName, props, measurements);
        if (this.logger) {
            try {
                this.logger.logUsage(eventName, props);
            }
            catch (err) {
                this.output.appendLine(`[Telemetry] logUsage failed for ${eventName}: ${String(err)}`);
            }
        }
    }
    logError(eventName, properties) {
        const props = this.buildProperties(properties);
        void this.writeFallback(eventName, props);
        if (this.logger) {
            try {
                this.logger.logError(eventName, props);
            }
            catch (err) {
                this.output.appendLine(`[Telemetry] logError failed for ${eventName}: ${String(err)}`);
            }
        }
    }
    dispose() {
        var _a;
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.dispose();
    }
    buildProperties(properties, measurements) {
        const measurementProps = {};
        if (measurements) {
            for (const [key, value] of Object.entries(measurements)) {
                measurementProps[`m_${key}`] = value.toString();
            }
        }
        return Object.assign(Object.assign({ afContext: this.afContext }, properties), measurementProps);
    }
    writeFallback(eventName, properties, measurements) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.fallbackPath) {
                return;
            }
            const payload = {
                timestamp: new Date().toISOString(),
                eventName,
                properties,
                measurements,
            };
            try {
                yield fs.promises.appendFile(this.fallbackPath, `${JSON.stringify(payload)}\n`, 'utf8');
            }
            catch (err) {
                this.output.appendLine(`[Telemetry] Failed to write fallback log: ${err}`);
            }
        });
    }
}
exports.GoalieTelemetry = GoalieTelemetry;
//# sourceMappingURL=telemetry.js.map