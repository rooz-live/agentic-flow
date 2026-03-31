import * as net from 'net';
import * as vscode from 'vscode';
import type { GoalieTelemetry } from './telemetry';

export interface StreamEventPayload {
  type?: string;
  data?: any;
  timestamp?: string;
}

export interface StreamClientOptions {
  socketPath?: string;
  telemetry: GoalieTelemetry;
  output: vscode.OutputChannel;
  reconnectDelayMs?: number;
  onEvent?: (payload: StreamEventPayload) => void;
}

export class StreamClient implements vscode.Disposable {
  private socket?: net.Socket;
  private reconnectTimer?: NodeJS.Timeout;
  private buffer = '';
  private disposed = false;
  private socketPath?: string;

  constructor(private readonly options: StreamClientOptions) {
    this.socketPath = options.socketPath;
  }

  start(socketPath?: string) {
    if (socketPath) {
      this.socketPath = socketPath;
    }
    this.connect();
  }

  dispose() {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = undefined;
    }
  }

  private connect() {
    if (this.disposed) {
      return;
    }
    if (!this.socketPath) {
      this.options.output.appendLine('[Stream] No socket path provided, skipping connection.');
      return;
    }

    const socketPath = this.socketPath;
    if (!socketPath) {
      return;
    }

    this.options.telemetry.log('goalie.stream.connecting', {
      socketPath,
    });

    this.socket = net.createConnection({ path: socketPath }, () => {
      this.options.output.appendLine(`[Stream] Connected to ${this.socketPath}`);
      this.options.telemetry.log('goalie.stream.connected', {
        socketPath,
      });
    });

    this.socket.on('data', chunk => this.handleChunk(chunk));
    this.socket.on('error', err => {
      this.options.output.appendLine(`[Stream] Error: ${err.message}`);
      this.options.telemetry.logError('goalie.stream.error', {
        message: err.message,
      });
    });
    this.socket.on('end', () => this.flushBuffer());
    this.socket.on('close', () => {
      this.options.output.appendLine('[Stream] Disconnected');
      this.options.telemetry.log('goalie.stream.disconnected', {
        socketPath: this.socketPath ?? 'unknown',
      });
      this.scheduleReconnect();
    });
  }

  private handleChunk(chunk: Buffer) {
    this.buffer += chunk.toString('utf8');
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      this.processLine(line);
      newlineIndex = this.buffer.indexOf('\n');
    }

    // If upstream doesn't send newline, try parsing whole buffer when socket closes
    this.tryProcessBuffer();
  }

  private flushBuffer() {
    this.tryProcessBuffer(true);
  }

  private tryProcessBuffer(force = false) {
    const trimmed = this.buffer.trim();
    if (!trimmed) {
      return;
    }
    try {
      const payload = JSON.parse(trimmed);
      this.buffer = '';
      this.emitEvent(payload);
    } catch (err) {
      if (force) {
        this.options.output.appendLine('[Stream] Failed to parse payload: ' + (err as Error).message);
        this.buffer = '';
      }
    }
  }

  private processLine(line: string) {
    if (!line) {
      return;
    }
    try {
      const payload = JSON.parse(line);
      this.emitEvent(payload);
    } catch (err) {
      this.options.output.appendLine('[Stream] Failed to parse line: ' + (err as Error).message);
      this.options.telemetry.logError('goalie.stream.parseError', {
        message: (err as Error).message,
      });
    }
  }

  private emitEvent(payload: StreamEventPayload) {
    const eventType = typeof payload?.type === 'string' ? payload.type : 'unknown';
    this.options.telemetry.log('goalie.stream.event', {
      eventType,
    });
    this.options.onEvent?.(payload);
  }

  private scheduleReconnect() {
    if (this.disposed) {
      return;
    }
    if (this.reconnectTimer) {
      return;
    }
    const delay = this.options.reconnectDelayMs ?? 5000;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
  }
}
