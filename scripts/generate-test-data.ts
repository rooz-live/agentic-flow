
import { AgenticSynth } from '@ruvector/agentic-synth';
import * as fs from 'fs/promises';
import * as path from 'path';

async function generateTestData() {
  console.log('🚀 Starting Test Data Generation with Agentic-Synth...');

  const synth = new AgenticSynth({
    provider: 'gemini',
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash-exp',
    cacheStrategy: 'memory',
    cacheTTL: 3600
  });

  const outputDir = path.join(process.cwd(), 'test-data');
  await fs.mkdir(outputDir, { recursive: true });

  // 1. Generate Users
  console.log('Generating users...');
  const users = await synth.generateStructured({
    count: 10,
    schema: {
      id: { type: 'string', required: true },
      username: { type: 'string', required: true },
      email: { type: 'string', required: true },
      role: { type: 'string', enum: ['admin', 'user', 'editor'], required: true }
    }
  });
  await fs.writeFile(path.join(outputDir, 'users.json'), JSON.stringify(users.data, null, 2));

  // 2. Generate Posts
  console.log('Generating posts...');
  const posts = await synth.generateStructured({
    count: 20,
    schema: {
      id: { type: 'string', required: true },
      title: { type: 'string', required: true },
      content: { type: 'string', required: true },
      status: { type: 'string', enum: ['published', 'draft'], required: true }
    }
  });
  await fs.writeFile(path.join(outputDir, 'posts.json'), JSON.stringify(posts.data, null, 2));

  console.log(`✅ Test data generated in ${outputDir}`);
}

generateTestData().catch(console.error);
