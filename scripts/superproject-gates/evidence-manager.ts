import fs from 'node:fs';
import path from 'node:path';
import type { EvidenceConfig, Emitter, EvidenceEvent, GraduationStatus } from './types/schema';
import { EconomicCompoundingEmitter } from './emitters/economic-compounding';
import { MaturityCoverageEmitter } from './emitters/maturity-coverage';
import { ObservabilityGapsEmitter } from './emitters/observability-gaps';
import GraduationChecker from './graduation-checker';
import { WipBoundsCheckEmitter } from './emitters/wip-bounds-check';
import { getPatternLogger, PatternLogger } from './pattern-logger';

export class EvidenceManager {
  private emitters = new Map<string, Emitter>();
  private config: EvidenceConfig;
  private queue: EvidenceEvent[] = [];
  private batchSize: number;
  private graduationChecker?: GraduationChecker;
  private lastFlushedEvents: EvidenceEvent[] = [];
  private patternLogger?: PatternLogger;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
    this.batchSize = this.config.batchSize ?? 10;
    this.registerDefaultEmitters();
    if (this.config.graduation?.thresholds) {
      this.graduationChecker = new GraduationChecker(this.config.graduation.thresholds);
    }
    
    // Initialize pattern logger for JSONL file support
    this.initializePatternLogger();
  }

  private loadConfig(configPath?: string): EvidenceConfig {
    let configFilePath: string;
    if (configPath) {
      configFilePath = configPath;
    } else {
      configFilePath = path.join(process.cwd(), 'config', 'evidence_config.json');
    }
    try {
      const content = fs.readFileSync(configFilePath, 'utf-8');
      const parsed = JSON.parse(content) as EvidenceConfig;
      return { ...this.getDefaultConfig(), ...parsed };
    } catch (error) {
      console.warn(`Could not load evidence config from ${configFilePath}, using defaults: ${error}`);
      return this.getDefaultConfig();
    }
  }

  private async initializePatternLogger(): Promise<void> {
    try {
      this.patternLogger = getPatternLogger();
      await this.patternLogger.initialize();
      console.log('[EVIDENCE_MANAGER] Pattern logger initialized for JSONL support');
    } catch (error) {
      console.warn('[EVIDENCE_MANAGER] Failed to initialize pattern logger:', error);
    }
  }

  private getDefaultConfig(): EvidenceConfig {
    return {
      emitters: {
        economic_compounding: { enabled: true },
        maturity_coverage: { enabled: false },
        observability_gaps: { enabled: false },
      },
      batchSize: 10,
      asyncEmit: true,
    };
  }

  private registerDefaultEmitters() {
    this.registerEmitter(new EconomicCompoundingEmitter());
    this.registerEmitter(new MaturityCoverageEmitter());
    this.registerEmitter(new ObservabilityGapsEmitter());
    this.registerEmitter(new WipBoundsCheckEmitter());
  }

  registerEmitter(emitter: Emitter): void {
    this.emitters.set(emitter.name, emitter);
  }

  async emit(emitterName: string, input: any): Promise<void> {
    const emitter = this.emitters.get(emitterName);
    if (!emitter || !emitter.isEnabled(this.config)) {
      return;
    }
    const event = emitter.emit(input);
    this.queue.push(event);
    const shouldFlush = !(this.config.asyncEmit ?? true) || this.queue.length >= this.batchSize;
    if (shouldFlush) {
      await this.flush();
    }
  }

  public async checkGraduation(): Promise<GraduationStatus | null> {
    if (!this.graduationChecker || this.lastFlushedEvents.length === 0) {
      return null;
    }
    return this.graduationChecker.check(this.lastFlushedEvents);
  }

  public getLastFlushedEvents(): readonly EvidenceEvent[] {
    return [...this.lastFlushedEvents];
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const events = [...this.queue];
    this.queue = [];
    this.lastFlushedEvents = events;
    
    // Log to console for debugging
    console.log(JSON.stringify(events, null, 2));
    
    // Write to JSONL files using pattern logger
    if (this.patternLogger) {
      for (const event of events) {
        try {
          switch (event.emitter) {
            case 'economic_compounding':
              await this.patternLogger.logCompoundingBenefits(
                event.data.economic_compounding,
                {
                  source: 'evidence-manager',
                  event_id: event.timestamp
                },
                `Economic compounding evidence logged during evidence collection. Tracks cost-benefit analysis and WSJF metrics for governance decisions.`,
                {
                  circle: 'system-optimization',
                  purpose: 'economic_compounding',
                  domain: 'technical-operations',
                  triggering_event: 'evidence_manager_flush'
                }
              );
              break;
            case 'maturity_coverage':
              await this.patternLogger.logTierDepthCoverage(
                event.data.maturity_coverage,
                {
                  source: 'evidence-manager',
                  event_id: event.timestamp
                },
                `Maturity coverage evidence logged. Tracks tier depth and coverage percentage for graduation assessment.`,
                {
                  circle: 'system-optimization',
                  purpose: 'maturity_coverage',
                  domain: 'technical-operations',
                  triggering_event: 'evidence_manager_flush'
                }
              );
              break;
            case 'observability_gaps':
              await this.patternLogger.logLearningEvidence(
                event.data.observability_gaps,
                {
                  source: 'evidence-manager',
                  event_id: event.timestamp,
                  type: 'observability_gaps'
                },
                `Observability gaps evidence logged. Identifies missing metrics and incomplete traces for system health monitoring.`,
                {
                  circle: 'system-optimization',
                  purpose: 'observability_gaps',
                  domain: 'technical-operations',
                  triggering_event: 'evidence_manager_flush'
                }
              );
              break;
            default:
              // Log unknown types as learning evidence
              await this.patternLogger.logLearningEvidence(
                event.data,
                {
                  source: 'evidence-manager',
                  event_id: event.timestamp,
                  emitter: event.emitter
                },
                `Unknown evidence type ${event.emitter} logged during evidence collection.`,
                {
                  circle: 'system-optimization',
                  purpose: 'unknown_evidence',
                  domain: 'technical-operations',
                  triggering_event: 'evidence_manager_flush'
                }
              );
          }
        } catch (error) {
          console.error('[EVIDENCE_MANAGER] Error writing to JSONL:', error);
        }
      }
    }
    
    if (process.env.AF_FULL_CYCLE_AUTOCOMMIT === '1' && this.graduationChecker) {
      const status = await this.checkGraduation();
      if (status) {
        console.log('AUTOCOMMIT GRADUATION STATUS:');
        console.log(JSON.stringify(status, null, 2));
      }
    }
  }

  migrateLegacyFlag(flag: string): string {
    const legacyMap: Record<string, string> = {
      'revenue-safe': 'economic_compounding',
      'tier-depth': 'maturity_coverage',
      'gaps': 'observability_gaps',
    };
    return legacyMap[flag] ?? flag;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const manager = new EvidenceManager();
  const checkGrad = args.includes('--check-graduation');
  if (checkGrad) {
    manager.emit('economic_compounding', {
      energy_cost_usd: 0.01,
      value_per_hour: 100,
      wsjf_per_hour: 200
    }).then(() => {
      return manager.flush();
    }).then(() => {
      return manager.checkGraduation();
    }).then(status => {
      console.log('AUTOCOMMIT GRADUATION STATUS:');
      console.log(JSON.stringify(status ?? {ready: false, metrics: {}, reasons: ['Demo run']}, null, 2));
      process.exit(0);
    }).catch(error => {
      console.error('Error in graduation check:', error);
      process.exit(1);
    });
  }
  // Future CLI extensions for other emits
}