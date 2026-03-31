import * as scheduler from './src/api/ceremony-scheduler';

console.log('Testing scheduler initialization...');
scheduler.initializeScheduler();

console.log('Creating test schedule...');
const id = scheduler.createSchedule({
  circle: 'orchestrator',
  ceremony: 'standup',
  cron_expression: '0 9 * * *',
  enabled: false, // Don't actually run it
});

console.log(`Created schedule ${id}`);

const schedules = scheduler.getAllSchedules();
console.log(`Total schedules: ${schedules.length}`);

console.log('✅ Scheduler works!');
