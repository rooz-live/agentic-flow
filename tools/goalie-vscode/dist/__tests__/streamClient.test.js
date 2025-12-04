"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const streamClient_1 = require("../streamClient");
const fixturesDir = path.resolve(__dirname, '../../fixtures');
const governanceFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'governance.json'), 'utf8'));
const retroFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'retro.json'), 'utf8'));
const createTelemetryMock = () => ({
    log: jest.fn(),
    logError: jest.fn(),
});
const createOutputChannel = () => ({
    appendLine: jest.fn(),
});
describe('StreamClient', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    function emitPayload(client, payload) {
        const chunk = Buffer.from(`${JSON.stringify(payload)}\n`, 'utf8');
        client.handleChunk(chunk);
    }
    test('emits governance events from fixture payload', () => {
        const telemetry = createTelemetryMock();
        const output = createOutputChannel();
        const onEvent = jest.fn();
        const client = new streamClient_1.StreamClient({ telemetry, output, onEvent });
        emitPayload(client, { type: 'governance-json', data: governanceFixture });
        expect(onEvent).toHaveBeenCalledTimes(1);
        expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'governance-json', data: governanceFixture }));
        expect(telemetry.log).toHaveBeenCalledWith('goalie.stream.event', { eventType: 'governance-json' });
    });
    test('retro fixtures trigger event telemetry', () => {
        const telemetry = createTelemetryMock();
        const output = createOutputChannel();
        const onEvent = jest.fn();
        const client = new streamClient_1.StreamClient({ telemetry, output, onEvent });
        emitPayload(client, { type: 'retro-json', data: retroFixture });
        expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'retro-json' }));
        expect(telemetry.log).toHaveBeenCalledWith('goalie.stream.event', { eventType: 'retro-json' });
    });
    test('extension wiring refreshes providers when governance payload arrives', () => {
        const telemetry = createTelemetryMock();
        const output = createOutputChannel();
        const setGovernanceJson = jest.fn();
        const refreshGaps = jest.fn();
        const client = new streamClient_1.StreamClient({
            telemetry,
            output,
            onEvent: payload => {
                if ((payload === null || payload === void 0 ? void 0 : payload.type) === 'governance-json' && payload.data) {
                    setGovernanceJson(payload.data);
                    refreshGaps();
                }
            },
        });
        emitPayload(client, { type: 'governance-json', data: governanceFixture });
        expect(setGovernanceJson).toHaveBeenCalledWith(governanceFixture);
        expect(refreshGaps).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=streamClient.test.js.map