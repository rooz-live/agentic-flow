# Advanced Learning Plugins

This document provides comprehensive information about AgentDB's advanced learning plugins that implement cutting-edge machine learning paradigms.

## Overview

AgentDB now includes 6 advanced learning plugins that go beyond traditional reinforcement learning, enabling sophisticated learning scenarios for modern AI applications.

| Plugin | Category | Use Case | Complexity |
|--------|----------|----------|------------|
| Federated Learning | Distributed | Privacy-preserving multi-agent learning | Advanced |
| Curriculum Learning | Structured | Progressive skill acquisition | Intermediate |
| Active Learning | Data-Efficient | Minimal labeling budget scenarios | Intermediate |
| Adversarial Training | Robustness | Security-critical applications | Advanced |
| Neural Architecture Search | AutoML | Architecture optimization | Expert |
| Multi-Task Learning | Transfer | Related task learning | Advanced |

---

## 1. Federated Learning Plugin

### Description
Privacy-preserving distributed learning where multiple agents collaborate without sharing raw data. Implements FedAvg, FedProx, FedOpt, and SCAFFOLD algorithms.

### Key Features
- **Client-side updates**: Each agent trains locally on private data
- **Secure aggregation**: Only model updates are shared, not data
- **Differential privacy**: Adds noise to protect individual contributions
- **Byzantine tolerance**: Detects and filters malicious agents
- **Multiple aggregation strategies**: FedAvg, FedProx, FedOpt, SCAFFOLD

### Configuration

```typescript
import { FederatedLearningPlugin } from 'agentdb/plugins';

const plugin = new FederatedLearningPlugin({
  aggregationStrategy: 'fedavg', // or 'fedprox', 'fedopt', 'scaffold'
  privacyBudget: 1.0,            // Differential privacy budget
  noisyScale: 0.1,               // Noise magnitude
  byzantineFraction: 0.2,        // Expected fraction of malicious agents
});

// Register clients
await plugin.registerClient('agent_1');
await plugin.registerClient('agent_2');

// Train locally
await plugin.trainLocalModel('agent_1', experiences, 5);

// Aggregate updates
await plugin.aggregateUpdates(['agent_1', 'agent_2']);
```

### Algorithms

**FedAvg** (Federated Averaging)
- Weighted average by data count
- Simple and effective baseline
- Best for IID data distributions

**FedProx** (Federated Proximal)
- Adds proximal term to handle heterogeneity
- Better for non-IID data
- Reduces client drift

**FedOpt** (Federated Optimization)
- Server-side adaptive optimization
- Uses momentum/Adam on server
- Faster convergence

**SCAFFOLD**
- Control variates to reduce drift
- Most sophisticated algorithm
- Best for highly heterogeneous data

### Use Cases
- **Healthcare**: Train on patient data without centralization
- **IoT devices**: Edge learning without cloud data transfer
- **Finance**: Collaborative fraud detection across banks
- **Mobile apps**: Personalization without user data collection

---

## 2. Curriculum Learning Plugin

### Description
Structured learning where the model progressively tackles increasingly difficult tasks, mimicking human learning pedagogy.

### Key Features
- **Automatic difficulty estimation**: Analyzes task complexity from experiences
- **Dynamic curriculum generation**: Creates learning path based on competence
- **Self-paced learning**: Agent chooses appropriate difficulty
- **Prerequisite tracking**: Ensures foundational skills before advanced tasks
- **Competence-based progression**: Advances only when ready

### Configuration

```typescript
import { CurriculumLearningPlugin } from 'agentdb/plugins';

const plugin = new CurriculumLearningPlugin({
  strategy: 'automatic',         // or 'predefined', 'self_paced', 'teacher_student'
  minSuccessRate: 0.7,           // Required mastery before progression
  competenceThreshold: 0.8,      // Threshold to mark task as learned
  difficultyWindow: 0.2,         // How much harder than current level
});

// Add custom curriculum stage
plugin.addCurriculumStage({
  stage: 4,
  name: 'Master',
  minCompetence: 0.95,
  tasks: ['complex_reasoning', 'creative_problem_solving'],
});

// Get progress
const progress = plugin.getCurriculumProgress();
console.log(`Stage: ${progress.currentStage}/${progress.totalStages}`);
console.log(`Competence: ${(progress.competence * 100).toFixed(1)}%`);
```

### Learning Strategies

**Predefined Curriculum**
- Manual expert-designed learning sequence
- Fixed progression through stages
- Best when optimal path is known

**Self-Paced Learning**
- Agent selects tasks slightly above current level
- Natural difficulty progression
- Maximizes motivation and learning

**Automatic Curriculum**
- AI estimates difficulty and creates path
- Adapts to agent's learning rate
- No human expertise required

**Teacher-Student**
- External teacher provides curriculum
- Can incorporate domain knowledge
- Hybrid human-AI approach

### Use Cases
- **Robotics**: Learn manipulation tasks from simple to complex
- **Game AI**: Master game mechanics progressively
- **Education**: Adaptive learning systems
- **Skill acquisition**: Any hierarchical skill learning

---

## 3. Active Learning Plugin

### Description
Query-based learning where the agent actively selects the most informative samples to label, maximizing data efficiency.

### Key Features
- **Uncertainty sampling**: Query most uncertain predictions
- **Query-by-committee**: Ensemble disagreement
- **Expected model change**: Maximum gradient magnitude
- **Diversity sampling**: Diverse batch selection
- **Budget-aware**: Operates within labeling budget

### Configuration

```typescript
import { ActiveLearningPlugin } from 'agentdb/plugins';

const plugin = new ActiveLearningPlugin({
  queryStrategy: 'uncertainty',  // or 'margin', 'entropy', 'committee', 'diverse'
  labelingBudget: 1000,         // Maximum samples to label
  committeeSize: 5,              // For query-by-committee
});

// Add unlabeled samples
await plugin.addUnlabeledSample(state, { source: 'production' });

// Select most informative batch
const batch = await plugin.selectQueryBatch(32);

// Label and train
for (const sample of batch) {
  const label = await oracle.label(sample.state);
  await plugin.storeExperience({
    state: sample.state,
    reward: label,
    // ...
  });
}
```

### Query Strategies

**Uncertainty Sampling**
- Select samples with lowest confidence
- Simple and effective
- Works with any model

**Margin Sampling**
- Smallest margin between top two classes
- Good for multiclass problems
- More stable than uncertainty

**Entropy Sampling**
- Highest prediction entropy
- Captures uncertainty across all classes
- Theoretical foundation

**Query-by-Committee**
- Train ensemble, select where members disagree
- Reduces bias
- More computationally expensive

**Expected Model Change**
- Samples that would change model most
- Gradient magnitude estimation
- Maximizes learning efficiency

**Diversity Sampling**
- Ensures batch diversity
- Prevents redundant queries
- Better exploration

### Use Cases
- **Annotation projects**: Minimize labeling cost
- **Rare event detection**: Find interesting samples
- **Model debugging**: Identify failure modes
- **Continuous learning**: Select which production data to label

---

## 4. Adversarial Training Plugin

### Description
Robust learning through adversarial example generation and training, improving model resilience to perturbations and attacks.

### Key Features
- **Multiple attack types**: FGSM, PGD, C&W, DeepFool, Boundary
- **Adversarial augmentation**: Mix clean and adversarial examples
- **Robustness evaluation**: Measure defense effectiveness
- **Certified defense**: Formal robustness guarantees
- **Adaptive attacks**: Iterative optimization

### Configuration

```typescript
import { AdversarialTrainingPlugin } from 'agentdb/plugins';

const plugin = new AdversarialTrainingPlugin({
  attackType: 'pgd',            // or 'fgsm', 'cw', 'deepfool'
  epsilon: 0.1,                 // Attack strength
  alpha: 0.01,                  // Step size for iterative attacks
  iterations: 40,               // PGD iterations
  adversarialRatio: 0.5,        // Mix of clean vs adversarial
});

// Generate adversarial example
const advExample = await plugin.generateAdversarialExample(state, target);

// Test robustness against specific attack
const results = await plugin.testAgainstAttack(testSamples, 'fgsm');
console.log(`Clean accuracy: ${(results.cleanAccuracy * 100).toFixed(1)}%`);
console.log(`Robust accuracy: ${(results.robustAccuracy * 100).toFixed(1)}%`);
```

### Attack Types

**FGSM (Fast Gradient Sign Method)**
- Single-step attack using gradient sign
- Fast but less powerful
- Good for training augmentation

**PGD (Projected Gradient Descent)**
- Multi-step iterative attack
- Stronger than FGSM
- Industry standard for evaluation

**C&W (Carlini-Wagner)**
- Optimization-based attack
- Very powerful, finds minimal perturbations
- Computationally expensive

**DeepFool**
- Finds minimal perturbation to decision boundary
- Geometric approach
- Good for understanding model robustness

**Boundary Attack**
- Black-box attack
- Only requires predictions
- Useful for testing deployed models

### Use Cases
- **Security applications**: Protect against adversarial attacks
- **Computer vision**: Robust image classification
- **NLP**: Defend against text perturbations
- **Malware detection**: Resilience to evasion attempts

---

## 5. Neural Architecture Search Plugin

### Description
Automated neural architecture optimization using evolutionary algorithms, discovering optimal network structures.

### Key Features
- **Architecture encoding**: Flexible layer specification
- **Population-based search**: Evolutionary algorithm
- **Performance prediction**: Fast architecture evaluation
- **Complexity tracking**: Balance accuracy vs efficiency
- **Transfer learning**: Meta-architectures across tasks

### Configuration

```typescript
import { NeuralArchitectureSearchPlugin } from 'agentdb/plugins';

const plugin = new NeuralArchitectureSearchPlugin({
  strategy: 'evolutionary',     // or 'rl_controller', 'random', 'bayesian'
  populationSize: 20,           // Number of architectures
  mutationRate: 0.2,            // Mutation probability
  maxLayers: 10,                // Architecture depth limit
});

// Run search
await plugin.train({ epochs: 50 });

// Get best architecture
const best = plugin.getBestArchitecture();
console.log(`Best fitness: ${best.fitness}`);
console.log(`Complexity: ${best.complexity} parameters`);

// Export for deployment
const json = plugin.exportArchitecture(best);
```

### Search Strategies

**Evolutionary**
- Genetic algorithm with mutation and crossover
- Population-based exploration
- Balances exploitation and exploration

**RL Controller**
- RNN controller generates architectures
- Reinforcement learning to optimize
- Can discover novel patterns

**Random Search**
- Baseline strategy
- Surprisingly effective
- Good for comparison

**Bayesian Optimization**
- Model-based search
- Sample-efficient
- Best for expensive evaluations

### Architectural Components

**Layer Types**
- Dense (fully connected)
- Convolutional
- Pooling
- Dropout
- Batch normalization

**Activation Functions**
- ReLU, Tanh, Sigmoid
- Leaky ReLU, ELU, SELU

**Search Space Constraints**
- Maximum layer depth
- Maximum nodes per layer
- Allowed layer types

### Use Cases
- **AutoML**: Automated machine learning pipelines
- **Model compression**: Find efficient architectures
- **Transfer learning**: Architecture search for new domains
- **Research**: Discover novel architectures

---

## 6. Multi-Task Learning Plugin

### Description
Joint learning across multiple related tasks, leveraging shared representations and transfer learning.

### Key Features
- **Shared layers**: Common representation learning
- **Task-specific heads**: Specialized output layers
- **Automatic task weighting**: Uncertainty-based balancing
- **Auxiliary tasks**: Helper tasks for regularization
- **Task relationship modeling**: Leverage task similarities

### Configuration

```typescript
import { MultiTaskLearningPlugin } from 'agentdb/plugins';

const plugin = new MultiTaskLearningPlugin({
  sharingStrategy: 'hard_sharing', // or 'soft_sharing', 'cross_stitch'
  uncertaintyWeighting: true,       // Automatic task balancing
  gradientNormalization: true,      // Normalize gradients across tasks
});

// Add tasks
plugin.addTask('sentiment', 'Sentiment Analysis', 1.0, false);
plugin.addTask('ner', 'Named Entity Recognition', 0.8, false);
plugin.addTask('pos', 'Part-of-Speech Tagging', 0.5, true); // Auxiliary

// Train across all tasks
await plugin.train({ epochs: 50, batchSize: 32 });

// Get task statistics
const stats = plugin.getTaskStats();
stats.forEach(task => {
  console.log(`${task.name}: ${(task.performance * 100).toFixed(1)}%`);
});

// Task-specific prediction
const action = await plugin.selectActionForTask(state, 'sentiment');
```

### Sharing Strategies

**Hard Parameter Sharing**
- Fully shared layers, task-specific heads
- Most common approach
- Strong regularization

**Soft Parameter Sharing**
- Separate networks with regularization
- More flexible
- Can model task differences better

**Cross-Stitch Networks**
- Learned linear combinations
- Adaptive sharing
- Best for uncertain task relationships

**Sluice Networks**
- Selective layer sharing
- Most flexible
- Highest computational cost

### Task Weighting

**Uncertainty Weighting**
- Automatic based on task variance
- No manual tuning required
- Kendall et al. (2018) method

**Manual Weighting**
- Explicit task priorities
- Domain knowledge incorporation
- Full control

### Use Cases
- **NLP**: Joint text understanding (sentiment, NER, POS)
- **Computer vision**: Detection, segmentation, classification
- **Robotics**: Multiple manipulation skills
- **Recommendation**: Multiple user preference aspects

---

## Performance Comparison

| Plugin | Training Speed | Sample Efficiency | Memory Usage | Complexity |
|--------|---------------|-------------------|--------------|------------|
| Federated Learning | Slow (distributed) | Low | High | Advanced |
| Curriculum Learning | Fast | High | Low | Intermediate |
| Active Learning | Medium | Very High | Low | Intermediate |
| Adversarial Training | Slow (2x data) | Low | Medium | Advanced |
| Neural Architecture Search | Very Slow | N/A | High | Expert |
| Multi-Task Learning | Medium | High | Medium | Advanced |

---

## Integration Examples

### Combining Plugins

**Federated + Curriculum Learning**
```typescript
// Distributed curriculum learning
const fedPlugin = new FederatedLearningPlugin({...});
const currPlugin = new CurriculumLearningPlugin({...});

for (const client of clients) {
  const taskId = currPlugin.selectNextTask();
  await fedPlugin.trainLocalModel(client, getTaskData(taskId));
}
```

**Active + Adversarial Training**
```typescript
// Query adversarial examples for labeling
const activePlugin = new ActiveLearningPlugin({...});
const advPlugin = new AdversarialTrainingPlugin({...});

const batch = await activePlugin.selectQueryBatch(32);
for (const sample of batch) {
  const adv = await advPlugin.generateAdversarialExample(sample.state, 0);
  await activePlugin.addUnlabeledSample(adv.adversarial);
}
```

**Multi-Task + NAS**
```typescript
// Search for optimal multi-task architecture
const mtlPlugin = new MultiTaskLearningPlugin({...});
const nasPlugin = new NeuralArchitectureSearchPlugin({...});

// NAS optimizes architecture for all tasks
const best = await nasPlugin.search(mtlPlugin.tasks);
mtlPlugin.setArchitecture(best);
```

---

## Best Practices

### Federated Learning
- Use differential privacy for sensitive data
- Monitor for Byzantine agents
- Balance communication rounds vs local epochs
- Start with FedAvg, upgrade to SCAFFOLD for non-IID data

### Curriculum Learning
- Begin with automatic strategy, refine to predefined
- Set competence threshold based on task criticality
- Monitor for curriculum learning speedup (should be 2-5x)
- Use self-paced for highly variable learners

### Active Learning
- Start with uncertainty sampling as baseline
- Use query-by-committee for critical applications
- Monitor labeling budget carefully
- Combine with semi-supervised learning

### Adversarial Training
- Use PGD-10 for training, PGD-40 for evaluation
- Start with epsilon=0.1, tune based on domain
- Monitor clean vs robust accuracy trade-off
- Consider certified defense for safety-critical apps

### Neural Architecture Search
- Use evolutionary for exploration, RL for exploitation
- Constrain search space based on compute budget
- Transfer architectures across similar tasks
- Validate on separate architecture test set

### Multi-Task Learning
- Use hard sharing by default
- Enable uncertainty weighting
- Monitor negative transfer (some tasks hurting others)
- Add auxiliary tasks for regularization

---

## Troubleshooting

### Common Issues

**Federated Learning not converging**
- Check data distribution across clients (IID assumption)
- Increase local epochs
- Try FedProx or SCAFFOLD
- Reduce learning rate

**Curriculum too easy/hard**
- Adjust `difficultyWindow` parameter
- Check task difficulty estimation
- Verify competence threshold
- Use self-paced strategy

**Active learning queries redundant**
- Switch to diversity sampling
- Increase batch diversity
- Use query-by-committee
- Check if model has saturated

**Adversarial training degrading clean accuracy**
- Reduce adversarial ratio
- Decrease epsilon
- Use curriculum on attack strength
- Try TRADES algorithm

**NAS finding suboptimal architectures**
- Increase population size
- Run more generations
- Check fitness function
- Use transfer from meta-architecture

**Multi-task negative transfer**
- Reduce task weighting for interfering tasks
- Use soft sharing instead of hard
- Add task-specific batch normalization
- Check task relationship matrix

---

## References

### Federated Learning
- McMahan et al. (2017) - Communication-Efficient Learning
- Li et al. (2020) - Federated Optimization
- Karimireddy et al. (2020) - SCAFFOLD

### Curriculum Learning
- Bengio et al. (2009) - Curriculum Learning
- Graves et al. (2017) - Automated Curriculum
- Jiang et al. (2018) - MentorNet

### Active Learning
- Settles (2009) - Active Learning Literature Survey
- Sener & Savarese (2018) - Core-Set Selection
- Gal et al. (2017) - Deep Bayesian Active Learning

### Adversarial Training
- Goodfellow et al. (2015) - FGSM
- Madry et al. (2018) - PGD
- Carlini & Wagner (2017) - C&W Attack

### Neural Architecture Search
- Zoph & Le (2017) - Neural Architecture Search
- Real et al. (2019) - Regularized Evolution
- Liu et al. (2019) - DARTS

### Multi-Task Learning
- Caruana (1997) - Multitask Learning
- Ruder (2017) - An Overview of MTL
- Kendall et al. (2018) - Multi-Task Learning Using Uncertainty

---

## License

These plugins are part of AgentDB, dual-licensed under MIT OR Apache-2.0.
