import * as fs from 'fs';
import * as path from 'path';
import { StreamClient } from '../streamClient';
import type { GoalieTelemetry } from '../telemetry';

const fixturesDir = path.resolve(__dirname, '../../fixtures');
const governanceFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'governance.json'), 'utf8'));
const retroFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'retro.json'), 'utf8'));

const createTelemetryMock = () => ({
  log: jest.fn(),
  logError: jest.fn(),
}) as unknown as GoalieTelemetry;

const createOutputChannel = () => ({
  appendLine: jest.fn(),
}) as any;

describe('StreamClient', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  function emitPayload(client: StreamClient, payload: unknown) {
    const chunk = Buffer.from(`${JSON.stringify(payload)}\n`, 'utf8');
    (client as any).handleChunk(chunk);
  }

  test('emits governance events from fixture payload', () => {
    const telemetry = createTelemetryMock();
    const output = createOutputChannel();
    const onEvent = jest.fn();

    const client = new StreamClient({ telemetry, output, onEvent });

    emitPayload(client, { type: 'governance-json', data: governanceFixture });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'governance-json', data: governanceFixture })
    );
    expect(telemetry.log).toHaveBeenCalledWith('goalie.stream.event', { eventType: 'governance-json' });
  });

  test('retro fixtures trigger event telemetry', () => {
    const telemetry = createTelemetryMock();
    const output = createOutputChannel();
    const onEvent = jest.fn();

    const client = new StreamClient({ telemetry, output, onEvent });

    emitPayload(client, { type: 'retro-json', data: retroFixture });

    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'retro-json' }));
    expect(telemetry.log).toHaveBeenCalledWith('goalie.stream.event', { eventType: 'retro-json' });
  });

  test('extension wiring refreshes providers when governance payload arrives', () => {
    const telemetry = createTelemetryMock();
    const output = createOutputChannel();
    const setGovernanceJson = jest.fn();
    const refreshGaps = jest.fn();

    const client = new StreamClient({
      telemetry,
      output,
      onEvent: payload => {
        if (payload?.type === 'governance-json' && payload.data) {
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
