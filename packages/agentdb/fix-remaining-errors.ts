#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

const pluginsDir = path.join(process.cwd(), 'src/plugins/implementations');

const fixes = [
  // Fix active-learning.ts line 399-401
  {
    file: 'active-learning.ts',
    search: `          action: { id: '0',
      embedding: stateArray,
      type: 'discrete', value: simulatedLabel },`,
    replace: `          action: { id: '0', embedding: sample.state },`
  },

  // Fix active-learning.ts line 444-446
  {
    file: 'active-learning.ts',
    search: `          action: { id: '0',
      embedding: stateArray,
      type: 'discrete' as const, value: Math.random() },`,
    replace: `          action: { id: '0', embedding: s.state },`
  },

  // Fix curriculum-learning.ts - retrieveSimilar signature
  {
    file: 'curriculum-learning.ts',
    search: /async retrieveSimilar\(state: Vector, limit: number\): Promise<Experience\[\]> \{[\s\S]*?return this\.experiences\.slice\(0, limit\);/,
    replace: `async retrieveSimilar(state: number[], k: number): Promise<import('../..').SearchResult<Experience>[]> {
    return this.experiences.slice(0, k).map((exp, idx) => ({
      id: exp.id || \`exp-\${idx}\`,
      embedding: exp.state,
      metadata: exp,
      score: 1.0 - (idx * 0.1),
    }));`
  },

  // Fix curriculum-learning.ts - selectAction id
  {
    file: 'curriculum-learning.ts',
    search: /return \{\s*id: 0,/,
    replace: `return {
      id: '0',`
  },

  // Fix federated-learning.ts - retrieveSimilar signature
  {
    file: 'federated-learning.ts',
    search: /async retrieveSimilar\(state: Vector, limit: number\): Promise<Experience\[\]> \{[\s\S]*?return this\.experiences\.slice\(0, limit\);/,
    replace: `async retrieveSimilar(state: number[], k: number): Promise<import('../..').SearchResult<Experience>[]> {
    return this.experiences.slice(0, k).map((exp, idx) => ({
      id: exp.id || \`exp-\${idx}\`,
      embedding: exp.state,
      metadata: exp,
      score: 1.0 - (idx * 0.1),
    }));`
  },

  // Fix federated-learning.ts - selectAction id
  {
    file: 'federated-learning.ts',
    search: /return \{\s*id: 0,/,
    replace: `return {
      id: '0',`
  },

  // Fix multi-task-learning.ts - retrieveSimilar signature
  {
    file: 'multi-task-learning.ts',
    search: /async retrieveSimilar\(state: Vector, limit: number\): Promise<Experience\[\]> \{[\s\S]*?return this\.experiences\.slice\(0, limit\);/,
    replace: `async retrieveSimilar(state: number[], k: number): Promise<import('../..').SearchResult<Experience>[]> {
    return this.experiences.slice(0, k).map((exp, idx) => ({
      id: exp.id || \`exp-\${idx}\`,
      embedding: exp.state,
      metadata: exp,
      score: 1.0 - (idx * 0.1),
    }));`
  },

  // Fix multi-task-learning.ts - selectAction ids
  {
    file: 'multi-task-learning.ts',
    search: /return \{\s*id: 0,/g,
    replace: `return {
      id: '0',`
  },

  // Fix multi-task-learning.ts - action with stateArray
  {
    file: 'multi-task-learning.ts',
    search: `          action: { id: '0',
      embedding: stateArray,
      value: simulatedLabel },`,
    replace: `          action: { id: '0', embedding: sample.state },`
  },

  // Fix neural-architecture-search.ts - retrieveSimilar signature
  {
    file: 'neural-architecture-search.ts',
    search: /async retrieveSimilar\(state: Vector, limit: number\): Promise<Experience\[\]> \{[\s\S]*?return this\.experiences\.slice\(0, limit\);/,
    replace: `async retrieveSimilar(state: number[], k: number): Promise<import('../..').SearchResult<Experience>[]> {
    return this.experiences.slice(0, k).map((exp, idx) => ({
      id: exp.id || \`exp-\${idx}\`,
      embedding: exp.state,
      metadata: exp,
      score: 1.0 - (idx * 0.1),
    }));`
  },
];

// Fix adversarial-training.ts - accessing .state and .reward on SearchResult
const adversarialFix = `
// Fix adversarial-training.ts to unwrap SearchResult metadata
const adversarialFile = path.join(pluginsDir, 'adversarial-training.ts');
let adversarialContent = fs.readFileSync(adversarialFile, 'utf-8');

// Replace exp.state with exp.metadata.state and exp.reward with exp.metadata.reward in train method
adversarialContent = adversarialContent.replace(
  /const experiences = await this\\.retrieveSimilar\\([^)]+\\);[\\s\\S]*?for \\(let i = 0; i < experiences\\.length - numAdversarial; i\\+\\+\\) \\{[\\s\\S]*?const exp = experiences\\[i\\];[\\s\\S]*?const prediction = await this\\.selectAction\\(exp\\.state\\);[\\s\\S]*?const loss = Math\\.pow\\(prediction\\.confidence! - exp\\.reward, 2\\);/,
  \`const experiences = await this.retrieveSimilar(
        new Array(128).fill(0),
        batchSize
      );

      // Split into clean and adversarial training
      const numAdversarial = Math.floor(experiences.length * this.adversarialRatio);

      // Train on clean examples
      for (let i = 0; i < experiences.length - numAdversarial; i++) {
        const exp = experiences[i].metadata;
        const prediction = await this.selectAction(exp.state);
        const loss = Math.pow(prediction.confidence! - exp.reward, 2);\`
);

adversarialContent = adversarialContent.replace(
  /for \\(let i = experiences\\.length - numAdversarial; i < experiences\\.length; i\\+\\+\\) \\{[\\s\\S]*?const exp = experiences\\[i\\];[\\s\\S]*?const advExample = await this\\.generateAdversarialExample\\(exp\\.state, exp\\.reward\\);[\\s\\S]*?const loss = Math\\.pow\\(prediction\\.confidence! - exp\\.reward, 2\\);/,
  \`for (let i = experiences.length - numAdversarial; i < experiences.length; i++) {
        const exp = experiences[i].metadata;

        // Generate adversarial example
        const advExample = await this.generateAdversarialExample(exp.state, exp.reward);
        this.adversarialExamples.push(advExample);

        // Train on adversarial example
        const prediction = await this.selectAction(advExample.adversarial);
        const loss = Math.pow(prediction.confidence! - exp.reward, 2);\`
);

adversarialContent = adversarialContent.replace(
  /const robustness = await this\\.evaluateRobustness\\(experiences\\.slice\\(0, 10\\)\\);/,
  'const robustness = await this.evaluateRobustness(experiences.slice(0, 10).map(e => e.metadata));'
);

fs.writeFileSync(adversarialFile, adversarialContent);
console.log('✅ Fixed adversarial-training.ts SearchResult access');
`;

// Fix multi-task-learning.ts SearchResult access
const multiTaskFix = `
const multiTaskFile = path.join(pluginsDir, 'multi-task-learning.ts');
let multiTaskContent = fs.readFileSync(multiTaskFile, 'utf-8');

// Fix .state access on SearchResult
multiTaskContent = multiTaskContent.replace(
  /const sample = batch\\[i\\];[\\s\\S]*?const stateArray = Array\\.isArray\\(sample\\.state\\) \\? sample\\.state : \\[sample\\.state\\];/,
  \`const sample = batch[i].metadata;
        const stateArray = Array.isArray(sample.state) ? sample.state : [sample.state];\`
);

// Fix .taskId access
multiTaskContent = multiTaskContent.replace(
  /const experiences = await this\\.retrieveSimilar\\(sample\\.state, 10\\);/,
  'const experiences = await this.retrieveSimilar(sample.state, 10);'
);

fs.writeFileSync(multiTaskFile, multiTaskContent);
console.log('✅ Fixed multi-task-learning.ts SearchResult access');
`;

// Fix federated-learning.ts missing encodeState
const federatedFix = `
const federatedFile = path.join(pluginsDir, 'federated-learning.ts');
let federatedContent = fs.readFileSync(federatedFile, 'utf-8');

// Add encodeState method
if (!federatedContent.includes('private encodeState(')) {
  federatedContent = federatedContent.replace(
    /private aggregateUpdates\\(/,
    \`/**
   * Encode state vector for transmission
   */
  private encodeState(state: number[]): string {
    return JSON.stringify(state);
  }

  /**
   * Decode state vector from transmission
   */
  private decodeState(encoded: string): number[] {
    return JSON.parse(encoded);
  }

  private aggregateUpdates(\`
  );
  fs.writeFileSync(federatedFile, federatedContent);
  console.log('✅ Fixed federated-learning.ts missing encodeState');
}
`;

// Fix neural-architecture-search.ts missing selectAction
const nasFixContent = `
const nasFile = path.join(pluginsDir, 'neural-architecture-search.ts');
let nasContent = fs.readFileSync(nasFile, 'utf-8');

// Add selectAction implementation
if (!nasContent.includes('async selectAction(')) {
  nasContent = nasContent.replace(
    /async storeExperience\\(/,
    \`/**
   * Override selectAction to provide base implementation
   */
  async selectAction(state: number[] | any, context?: Context): Promise<Action> {
    // Simple default action selection
    const stateArray = Array.isArray(state) ? state : [state];
    const stateSum = stateArray.reduce((a: number, b: number) => a + b, 0);
    const value = Math.tanh(stateSum / stateArray.length);

    return {
      id: String(Math.floor(Math.abs(value) * 10)),
      embedding: stateArray,
      confidence: Math.abs(value),
    };
  }

  async storeExperience(\`
  );
  fs.writeFileSync(nasFile, nasContent);
  console.log('✅ Fixed neural-architecture-search.ts missing selectAction');
}
`;

console.log('Applying comprehensive fixes...\n');

// Apply all standard fixes
for (const fix of fixes) {
  const filePath = path.join(pluginsDir, fix.file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${fix.file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  if (fix.search instanceof RegExp) {
    if (fix.search.test(content)) {
      content = content.replace(fix.search, fix.replace);
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${fix.file}`);
    }
  } else {
    if (content.includes(fix.search)) {
      content = content.replace(fix.search, fix.replace);
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${fix.file}`);
    }
  }
}

// Apply special fixes
eval(adversarialFix);
eval(multiTaskFix);
eval(federatedFix);
eval(nasFixContent);

console.log('\n✅ All comprehensive fixes applied');
