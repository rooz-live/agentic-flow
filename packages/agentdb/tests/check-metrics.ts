import { SQLiteVectorDB } from '../src/core/vector-db.js';
import { LearningManager } from '../src/mcp/learning/core/learning-manager.js';

async function main() {
  const db = new SQLiteVectorDB({ memoryMode: true });
  const mgr = new LearningManager(db);

  const session = await mgr.startSession('user', 'coding');
  console.log('Session:', session.sessionId);

  // Record experience
  const exp = await mgr.recordExperience(
    session.sessionId,
    'tool1',
    {},
    {},
    { success: true, executionTime: 100, tokensUsed: 50 }
  );
  console.log('Experience recorded with reward:', exp.reward);
  console.log('Experience sessionId:', exp.metadata.sessionId);

  // Check what's in the DB
  const allVectors = await db.search(Array(768).fill(0), 100);
  console.log('Total vectors in DB:', allVectors.length);

  const experiences = allVectors.filter((v: any) => v.metadata.type === 'learning_experience');
  console.log('Experience vectors:', experiences.length);

  if (experiences.length > 0) {
    console.log('Experience metadata:', JSON.stringify(experiences[0].metadata, null, 2));
  }

  // Now get metrics
  const metrics = await mgr.getMetrics(session.sessionId);
  console.log('\nMetrics:');
  console.log('  totalExperiences:', metrics.totalExperiences);
  console.log('  averageReward:', metrics.averageReward);

  db.close();
}

main().catch(console.error);
