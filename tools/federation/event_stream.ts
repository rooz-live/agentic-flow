/**
 * Real-Time Event Stream Architecture Foundation
 * 
 * This module provides the foundation for real-time event streaming from external
 * monitoring systems (Prometheus, SLURM, Kubernetes) to the Goalie system.
 * 
 * Architecture:
 * - Event producers (adapters) convert external metrics to Goalie events
 * - Event stream manages event flow and buffering
 * - Event consumers (subscribers) process events and update Goalie data
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface GoalieEvent {
  ts: string;
  type: 'pattern' | 'metric' | 'alert' | 'health';
  source: 'prometheus' | 'slurm' | 'kubernetes' | 'internal';
  pattern?: string;
  circle?: string;
  depth?: number;
  data: Record<string, any>;
}

export interface EventStreamConfig {
  bufferSize?: number;
  flushInterval?: number; // milliseconds
  outputPath?: string; // Path to pattern_metrics.jsonl
}

/**
 * Event Stream Manager
 * Manages event flow from producers to consumers
 */
export class EventStream extends EventEmitter {
  private buffer: GoalieEvent[] = [];
  private config: Required<EventStreamConfig>;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: EventStreamConfig = {}) {
    super();
    this.config = {
      bufferSize: config.bufferSize ?? 100,
      flushInterval: config.flushInterval ?? 5000, // 5 seconds
      outputPath: config.outputPath ?? path.join(process.cwd(), '.goalie', 'pattern_metrics.jsonl'),
    };

    // Start flush timer
    this.startFlushTimer();
  }

  /**
   * Emit an event to the stream
   */
  emitEvent(event: GoalieEvent): void {
    this.buffer.push(event);
    this.emit('event', event);

    // Flush if buffer is full
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  /**
   * Flush buffer to file
   */
  flush(): void {
    if (this.buffer.length === 0) {
      return;
    }

    const events = [...this.buffer];
    this.buffer = [];

    // Ensure directory exists
    const dir = path.dirname(this.config.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Append events to file
    const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n';
    fs.appendFileSync(this.config.outputPath, lines, 'utf8');

    this.emit('flush', events);
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer and flush remaining events
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.flush();
  }
}

/**
 * Prometheus Adapter
 * Converts Prometheus metrics to Goalie events
 */
export class PrometheusAdapter {
  constructor(private stream: EventStream) {}

  /**
   * Process Prometheus query result
   */
  processMetrics(metrics: any[]): void {
    for (const metric of metrics) {
      const event: GoalieEvent = {
        ts: new Date().toISOString(),
        type: 'metric',
        source: 'prometheus',
        data: {
          metric: metric.metric,
          value: metric.value,
          labels: metric.labels,
        },
      };

      // Map Prometheus metrics to patterns
      if (metric.metric?.name?.includes('gpu_utilization')) {
        event.pattern = 'hpc-batch-window';
        event.circle = 'Assessor';
        event.depth = 1;
        event.data.gpu_util_pct = parseFloat(metric.value[1]) * 100;
      } else if (metric.metric?.name?.includes('training_loss')) {
        event.pattern = 'ml-training-guardrail';
        event.circle = 'Analyst';
        event.depth = 2;
        event.data.training_loss = parseFloat(metric.value[1]);
      }

      this.stream.emitEvent(event);
    }
  }
}

/**
 * SLURM Adapter
 * Converts SLURM accounting data to Goalie events
 */
export class SLURMAdapter {
  constructor(private stream: EventStream) {}

  /**
   * Process SLURM job accounting data
   */
  processJobData(job: any): void {
    const event: GoalieEvent = {
      ts: new Date(job.start_time).toISOString(),
      type: 'pattern',
      source: 'slurm',
      pattern: 'hpc-batch-window',
      circle: 'Assessor',
      depth: 1,
      data: {
        job_id: job.job_id,
        queue_time_sec: job.queue_time_sec,
        gpu_util_pct: job.gpu_util_pct,
        node_count: job.node_count,
        throughput_samples_sec: job.throughput_samples_sec,
        p99_latency_ms: job.p99_latency_ms,
      },
    };

    this.stream.emitEvent(event);
  }
}

/**
 * Kubernetes Adapter
 * Converts Kubernetes metrics to Goalie events
 */
export class KubernetesAdapter {
  constructor(private stream: EventStream) {}

  /**
   * Process Kubernetes pod metrics
   */
  processPodMetrics(pod: any): void {
    const event: GoalieEvent = {
      ts: new Date().toISOString(),
      type: 'metric',
      source: 'kubernetes',
      data: {
        pod_name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        status: pod.status.phase,
        containers: pod.spec.containers.map((c: any) => c.name),
      },
    };

    // Map to patterns based on pod labels or annotations
    if (pod.metadata.labels?.['app'] === 'ml-training') {
      event.pattern = 'ml-training-guardrail';
      event.circle = 'Analyst';
      event.depth = 2;
    }

    this.stream.emitEvent(event);
  }
}

/**
 * WebSocket Server (for real-time updates)
 * Provides WebSocket endpoint for real-time event streaming
 */
export class EventStreamWebSocket {
  private stream: EventStream;
  private connections: Set<any> = new Set();

  constructor(stream: EventStream) {
    this.stream = stream;

    // Forward events to WebSocket connections
    this.stream.on('event', (event: GoalieEvent) => {
      this.broadcast(event);
    });
  }

  /**
   * Add WebSocket connection
   */
  addConnection(ws: any): void {
    this.connections.add(ws);
    ws.on('close', () => {
      this.connections.delete(ws);
    });
  }

  /**
   * Broadcast event to all connections
   */
  private broadcast(event: GoalieEvent): void {
    const message = JSON.stringify(event);
    for (const ws of this.connections) {
      if (ws.readyState === 1) { // OPEN
        ws.send(message);
      }
    }
  }
}

/**
 * Example usage
 */
export function createEventStream(config?: EventStreamConfig): EventStream {
  const stream = new EventStream(config);

  // Create adapters
  const prometheusAdapter = new PrometheusAdapter(stream);
  const slurmAdapter = new SLURMAdapter(stream);
  const kubernetesAdapter = new KubernetesAdapter(stream);

  // Example: Process Prometheus metrics
  // prometheusAdapter.processMetrics(metrics);

  // Example: Process SLURM job data
  // slurmAdapter.processJobData(job);

  // Example: Process Kubernetes pod metrics
  // kubernetesAdapter.processPodMetrics(pod);

  return stream;
}

