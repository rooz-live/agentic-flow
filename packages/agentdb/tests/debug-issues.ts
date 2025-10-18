import { SQLiteVectorDB } from '../src/core/vector-db.js';
import { LearningManager } from '../src/mcp/learning/core/learning-manager.js';

async function main() {
  const db = new SQLiteVectorDB({ memoryMode: true });
  const mgr = new LearningManager(db);

  // Test 1: Metrics issue
  console.log('Test 1: Metrics');
  const session = await mgr.startSession('user', 'coding');
  console.log('✓ Session created:', session.sessionId);

  await mgr.recordExperience(
    session.sessionId,
    'tool1',
    {},
    {},
    { success: true, executionTime: 100, tokensUsed: 50 }
  );
  console.log('✓ Experience recorded');

  const metrics = await mgr.getMetrics(session.sessionId);
  console.log('Metrics result:', JSON.stringify(metrics, null, 2));

  // Check structure
  console.log('Has totalExperiences?', metrics.totalExperiences > 0);
  console.log('Has topActions array?', Array.isArray(metrics.topActions));

  // Test 2: Session ending
  console.log('\nTest 2: Session ending');
  const session2 = await mgr.startSession('user2', 'debugging');
  console.log('✓ Session 2 created:', session2.sessionId);

  const info = mgr.getSessionInfo(session2.sessionId);
  console.log('Session info before end:', info?.status);

  const ended = await mgr.endSession(session2.sessionId);
  console.log('✓ Session ended:', ended.sessionId, ended.status);

  const infoAfter = mgr.getSessionInfo(session2.sessionId);
  console.log('Session info after end:', infoAfter); // Should be undefined

  // Test 3: Try to end again
  console.log('\nTest 3: Double end');
  try {
    await mgr.endSession(session2.sessionId);
    console.log('❌ Should have thrown error');
  } catch (e: any) {
    console.log('✓ Expected error:', e.message);
  }

  db.close();
}

main().catch(console.error);
