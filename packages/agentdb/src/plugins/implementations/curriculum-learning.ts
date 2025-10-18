/**
 * Curriculum Learning Plugin
 *
 * Implements structured learning where the model progressively tackles
 * increasingly difficult tasks, mimicking human learning.
 *
 * Key features:
 * - Automatic difficulty estimation
 * - Dynamic curriculum generation
 * - Self-paced learning
 * - Task sequencing based on prerequisites
 * - Competence-based progression
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
 * Task difficulty metrics
 */
interface TaskDifficulty {
  taskId: string;
  complexity: number; // 0-1
  estimatedLoss: number;
  successRate: number;
  prerequisites: string[];
}

/**
 * Curriculum stage
 */
interface CurriculumStage {
  stage: number;
  name: string;
  minCompetence: number;
  tasks: string[];
  completed: boolean;
}

/**
 * Curriculum strategy
 */
type CurriculumStrategy =
  | 'predefined'      // Manual curriculum design
  | 'self_paced'      // Agent chooses difficulty
  | 'teacher_student' // External teacher provides curriculum
  | 'automatic';      // Automatic difficulty estimation

/**
 * Curriculum Learning Plugin Implementation
 */
export class CurriculumLearningPlugin extends BasePlugin {
  name = 'curriculum-learning';
  version = '1.0.0';

  private experiences: Experience[] = [];
  private curriculum: CurriculumStage[] = [];
  private currentStage: number = 0;
  private taskDifficulties: Map<string, TaskDifficulty> = new Map();
  private competence: Map<string, number> = new Map();
  private strategy: CurriculumStrategy = 'automatic';

  // Learning parameters
  private minSuccessRate: number = 0.7;
  private competenceThreshold: number = 0.8;
  private difficultyWindow: number = 0.2;

  constructor(config?: Partial<any>) {
    super();

    if (config) {
      this.strategy = config.strategy || 'automatic';
      this.minSuccessRate = config.minSuccessRate || 0.7;
      this.competenceThreshold = config.competenceThreshold || 0.8;
    }

    this.initializeCurriculum();

    // Mark as initialized for in-memory operation
    this.initialized = true;
  }

  /**
   * Override to skip initialization check for in-memory operation
   */
  protected checkInitialized(): void {
    // No-op for curriculum learning - operates in-memory
  }

  /**
   * Override selectAction to provide base implementation
   */
  async selectAction(state: Vector, context?: Context): Promise<Action> {
    // Simple default action selection
    const stateSum = state.reduce((a, b) => a + b, 0);
    const value = Math.tanh(stateSum / state.length);

    return {
      id: String(Math.floor(Math.abs(value) * 10)),
      embedding: state,
      confidence: Math.abs(value),
    };
  }

  /**
   * Override to store experiences in-memory without vectorDB
   */
  async storeExperience(experience: Experience): Promise<void> {
    this.experiences.push(experience);

    const taskId = experience.metadata?.taskId || 'unknown';
    const success = experience.reward > 0;

    // Update competence
    this.updateCompetence(taskId, experience.reward, success);

    // Update task difficulty estimate using local experiences
    const taskExps = this.experiences.filter(e => e.metadata?.taskId === taskId);
    const difficulty = this.estimateTaskDifficulty(taskId, taskExps);
    this.taskDifficulties.set(taskId, difficulty);
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
   * Initialize curriculum stages
   */
  private initializeCurriculum(): void {
    this.curriculum = [
      {
        stage: 0,
        name: 'Foundation',
        minCompetence: 0.0,
        tasks: ['basic_actions', 'simple_rewards'],
        completed: false,
      },
      {
        stage: 1,
        name: 'Intermediate',
        minCompetence: 0.7,
        tasks: ['sequential_actions', 'delayed_rewards'],
        completed: false,
      },
      {
        stage: 2,
        name: 'Advanced',
        minCompetence: 0.8,
        tasks: ['complex_strategies', 'multi_step_planning'],
        completed: false,
      },
      {
        stage: 3,
        name: 'Expert',
        minCompetence: 0.9,
        tasks: ['optimal_policies', 'transfer_learning'],
        completed: false,
      },
    ];
  }

  /**
   * Estimate task difficulty from experiences
   */
  private estimateTaskDifficulty(taskId: string, experiences: Experience[]): TaskDifficulty {
    if (experiences.length === 0) {
      return {
        taskId,
        complexity: 0.5,
        estimatedLoss: 1.0,
        successRate: 0.0,
        prerequisites: [],
      };
    }

    // Calculate metrics
    const successes = experiences.filter(e => e.reward > 0).length;
    const successRate = successes / experiences.length;

    const avgReward = experiences.reduce((sum, e) => sum + e.reward, 0) / experiences.length;
    const rewardVariance = experiences.reduce((sum, e) =>
      sum + Math.pow(e.reward - avgReward, 2), 0) / experiences.length;

    // Complexity based on state dimensionality and reward variance
    const stateDim = experiences[0].state.length;
    const complexity = Math.min(1.0, (stateDim / 256 + Math.sqrt(rewardVariance)) / 2);

    return {
      taskId,
      complexity,
      estimatedLoss: 1.0 - successRate,
      successRate,
      prerequisites: this.inferPrerequisites(taskId, complexity),
    };
  }

  /**
   * Infer prerequisite tasks based on complexity
   */
  private inferPrerequisites(taskId: string, complexity: number): string[] {
    const prerequisites: string[] = [];

    this.taskDifficulties.forEach((difficulty, id) => {
      if (id !== taskId && difficulty.complexity < complexity - 0.2) {
        prerequisites.push(id);
      }
    });

    return prerequisites.slice(0, 3); // Max 3 prerequisites
  }

  /**
   * Select next task based on current competence
   */
  private selectNextTask(): string | null {
    const currentCompetence = this.getCurrentCompetence();

    // Self-paced: Choose task slightly above current competence
    if (this.strategy === 'self_paced') {
      return this.selectSelfPacedTask(currentCompetence);
    }

    // Automatic: Estimate difficulty and choose optimally
    if (this.strategy === 'automatic') {
      return this.selectAutomaticTask(currentCompetence);
    }

    // Predefined: Follow curriculum stages
    return this.selectCurriculumTask();
  }

  /**
   * Self-paced task selection
   */
  private selectSelfPacedTask(competence: number): string | null {
    const targetDifficulty = competence + this.difficultyWindow;

    let bestTask: string | null = null;
    let bestDiff = Infinity;

    this.taskDifficulties.forEach((difficulty, taskId) => {
      const diff = Math.abs(difficulty.complexity - targetDifficulty);

      if (diff < bestDiff && this.arePrerequisitesMet(taskId)) {
        bestTask = taskId;
        bestDiff = diff;
      }
    });

    return bestTask;
  }

  /**
   * Automatic task selection using competence-based heuristic
   */
  private selectAutomaticTask(competence: number): string | null {
    const candidates: Array<{ taskId: string; score: number }> = [];

    this.taskDifficulties.forEach((difficulty, taskId) => {
      if (!this.arePrerequisitesMet(taskId)) {
        return;
      }

      // Score combines difficulty match and learning progress potential
      const difficultyMatch = 1.0 - Math.abs(difficulty.complexity - competence);
      const learningPotential = 1.0 - difficulty.successRate;
      const score = difficultyMatch * 0.7 + learningPotential * 0.3;

      candidates.push({ taskId, score });
    });

    if (candidates.length === 0) {
      return null;
    }

    // Select best scoring task
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].taskId;
  }

  /**
   * Curriculum-based task selection
   */
  private selectCurriculumTask(): string | null {
    const stage = this.curriculum[this.currentStage];

    if (!stage || stage.completed) {
      // Move to next stage
      if (this.currentStage < this.curriculum.length - 1) {
        this.currentStage++;
        return this.selectCurriculumTask();
      }
      return null;
    }

    // Select random task from current stage
    const uncompletedTasks = stage.tasks.filter(
      taskId => (this.competence.get(taskId) || 0) < this.competenceThreshold
    );

    if (uncompletedTasks.length === 0) {
      stage.completed = true;
      return this.selectCurriculumTask();
    }

    return uncompletedTasks[Math.floor(Math.random() * uncompletedTasks.length)];
  }

  /**
   * Check if task prerequisites are met
   */
  private arePrerequisitesMet(taskId: string): boolean {
    const difficulty = this.taskDifficulties.get(taskId);
    if (!difficulty) {
      return true;
    }

    return difficulty.prerequisites.every(prereqId => {
      const competence = this.competence.get(prereqId) || 0;
      return competence >= this.minSuccessRate;
    });
  }

  /**
   * Get current overall competence
   */
  private getCurrentCompetence(): number {
    if (this.competence.size === 0) {
      return 0.0;
    }

    const sum = Array.from(this.competence.values()).reduce((a, b) => a + b, 0);
    return sum / this.competence.size;
  }

  /**
   * Update competence for a task
   */
  private updateCompetence(taskId: string, reward: number, success: boolean): void {
    const currentCompetence = this.competence.get(taskId) || 0;

    // Exponential moving average
    const alpha = 0.1;
    const newCompetence = success ? 1.0 : 0.0;
    const updated = (1 - alpha) * currentCompetence + alpha * newCompetence;

    this.competence.set(taskId, updated);
  }


  /**
   * Train with curriculum learning
   */
  async train(options?: TrainOptions): Promise<TrainingMetrics> {
    const startTime = Date.now();
    const epochs = options?.epochs || 50;

    let totalLoss = 0;
    let experiencesProcessed = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Select next task based on curriculum
      const taskId = this.selectNextTask();

      if (!taskId) {
        // Curriculum completed
        break;
      }

      // Retrieve experiences for this task from local storage
      const allExperiences = await this.retrieveSimilar(
        new Array(128).fill(0),
        options?.batchSize || 32
      );

      const experiences = this.experiences
        .filter(e => e.metadata?.taskId === taskId)
        .slice(0, options?.batchSize || 32);

      // Train on task
      for (const exp of experiences) {
        const prediction = await this.selectAction(exp.state);
        const loss = Math.pow(prediction.confidence! - exp.reward, 2);
        totalLoss += loss;
        experiencesProcessed++;
      }

      // Check if we should advance curriculum stage
      if (this.strategy === 'predefined') {
        const currentCompetence = this.getCurrentCompetence();
        const nextStage = this.curriculum[this.currentStage + 1];

        if (nextStage && currentCompetence >= nextStage.minCompetence) {
          this.currentStage++;
        }
      }
    }

    const duration = Math.max(1, Date.now() - startTime);

    return {
      loss: totalLoss / Math.max(1, experiencesProcessed),
      experiencesProcessed,
      duration,
      currentStage: this.currentStage,
      currentCompetence: this.getCurrentCompetence(),
      tasksCompleted: Array.from(this.competence.entries())
        .filter(([, comp]) => comp >= this.competenceThreshold)
        .length,
    };
  }

  /**
   * Get curriculum progress
   */
  getCurriculumProgress(): {
    currentStage: number;
    totalStages: number;
    competence: number;
    tasksCompleted: number;
    totalTasks: number;
  } {
    const totalTasks = this.curriculum.reduce((sum, stage) => sum + stage.tasks.length, 0);
    const completed = Array.from(this.competence.values())
      .filter(c => c >= this.competenceThreshold).length;

    return {
      currentStage: this.currentStage,
      totalStages: this.curriculum.length,
      competence: this.getCurrentCompetence(),
      tasksCompleted: completed,
      totalTasks,
    };
  }

  /**
   * Add custom curriculum stage
   */
  addCurriculumStage(stage: Omit<CurriculumStage, 'completed'>): void {
    this.curriculum.push({
      ...stage,
      completed: false,
    });
  }

  /**
   * Get task difficulties
   */
  getTaskDifficulties(): Map<string, TaskDifficulty> {
    return new Map(this.taskDifficulties);
  }
}
