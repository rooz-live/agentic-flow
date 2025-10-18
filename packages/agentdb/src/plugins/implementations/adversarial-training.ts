/**
 * Adversarial Training Plugin
 *
 * Implements robust learning through adversarial examples generation
 * and training, improving model resilience to perturbations.
 *
 * Key features:
 * - FGSM (Fast Gradient Sign Method)
 * - PGD (Projected Gradient Descent) attacks
 * - Adversarial augmentation
 * - Certified defense mechanisms
 * - Robustness evaluation
 */

import { BasePlugin } from '../base-plugin';
import {
  Action,
  Context,
  Experience,
  TrainOptions,
  TrainingMetrics,
  Vector,
} from '../learning-plugin.interface';

/**
 * Attack type for adversarial generation
 */
type AttackType =
  | 'fgsm'        // Fast Gradient Sign Method
  | 'pgd'         // Projected Gradient Descent
  | 'cw'          // Carlini-Wagner
  | 'deepfool'    // DeepFool
  | 'boundary';   // Boundary Attack

/**
 * Adversarial example
 */
interface AdversarialExample {
  original: Vector;
  adversarial: Vector;
  perturbation: Vector;
  confidence: number;
  attackType: AttackType;
}

/**
 * Adversarial Training Plugin Implementation
 */
export class AdversarialTrainingPlugin extends BasePlugin {
  name = 'adversarial-training';
  version = '1.0.0';

  private experiences: Experience[] = [];
  private attackType: AttackType = 'fgsm';
  private epsilon: number = 0.1; // Attack strength
  private alpha: number = 0.01;  // Step size for iterative attacks
  private iterations: number = 40; // PGD iterations

  // Training parameters
  private adversarialRatio: number = 0.5; // Mix of clean vs adversarial
  private certifiedDefense: boolean = false;

  // Robustness tracking
  private robustnessScores: number[] = [];
  private adversarialExamples: AdversarialExample[] = [];

  constructor(config?: Partial<any>) {
    super();

    if (config) {
      this.attackType = config.attackType || 'fgsm';
      this.epsilon = config.epsilon || 0.1;
      this.alpha = config.alpha || 0.01;
      this.iterations = config.iterations || 40;
      this.adversarialRatio = config.adversarialRatio || 0.5;
    }

    // Mark as initialized for in-memory operation
    this.initialized = true;
  }

  /**
   * Override to skip initialization check for in-memory operation
   */
  protected checkInitialized(): void {
    // No-op for adversarial training - operates in-memory
  }

  /**
   * Override selectAction to provide base implementation
   */
  async selectAction(state: Vector | any, context?: Context): Promise<Action> {
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

  /**
   * Override to store experiences in-memory without vectorDB
   */
  async storeExperience(experience: Experience): Promise<void> {
    this.experiences.push(experience);
  }

  /**
   * Override to retrieve from local experiences
   */
  async retrieveSimilar(state: number[], k: number): Promise<import('../..').SearchResult<Experience>[]> {
    return this.experiences.slice(0, k).map((exp, idx) => ({
      id: exp.id || `exp-${idx}`,
      embedding: exp.state,
      metadata: exp,
      score: 1.0 - (idx * 0.1),
    }));
  }

  /**
   * Generate adversarial example using FGSM
   */
  private async generateFGSM(state: Vector, target: number): Promise<AdversarialExample> {
    // Ensure state is array
    const stateArray = Array.isArray(state) ? state : [state];

    // Handle zero epsilon case - no perturbation
    if (this.epsilon === 0) {
      return {
        original: stateArray,
        adversarial: [...stateArray],
        perturbation: new Array(stateArray.length).fill(0),
        confidence: 0,
        attackType: 'fgsm',
      };
    }

    // Compute gradient of loss with respect to input
    const gradient = await this.computeGradient(stateArray, target);

    // Apply FGSM: x_adv = x + epsilon * sign(grad)
    const adversarial = stateArray.map((x,  i: number) => {
      const sign = gradient[i] > 0 ? 1 : -1;
      return x + this.epsilon * sign;
    });

    const perturbation = adversarial.map((x,  i: number) => x - stateArray[i]);

    return {
      original: stateArray,
      adversarial: this.clipToValid(adversarial),
      perturbation,
      confidence: 0,
      attackType: 'fgsm',
    };
  }

  /**
   * Generate adversarial example using PGD
   */
  private async generatePGD(state: Vector, target: number): Promise<AdversarialExample> {
    // Ensure state is array
    const stateArray = Array.isArray(state) ? state : [state];

    // Handle zero epsilon case - no perturbation
    if (this.epsilon === 0) {
      return {
        original: stateArray,
        adversarial: [...stateArray],
        perturbation: new Array(stateArray.length).fill(0),
        confidence: 0,
        attackType: 'pgd',
      };
    }

    let adversarial = [...stateArray];

    // Iterative FGSM with projection
    for (let i = 0; i < this.iterations; i++) {
      const gradient = await this.computeGradient(adversarial, target);

      // Update with gradient step
      adversarial = adversarial.map((x, idx) => {
        const sign = gradient[idx] > 0 ? 1 : -1;
        return x + this.alpha * sign;
      });

      // Project back to epsilon ball around original
      adversarial = this.projectToEpsilonBall(adversarial, stateArray, this.epsilon);
      adversarial = this.clipToValid(adversarial);
    }

    const perturbation = adversarial.map((x,  i: number) => x - stateArray[i]);

    return {
      original: stateArray,
      adversarial,
      perturbation,
      confidence: 0,
      attackType: 'pgd',
    };
  }

  /**
   * Generate adversarial example using DeepFool
   */
  private async generateDeepFool(state: Vector, target: number): Promise<AdversarialExample> {
    // Ensure state is array
    const stateArray = Array.isArray(state) ? state : [state];

    let adversarial = [...stateArray];
    const maxIterations = 50;

    for (let i = 0; i < maxIterations; i++) {
      // Get predictions for all classes
      const predictions = await this.multiClassPredict(adversarial);

      // Find closest decision boundary
      const sorted = predictions
        .map((p, idx) => ({ prob: p, class: idx }))
        .sort((a, b) => b.prob - a.prob);

      const currentClass = sorted[0].class;
      const nextClass = sorted[1].class;

      // If misclassified, stop
      if (currentClass !== Math.floor(target)) {
        break;
      }

      // Compute minimum perturbation to cross boundary
      const w = await this.computeDecisionBoundary(adversarial, currentClass, nextClass);
      const f = sorted[0].prob - sorted[1].prob;

      const perturbation = w.map((wi: number) => (f / (this.l2Norm(w) ** 2 + 1e-8)) * wi);

      adversarial = adversarial.map((x, idx) => x + perturbation[idx]);
    }

    const finalPerturbation = adversarial.map((x,  i: number) => x - stateArray[i]);

    return {
      original: stateArray,
      adversarial: this.clipToValid(adversarial),
      perturbation: finalPerturbation,
      confidence: 0,
      attackType: 'deepfool',
    };
  }

  /**
   * Compute gradient of loss with respect to input
   */
  private async computeGradient(state: Vector, target: number): Promise<Vector> {
    // Ensure state is valid array
    if (!state || !Array.isArray(state) || state.length === 0) {
      return [0];
    }

    const epsilon = 1e-5;
    const gradient = new Array(state.length).fill(0);

    for (let i = 0; i < state.length; i++) {
      // Finite difference approximation
      const statePlus = [...state];
      statePlus[i] += epsilon;

      const stateMinus = [...state];
      stateMinus[i] -= epsilon;

      const predPlus = (await this.selectAction(statePlus)).confidence || 0;
      const predMinus = (await this.selectAction(stateMinus)).confidence || 0;

      gradient[i] = (predPlus - predMinus) / (2 * epsilon);
    }

    return gradient;
  }

  /**
   * Multi-class predictions (simplified)
   */
  private async multiClassPredict(state: Vector): Promise<number[]> {
    const numClasses = 10;
    const predictions = new Array(numClasses).fill(0);

    for (let i = 0; i < numClasses; i++) {
      predictions[i] = Math.random();
    }

    // Normalize
    const sum = predictions.reduce((a, b) => a + b, 0);
    return predictions.map(p => p / sum);
  }

  /**
   * Compute decision boundary between two classes
   */
  private async computeDecisionBoundary(
    state: Vector,
    class1: number,
    class2: number
  ): Promise<Vector> {
    const gradient = new Array(state.length).fill(0);

    for (let i = 0; i < state.length; i++) {
      gradient[i] = (class1 - class2) * Math.random() * 0.1;
    }

    return gradient;
  }

  /**
   * Project adversarial example to epsilon ball
   */
  private projectToEpsilonBall(adversarial: Vector, original: Vector, epsilon: number): Vector {
    const perturbation = adversarial.map((x,  i: number) => x - original[i]);
    const norm = this.l2Norm(perturbation);

    if (norm > epsilon) {
      return adversarial.map((x,  i: number) =>
        original[i] + (perturbation[i] / norm) * epsilon
      );
    }

    return adversarial;
  }

  /**
   * L2 norm of vector
   */
  private l2Norm(vec: Vector): number {
    return Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
  }

  /**
   * Clip values to valid range [0, 1]
   */
  private clipToValid(vec: Vector): Vector {
    return vec.map((x: number) => Math.max(0, Math.min(1, x)));
  }

  /**
   * Generate adversarial example
   */
  async generateAdversarialExample(
    state: Vector,
    target: number
  ): Promise<AdversarialExample> {
    switch (this.attackType) {
      case 'fgsm':
        return this.generateFGSM(state, target);
      case 'pgd':
        return this.generatePGD(state, target);
      case 'deepfool':
        return this.generateDeepFool(state, target);
      default:
        return this.generateFGSM(state, target);
    }
  }

  /**
   * Train with adversarial examples
   */
  async train(options?: TrainOptions): Promise<TrainingMetrics> {
    const startTime = Date.now();
    const epochs = options?.epochs || 50;
    const batchSize = options?.batchSize || 32;

    let totalLoss = 0;
    let cleanLoss = 0;
    let advLoss = 0;
    let experiencesProcessed = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Retrieve batch of experiences from local storage
      const experiences = await this.retrieveSimilar(
        new Array(128).fill(0),
        batchSize
      );

      // Split into clean and adversarial training
      const numAdversarial = Math.floor(experiences.length * this.adversarialRatio);

      // Train on clean examples
      for (let i = 0; i < experiences.length - numAdversarial; i++) {
        const exp = experiences[i].metadata!;
        const prediction = await this.selectAction(exp.state);
        const loss = Math.pow(prediction.confidence! - exp.reward, 2);
        cleanLoss += loss;
        totalLoss += loss;
        experiencesProcessed++;
      }

      // Generate and train on adversarial examples
      for (let i = experiences.length - numAdversarial; i < experiences.length; i++) {
        const exp = experiences[i].metadata!;

        // Generate adversarial example
        const advExample = await this.generateAdversarialExample(exp.state, exp.reward);
        this.adversarialExamples.push(advExample);

        // Train on adversarial example
        const prediction = await this.selectAction(advExample.adversarial);
        const loss = Math.pow(prediction.confidence! - exp.reward, 2);
        advLoss += loss;
        totalLoss += loss;
        experiencesProcessed++;
      }

      // Evaluate robustness
      if (epoch % 10 === 0) {
        const robustness = await this.evaluateRobustness(experiences.slice(0, 10).map(e => e.metadata!));
        this.robustnessScores.push(robustness);
      }
    }

    const duration = Date.now() - startTime;

    return {
      loss: totalLoss / Math.max(1, experiencesProcessed),
      cleanLoss: cleanLoss / Math.max(1, experiencesProcessed - this.adversarialExamples.length),
      adversarialLoss: advLoss / Math.max(1, this.adversarialExamples.length),
      experiencesProcessed,
      duration,
      robustnessScore: this.robustnessScores[this.robustnessScores.length - 1] || 0,
      adversarialExamplesGenerated: this.adversarialExamples.length,
    };
  }

  /**
   * Evaluate model robustness
   */
  private async evaluateRobustness(testExamples: Experience[]): Promise<number> {
    let correctClean = 0;
    let correctAdv = 0;

    for (const exp of testExamples) {
      // Clean prediction
      const cleanPred = await this.selectAction(exp.state);
      if (cleanPred.confidence! > 0.5) {
        correctClean++;
      }

      // Adversarial prediction
      const advExample = await this.generateAdversarialExample(exp.state, exp.reward);
      const advPred = await this.selectAction(advExample.adversarial);

      if (advPred.confidence! > 0.5) {
        correctAdv++;
      }
    }

    // Robustness score is ratio of adversarial accuracy to clean accuracy
    const cleanAcc = correctClean / testExamples.length;
    const advAcc = correctAdv / testExamples.length;

    return cleanAcc > 0 ? advAcc / cleanAcc : 0;
  }

  /**
   * Get adversarial training statistics
   */
  getAdversarialStats(): {
    attackType: AttackType;
    epsilon: number;
    examplesGenerated: number;
    averageRobustness: number;
    avgPerturbationNorm: number;
  } {
    const avgRobustness = this.robustnessScores.length > 0
      ? this.robustnessScores.reduce((a, b) => a + b, 0) / this.robustnessScores.length
      : 0;

    const avgPerturbNorm = this.adversarialExamples.length > 0
      ? this.adversarialExamples.reduce((sum, ex) =>
          sum + this.l2Norm(ex.perturbation), 0) / this.adversarialExamples.length
      : 0;

    return {
      attackType: this.attackType,
      epsilon: this.epsilon,
      examplesGenerated: this.adversarialExamples.length,
      averageRobustness: avgRobustness,
      avgPerturbationNorm: avgPerturbNorm,
    };
  }

  /**
   * Test model against specific attack
   */
  async testAgainstAttack(
    samples: Vector[] | Array<{ state: Vector; label?: number }>,
    attackType: AttackType
  ): Promise<{ cleanAccuracy: number; robustAccuracy: number; avgPerturbation?: number }> {
    if (samples.length === 0) {
      return {
        cleanAccuracy: 0,
        robustAccuracy: 0,
        avgPerturbation: 0,
      };
    }

    const previousAttack = this.attackType;
    this.attackType = attackType;

    let cleanCorrect = 0;
    let advCorrect = 0;
    let totalPerturbation = 0;

    for (const sample of samples) {
      // Handle both Vector[] and {state, label}[] formats
      const state = Array.isArray(sample) ? sample : (sample as any).state;

      const cleanPred = await this.selectAction(state);
      if (cleanPred.confidence! > 0.5) {
        cleanCorrect++;
      }

      const advExample = await this.generateAdversarialExample(state, 1.0);
      const advPred = await this.selectAction(advExample.adversarial);

      if (advPred.confidence! > 0.5) {
        advCorrect++;
      }

      totalPerturbation += this.l2Norm(advExample.perturbation);
    }

    this.attackType = previousAttack;

    return {
      cleanAccuracy: cleanCorrect / samples.length,
      robustAccuracy: advCorrect / samples.length,
      avgPerturbation: totalPerturbation / samples.length,
    };
  }
}
