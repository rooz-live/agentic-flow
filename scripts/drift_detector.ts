import { randomUUID } from 'crypto';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RISK_DB_PATH = process.env.RISK_DB_PATH || path.join(__dirname, '../risks.db');
const DRIFT_THRESHOLD = 0.15; // 15% deviation triggers drift

function queryAll(db: sqlite3.Database, sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function runQuery(db: sqlite3.Database, sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(sql, params, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function detectDrift() {
  console.log('📉 Running Cognitive Drift Detection...');

  const db = new sqlite3.Database(RISK_DB_PATH);

  try {
    // 1. Get Baselines
    const baselines = await queryAll(db, 'SELECT * FROM baselines');
    const baselineMap = new Map(baselines.map(b => [b.metric_name, b.metric_value]));

    // 2. Simulate Current Metrics (In prod, fetch from monitoring)
    // Simulating a drift in SNN latency
    const currentMetrics = {
      'snn_inference_time_ms': (baselineMap.get('snn_inference_time_ms') || 5) * 1.25, // 25% slower
      'system_memory_rss_mb': (baselineMap.get('system_memory_rss_mb') || 100) * 1.05 // 5% increase
    };

    console.log('📊 Current Metrics (Simulated):', currentMetrics);

    // 3. Check for Drift
    for (const [metric, currentValue] of Object.entries(currentMetrics)) {
      const baseline = baselineMap.get(metric);
      if (baseline) {
        const deviation = Math.abs((currentValue - baseline) / baseline);

        if (deviation > DRIFT_THRESHOLD) {
          console.warn(`⚠️  Drift Detected for ${metric}: ${(deviation * 100).toFixed(1)}% deviation (Threshold: ${DRIFT_THRESHOLD * 100}%)`);

          // Log Drift Event
          const eventId = randomUUID();
          const metadata = JSON.stringify({
             metric: metric,
             baseline: baseline,
             current: currentValue,
             deviation_pct: deviation * 100
          });

          await runQuery(db, `
            INSERT INTO drift_events (
                id, event_type, drift_magnitude, confidence_score,
                detected_at, source_component, metadata
            )
            VALUES (?, 'performance', ?, 1.0, CURRENT_TIMESTAMP, ?, ?)
          `, [eventId, deviation, metric, metadata]);

          console.log(`📝 Drift event logged to DB (ID: ${eventId}).`);
        } else {
          console.log(`✅ ${metric} within normal range (${(deviation * 100).toFixed(1)}% dev)`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Drift Detection Failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

detectDrift().catch(console.error);
