import fs from 'fs';
import path from 'path';

// Ensure .goalie directory exists
const goalieDir = path.join(process.cwd(), 'investing/agentic-flow/.goalie');
if (!fs.existsSync(goalieDir)) {
  fs.mkdirSync(goalieDir, { recursive: true });
}

const metricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');

const timestamp = new Date().toISOString();

const patterns = [
  // ML Patterns (TensorFlow/PyTorch)
  {
    pattern: 'ml-training-guardrail',
    circle: 'Training',
    depth: 2,
    economic: { cod: 6.5, wsjf_score: 12.0, computeCost: 150.0 },
    p99_latency_ms: 1200,
    gpu_util_pct: 85,
    framework: 'PyTorch',
    tags: ['ML']
  },
  {
    pattern: 'tf-distribution-check',
    circle: 'Training',
    depth: 1,
    economic: { cod: 4.0, wsjf_score: 8.0, computeCost: 50.0 },
    p99_latency_ms: 800,
    gpu_util_pct: 90,
    framework: 'TensorFlow',
    tags: ['ML']
  },
  // HPC Patterns (Batch window, compute cost)
  {
    pattern: 'hpc-batch-window',
    circle: 'Compute',
    depth: 3,
    economic: { cod: 9.0, wsjf_score: 20.0, computeCost: 500.0 },
    queue_time_sec: 4500, // > 1 hour
    node_count: 16,
    gpu_util_pct: 45, // Low util -> high waste
    scheduler: 'SLURM',
    tags: ['HPC']
  },
  {
    pattern: 'cluster-fragmentation',
    circle: 'Compute',
    depth: 2,
    economic: { cod: 7.0, wsjf_score: 15.0, computeCost: 300.0 },
    queue_time_sec: 1800,
    node_count: 8,
    scheduler: 'Kubernetes',
    tags: ['HPC']
  },
  // Stats Patterns (Robustness)
  {
    pattern: 'stat-robustness-sweep',
    circle: 'Analysis',
    depth: 2,
    economic: { cod: 5.0, wsjf_score: 10.0, computeCost: 20.0 },
    tags: ['Stats']
  },
  // Mobile Patterns
  {
    pattern: 'mobile-interaction-lag',
    circle: 'Experience',
    depth: 1,
    economic: { cod: 8.0, wsjf_score: 18.0 },
    p99_latency_ms: 250, // High UI latency
    tags: ['Mobile']
  },
  {
    pattern: 'mobile-prototype-touch-target',
    circle: 'Experience',
    depth: 1,
    economic: { cod: 6.0, wsjf_score: 12.0 },
    tags: ['Mobile']
  },
  // Desktop Patterns
  {
    pattern: 'desktop-render-block',
    circle: 'Experience',
    depth: 2,
    economic: { cod: 7.5, wsjf_score: 16.0 },
    p99_latency_ms: 150,
    tags: ['Desktop']
  },
  {
    pattern: 'desktop-prototype-window-management',
    circle: 'Experience',
    depth: 1,
    economic: { cod: 5.5, wsjf_score: 9.0 },
    tags: ['Desktop']
  },
  // Web Patterns
  {
    pattern: 'web-vitals-cls',
    circle: 'Experience',
    depth: 1,
    economic: { cod: 8.5, wsjf_score: 19.0 },
    tags: ['Web']
  },
  {
    pattern: 'web-prototype-ssr-hydration-mismatch',
    circle: 'Experience',
    depth: 2,
    economic: { cod: 7.0, wsjf_score: 14.0 },
    tags: ['Web']
  }
];

console.log(`Generating ${patterns.length} metrics entries to ${metricsPath}...`);

patterns.forEach(p => {
  const entry = {
    ts: timestamp,
    ...p
  };
  fs.appendFileSync(metricsPath, JSON.stringify(entry) + '\n');
});

console.log('Done.');