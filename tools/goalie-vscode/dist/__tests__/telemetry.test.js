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
const fs = require("fs");
const os = require("os");
const path = require("path");
const telemetry_1 = require("../telemetry");
describe('GoalieTelemetry', () => {
    const originalAfContext = process.env.AF_CONTEXT;
    const createTelemetry = (workspaceRoot) => {
        const outputChannel = { appendLine: jest.fn() };
        return new telemetry_1.GoalieTelemetry(outputChannel, workspaceRoot);
    };
    afterEach(() => {
        process.env.AF_CONTEXT = originalAfContext;
    });
    test('buildProperties merges context, props, and measurement prefixes', () => {
        process.env.AF_CONTEXT = 'prod-cycle';
        const telemetry = createTelemetry();
        const result = telemetry.buildProperties({ foo: 'bar' }, { cost: 42 });
        expect(result).toEqual({
            afContext: 'prod-cycle',
            foo: 'bar',
            m_cost: '42',
        });
    });
    test('writeFallback appends JSON line when fallback path exists', () => __awaiter(void 0, void 0, void 0, function* () {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'goalie-telemetry-'));
        const telemetry = createTelemetry(tempRoot);
        const goalieDir = path.join(tempRoot, '.goalie');
        const fallbackFile = path.join(goalieDir, 'telemetry_log.jsonl');
        yield telemetry.writeFallback('test-event', { foo: 'bar' }, { count: 3 });
        const fileContents = fs.readFileSync(fallbackFile, 'utf8').trim();
        const payload = JSON.parse(fileContents);
        expect(payload.eventName).toBe('test-event');
        expect(payload.properties).toEqual({ foo: 'bar' });
        expect(payload.measurements).toEqual({ count: 3 });
        fs.rmSync(tempRoot, { recursive: true, force: true });
    }));
});
//# sourceMappingURL=telemetry.test.js.map