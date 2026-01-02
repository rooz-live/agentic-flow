"use strict";
/**
 * ProcessGovernor Bridge - Pattern Metrics Integration
 *
 * Maps ProcessGovernor events to standardized pattern metrics for value stream delivery:
 * - CPU_OVERLOAD → safe-degrade pattern
 * - RATE_LIMITED → iteration-budget pattern
 * - BACKOFF → failure-strategy pattern
 * - CIRCUIT_OPEN → fault-tolerance pattern
 *
 * Design:
 * - <2s overhead via buffered JSONL writes
 * - Advisory by default (AF_PROD_CYCLE_MODE=advisory)
 * - Graceful degradation on missing sinks
 * - Zero dependencies beyond Node stdlib
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestGovernorEvent = ingestGovernorEvent;
exports.shutdown = shutdown;
exports.getStats = getStats;
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
// Configuration
var PATTERN_METRICS_PATH = process.env.AF_PATTERN_METRICS_PATH
    || path_1.default.join(process.cwd(), '.goalie', 'pattern_metrics.jsonl');
var CYCLE_LOG_PATH = process.env.AF_CYCLE_LOG_PATH
    || path_1.default.join(process.cwd(), '.goalie', 'cycle_log.jsonl');
var LEARNING_EVENTS_PATH = process.env.AF_LEARNING_EVENTS_PATH
    || path_1.default.join(process.cwd(), '.agentdb', 'learning', 'events.jsonl');
var BUFFER_FLUSH_INTERVAL_MS = parseInt(process.env.AF_BRIDGE_FLUSH_MS || '250', 10);
var BUFFER_MAX_SIZE = parseInt(process.env.AF_BRIDGE_BUFFER_SIZE || '1000', 10);
var ENABLED = process.env.AF_GOVERNOR_BRIDGE_ENABLED !== 'false';
var RUN_ID = process.env.AF_RUN_ID || "run-".concat(Date.now());
// Buffered writes for <2s overhead
var metricsBuffer = [];
var flushTimer = null;
var isShuttingDown = false;
/**
 * Map ProcessGovernor incident types to pattern metrics
 */
function mapEventToPattern(event) {
    var baseMetric = {
        ts: event.timestamp,
        runId: RUN_ID,
        success: true,
        durationMs: 0,
        circle: 'orchestrator', // Governor is orchestrator-level concern
        gate: 'health',
    };
    switch (event.type) {
        case 'CPU_OVERLOAD':
            return __assign(__assign({}, baseMetric), { pattern: 'safe-degrade', behavior: 'mutation', details: {
                    cpuLoad: event.details.cpuLoad,
                    threshold: event.details.threshold,
                    action: 'throttled',
                    source: 'processGovernor',
                }, success: false, degraded: true });
        case 'RATE_LIMITED':
            return __assign(__assign({}, baseMetric), { pattern: 'iteration-budget', behavior: 'advisory', details: {
                    availableTokens: event.details.availableTokens,
                    requestedTokens: event.details.requestedTokens,
                    rateLimitOpsPerSec: event.details.rateLimitOpsPerSec,
                    source: 'processGovernor',
                } });
        case 'BACKOFF':
            return __assign(__assign({}, baseMetric), { pattern: 'failure-strategy', behavior: 'observability', details: {
                    backoffMs: event.details.backoffMs,
                    attempt: event.details.attempt,
                    reason: event.details.reason,
                    source: 'processGovernor',
                } });
        case 'CIRCUIT_OPEN':
            return __assign(__assign({}, baseMetric), { pattern: 'fault-tolerance', behavior: 'mutation', gate: 'deploy', details: {
                    failures: event.details.failures,
                    threshold: event.details.threshold,
                    state: 'open',
                    source: 'processGovernor',
                }, success: false, degraded: true });
        case 'CIRCUIT_CLOSED':
            return __assign(__assign({}, baseMetric), { pattern: 'fault-tolerance', behavior: 'observability', gate: 'deploy', details: {
                    message: event.details.message,
                    state: 'closed',
                    source: 'processGovernor',
                } });
        case 'ADAPTIVE_THROTTLING':
            return __assign(__assign({}, baseMetric), { pattern: 'adaptive-throttling', behavior: 'advisory', details: {
                    throttlingLevel: event.details.throttlingLevel,
                    predictiveScore: event.details.predictiveScore,
                    loadHistory: event.details.loadHistory,
                    source: 'processGovernor',
                } });
        case 'WIP_VIOLATION':
            return __assign(__assign({}, baseMetric), { pattern: 'iteration-budget', behavior: 'advisory', details: {
                    activeWork: event.details.activeWork,
                    maxWip: event.details.maxWip,
                    queuedWork: event.details.queuedWork,
                    source: 'processGovernor',
                }, success: false });
        case 'BATCH_COMPLETE':
            // Observability only - don't clutter metrics with every batch completion
            return null;
        default:
            return null;
    }
}
/**
 * Write buffered metrics to all sinks
 */
function flushBuffer() {
    return __awaiter(this, void 0, void 0, function () {
        var toFlush, flushStart, flushDuration, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (metricsBuffer.length === 0 || isShuttingDown) {
                        return [2 /*return*/];
                    }
                    toFlush = __spreadArray([], metricsBuffer, true);
                    metricsBuffer.length = 0; // Clear buffer
                    flushStart = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    // Sink 1: Pattern metrics (primary)
                    return [4 /*yield*/, appendToSink(PATTERN_METRICS_PATH, toFlush)];
                case 2:
                    // Sink 1: Pattern metrics (primary)
                    _a.sent();
                    // Sink 2: Cycle log (for full-cycle analysis)
                    return [4 /*yield*/, appendToSink(CYCLE_LOG_PATH, toFlush.map(function (m) { return (__assign(__assign({}, m), { source: 'processGovernor', sinkType: 'cycle' })); }))];
                case 3:
                    // Sink 2: Cycle log (for full-cycle analysis)
                    _a.sent();
                    // Sink 3: Learning events (for ML/agent training)
                    return [4 /*yield*/, appendToSink(LEARNING_EVENTS_PATH, toFlush.map(function (m) { return ({
                            eventType: 'pattern_observed',
                            pattern: m.pattern,
                            context: m.details,
                            timestamp: m.ts,
                            runId: m.runId,
                            success: m.success,
                            degraded: m.degraded || false,
                        }); }))];
                case 4:
                    // Sink 3: Learning events (for ML/agent training)
                    _a.sent();
                    flushDuration = Date.now() - flushStart;
                    if (flushDuration > 100) {
                        console.warn("[ProcessGovernorBridge] Slow flush: ".concat(flushDuration, "ms"));
                    }
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _a.sent();
                    console.warn('[ProcessGovernorBridge] Flush failed:', err_1);
                    // Graceful degradation: log to stderr as fallback
                    process.stderr.write(JSON.stringify({
                        error: 'bridge_flush_failed',
                        metricsLost: toFlush.length,
                        reason: String(err_1),
                    }) + '\n');
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Append metrics to a JSONL sink with graceful degradation
 */
function appendToSink(sinkPath, records) {
    return __awaiter(this, void 0, void 0, function () {
        var dir, content;
        return __generator(this, function (_a) {
            if (!ENABLED)
                return [2 /*return*/];
            try {
                dir = path_1.default.dirname(sinkPath);
                if (!fs_1.default.existsSync(dir)) {
                    fs_1.default.mkdirSync(dir, { recursive: true });
                }
                content = records.map(function (r) { return JSON.stringify(r); }).join('\n') + '\n';
                fs_1.default.appendFileSync(sinkPath, content);
            }
            catch (err) {
                // Graceful degradation: don't crash, just warn
                console.warn("[ProcessGovernorBridge] Failed to write to ".concat(sinkPath, ":"), err);
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Schedule periodic buffer flush
 */
function scheduleFlush() {
    if (!flushTimer && ENABLED) {
        flushTimer = setInterval(function () {
            flushBuffer().catch(function (err) {
                return console.warn('[ProcessGovernorBridge] Flush error:', err);
            });
        }, BUFFER_FLUSH_INTERVAL_MS);
    }
}
/**
 * Public API: Ingest a ProcessGovernor event
 */
function ingestGovernorEvent(event) {
    if (!ENABLED)
        return;
    var metric = mapEventToPattern(event);
    if (!metric)
        return;
    metricsBuffer.push(metric);
    // Drop oldest if buffer overflows (graceful degradation)
    if (metricsBuffer.length > BUFFER_MAX_SIZE) {
        var dropped = metricsBuffer.shift();
        console.warn('[ProcessGovernorBridge] Buffer overflow, dropped:', dropped === null || dropped === void 0 ? void 0 : dropped.pattern);
    }
    scheduleFlush();
    // Immediate flush for critical events
    if (event.type === 'CPU_OVERLOAD' || event.type === 'CIRCUIT_OPEN') {
        flushBuffer().catch(function (err) {
            return console.warn('[ProcessGovernorBridge] Immediate flush failed:', err);
        });
    }
}
/**
 * Graceful shutdown - flush all pending metrics
 */
function shutdown() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (isShuttingDown)
                        return [2 /*return*/];
                    isShuttingDown = true;
                    if (flushTimer) {
                        clearInterval(flushTimer);
                        flushTimer = null;
                    }
                    return [4 /*yield*/, flushBuffer()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Get bridge statistics
 */
function getStats() {
    return {
        enabled: ENABLED,
        buffered: metricsBuffer.length,
        runId: RUN_ID,
        sinks: [
            PATTERN_METRICS_PATH,
            CYCLE_LOG_PATH,
            LEARNING_EVENTS_PATH,
        ],
    };
}
// Register shutdown handlers
if (ENABLED) {
    process.on('beforeExit', function () { return shutdown(); });
    process.on('SIGINT', function () { return shutdown().then(function () { return process.exit(0); }); });
    process.on('SIGTERM', function () { return shutdown().then(function () { return process.exit(0); }); });
}
