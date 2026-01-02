import { EventEmitter } from 'events';
import * as net from 'net';

import {
  emitDriftEventToSyslog,
  probeTcpConnect,
  type DriftMonitorEvent,
} from '../../src/telemetry/offhost-syslog/driftMonitor';

describe('offhost syslog drift monitor', () => {
  test('probeTcpConnect succeeds against a listening server', async () => {
    const server = net.createServer((socket) => {
      socket.end();
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('expected server to be listening on a TCP port');
    }

    const res = await probeTcpConnect({ host: '127.0.0.1', port: address.port, timeoutMs: 1000 });

    await new Promise<void>((resolve) => server.close(() => resolve()));

    expect(res.ok).toBe(true);
    expect(typeof res.latencyMs).toBe('number');
  });

  test('probeTcpConnect fails when port is closed', async () => {
    const server = net.createServer();

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('expected server to be listening on a TCP port');
    }

    await new Promise<void>((resolve) => server.close(() => resolve()));

    const res = await probeTcpConnect({ host: '127.0.0.1', port: address.port, timeoutMs: 500 });
    expect(res.ok).toBe(false);
  });

  test('emitDriftEventToSyslog invokes logger with tag and priority', async () => {
    const calls: Array<{ cmd: string; args?: ReadonlyArray<string> }> = [];

    const spawnFn = (cmd: string, args?: ReadonlyArray<string>) => {
      calls.push({ cmd, args });
      const child = new EventEmitter();
      setImmediate(() => child.emit('close'));
      return child;
    };

    const event: DriftMonitorEvent = {
      ts: new Date().toISOString(),
      source: 'unit-test',
      check: 'syslog_sink_tcp',
      provider: 'aws_lightsail',
      target: 'example:6514',
      status: 'ok',
      latency_ms: 12,
    };

    const res = await emitDriftEventToSyslog(event, {
      tag: 'drift-monitor',
      facility: 'local5',
      spawnFn,
    });

    expect(res.ok).toBe(true);
    expect(calls.length).toBe(1);
    expect(calls[0].cmd).toBe('logger');
    expect(calls[0].args).toContain('-t');
    expect(calls[0].args).toContain('drift-monitor');
    expect(calls[0].args).toContain('-p');
    expect(calls[0].args).toContain('local5.info');
  });
});
