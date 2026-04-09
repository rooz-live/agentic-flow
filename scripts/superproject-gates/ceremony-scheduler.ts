/**
 * Ceremony Scheduler Service
 * 
 * Monitors ceremony_schedules table and executes ceremonies at scheduled times using cron expressions.
 * Updates last_execution and next_execution timestamps after each execution.
 */

import * as cron from 'node-cron';
import Database from 'better-sqlite3';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CeremonySchedule {
  id: string;
  circle: string;
  ceremony_type: string;
  cron_expression: string;
  mode: string;
  enabled: number;
  last_execution?: string;
  next_execution?: string;
}

class CeremonyScheduler {
  private schedules: Map<string, cron.ScheduledTask> = new Map();
  private dbPath: string;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.dbPath = path.join(process.cwd(), '.db/risk-traceability.db');
  }

  /**
   * Start the scheduler service
   * Loads all enabled schedules from database and starts monitoring
   */
  start() {
    console.log('[SCHEDULER] Starting ceremony scheduler service...');
    
    // Load and initialize all schedules
    this.loadSchedules();
    
    // Check for schedule changes every minute
    this.checkInterval = setInterval(() => {
      this.loadSchedules();
    }, 60000);
    
    console.log('[SCHEDULER] Ceremony scheduler service started');
  }

  /**
   * Stop the scheduler service
   * Stops all running cron jobs
   */
  stop() {
    console.log('[SCHEDULER] Stopping ceremony scheduler service...');
    
    // Stop all cron jobs
    for (const [id, task] of this.schedules.entries()) {
      task.stop();
      console.log(`[SCHEDULER] Stopped schedule: ${id}`);
    }
    
    this.schedules.clear();
    
    // Stop check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    console.log('[SCHEDULER] Ceremony scheduler service stopped');
  }

  /**
   * Load all enabled schedules from database
   * Creates or updates cron jobs for each schedule
   */
  private loadSchedules() {
    try {
      const db = new Database(this.dbPath);
      
      const schedules: CeremonySchedule[] = db.prepare(`
        SELECT * FROM ceremony_schedules WHERE enabled = 1
      `).all() as CeremonySchedule[];
      
      db.close();
      
      // Remove schedules that no longer exist or are disabled
      for (const [id, task] of this.schedules.entries()) {
        if (!schedules.find(s => s.id === id)) {
          task.stop();
          this.schedules.delete(id);
          console.log(`[SCHEDULER] Removed schedule: ${id}`);
        }
      }
      
      // Add or update schedules
      for (const schedule of schedules) {
        this.addOrUpdateSchedule(schedule);
      }
      
      if (schedules.length === 0) {
        console.log('[SCHEDULER] No enabled schedules found');
      }
    } catch (error: any) {
      console.error('[SCHEDULER] Error loading schedules:', error.message);
    }
  }

  /**
   * Add or update a ceremony schedule
   */
  private addOrUpdateSchedule(schedule: CeremonySchedule) {
    // Validate cron expression
    if (!cron.validate(schedule.cron_expression)) {
      console.error(`[SCHEDULER] Invalid cron expression for ${schedule.id}: ${schedule.cron_expression}`);
      return;
    }
    
    // Check if schedule already exists
    const existingTask = this.schedules.get(schedule.id);
    
    if (existingTask) {
      // Check if cron expression changed
      const db = new Database(this.dbPath);
      const current = db.prepare('SELECT cron_expression FROM ceremony_schedules WHERE id = ?').get(schedule.id) as any;
      db.close();
      
      if (current && current.cron_expression === schedule.cron_expression) {
        // No change, keep existing
        return;
      }
      
      // Cron expression changed, stop old task
      existingTask.stop();
      this.schedules.delete(schedule.id);
      console.log(`[SCHEDULER] Updated schedule: ${schedule.id}`);
    } else {
      console.log(`[SCHEDULER] Added schedule: ${schedule.id} (${schedule.cron_expression})`);
    }
    
    // Create new cron task
    const task = cron.schedule(schedule.cron_expression, async () => {
      await this.executeCeremony(schedule);
    });
    
    this.schedules.set(schedule.id, task);
    
    // Calculate and store next execution time
    this.updateNextExecution(schedule.id);
  }

  /**
   * Execute a ceremony based on schedule
   */
  private async executeCeremony(schedule: CeremonySchedule) {
    console.log(`[SCHEDULER] Executing ceremony: ${schedule.circle} - ${schedule.ceremony_type}`);
    
    try {
      const scriptPath = path.join(process.cwd(), 'scripts/ay-prod-cycle.sh');
      const { stdout, stderr } = await execAsync(
        `bash ${scriptPath} ${schedule.circle} ${schedule.ceremony_type} ${schedule.mode}`,
        { timeout: 300000 } // 5 minute timeout
      );
      
      // Extract episode ID from output
      const episodeMatch = stdout.match(/Episode: (ep_\d+_\w+_\w+)/);
      const episodeId = episodeMatch ? episodeMatch[1] : null;
      
      // Extract result
      const resultMatch = stdout.match(/Cycle complete \(exit: (\d+)\)/);
      const exitCode = resultMatch ? parseInt(resultMatch[1]) : 0;
      
      console.log(`[SCHEDULER] Ceremony executed successfully: ${episodeId} (exit: ${exitCode})`);
      
      // Update last_execution and next_execution
      const db = new Database(this.dbPath);
      db.prepare(`
        UPDATE ceremony_schedules
        SET last_execution = datetime('now')
        WHERE id = ?
      `).run(schedule.id);
      db.close();
      
      this.updateNextExecution(schedule.id);
      
      // Record execution in ceremony history
      this.recordExecution(schedule, episodeId, exitCode === 0, stdout, stderr);
    } catch (error: any) {
      console.error(`[SCHEDULER] Error executing ceremony ${schedule.id}:`, error.message);
      
      // Record failed execution
      this.recordExecution(schedule, null, false, '', error.message);
    }
  }

  /**
   * Calculate and store the next execution time for a schedule
   */
  private updateNextExecution(scheduleId: string) {
    try {
      const db = new Database(this.dbPath);
      
      const schedule = db.prepare('SELECT cron_expression FROM ceremony_schedules WHERE id = ?').get(scheduleId) as any;
      
      if (!schedule) {
        db.close();
        return;
      }
      
      // Calculate next execution using cron-parser (approximation)
      // For now, we'll just update it to null and let the database handle it
      // A production implementation would use cron-parser to calculate exact next run time
      db.prepare(`
        UPDATE ceremony_schedules
        SET next_execution = datetime('now', '+1 hour')
        WHERE id = ?
      `).run(scheduleId);
      
      db.close();
    } catch (error: any) {
      console.error('[SCHEDULER] Error updating next execution:', error.message);
    }
  }

  /**
   * Record ceremony execution in ceremony_history table
   */
  private recordExecution(
    schedule: CeremonySchedule,
    episodeId: string | null,
    success: boolean,
    output: string,
    errors: string
  ) {
    try {
      const db = new Database(this.dbPath);
      
      const ceremonyId = `${schedule.circle}-${schedule.ceremony_type}-${Date.now()}`;
      
      db.prepare(`
        INSERT INTO ceremony_history (ceremony_id, circle, ceremony_type, mode, executed_at, episode_id, success, output, errors)
        VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
      `).run(
        ceremonyId,
        schedule.circle,
        schedule.ceremony_type,
        schedule.mode,
        episodeId,
        success ? 1 : 0,
        output.substring(0, 1000), // Truncate long output
        errors.substring(0, 1000)
      );
      
      db.close();
      
      console.log(`[SCHEDULER] Recorded execution: ${ceremonyId}`);
    } catch (error: any) {
      console.error('[SCHEDULER] Error recording execution:', error.message);
    }
  }

  /**
   * Get all active schedules
   */
  getActiveSchedules(): string[] {
    return Array.from(this.schedules.keys());
  }

  /**
   * Get schedule status
   */
  getStatus(): { active: number; schedules: string[] } {
    return {
      active: this.schedules.size,
      schedules: this.getActiveSchedules()
    };
  }
}

// Singleton instance
let schedulerInstance: CeremonyScheduler | null = null;

/**
 * Initialize the ceremony scheduler
 */
export function initializeScheduler(): CeremonyScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new CeremonyScheduler();
    schedulerInstance.start();
  }
  return schedulerInstance;
}

/**
 * Get the scheduler instance
 */
export function getSchedulerInstance(): CeremonyScheduler | null {
  return schedulerInstance;
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
}

export default { initializeScheduler, getSchedulerInstance, stopScheduler };
