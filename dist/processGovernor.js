"use strict";
/**
 * Process Governor - Dynamic Concurrency Control
 *
 * Prevents runaway process spawning through:
 * - Work-in-progress (WIP) limits
 * - Dynamic rate limiting based on system load
 * - Exponential backoff on failures
 * - Batch processing with configurable sizes
 *
 * Usage:
 *   import { runBatched, drain } from './runtime/processGovernor';
 *   await runBatched(tasks, async (task) => processTask(task));
 *   await drain(); // Wait for all work to complete
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.config = exports.CircuitBreakerOpenError = exports.CircuitBreakerState = exports.AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS = exports.AF_CIRCUIT_BREAKER_COOLDOWN_MS = exports.AF_CIRCUIT_BREAKER_WINDOW_MS = exports.AF_CIRCUIT_BREAKER_THRESHOLD = exports.AF_CIRCUIT_BREAKER_ENABLED = exports.AF_CPU_CRITICAL_THRESHOLD = exports.AF_CPU_WARNING_THRESHOLD = exports.AF_MAX_BATCH_SIZE = exports.AF_LOAD_HISTORY_SIZE = exports.AF_EXECUTION_ORDER_OPTIMIZATION = exports.AF_BATCH_MAPPING_ENABLED = exports.AF_DEPENDENCY_ANALYSIS_ENABLED = exports.AF_PREDICTIVE_THROTTLING = exports.AF_ADAPTIVE_THROTTLING_ENABLED = exports.AF_ADAPTIVE_POLL_MAX_MS = exports.AF_ADAPTIVE_POLL_MIN_MS = exports.AF_MICRO_BATCH_DROP_OLDEST = exports.AF_MICRO_BATCH_FLUSH_INTERVAL_MS = exports.AF_MICRO_BATCH_SIZE = exports.AF_ENHANCED_BACKOFF_CEILING_MS = exports.AF_ENHANCED_BACKOFF_JITTER = exports.AF_ENHANCED_BACKOFF_FACTOR = exports.AF_ENHANCED_BACKOFF_START_MS = exports.AF_TOKEN_REFILL_INTERVAL_MS = exports.AF_MAX_BURST = exports.AF_TOKENS_PER_SECOND = exports.AF_RATE_LIMIT_ENABLED = exports.AF_BACKOFF_MULTIPLIER = exports.AF_BACKOFF_MAX_MS = exports.AF_BACKOFF_MIN_MS = exports.AF_MAX_WIP = exports.AF_BATCH_SIZE = exports.AF_CPU_HEADROOM_TARGET = void 0;
exports.isCircuitClosed = isCircuitClosed;
exports.recordSuccess = recordSuccess;
exports.recordFailure = recordFailure;
exports.getCircuitBreakerState = getCircuitBreakerState;
exports.runBatched = runBatched;
exports.guarded = guarded;
exports.drain = drain;
exports.getStats = getStats;
exports.reset = reset;
var os_1 = __importDefault(require("os"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var child_process_1 = require("child_process");
var processGovernorBridge_1 = require("./processGovernorBridge");
// Configuration with safe defaults (optimized for high CPU load scenarios)
exports.AF_CPU_HEADROOM_TARGET = parseFloat(process.env.AF_CPU_HEADROOM_TARGET || '0.40');
exports.AF_BATCH_SIZE = parseInt(process.env.AF_BATCH_SIZE || '3', 10);
exports.AF_MAX_WIP = parseInt(process.env.AF_MAX_WIP || '6', 10);
exports.AF_BACKOFF_MIN_MS = parseInt(process.env.AF_BACKOFF_MIN_MS || '200', 10);
exports.AF_BACKOFF_MAX_MS = parseInt(process.env.AF_BACKOFF_MAX_MS || '30000', 10);
exports.AF_BACKOFF_MULTIPLIER = parseFloat(process.env.AF_BACKOFF_MULTIPLIER || '2.0');
// Token bucket rate limiting (enhanced)
exports.AF_RATE_LIMIT_ENABLED = process.env.AF_RATE_LIMIT_ENABLED !== 'false';
exports.AF_TOKENS_PER_SECOND = parseInt(process.env.AF_TOKENS_PER_SECOND || '5', 10); // Reduced from 10 to 5 ops/sec ceiling
exports.AF_MAX_BURST = parseInt(process.env.AF_MAX_BURST || '10', 10); // Reduced from 20 to 10
exports.AF_TOKEN_REFILL_INTERVAL_MS = parseInt(process.env.AF_TOKEN_REFILL_INTERVAL_MS || '200', 10); // Refill every 200ms
// Enhanced exponential backoff (Phase 1.1)
exports.AF_ENHANCED_BACKOFF_START_MS = parseInt(process.env.AF_ENHANCED_BACKOFF_START_MS || '250', 10);
exports.AF_ENHANCED_BACKOFF_FACTOR = parseFloat(process.env.AF_ENHANCED_BACKOFF_FACTOR || '2.0');
exports.AF_ENHANCED_BACKOFF_JITTER = parseFloat(process.env.AF_ENHANCED_BACKOFF_JITTER || '0.20'); // 20% jitter
exports.AF_ENHANCED_BACKOFF_CEILING_MS = parseInt(process.env.AF_ENHANCED_BACKOFF_CEILING_MS || '60000', 10); // 60s ceiling
// Micro-batching configuration (Phase 1.1)
exports.AF_MICRO_BATCH_SIZE = parseInt(process.env.AF_MICRO_BATCH_SIZE || '10', 10);
exports.AF_MICRO_BATCH_FLUSH_INTERVAL_MS = parseInt(process.env.AF_MICRO_BATCH_FLUSH_INTERVAL_MS || '5000', 10); // 5s flush interval
exports.AF_MICRO_BATCH_DROP_OLDEST = process.env.AF_MICRO_BATCH_DROP_OLDEST !== 'false';
// Adaptive polling configuration (Phase 1.1)
exports.AF_ADAPTIVE_POLL_MIN_MS = parseInt(process.env.AF_ADAPTIVE_POLL_MIN_MS || '50', 10);
exports.AF_ADAPTIVE_POLL_MAX_MS = parseInt(process.env.AF_ADAPTIVE_POLL_MAX_MS || '5000', 10);
// Advanced throttling features (Phase 1.1)
exports.AF_ADAPTIVE_THROTTLING_ENABLED = process.env.AF_ADAPTIVE_THROTTLING_ENABLED !== 'false';
exports.AF_PREDICTIVE_THROTTLING = process.env.AF_PREDICTIVE_THROTTLING !== 'false';
exports.AF_DEPENDENCY_ANALYSIS_ENABLED = process.env.AF_DEPENDENCY_ANALYSIS_ENABLED !== 'false';
exports.AF_BATCH_MAPPING_ENABLED = process.env.AF_BATCH_MAPPING_ENABLED !== 'false';
exports.AF_EXECUTION_ORDER_OPTIMIZATION = process.env.AF_EXECUTION_ORDER_OPTIMIZATION !== 'false';
exports.AF_LOAD_HISTORY_SIZE = parseInt(process.env.AF_LOAD_HISTORY_SIZE || '30', 10);
exports.AF_MAX_BATCH_SIZE = parseInt(process.env.AF_MAX_BATCH_SIZE || '50', 10);
// CPU load thresholds (Phase 1.1)
exports.AF_CPU_WARNING_THRESHOLD = parseFloat(process.env.AF_CPU_WARNING_THRESHOLD || '0.65'); // 65%
exports.AF_CPU_CRITICAL_THRESHOLD = parseFloat(process.env.AF_CPU_CRITICAL_THRESHOLD || '0.80'); // 80%
// Circuit breaker configuration
exports.AF_CIRCUIT_BREAKER_ENABLED = process.env.AF_CIRCUIT_BREAKER_ENABLED !== 'false';
exports.AF_CIRCUIT_BREAKER_THRESHOLD = parseInt(process.env.AF_CIRCUIT_BREAKER_THRESHOLD || '5', 10);
exports.AF_CIRCUIT_BREAKER_WINDOW_MS = parseInt(process.env.AF_CIRCUIT_BREAKER_WINDOW_MS || '10000', 10);
exports.AF_CIRCUIT_BREAKER_COOLDOWN_MS = parseInt(process.env.AF_CIRCUIT_BREAKER_COOLDOWN_MS || '30000', 10);
exports.AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS = parseInt(process.env.AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS || '3', 10);
var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState["CLOSED"] = "CLOSED";
    CircuitBreakerState["OPEN"] = "OPEN";
    CircuitBreakerState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitBreakerState || (exports.CircuitBreakerState = CircuitBreakerState = {}));
var state = {
    activeWork: 0,
    queuedWork: 0,
    completedWork: 0,
    failedWork: 0,
    currentBackoff: exports.AF_ENHANCED_BACKOFF_START_MS,
    lastLoadCheck: Date.now(),
    availableTokens: exports.AF_MAX_BURST,
    lastTokenRefill: Date.now(),
    circuitBreaker: {
        state: CircuitBreakerState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        lastStateChange: Date.now(),
        halfOpenRequests: 0,
        windowStart: Date.now(),
    },
    // Phase 1.1: Enhanced state initialization
    loadHistory: [],
    processDependencies: new Map(),
    adaptiveThrottlingLevel: 1.0,
    predictiveLoadScore: 0.0,
    lastDependencyAnalysis: 0,
    incidentBuffer: [],
    incidents: [],
    metrics: {
        tokens_available: exports.AF_MAX_BURST,
        throttle_events: 0,
        backoff_ms: exports.AF_ENHANCED_BACKOFF_START_MS,
        poll_ms: exports.AF_ADAPTIVE_POLL_MIN_MS,
        batch_depth: 0,
        dropped_events: 0,
        queue_depth: 0,
        flush_latency_ms: 0,
    },
};
var INCIDENT_LOG_PATH = process.env.AF_INCIDENT_LOG || 'logs/governor_incidents.jsonl';
var LEARNING_BRIDGE_ENABLED = process.env.AF_LEARNING_BRIDGE_ENABLED !== 'false';
var LEARNING_BRIDGE_PATH = process.env.AF_LEARNING_BRIDGE_PATH
    || path_1.default.join(process.cwd(), 'scripts', 'agentdb', 'process_governor_ingest.js');
// Phase 1.1: Memory-mapped ring buffer configuration
var INCIDENT_BUFFER_MAX_SIZE = parseInt(process.env.AF_INCIDENT_BUFFER_SIZE || '1000', 10);
var INCIDENT_FLUSH_INTERVAL_MS = parseInt(process.env.AF_INCIDENT_FLUSH_INTERVAL_MS || '5000', 10);
var flushTimer = null;
var isFlushingBuffer = false;
function forwardIncidentToLearningBridge(incident) {
    if (!LEARNING_BRIDGE_ENABLED) {
        return;
    }
    if (!fs_1.default.existsSync(LEARNING_BRIDGE_PATH)) {
        return;
    }
    var payload = __assign(__assign({}, incident), { stateSnapshot: {
            activeWork: state.activeWork,
            queuedWork: state.queuedWork,
            completedWork: state.completedWork,
            failedWork: state.failedWork,
            circuitBreaker: state.circuitBreaker.state,
            availableTokens: state.availableTokens,
            queuedIncidents: state.incidents.length,
        } });
    try {
        var child = (0, child_process_1.spawn)(process.execPath, [LEARNING_BRIDGE_PATH], {
            stdio: ['pipe', 'ignore', 'ignore'],
            env: __assign(__assign({}, process.env), { AF_LEARNING_SOURCE: 'processGovernor' }),
        });
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
    }
    catch (error) {
        console.warn('[LearningBridge] Failed to forward incident:', error);
    }
}
/**
 * Phase 1.1: Memory-mapped ring buffer with async flush
 * Reduces I/O pressure by buffering incidents in memory and flushing periodically
 */
function flushIncidentBuffer() {
    return __awaiter(this, void 0, void 0, function () {
        var flushStart, toFlush, dir, logContent;
        var _a;
        return __generator(this, function (_b) {
            if (isFlushingBuffer || state.incidentBuffer.length === 0) {
                return [2 /*return*/];
            }
            isFlushingBuffer = true;
            flushStart = Date.now();
            toFlush = __spreadArray([], state.incidentBuffer, true);
            state.incidentBuffer = [];
            try {
                dir = path_1.default.dirname(INCIDENT_LOG_PATH);
                if (!fs_1.default.existsSync(dir)) {
                    fs_1.default.mkdirSync(dir, { recursive: true });
                }
                logContent = toFlush.map(function (inc) { return JSON.stringify(inc); }).join('\n') + '\n';
                fs_1.default.appendFileSync(INCIDENT_LOG_PATH, logContent);
                // Update flush latency metric
                state.metrics.flush_latency_ms = Date.now() - flushStart;
            }
            catch (err) {
                console.warn('[ProcessGovernor] Failed to flush incident buffer:', err);
                // On error, restore buffered incidents (with fallback to learning bridge)
                (_a = state.incidentBuffer).unshift.apply(_a, toFlush.slice(0, Math.min(100, toFlush.length)));
            }
            finally {
                isFlushingBuffer = false;
            }
            return [2 /*return*/];
        });
    });
}
function scheduleBufferFlush() {
    if (!flushTimer) {
        flushTimer = setInterval(function () {
            flushIncidentBuffer().catch(function (err) {
                return console.warn('[ProcessGovernor] Flush error:', err);
            });
        }, INCIDENT_FLUSH_INTERVAL_MS);
    }
}
function logIncident(type, details) {
    var incident = {
        timestamp: new Date().toISOString(),
        type: type,
        details: details,
    };
    // Phase 3: Forward to ProcessGovernorBridge for pattern metrics
    try {
        (0, processGovernorBridge_1.ingestGovernorEvent)(incident);
    }
    catch (err) {
        // Graceful degradation: bridge failure doesn't crash governor
        console.warn('[ProcessGovernor] Bridge ingestion failed:', err);
    }
    // Phase 1.1: Buffer incidents in memory
    state.incidentBuffer.push(incident);
    state.incidents.push(incident); // Keep for getStats()
    // Drop oldest if buffer overflows
    if (state.incidentBuffer.length > INCIDENT_BUFFER_MAX_SIZE) {
        var dropped = state.incidentBuffer.shift();
        state.metrics.dropped_events++;
        if (dropped) {
            // Fallback: try learning bridge for dropped events
            forwardIncidentToLearningBridge(dropped);
        }
    }
    // Update metrics
    state.metrics.batch_depth = state.incidentBuffer.length;
    // Schedule periodic flush
    scheduleBufferFlush();
    // Forward high-priority incidents immediately
    if (type === 'CIRCUIT_OPEN' || type === 'CPU_OVERLOAD') {
        forwardIncidentToLearningBridge(incident);
    }
}
function getCpuLoad() {
    var _a;
    var cpus = os_1.default.cpus();
    var numCpus = cpus.length;
    var loadAvg = (_a = os_1.default.loadavg()[0]) !== null && _a !== void 0 ? _a : 0;
    return Math.min(((loadAvg || 0) / Math.max(numCpus, 1)) * 100, 100);
}
function getIdlePercentage() {
    return Math.max(0, 100 - getCpuLoad());
}
/**
 * Phase 1.1: Enhanced token bucket with interval-based refilling
 * Refills tokens at a fixed rate (AF_TOKEN_REFILL_INTERVAL_MS)
 * This reduces CPU overhead from constant refill calculations
 */
function refillTokens() {
    if (!exports.AF_RATE_LIMIT_ENABLED) {
        state.availableTokens = exports.AF_MAX_BURST;
        state.metrics.tokens_available = exports.AF_MAX_BURST;
        return;
    }
    var now = Date.now();
    var elapsedMs = now - state.lastTokenRefill;
    // Only refill if enough time has passed (reduces overhead)
    if (elapsedMs >= exports.AF_TOKEN_REFILL_INTERVAL_MS) {
        var intervals = Math.floor(elapsedMs / exports.AF_TOKEN_REFILL_INTERVAL_MS);
        var tokensToAdd = (exports.AF_TOKENS_PER_SECOND * exports.AF_TOKEN_REFILL_INTERVAL_MS / 1000) * intervals;
        state.availableTokens = Math.min(state.availableTokens + tokensToAdd, exports.AF_MAX_BURST);
        state.lastTokenRefill = now - (elapsedMs % exports.AF_TOKEN_REFILL_INTERVAL_MS);
        // Update metrics
        state.metrics.tokens_available = state.availableTokens;
    }
}
function consumeToken() {
    refillTokens();
    if (state.availableTokens >= 1) {
        state.availableTokens -= 1;
        return true;
    }
    return false;
}
function isCircuitClosed() {
    if (!exports.AF_CIRCUIT_BREAKER_ENABLED)
        return true;
    var cb = state.circuitBreaker;
    var now = Date.now();
    if (now - cb.windowStart > exports.AF_CIRCUIT_BREAKER_WINDOW_MS) {
        cb.failures = 0;
        cb.windowStart = now;
    }
    switch (cb.state) {
        case CircuitBreakerState.CLOSED:
            return true;
        case CircuitBreakerState.OPEN:
            if (now - cb.lastStateChange >= exports.AF_CIRCUIT_BREAKER_COOLDOWN_MS) {
                cb.state = CircuitBreakerState.HALF_OPEN;
                cb.halfOpenRequests = 0;
                cb.lastStateChange = now;
                logIncident('CIRCUIT_HALF_OPEN', {
                    cooldownMs: exports.AF_CIRCUIT_BREAKER_COOLDOWN_MS,
                    previousFailures: cb.failures,
                });
                return true;
            }
            return false;
        case CircuitBreakerState.HALF_OPEN:
            if (cb.halfOpenRequests < exports.AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS) {
                cb.halfOpenRequests++;
                return true;
            }
            return false;
        default:
            return true;
    }
}
function recordSuccess() {
    if (!exports.AF_CIRCUIT_BREAKER_ENABLED)
        return;
    var cb = state.circuitBreaker;
    cb.successes++;
    if (cb.state === CircuitBreakerState.HALF_OPEN) {
        if (cb.successes >= exports.AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS) {
            cb.state = CircuitBreakerState.CLOSED;
            cb.failures = 0;
            cb.successes = 0;
            cb.lastStateChange = Date.now();
            cb.windowStart = Date.now();
            logIncident('CIRCUIT_CLOSED', { message: 'Circuit recovered' });
        }
    }
}
function recordFailure() {
    if (!exports.AF_CIRCUIT_BREAKER_ENABLED)
        return;
    var cb = state.circuitBreaker;
    var now = Date.now();
    cb.failures++;
    cb.lastFailureTime = now;
    cb.successes = 0;
    if (cb.state === CircuitBreakerState.HALF_OPEN) {
        cb.state = CircuitBreakerState.OPEN;
        cb.lastStateChange = now;
        logIncident('CIRCUIT_OPEN', { trigger: 'half-open-failure', failures: cb.failures });
    }
    else if (cb.state === CircuitBreakerState.CLOSED) {
        if (cb.failures >= exports.AF_CIRCUIT_BREAKER_THRESHOLD) {
            cb.state = CircuitBreakerState.OPEN;
            cb.lastStateChange = now;
            logIncident('CIRCUIT_OPEN', { trigger: 'threshold-exceeded', failures: cb.failures });
        }
    }
}
function getCircuitBreakerState() {
    return __assign({}, state.circuitBreaker);
}
var CircuitBreakerOpenError = /** @class */ (function (_super) {
    __extends(CircuitBreakerOpenError, _super);
    function CircuitBreakerOpenError(message) {
        if (message === void 0) { message = 'Circuit breaker is open - request rejected'; }
        var _this = _super.call(this, message) || this;
        _this.name = 'CircuitBreakerOpenError';
        return _this;
    }
    return CircuitBreakerOpenError;
}(Error));
exports.CircuitBreakerOpenError = CircuitBreakerOpenError;
/**
 * Enhanced proactive admission control with intelligent CPU load detection and adaptive throttling.
 * @param count - Number of slots to reserve
 */
function waitForCapacity() {
    return __awaiter(this, arguments, void 0, function (count) {
        var throttlingLevel, adaptiveDelay, predictiveScore, adjustedTokensPerSecond, adjustedMaxBurst, tokensNeeded, adaptiveMaxWip, now, cpuLoad, loadRatio, pollInterval, idlePercent, targetIdlePercent, jitter, backoffWithJitter;
        if (count === void 0) { count = 1; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Update load history for predictive analysis
                    updateLoadHistory();
                    throttlingLevel = calculateAdaptiveThrottlingLevel();
                    state.adaptiveThrottlingLevel = throttlingLevel;
                    adaptiveDelay = Math.floor((1 - throttlingLevel) * exports.AF_BACKOFF_MIN_MS);
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 15];
                    // 1. Circuit Breaker
                    if (!isCircuitClosed()) {
                        logIncident('CIRCUIT_OPEN', { state: state.circuitBreaker.state });
                        throw new CircuitBreakerOpenError();
                    }
                    if (!exports.AF_PREDICTIVE_THROTTLING) return [3 /*break*/, 3];
                    predictiveScore = calculatePredictiveLoadScore();
                    state.predictiveLoadScore = predictiveScore;
                    if (!(predictiveScore > exports.AF_CPU_CRITICAL_THRESHOLD)) return [3 /*break*/, 3];
                    logIncident('PREDICTIVE_THROTTLING', {
                        predictiveScore: predictiveScore,
                        threshold: exports.AF_CPU_CRITICAL_THRESHOLD,
                        activeWork: state.activeWork
                    });
                    return [4 /*yield*/, sleep(adaptiveDelay * 2)];
                case 2:
                    _a.sent(); // Longer delay for predicted high load
                    return [3 /*break*/, 1];
                case 3:
                    adjustedTokensPerSecond = Math.floor(exports.AF_TOKENS_PER_SECOND * throttlingLevel);
                    adjustedMaxBurst = Math.floor(exports.AF_MAX_BURST * throttlingLevel);
                    tokensNeeded = Math.ceil(count * throttlingLevel);
                    if (!(state.availableTokens < tokensNeeded)) return [3 /*break*/, 5];
                    logIncident('RATE_LIMITED', {
                        activeWork: state.activeWork,
                        tokensNeeded: tokensNeeded,
                        availableTokens: state.availableTokens,
                        throttlingLevel: throttlingLevel
                    });
                    return [4 /*yield*/, sleep(adaptiveDelay)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 5:
                    adaptiveMaxWip = Math.floor(exports.AF_MAX_WIP * throttlingLevel);
                    if (!(state.activeWork + count > adaptiveMaxWip)) return [3 /*break*/, 7];
                    logIncident('ADAPTIVE_THROTTLING', {
                        activeWork: state.activeWork,
                        requestedSlots: count,
                        adaptiveMaxWip: adaptiveMaxWip,
                        throttlingLevel: throttlingLevel
                    });
                    return [4 /*yield*/, sleep(adaptiveDelay)];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 7:
                    now = Date.now();
                    cpuLoad = getCpuLoad();
                    loadRatio = cpuLoad / 100;
                    pollInterval = Math.floor(exports.AF_ADAPTIVE_POLL_MIN_MS +
                        (exports.AF_ADAPTIVE_POLL_MAX_MS - exports.AF_ADAPTIVE_POLL_MIN_MS) * loadRatio);
                    state.metrics.poll_ms = pollInterval;
                    if (!(now - state.lastLoadCheck > pollInterval)) return [3 /*break*/, 14];
                    state.lastLoadCheck = now;
                    idlePercent = getIdlePercentage();
                    targetIdlePercent = exports.AF_CPU_HEADROOM_TARGET * 100 * throttlingLevel;
                    if (!(cpuLoad > exports.AF_CPU_CRITICAL_THRESHOLD * 100)) return [3 /*break*/, 9];
                    logIncident('CPU_OVERLOAD', {
                        idlePercent: idlePercent,
                        cpuLoad: cpuLoad,
                        targetIdlePercent: targetIdlePercent,
                        activeWork: state.activeWork,
                        level: 'critical',
                        pollInterval: pollInterval
                    });
                    jitter = Math.random() * exports.AF_ENHANCED_BACKOFF_JITTER;
                    backoffWithJitter = state.currentBackoff * (1 + jitter);
                    return [4 /*yield*/, sleep(backoffWithJitter)];
                case 8:
                    _a.sent();
                    state.currentBackoff = Math.min(state.currentBackoff * exports.AF_ENHANCED_BACKOFF_FACTOR * 1.5, // Faster escalation for critical
                    exports.AF_ENHANCED_BACKOFF_CEILING_MS);
                    state.metrics.backoff_ms = state.currentBackoff;
                    return [3 /*break*/, 1];
                case 9:
                    if (!(cpuLoad > exports.AF_CPU_WARNING_THRESHOLD * 100)) return [3 /*break*/, 11];
                    logIncident('CPU_OVERLOAD', {
                        idlePercent: idlePercent,
                        cpuLoad: cpuLoad,
                        targetIdlePercent: targetIdlePercent,
                        activeWork: state.activeWork,
                        level: 'warning',
                        pollInterval: pollInterval
                    });
                    return [4 /*yield*/, sleep(state.currentBackoff)];
                case 10:
                    _a.sent();
                    state.currentBackoff = Math.min(state.currentBackoff * exports.AF_ENHANCED_BACKOFF_FACTOR, exports.AF_ENHANCED_BACKOFF_CEILING_MS);
                    state.metrics.backoff_ms = state.currentBackoff;
                    return [3 /*break*/, 1];
                case 11:
                    if (!(idlePercent < targetIdlePercent)) return [3 /*break*/, 13];
                    logIncident('CPU_OVERLOAD', {
                        idlePercent: idlePercent,
                        cpuLoad: cpuLoad,
                        targetIdlePercent: targetIdlePercent,
                        activeWork: state.activeWork,
                        level: 'adaptive',
                        pollInterval: pollInterval
                    });
                    state.metrics.throttle_events++;
                    return [4 /*yield*/, sleep(adaptiveDelay)];
                case 12:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 13:
                    // Reset backoff on healthy load
                    state.currentBackoff = exports.AF_ENHANCED_BACKOFF_START_MS;
                    state.metrics.backoff_ms = state.currentBackoff;
                    _a.label = 14;
                case 14:
                    // If we got here, all checks passed. Reserve slot(s) and consume tokens.
                    state.activeWork += count;
                    state.availableTokens -= tokensNeeded;
                    // Phase 1.1: Update queue depth and token metrics
                    state.metrics.tokens_available = state.availableTokens;
                    state.metrics.queue_depth = state.queuedWork;
                    // Log if we somehow exceeded max (race edge case)
                    if (state.activeWork > adaptiveMaxWip) {
                        logIncident('WIP_VIOLATION', {
                            activeWork: state.activeWork,
                            maxWip: adaptiveMaxWip,
                            throttlingLevel: throttlingLevel
                        });
                    }
                    return [2 /*return*/];
                case 15: return [2 /*return*/];
            }
        });
    });
}
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
// Enhanced CPU load detection and adaptive throttling
function updateLoadHistory() {
    var now = Date.now();
    var cpuLoad = getCpuLoad();
    var idlePercentage = getIdlePercentage();
    var entry = {
        timestamp: now,
        cpuLoad: cpuLoad,
        idlePercentage: idlePercentage,
        activeWork: state.activeWork,
        queuedWork: state.queuedWork,
    };
    state.loadHistory.push(entry);
    // Keep only the recent history
    if (state.loadHistory.length > exports.AF_LOAD_HISTORY_SIZE) {
        state.loadHistory.shift();
    }
}
function calculatePredictiveLoadScore() {
    if (state.loadHistory.length < 3)
        return 0.5; // Default medium load
    // Calculate trend based on recent load history
    var recent = state.loadHistory.slice(-3);
    var loadTrend = recent[2].cpuLoad - recent[0].cpuLoad;
    var workTrend = recent[2].activeWork - recent[0].activeWork;
    // Predictive score: 0 = low load expected, 1 = high load expected
    var trendScore = Math.max(0, Math.min(1, (loadTrend + workTrend * 10) / 100));
    var currentLoadScore = getCpuLoad() / 100;
    // Weight current load more heavily than trend
    return currentLoadScore * 0.7 + trendScore * 0.3;
}
function calculateAdaptiveThrottlingLevel() {
    if (!exports.AF_ADAPTIVE_THROTTLING_ENABLED)
        return 1.0;
    var currentLoad = getCpuLoad() / 100;
    var predictiveScore = calculatePredictiveLoadScore();
    // Combine current and predictive load for throttling decision
    var combinedLoad = Math.max(currentLoad, predictiveScore);
    // Calculate throttling level: 1.0 = no throttling, 0.1 = maximum throttling
    var throttlingLevel = 1.0;
    if (combinedLoad > exports.AF_CPU_CRITICAL_THRESHOLD) {
        throttlingLevel = 0.1; // Severe throttling
    }
    else if (combinedLoad > exports.AF_CPU_WARNING_THRESHOLD) {
        throttlingLevel = 0.3; // Moderate throttling
    }
    else if (combinedLoad > exports.AF_CPU_HEADROOM_TARGET) {
        throttlingLevel = 0.6; // Light throttling
    }
    return throttlingLevel;
}
// Process dependency analysis and batch optimization
function analyzeProcessDependencies(items) {
    if (!exports.AF_DEPENDENCY_ANALYSIS_ENABLED) {
        return items.map(function (item, index) { return ({
            id: "item-".concat(index),
            dependencies: [],
            priority: 1,
            estimatedDuration: 1000,
            resourceWeight: 1,
        }); });
    }
    // Simple dependency analysis - in real implementation, this would analyze
    // actual process relationships, resource requirements, etc.
    return items.map(function (item, index) {
        var hasDependencies = index > 0 && index % 3 === 0; // Every 3rd item depends on previous
        var priority = hasDependencies ? 2 : 1;
        return {
            id: "item-".concat(index),
            dependencies: hasDependencies ? ["item-".concat(index - 1)] : [],
            priority: priority,
            estimatedDuration: 1000 + Math.random() * 2000, // 1-3 seconds
            resourceWeight: priority === 2 ? 2 : 1, // Higher priority items use more resources
        };
    });
}
function optimizeExecutionOrder(dependencies) {
    if (!exports.AF_EXECUTION_ORDER_OPTIMIZATION)
        return dependencies;
    // Topological sort to respect dependencies
    var sorted = [];
    var visited = new Set();
    var visiting = new Set();
    function visit(nodeId) {
        if (visiting.has(nodeId)) {
            // Circular dependency detected, skip
            return;
        }
        if (visited.has(nodeId))
            return;
        visiting.add(nodeId);
        var node = dependencies.find(function (d) { return d.id === nodeId; });
        if (node) {
            for (var _i = 0, _a = node.dependencies; _i < _a.length; _i++) {
                var depId = _a[_i];
                visit(depId);
            }
            sorted.push(node);
        }
        visiting.delete(nodeId);
        visited.add(nodeId);
    }
    // Visit all nodes
    for (var _i = 0, dependencies_1 = dependencies; _i < dependencies_1.length; _i++) {
        var dep = dependencies_1[_i];
        visit(dep.id);
    }
    // Sort by priority within dependency constraints
    return sorted.sort(function (a, b) { return a.priority - b.priority; });
}
function createOptimalBatches(items, dependencies) {
    if (!exports.AF_BATCH_MAPPING_ENABLED) {
        return Array.from({ length: Math.ceil(items.length / exports.AF_BATCH_SIZE) }, function (_, i) {
            return items.slice(i * exports.AF_BATCH_SIZE, (i + 1) * exports.AF_BATCH_SIZE);
        });
    }
    var batches = [];
    var orderedDeps = optimizeExecutionOrder(dependencies);
    var currentBatch = [];
    var currentBatchResources = 0;
    var maxBatchResources = exports.AF_MAX_BATCH_SIZE;
    for (var _i = 0, orderedDeps_1 = orderedDeps; _i < orderedDeps_1.length; _i++) {
        var dep = orderedDeps_1[_i];
        var itemIndex = parseInt(dep.id.split('-')[1]);
        var item = items[itemIndex];
        // Check if adding this item would exceed batch resource limits
        if (currentBatchResources + dep.resourceWeight > maxBatchResources ||
            currentBatch.length >= exports.AF_MAX_BATCH_SIZE) {
            if (currentBatch.length > 0) {
                batches.push(currentBatch);
                currentBatch = [];
                currentBatchResources = 0;
            }
        }
        currentBatch.push(item);
        currentBatchResources += dep.resourceWeight;
    }
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }
    return batches.length > 0 ? batches : [items]; // Fallback to single batch
}
function runBatched(items, processor, options) {
    return __awaiter(this, void 0, void 0, function () {
        var batchSize, maxRetries, results, dependencies, batches, _loop_1, batchIndex;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    batchSize = (options === null || options === void 0 ? void 0 : options.batchSize) || exports.AF_BATCH_SIZE;
                    maxRetries = (options === null || options === void 0 ? void 0 : options.maxRetries) || 3;
                    results = [];
                    state.queuedWork += items.length;
                    dependencies = analyzeProcessDependencies(items);
                    batches = createOptimalBatches(items, dependencies);
                    logIncident('DEPENDENCY_ANALYSIS', {
                        totalItems: items.length,
                        dependenciesFound: dependencies.length,
                        batchesCreated: batches.length,
                        adaptiveThrottlingLevel: state.adaptiveThrottlingLevel
                    });
                    _loop_1 = function (batchIndex) {
                        var batch, originalIndices, batchPromises, batchResults, interBatchDelay;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    batch = batches[batchIndex];
                                    originalIndices = batch.map(function (item) { return items.indexOf(item); });
                                    // Atomically wait and reserve slots with adaptive throttling
                                    return [4 /*yield*/, waitForCapacity(batch.length)];
                                case 1:
                                    // Atomically wait and reserve slots with adaptive throttling
                                    _b.sent();
                                    state.queuedWork -= batch.length;
                                    batchPromises = batch.map(function (item, localBatchIndex) { return __awaiter(_this, void 0, void 0, function () {
                                        var originalIndex, lastError, retry, result, err_1, baseBackoff, adaptiveScaling, jitter, retryBackoff;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    originalIndex = originalIndices[localBatchIndex];
                                                    retry = 0;
                                                    _a.label = 1;
                                                case 1:
                                                    if (!(retry <= maxRetries)) return [3 /*break*/, 8];
                                                    _a.label = 2;
                                                case 2:
                                                    _a.trys.push([2, 4, , 7]);
                                                    return [4 /*yield*/, processor(item, originalIndex)];
                                                case 3:
                                                    result = _a.sent();
                                                    state.completedWork++;
                                                    recordSuccess();
                                                    return [2 /*return*/, result];
                                                case 4:
                                                    err_1 = _a.sent();
                                                    lastError = err_1;
                                                    if (!(retry < maxRetries)) return [3 /*break*/, 6];
                                                    baseBackoff = exports.AF_BACKOFF_MIN_MS * Math.pow(2, retry);
                                                    adaptiveScaling = 1 + (1 - state.adaptiveThrottlingLevel);
                                                    jitter = Math.random() * 0.2;
                                                    retryBackoff = Math.floor(baseBackoff * adaptiveScaling * (1 + jitter));
                                                    logIncident('BACKOFF', {
                                                        retry: retry + 1,
                                                        error: lastError.message,
                                                        backoffMs: retryBackoff,
                                                        adaptiveThrottlingLevel: state.adaptiveThrottlingLevel,
                                                        batchIndex: batchIndex + 1,
                                                        totalBatches: batches.length
                                                    });
                                                    return [4 /*yield*/, sleep(retryBackoff)];
                                                case 5:
                                                    _a.sent();
                                                    _a.label = 6;
                                                case 6: return [3 /*break*/, 7];
                                                case 7:
                                                    retry++;
                                                    return [3 /*break*/, 1];
                                                case 8:
                                                    state.failedWork++;
                                                    recordFailure();
                                                    throw lastError;
                                            }
                                        });
                                    }); });
                                    _b.label = 2;
                                case 2:
                                    _b.trys.push([2, , 4, 5]);
                                    return [4 /*yield*/, Promise.all(batchPromises)];
                                case 3:
                                    batchResults = _b.sent();
                                    results.push.apply(results, batchResults);
                                    logIncident('BATCH_COMPLETE', {
                                        batchSize: batch.length,
                                        batchIndex: batchIndex + 1,
                                        totalBatches: batches.length,
                                        adaptiveThrottlingLevel: state.adaptiveThrottlingLevel,
                                        cpuLoad: getCpuLoad(),
                                        idlePercentage: getIdlePercentage()
                                    });
                                    return [3 /*break*/, 5];
                                case 4:
                                    state.activeWork -= batch.length; // Release slots
                                    return [7 /*endfinally*/];
                                case 5:
                                    if (!(batchIndex < batches.length - 1)) return [3 /*break*/, 7];
                                    interBatchDelay = Math.floor((1 - state.adaptiveThrottlingLevel) * exports.AF_BACKOFF_MIN_MS);
                                    if (!(interBatchDelay > 0)) return [3 /*break*/, 7];
                                    return [4 /*yield*/, sleep(interBatchDelay)];
                                case 6:
                                    _b.sent();
                                    _b.label = 7;
                                case 7: return [2 /*return*/];
                            }
                        });
                    };
                    batchIndex = 0;
                    _a.label = 1;
                case 1:
                    if (!(batchIndex < batches.length)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(batchIndex)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    batchIndex++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, results];
            }
        });
    });
}
function guarded(operation) {
    return __awaiter(this, void 0, void 0, function () {
        var result, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, waitForCapacity(1)];
                case 1:
                    _a.sent();
                    state.queuedWork--;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, 5, 6]);
                    return [4 /*yield*/, operation()];
                case 3:
                    result = _a.sent();
                    state.completedWork++;
                    recordSuccess();
                    return [2 /*return*/, result];
                case 4:
                    err_2 = _a.sent();
                    state.failedWork++;
                    recordFailure();
                    throw err_2;
                case 5:
                    state.activeWork--; // Release slot
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function drain() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(state.activeWork > 0 || state.queuedWork > 0)) return [3 /*break*/, 2];
                    return [4 /*yield*/, sleep(100)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 0];
                case 2: return [2 /*return*/];
            }
        });
    });
}
function getStats() {
    return __assign(__assign({}, state), { incidents: __spreadArray([], state.incidents, true) });
}
function reset() {
    // Clear flush timer if exists
    if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
    }
    // Flush remaining incidents before reset
    flushIncidentBuffer().catch(function (err) {
        return console.warn('[ProcessGovernor] Final flush error:', err);
    });
    state.activeWork = 0;
    state.queuedWork = 0;
    state.completedWork = 0;
    state.failedWork = 0;
    state.currentBackoff = exports.AF_ENHANCED_BACKOFF_START_MS;
    state.lastLoadCheck = Date.now();
    state.availableTokens = exports.AF_MAX_BURST;
    state.lastTokenRefill = Date.now();
    state.circuitBreaker = {
        state: CircuitBreakerState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        lastStateChange: Date.now(),
        halfOpenRequests: 0,
        windowStart: Date.now(),
    };
    state.loadHistory = [];
    state.processDependencies.clear();
    state.adaptiveThrottlingLevel = 1.0;
    state.predictiveLoadScore = 0.0;
    state.lastDependencyAnalysis = 0;
    state.incidentBuffer = [];
    state.incidents = [];
    state.metrics = {
        tokens_available: exports.AF_MAX_BURST,
        throttle_events: 0,
        backoff_ms: exports.AF_ENHANCED_BACKOFF_START_MS,
        poll_ms: exports.AF_ADAPTIVE_POLL_MIN_MS,
        batch_depth: 0,
        dropped_events: 0,
        queue_depth: 0,
        flush_latency_ms: 0,
    };
}
exports.config = {
    // Original config
    AF_CPU_HEADROOM_TARGET: exports.AF_CPU_HEADROOM_TARGET,
    AF_BATCH_SIZE: exports.AF_BATCH_SIZE,
    AF_MAX_WIP: exports.AF_MAX_WIP,
    AF_BACKOFF_MIN_MS: exports.AF_BACKOFF_MIN_MS,
    AF_BACKOFF_MAX_MS: exports.AF_BACKOFF_MAX_MS,
    AF_BACKOFF_MULTIPLIER: exports.AF_BACKOFF_MULTIPLIER,
    AF_RATE_LIMIT_ENABLED: exports.AF_RATE_LIMIT_ENABLED,
    AF_TOKENS_PER_SECOND: exports.AF_TOKENS_PER_SECOND,
    AF_MAX_BURST: exports.AF_MAX_BURST,
    AF_CIRCUIT_BREAKER_ENABLED: exports.AF_CIRCUIT_BREAKER_ENABLED,
    AF_CIRCUIT_BREAKER_THRESHOLD: exports.AF_CIRCUIT_BREAKER_THRESHOLD,
    AF_CIRCUIT_BREAKER_WINDOW_MS: exports.AF_CIRCUIT_BREAKER_WINDOW_MS,
    AF_CIRCUIT_BREAKER_COOLDOWN_MS: exports.AF_CIRCUIT_BREAKER_COOLDOWN_MS,
    AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS: exports.AF_CIRCUIT_BREAKER_HALF_OPEN_REQUESTS,
    // Phase 1.1: Enhanced config
    AF_TOKEN_REFILL_INTERVAL_MS: exports.AF_TOKEN_REFILL_INTERVAL_MS,
    AF_ENHANCED_BACKOFF_START_MS: exports.AF_ENHANCED_BACKOFF_START_MS,
    AF_ENHANCED_BACKOFF_FACTOR: exports.AF_ENHANCED_BACKOFF_FACTOR,
    AF_ENHANCED_BACKOFF_JITTER: exports.AF_ENHANCED_BACKOFF_JITTER,
    AF_ENHANCED_BACKOFF_CEILING_MS: exports.AF_ENHANCED_BACKOFF_CEILING_MS,
    AF_MICRO_BATCH_SIZE: exports.AF_MICRO_BATCH_SIZE,
    AF_MICRO_BATCH_FLUSH_INTERVAL_MS: exports.AF_MICRO_BATCH_FLUSH_INTERVAL_MS,
    AF_MICRO_BATCH_DROP_OLDEST: exports.AF_MICRO_BATCH_DROP_OLDEST,
    AF_ADAPTIVE_POLL_MIN_MS: exports.AF_ADAPTIVE_POLL_MIN_MS,
    AF_ADAPTIVE_POLL_MAX_MS: exports.AF_ADAPTIVE_POLL_MAX_MS,
    AF_ADAPTIVE_THROTTLING_ENABLED: exports.AF_ADAPTIVE_THROTTLING_ENABLED,
    AF_PREDICTIVE_THROTTLING: exports.AF_PREDICTIVE_THROTTLING,
    AF_DEPENDENCY_ANALYSIS_ENABLED: exports.AF_DEPENDENCY_ANALYSIS_ENABLED,
    AF_BATCH_MAPPING_ENABLED: exports.AF_BATCH_MAPPING_ENABLED,
    AF_EXECUTION_ORDER_OPTIMIZATION: exports.AF_EXECUTION_ORDER_OPTIMIZATION,
    AF_LOAD_HISTORY_SIZE: exports.AF_LOAD_HISTORY_SIZE,
    AF_MAX_BATCH_SIZE: exports.AF_MAX_BATCH_SIZE,
    AF_CPU_WARNING_THRESHOLD: exports.AF_CPU_WARNING_THRESHOLD,
    AF_CPU_CRITICAL_THRESHOLD: exports.AF_CPU_CRITICAL_THRESHOLD,
};
