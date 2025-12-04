/**
 * Event Stream Adapters - Production Implementations
 *
 * Concrete implementations of adapters for Prometheus, SLURM, and Kubernetes
 * that integrate with real monitoring systems.
 */
import { EventStream } from './event_stream';
/**
 * Prometheus Adapter - Production Implementation
 * Queries Prometheus API and converts metrics to Goalie events
 */
export declare class PrometheusAdapterImpl {
    private stream;
    private prometheusUrl;
    constructor(stream: EventStream, prometheusUrl?: string);
    /**
     * Query Prometheus and process results
     */
    queryAndProcess(query: string, step?: string): Promise<void>;
    /**
     * Process Prometheus query result
     */
    private processMetrics;
    private averageValues;
    private httpGet;
}
/**
 * SLURM Adapter - Production Implementation
 * Queries SLURM accounting and converts job data to Goalie events
 */
export declare class SLURMAdapterImpl {
    private stream;
    private sacctCommand;
    constructor(stream: EventStream, sacctCommand?: string);
    /**
     * Query SLURM accounting for recent jobs
     */
    queryRecentJobs(hours?: number): Promise<void>;
    /**
     * Process a single SLURM job line
     */
    private processJobLine;
    private parseElapsedTime;
}
/**
 * Kubernetes Adapter - Production Implementation
 * Queries Kubernetes API and converts pod/metrics to Goalie events
 */
export declare class KubernetesAdapterImpl {
    private stream;
    private kubeconfig;
    private namespace;
    constructor(stream: EventStream, kubeconfig?: string, namespace?: string);
    /**
     * Query Kubernetes pods and process metrics
     */
    queryPods(): Promise<void>;
    /**
     * Process Kubernetes pod metrics
     */
    private processPodMetrics;
}
/**
 * Factory function to create all adapters
 */
export declare function createEventStreamAdapters(stream: EventStream): {
    prometheus: PrometheusAdapterImpl;
    slurm: SLURMAdapterImpl;
    kubernetes: KubernetesAdapterImpl;
};
//# sourceMappingURL=event_stream_adapters.d.ts.map