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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternBaselineDelta = void 0;
exports.readJsonl = readJsonl;
exports.summarizePatterns = summarizePatterns;
exports.getActionKeys = getActionKeys;
exports.computeCodBaselineDeltas = computeCodBaselineDeltas;
const fs = require("fs");
const readline = require("readline");
const yaml = require("yaml");
function readJsonl(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        const results = [];
        if (!fs.existsSync(filePath))
            return results;
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        try {
            for (var _d = true, rl_1 = __asyncValues(rl), rl_1_1; rl_1_1 = yield rl_1.next(), _a = rl_1_1.done, !_a; _d = true) {
                _c = rl_1_1.value;
                _d = false;
                const line = _c;
                if (!line.trim())
                    continue;
                try {
                    results.push(JSON.parse(line));
                }
                catch (_e) {
                    // ignore malformed lines
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = rl_1.return)) yield _b.call(rl_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return results;
    });
}
function summarizePatterns(patterns) {
    const counts = new Map();
    for (const ev of patterns) {
        const key = ev.pattern || 'unknown';
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
}
function getActionKeys(goalieDir) {
    const actionsPath = `${goalieDir}/OBSERVABILITY_ACTIONS.yaml`;
    const keys = new Set();
    if (!fs.existsSync(actionsPath))
        return keys;
    try {
        const raw = fs.readFileSync(actionsPath, 'utf8');
        const doc = yaml.parse(raw) || {};
        const items = doc.items || [];
        for (const it of items) {
            const circle = it.circle || '<none>';
            const depth = typeof it.depth === 'number' ? it.depth : 0;
            keys.add(`${circle}|${depth}`);
        }
    }
    catch (_a) {
        // ignore YAML errors
    }
    return keys;
}
class PatternBaselineDelta {
}
exports.PatternBaselineDelta = PatternBaselineDelta;
function computeCodBaselineDeltas(patterns) {
    var _a;
    const byKey = new Map();
    for (const ev of patterns) {
        const pattern = ev.pattern || 'unknown';
        const circle = String((_a = ev.circle) !== null && _a !== void 0 ? _a : '<none>');
        const depth = typeof ev.depth === 'number' ? ev.depth : 0;
        const tsStr = (ev.ts || ev.timestamp);
        const ts = tsStr ? Date.parse(tsStr) : Number.NaN;
        const cod = ev.economic && typeof ev.economic.cod === 'number'
            ? ev.economic.cod
            : undefined;
        const key = `${pattern}|${circle}|${depth}`;
        let acc = byKey.get(key);
        if (!acc) {
            acc = { pattern, circle, depth };
            byKey.set(key, acc);
        }
        if (!Number.isNaN(ts)) {
            if (acc.firstTs === undefined || ts < acc.firstTs) {
                acc.firstTs = ts;
                if (cod !== undefined)
                    acc.firstCod = cod;
            }
            if (acc.lastTs === undefined || ts > acc.lastTs) {
                acc.lastTs = ts;
                if (cod !== undefined)
                    acc.lastCod = cod;
            }
        }
    }
    const results = [];
    for (const acc of byKey.values()) {
        const baselineScore = acc.firstCod;
        const currentScore = acc.lastCod;
        if (baselineScore === undefined ||
            currentScore === undefined ||
            baselineScore === 0) {
            continue;
        }
        const delta = currentScore - baselineScore;
        const deltaPct = (delta / baselineScore) * 100;
        results.push({
            pattern: acc.pattern,
            circle: acc.circle,
            depth: acc.depth,
            baselineScore,
            currentScore,
            delta,
            deltaPct,
        });
    }
    return results;
}
//# sourceMappingURL=shared_utils.js.map