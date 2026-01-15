/**
 * Ceremony Scheduler Service
 * 
 * Manages scheduled ceremony execution with cron expressions.
 * Stores schedules in JSON and executes via ay-prod-cycle.sh
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SCHEDULES_DIR = path.resolve(__dirname, '../../.schedules');
const SCHEDULES_FILE = path.join(SCHEDULES_DIR, 'ceremonies.json');
const ROOT_DIR = path.resolve(__dirname, '../..');

export interface CeremonySchedule {
  id?: number;
  circle: string;
  ceremony: string;
  cron_expression: string;
  enabled: boolean;
  last_execution?: number;
  next_execution?: number;
  execution_count?: number;
  created_at?: number;
  metadata?: any;
}

// Active cron tasks
const activeTasks = new Map<number, cron.ScheduledTask>();
let schedules: CeremonySchedule[] = [];
let nextId = 1;

/**
 * Initialize scheduler
 */
export function initializeScheduler(): void {
  // Create directory if it doesn't exist
  if (!fs.existsSync(SCHEDULES_DIR)) {
    fs.mkdirSync(SCHEDULES_DIR, { recursive: true });
  }

  // Load existing schedules
  loadSchedules();

  // Start all enabled schedules
  schedules.filter(s => s.enabled).forEach(schedule => {
    if (schedule.id) {
      startSchedule(schedule.id);
    }
  });

  console.log(`✅ Ceremony scheduler initialized with ${schedules.filter(s => s.enabled).length} active schedules`);
}

/**
 * Load schedules from JSON
 */
function loadSchedules() {
  try {
    if (fs.existsSync(SCHEDULES_FILE)) {
      const data = JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf-8'));
      schedules = data.schedules || [];
      nextId = data.nextId || 1;
    }
  } catch (error) {
    console.error('Error loading ceremony schedules:', error);
  }
}

/**
 * Save schedules to file
 */
function saveSchedules() {
  fs.writeFileSync(SCHEDULES_FILE, JSON.stringify({ schedules, nextId }, null, 2));
}

/**
 * Create a new ceremony schedule
 */
export function createSchedule(schedule: CeremonySchedule): number {
  // Validate cron expression
  if (!cron.validate(schedule.cron_expression)) {
    throw new Error(`Invalid cron expression: ${schedule.cron_expression}`);
  }

  const id = nextId++;
  const newSchedule: CeremonySchedule = {
    id,
    circle: schedule.circle,
    ceremony: schedule.ceremony,
    cron_expression: schedule.cron_expression,
    enabled: schedule.enabled !== undefined ? schedule.enabled : true,
    execution_count: 0,
    created_at: Math.floor(Date.now() / 1000),
    metadata: schedule.metadata || null,
  };

  schedules.push(newSchedule);
  saveSchedules();

  // Start if enabled
  if (newSchedule.enabled) {
    startSchedule(id);
  }

  return id;
}

/**
 * Get schedule by ID
 */
export function getScheduleById(id: number): CeremonySchedule | null {
  return schedules.find(s => s.id === id) || null;
}

/**
 * Get all schedules (optionally filtered by circle)
 */
export function getAllSchedules(circle?: string): CeremonySchedule[] {
  if (circle) {
    return schedules.filter(s => s.circle === circle);
  }
  return [...schedules];
}

/**
 * Update schedule
 */
export function updateSchedule(id: number, updates: Partial<CeremonySchedule>): boolean {
  const schedule = schedules.find(s => s.id === id);
  if (!schedule) return false;

  // Validate cron if changed
  if (updates.cron_expression && !cron.validate(updates.cron_expression)) {
    throw new Error(`Invalid cron expression: ${updates.cron_expression}`);
  }

  // Stop existing task
  stopSchedule(id);

  // Apply updates
  Object.assign(schedule, updates);
  saveSchedules();

  // Restart if enabled
  if (schedule.enabled) {
    startSchedule(id);
  }

  return true;
}

/**
 * Delete schedule
 */
export function deleteSchedule(id: number): boolean {
  stopSchedule(id);
  
  const index = schedules.findIndex(s => s.id === id);
  if (index === -1) return false;

  schedules.splice(index, 1);
  saveSchedules();

  return true;
}

/**
 * Start a scheduled ceremony
 */
function startSchedule(id: number): boolean {
  const schedule = getScheduleById(id);
  if (!schedule || !schedule.enabled) return false;

  // Stop existing task if running
  stopSchedule(id);

  try {
    const task = cron.schedule(schedule.cron_expression, async () => {
      console.log(`⏰ Executing scheduled ceremony: ${schedule.circle}.${schedule.ceremony}`);
      
      try {
        await executeCeremony(schedule.circle, schedule.ceremony);
        
        // Update execution stats
        schedule.execution_count = (schedule.execution_count || 0) + 1;
        schedule.last_execution = Math.floor(Date.now() / 1000);
        saveSchedules();
        
        console.log(`✅ Ceremony ${schedule.circle}.${schedule.ceremony} completed`);
      } catch (error) {
        console.error(`❌ Ceremony ${schedule.circle}.${schedule.ceremony} failed:`, error);
      }
    });

    activeTasks.set(id, task);
    console.log(`🚀 Started schedule ${id}: ${schedule.circle}.${schedule.ceremony} (${schedule.cron_expression})`);
    return true;
  } catch (error) {
    console.error(`Failed to start schedule ${id}:`, error);
    return false;
  }
}

/**
 * Stop a scheduled ceremony
 */
function stopSchedule(id: number): boolean {
  const task = activeTasks.get(id);
  if (task) {
    task.stop();
    activeTasks.delete(id);
    console.log(`🛑 Stopped schedule ${id}`);
    return true;
  }
  return false;
}

/**
 * Execute a ceremony via shell script
 */
async function executeCeremony(circle: string, ceremony: string, adr?: string): Promise<{ success: boolean; output: string; error?: string }> {
  const adrFlag = adr ? `--adr ${adr}` : '';
  const command = `bash ${ROOT_DIR}/scripts/ay-prod-cycle.sh ${circle} ${ceremony} ${adrFlag}`;

  try {
    const { stdout, stderr } = await execAsync(command);
    return {
      success: !stderr,
      output: stdout,
      error: stderr || undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      output: '',
      error: error.message,
    };
  }
}

/**
 * Manually execute a ceremony (not scheduled)
 */
export async function executeManualCeremony(circle: string, ceremony: string, adr?: string): Promise<{ success: boolean; output: string; error?: string }> {
  console.log(`🔧 Manual execution: ${circle}.${ceremony}`);
  return executeCeremony(circle, ceremony, adr);
}

/**
 * Get next execution time for a schedule
 */
export function getNextExecution(cronExpression: string): Date | null {
  try {
    // This is a simplified version - you'd need a proper cron parser for accurate next time
    // For now, return null as placeholder
    return null;
  } catch {
    return null;
  }
}

/**
 * Stop all schedules
 */
export function stopAllSchedules(): void {
  activeTasks.forEach((task, id) => {
    task.stop();
    console.log(`🛑 Stopped schedule ${id}`);
  });
  activeTasks.clear();
}

/**
 * Restart all enabled schedules
 */
export function restartAllSchedules(): void {
  stopAllSchedules();
  schedules.filter(s => s.enabled).forEach(schedule => {
    if (schedule.id) {
      startSchedule(schedule.id);
    }
  });
  console.log(`🔄 Restarted ${activeTasks.size} schedules`);
}

// Singleton wrapper for compatibility
export const scheduler = {
  executeManualCeremony,
  createSchedule,
  getScheduleById,
  getAllSchedules,
  updateSchedule,
  deleteSchedule,
  stopAllSchedules,
  restartAllSchedules
};

