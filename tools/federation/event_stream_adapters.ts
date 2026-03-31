/**
 * Event Stream Adapters - Production Implementations
 * 
 * Concrete implementations of adapters for Prometheus, SLURM, and Kubernetes
 * that integrate with real monitoring systems.
 */

import { EventStream, GoalieEvent } from './event_stream';
import * as https from 'https';
import * as http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Prometheus Adapter - Production Implementation
 * Queries Prometheus API and converts metrics to Goalie events
 */
export class PrometheusAdapterImpl {
  constructor(
    private stream: EventStream,
    private prometheusUrl: string = process.env.PROMETHEUS_URL || 'http://localhost:9090'
  ) {}

  /**
   * Query Prometheus and process results
   */
  async queryAndProcess(query: string, step: string = '1m'): Promise<void> {
    try {
      const url = `${this.prometheusUrl}/api/v1/query_range?query=${encodeURIComponent(query)}&step=${step}`;
      const response = await this.httpGet(url);
      const data = JSON.parse(response);

      if (data.status === 'success' && data.data?.result) {
        this.processMetrics(data.data.result);
      }
    } catch (error) {
      console.error('Prometheus query failed:', error);
    }
  }

  /**
   * Process Prometheus query result
   */
  private processMetrics(metrics: any[]): void {
    for (const metric of metrics) {
      const event: GoalieEvent = {
        ts: new Date().toISOString(),
        type: 'metric',
        source: 'prometheus',
        data: {
          metric: metric.metric,
          values: metric.values,
        },
      };

      // Map Prometheus metrics to patterns
      const metricName = metric.metric?.__name__ || '';
      const labels = metric.metric || {};

      if (metricName.includes('gpu_utilization') || metricName.includes('nvidia_gpu_utilization')) {
        event.pattern = 'hpc-batch-window';
        event.circle = 'Assessor';
        event.depth = 1;
        const avgValue = this.averageValues(metric.values);
        event.data.gpu_util_pct = avgValue * 100;
      } else if (metricName.includes('training_loss') || metricName.includes('model_loss')) {
        event.pattern = 'ml-training-guardrail';
        event.circle = 'Analyst';
        event.depth = 2;
        const avgValue = this.averageValues(metric.values);
        event.data.training_loss = avgValue;
      } else if (metricName.includes('queue_wait_time') || metricName.includes('slurm_queue_time')) {
        event.pattern = 'hpc-batch-window';
        event.circle = 'Assessor';
        event.depth = 1;
        const avgValue = this.averageValues(metric.values);
        event.data.queue_time_sec = avgValue;
      } else if (metricName.includes('node_count') || metricName.includes('slurm_node_count')) {
        event.pattern = 'hpc-batch-window';
        event.circle = 'Assessor';
        event.depth = 1;
        const latestValue = metric.values?.[metric.values.length - 1]?.[1];
        event.data.node_count = parseFloat(latestValue) || 0;
      }

      this.stream.emitEvent(event);
    }
  }

  private averageValues(values: any[]): number {
    if (!values || values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + parseFloat(val[1] || 0), 0);
    return sum / values.length;
  }

  private httpGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      }).on('error', reject);
    });
  }
}

/**
 * SLURM Adapter - Production Implementation
 * Queries SLURM accounting and converts job data to Goalie events
 */
export class SLURMAdapterImpl {
  constructor(
    private stream: EventStream,
    private sacctCommand: string = 'sacct'
  ) {}

  /**
   * Query SLURM accounting for recent jobs
   */
  async queryRecentJobs(hours: number = 24): Promise<void> {
    try {
      // Query SLURM accounting for jobs in the last N hours
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
      
      const startStr = startTime.toISOString().replace(/[-:]/g, '').split('.')[0];
      const endStr = endTime.toISOString().replace(/[-:]/g, '').split('.')[0];

      const command = `${this.sacctCommand} -S ${startStr} -E ${endStr} --format=JobID,JobName,State,Start,End,Elapsed,NodeList,AllocCPUS,ReqMem,MaxRSS --parsable2 --noheader`;
      
      const { stdout } = await execAsync(command);
      const lines = stdout.trim().split('\n').filter(l => l.trim());

      for (const line of lines) {
        this.processJobLine(line);
      }
    } catch (error) {
      console.error('SLURM query failed:', error);
    }
  }

  /**
   * Process a single SLURM job line
   */
  private processJobLine(line: string): void {
    const fields = line.split('|');
    if (fields.length < 10) return;

    const [jobId, jobName, state, start, end, elapsed, nodeList, allocCpus, reqMem, maxRss] = fields;

    // Calculate queue time (simplified - would need job submission time from sacct)
    const elapsedSec = this.parseElapsedTime(elapsed);
    const nodeCount = nodeList ? nodeList.split(',').length : 1;

    const event: GoalieEvent = {
      ts: start || new Date().toISOString(),
      type: 'pattern',
      source: 'slurm',
      pattern: 'hpc-batch-window',
      circle: 'Assessor',
      depth: 1,
      data: {
        job_id: jobId,
        job_name: jobName,
        state,
        elapsed_sec: elapsedSec,
        node_count: nodeCount,
        alloc_cpus: parseInt(allocCpus) || 0,
        req_mem: reqMem,
        max_rss: maxRss,
        // Estimate queue time (would need actual submission time)
        queue_time_sec: 0,
      },
    };

    this.stream.emitEvent(event);
  }

  private parseElapsedTime(elapsed: string): number {
    // Parse SLURM elapsed time format (HH:MM:SS or DD-HH:MM:SS)
    const parts = elapsed.split('-');
    let days = 0;
    let timePart = elapsed;

    if (parts.length === 2) {
      days = parseInt(parts[0]) || 0;
      timePart = parts[1];
    }

    const [hours, minutes, seconds] = timePart.split(':').map(s => parseInt(s) || 0);
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }
}

/**
 * Kubernetes Adapter - Production Implementation
 * Queries Kubernetes API and converts pod/metrics to Goalie events
 */
export class KubernetesAdapterImpl {
  constructor(
    private stream: EventStream,
    private kubeconfig: string = process.env.KUBECONFIG || '',
    private namespace: string = process.env.K8S_NAMESPACE || 'default'
  ) {}

  /**
   * Query Kubernetes pods and process metrics
   */
  async queryPods(): Promise<void> {
    try {
      const command = `kubectl get pods -n ${this.namespace} -o json ${this.kubeconfig ? `--kubeconfig=${this.kubeconfig}` : ''}`;
      const { stdout } = await execAsync(command);
      const data = JSON.parse(stdout);

      if (data.items) {
        for (const pod of data.items) {
          this.processPodMetrics(pod);
        }
      }
    } catch (error) {
      console.error('Kubernetes query failed:', error);
    }
  }

  /**
   * Process Kubernetes pod metrics
   */
  private processPodMetrics(pod: any): void {
    const event: GoalieEvent = {
      ts: new Date().toISOString(),
      type: 'metric',
      source: 'kubernetes',
      data: {
        pod_name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        status: pod.status.phase,
        containers: pod.spec.containers.map((c: any) => c.name),
        labels: pod.metadata.labels || {},
      },
    };

    // Map to patterns based on pod labels or annotations
    const labels = pod.metadata.labels || {};
    const annotations = pod.metadata.annotations || {};

    if (labels['app'] === 'ml-training' || labels['workload-type'] === 'ml') {
      event.pattern = 'ml-training-guardrail';
      event.circle = 'Analyst';
      event.depth = 2;
    } else if (labels['app'] === 'hpc-batch' || labels['workload-type'] === 'hpc') {
      event.pattern = 'hpc-batch-window';
      event.circle = 'Assessor';
      event.depth = 1;
    } else if (labels['app'] === 'model-serving' || labels['workload-type'] === 'serving') {
      event.pattern = 'ml-model-serving-latency';
      event.circle = 'Architect';
      event.depth = 2;
    }

    // Extract resource requests/limits
    if (pod.spec.containers) {
      for (const container of pod.spec.containers) {
        if (container.resources?.requests) {
          event.data.cpu_request = container.resources.requests.cpu;
          event.data.memory_request = container.resources.requests.memory;
        }
        if (container.resources?.limits) {
          event.data.cpu_limit = container.resources.limits.cpu;
          event.data.memory_limit = container.resources.limits.memory;
        }
      }
    }

    this.stream.emitEvent(event);
  }
}

/**
 * Factory function to create all adapters
 */
export function createEventStreamAdapters(stream: EventStream): {
  prometheus: PrometheusAdapterImpl;
  slurm: SLURMAdapterImpl;
  kubernetes: KubernetesAdapterImpl;
} {
  return {
    prometheus: new PrometheusAdapterImpl(stream),
    slurm: new SLURMAdapterImpl(stream),
    kubernetes: new KubernetesAdapterImpl(stream),
  };
}

