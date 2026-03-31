import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GoalieTelemetry } from '../telemetry';

describe('GoalieTelemetry', () => {
  const originalAfContext = process.env.AF_CONTEXT;

  const createTelemetry = (workspaceRoot?: string) => {
    const outputChannel = { appendLine: jest.fn() } as any;
    return new GoalieTelemetry(outputChannel, workspaceRoot);
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

  test('writeFallback appends JSON line when fallback path exists', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'goalie-telemetry-'));
    const telemetry = createTelemetry(tempRoot);
    const goalieDir = path.join(tempRoot, '.goalie');
    const fallbackFile = path.join(goalieDir, 'telemetry_log.jsonl');

    await telemetry.writeFallback('test-event', { foo: 'bar' }, { count: 3 });

    const fileContents = fs.readFileSync(fallbackFile, 'utf8').trim();
    const payload = JSON.parse(fileContents);

    expect(payload.eventName).toBe('test-event');
    expect(payload.properties).toEqual({ foo: 'bar' });
    expect(payload.measurements).toEqual({ count: 3 });

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
