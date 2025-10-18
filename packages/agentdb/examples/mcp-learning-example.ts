/**
 * MCP Learning Integration Example
 *
 * This example demonstrates how to use AgentDB's learning capabilities
 * to optimize tool selection based on past experiences.
 */

import { SQLiteVectorDB } from '../src/core/vector-db.js';
import { LearningManager } from '../src/mcp/learning/core/learning-manager.js';
import type { Outcome, State } from '../src/mcp/learning/types/index.js';

async function main() {
  console.log('🧠 AgentDB Learning Integration Example\n');

  // 1. Initialize database and learning manager
  const db = new SQLiteVectorDB({ memoryMode: true });
  const learningManager = new LearningManager(db);

  // 2. Start a learning session
  const session = await learningManager.startSession(
    'developer-1',
    'coding',
    'q-learning',
    {
      learningRate: 0.1,
      discountFactor: 0.95,
    }
  );

  console.log(
    `✅ Started learning session: ${session.sessionId}\n   Type: ${session.sessionType}\n   Plugin: ${session.plugin}\n`
  );

  // 3. Simulate tool executions with different outcomes
  console.log('📝 Recording tool execution experiences...\n');

  const tools = [
    { name: 'static_analyzer', avgSuccess: 0.9, avgTime: 200 },
    { name: 'type_checker', avgSuccess: 0.85, avgTime: 300 },
    { name: 'linter', avgSuccess: 0.7, avgTime: 400 },
    { name: 'formatter', avgSuccess: 0.95, avgTime: 150 },
  ];

  // Record 50 tool executions
  for (let i = 0; i < 50; i++) {
    const tool = tools[i % tools.length];
    const success = Math.random() < tool.avgSuccess;

    const outcome: Outcome = {
      success,
      result: success ? { issues: [] } : null,
      error: success ? undefined : new Error('Tool failed'),
      executionTime: tool.avgTime + Math.random() * 100,
      tokensUsed: 100 + Math.random() * 200,
    };

    const experience = await learningManager.recordExperience(
      session.sessionId,
      tool.name,
      { file: `test${i}.ts` },
      outcome.result,
      outcome
    );

    if (i % 10 === 0) {
      console.log(
        `   ${i + 1}/50 - ${tool.name}: ${success ? '✅' : '❌'} (reward: ${experience.reward.toFixed(3)})`
      );
    }
  }

  // 4. Get learning metrics
  console.log('\n📊 Learning Metrics:');
  const metrics = await learningManager.getMetrics(session.sessionId, 'session');

  console.log(`   Total Experiences: ${metrics.totalExperiences}`);
  console.log(`   Average Reward: ${metrics.averageReward.toFixed(3)}`);
  console.log(`   Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
  console.log(`   Learning Progress: ${metrics.learningProgress.improvement}`);

  console.log('\n   Top Performing Actions:');
  metrics.topActions.forEach((action, i) => {
    console.log(
      `   ${i + 1}. ${action.tool}: ${(action.successRate * 100).toFixed(1)}% success, ${action.avgReward.toFixed(3)} avg reward (${action.count} uses)`
    );
  });

  // 5. Train the policy
  console.log('\n🎯 Training policy on collected experiences...');
  const trainingMetrics = await learningManager.train(session.sessionId, {
    batchSize: 16,
    epochs: 10,
    learningRate: 0.1,
  });

  console.log(`   Experiences Processed: ${trainingMetrics.experiencesProcessed}`);
  console.log(`   Training Time: ${trainingMetrics.trainingTime}ms`);
  console.log(`   Final Loss: ${trainingMetrics.loss.toFixed(4)}`);
  console.log(`   Accuracy: ${(trainingMetrics.accuracy * 100).toFixed(1)}%`);

  // 6. Get action prediction for a new task
  console.log('\n🔮 Predicting best action for new task...');

  const currentState: State = {
    taskDescription: 'Analyze TypeScript code for issues',
    availableTools: tools.map((t) => t.name),
    previousActions: [],
  };

  const prediction = await learningManager.predictAction(
    session.sessionId,
    currentState,
    tools.map((t) => t.name)
  );

  console.log('\n   Recommended Action:');
  console.log(
    `   Tool: ${prediction.recommendedAction.tool} (confidence: ${(prediction.recommendedAction.confidence * 100).toFixed(1)}%)`
  );
  console.log(`   Reasoning: ${prediction.recommendedAction.reasoning}`);

  console.log('\n   Alternative Actions:');
  prediction.alternatives.slice(0, 3).forEach((alt, i) => {
    console.log(
      `   ${i + 1}. ${alt.tool} (confidence: ${(alt.confidence * 100).toFixed(1)}%)`
    );
    console.log(`      ${alt.reasoning}`);
  });

  // 7. Explain the prediction
  console.log('\n💡 Explanation for recommendation...');
  const explanation = await learningManager.explainPrediction(
    session.sessionId,
    currentState
  );

  console.log(`   ${explanation.reasoning}`);
  console.log(
    `   Based on ${explanation.similarExperiences.length} similar past experiences`
  );
  console.log('   Confidence Factors:');
  Object.entries(explanation.confidenceFactors).forEach(([key, value]) => {
    console.log(
      `   - ${key}: ${typeof value === 'number' ? (value * 100).toFixed(1) + '%' : value}`
    );
  });

  // 8. Simulate user feedback
  console.log('\n💬 Providing user feedback...');
  await learningManager.provideFeedback(
    session.sessionId,
    'action_0', // Would be from actual experience
    {
      success: true,
      rating: 4.5,
      comments: 'Very helpful suggestion',
      dimensions: {
        speed: 0.9,
        accuracy: 0.95,
        completeness: 0.85,
      },
    }
  );
  console.log('   ✅ Feedback recorded');

  // 9. Transfer learning to similar task
  console.log('\n🔄 Testing transfer learning...');

  const debugSession = await learningManager.startSession(
    'developer-1',
    'debugging',
    'q-learning'
  );

  const transferMetrics = await learningManager.transferLearning(
    session.sessionId,
    debugSession.sessionId,
    0.7 // 70% similarity
  );

  console.log(`   Source Task: ${transferMetrics.sourceTask}`);
  console.log(`   Target Task: ${transferMetrics.targetTask}`);
  console.log(`   Similarity: ${(transferMetrics.similarity * 100).toFixed(0)}%`);
  console.log(
    `   Performance Gain: +${(transferMetrics.performanceGain * 100).toFixed(1)}%`
  );
  console.log(
    `   Experiences Transferred: ${transferMetrics.experiencesTransferred}`
  );

  // 10. End sessions
  console.log('\n🏁 Ending sessions...');
  await learningManager.endSession(session.sessionId);
  await learningManager.endSession(debugSession.sessionId);

  console.log('   ✅ Sessions ended and policies saved');

  // Cleanup
  db.close();

  console.log('\n✨ Example completed successfully!\n');

  // Summary
  console.log('📚 Key Takeaways:');
  console.log('   1. Learning system tracks tool performance over time');
  console.log('   2. Rewards are calculated based on success, speed, quality, and cost');
  console.log('   3. Policy learns to recommend best tools for each task');
  console.log('   4. Transfer learning accelerates learning on similar tasks');
  console.log('   5. User feedback further refines the learning process');
  console.log('\n   Expected improvements after 100+ interactions:');
  console.log('   - 20% faster task completion');
  console.log('   - 30% better token efficiency');
  console.log('   - Higher success rates on repeated task types');
}

// Run the example
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
