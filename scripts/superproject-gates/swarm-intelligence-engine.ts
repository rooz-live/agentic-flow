/**
 * Swarm Intelligence Engine
 *
 * Implements evolutionary swarm algorithms for optimization problems
 * in bio-inspired computational architectures
 */

import { SwarmPopulation, SwarmAgent, BioComputationResult } from './types';

export class SwarmIntelligenceEngine {
  private populations: Map<string, SwarmPopulation> = new Map();

  constructor() {}

  /**
   * Create a new swarm population
   */
  createPopulation(
    id: string,
    populationSize: number,
    dimensions: number,
    bounds: [number, number][],
    inertiaWeight: number = 0.7,
    cognitiveComponent: number = 1.4,
    socialComponent: number = 1.4,
    maxIterations: number = 100
  ): SwarmPopulation {
    const agents: SwarmAgent[] = [];

    for (let i = 0; i < populationSize; i++) {
      const position = bounds.map(([min, max]) => min + Math.random() * (max - min));
      const velocity = position.map(() => (Math.random() - 0.5) * 2);

      agents.push({
        id: `agent-${i}`,
        position: [...position],
        velocity: [...velocity],
        personalBest: [...position],
        personalBestFitness: Infinity,
        fitness: Infinity,
        neighbors: []
      });
    }

    // Initialize global best
    let globalBest = [...agents[0].position];
    let globalBestFitness = Infinity;

    const population: SwarmPopulation = {
      id,
      agents,
      globalBest,
      globalBestFitness,
      inertiaWeight,
      cognitiveComponent,
      socialComponent,
      maxIterations,
      currentIteration: 0
    };

    this.populations.set(id, population);
    return population;
  }

  /**
   * Evaluate fitness for all agents
   */
  evaluateFitness(populationId: string, fitnessFunction: (position: number[]) => number): void {
    const population = this.populations.get(populationId);
    if (!population) throw new Error(`Population ${populationId} not found`);

    population.agents.forEach(agent => {
      agent.fitness = fitnessFunction(agent.position);

      // Update personal best
      if (agent.fitness < agent.personalBestFitness) {
        agent.personalBest = [...agent.position];
        agent.personalBestFitness = agent.fitness;
      }

      // Update global best
      if (agent.fitness < population.globalBestFitness) {
        population.globalBest = [...agent.position];
        population.globalBestFitness = agent.fitness;
      }
    });
  }

  /**
   * Update agent velocities and positions
   */
  updateSwarm(populationId: string, bounds: [number, number][]): void {
    const population = this.populations.get(populationId);
    if (!population) return;

    const w = population.inertiaWeight;
    const c1 = population.cognitiveComponent;
    const c2 = population.socialComponent;

    population.agents.forEach(agent => {
      // Update velocity
      for (let d = 0; d < agent.position.length; d++) {
        const r1 = Math.random();
        const r2 = Math.random();

        const cognitive = c1 * r1 * (agent.personalBest[d] - agent.position[d]);
        const social = c2 * r2 * (population.globalBest[d] - agent.position[d]);

        agent.velocity[d] = w * agent.velocity[d] + cognitive + social;
      }

      // Update position
      for (let d = 0; d < agent.position.length; d++) {
        agent.position[d] += agent.velocity[d];

        // Clamp to bounds
        const [min, max] = bounds[d];
        agent.position[d] = Math.max(min, Math.min(max, agent.position[d]));
      }
    });

    population.currentIteration++;
  }

  /**
   * Run particle swarm optimization
   */
  optimize(
    populationId: string,
    fitnessFunction: (position: number[]) => number,
    bounds: [number, number][],
    tolerance: number = 1e-6
  ): BioComputationResult {
    const population = this.populations.get(populationId);
    if (!population) throw new Error(`Population ${populationId} not found`);

    let prevBestFitness = population.globalBestFitness;
    let stagnationCount = 0;

    while (population.currentIteration < population.maxIterations) {
      this.evaluateFitness(populationId, fitnessFunction);
      this.updateSwarm(populationId, bounds);

      // Check for convergence
      const improvement = Math.abs(prevBestFitness - population.globalBestFitness);
      if (improvement < tolerance) {
        stagnationCount++;
        if (stagnationCount > 10) break; // Early stopping
      } else {
        stagnationCount = 0;
      }
      prevBestFitness = population.globalBestFitness;
    }

    return {
      swarmSolution: [...population.globalBest],
      convergence: population.currentIteration < population.maxIterations,
      iterations: population.currentIteration,
      fitness: population.globalBestFitness,
      energyEfficiency: 0.92 // Placeholder
    };
  }

  /**
   * Implement differential evolution variant
   */
  differentialEvolution(
    populationId: string,
    fitnessFunction: (position: number[]) => number,
    bounds: [number, number][],
    F: number = 0.8, // Differential weight
    CR: number = 0.9 // Crossover probability
  ): BioComputationResult {
    const population = this.populations.get(populationId);
    if (!population) throw new Error(`Population ${populationId} not found`);

    for (let gen = 0; gen < population.maxIterations; gen++) {
      population.agents.forEach((agent, i) => {
        // Select three random distinct agents
        const indices = population.agents
          .map((_, idx) => idx)
          .filter(idx => idx !== i);

        const [a, b, c] = indices
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(idx => population.agents[idx]);

        // Create mutant vector
        const mutant = agent.position.map((pos, d) =>
          a.position[d] + F * (b.position[d] - c.position[d])
        );

        // Crossover
        const trial = agent.position.map((pos, d) => {
          if (Math.random() < CR) {
            return this.clamp(mutant[d], bounds[d][0], bounds[d][1]);
          }
          return pos;
        });

        // Selection
        const trialFitness = fitnessFunction(trial);
        if (trialFitness < agent.fitness) {
          agent.position = [...trial];
          agent.fitness = trialFitness;

          if (trialFitness < agent.personalBestFitness) {
            agent.personalBest = [...trial];
            agent.personalBestFitness = trialFitness;
          }

          if (trialFitness < population.globalBestFitness) {
            population.globalBest = [...trial];
            population.globalBestFitness = trialFitness;
          }
        }
      });

      population.currentIteration = gen + 1;
    }

    return {
      swarmSolution: [...population.globalBest],
      convergence: true,
      iterations: population.currentIteration,
      fitness: population.globalBestFitness,
      energyEfficiency: 0.88
    };
  }

  /**
   * Implement ant colony optimization for combinatorial problems
   */
  antColonyOptimization(
    graph: number[][],
    numAnts: number = 50,
    numIterations: number = 100,
    alpha: number = 1, // Pheromone importance
    beta: number = 2,  // Heuristic importance
    evaporation: number = 0.5,
    Q: number = 100 // Pheromone deposit factor
  ): BioComputationResult {
    const n = graph.length;
    let pheromones = Array(n).fill(0).map(() => Array(n).fill(1));

    let bestPath: number[] = [];
    let bestDistance = Infinity;

    for (let iter = 0; iter < numIterations; iter++) {
      const antPaths: number[][] = [];
      const antDistances: number[] = [];

      // Each ant constructs a path
      for (let ant = 0; ant < numAnts; ant++) {
        const path = this.constructAntPath(graph, pheromones, alpha, beta);
        const distance = this.calculatePathDistance(path, graph);

        antPaths.push(path);
        antDistances.push(distance);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestPath = [...path];
        }
      }

      // Update pheromones
      // Evaporation
      pheromones = pheromones.map(row =>
        row.map(p => p * (1 - evaporation))
      );

      // Deposit
      antPaths.forEach((path, i) => {
        const deposit = Q / antDistances[i];
        for (let j = 0; j < path.length - 1; j++) {
          const from = path[j];
          const to = path[j + 1];
          pheromones[from][to] += deposit;
          pheromones[to][from] += deposit; // Undirected graph
        }
      });
    }

    return {
      swarmSolution: bestPath,
      convergence: true,
      iterations: numIterations,
      fitness: bestDistance,
      energyEfficiency: 0.85
    };
  }

  /**
   * Construct path for an ant
   */
  private constructAntPath(graph: number[][], pheromones: number[][], alpha: number, beta: number): number[] {
    const n = graph.length;
    const path: number[] = [0]; // Start from node 0
    const visited = new Set([0]);

    while (path.length < n) {
      const current = path[path.length - 1];
      const probabilities = this.calculateProbabilities(current, visited, graph, pheromones, alpha, beta);

      let rand = Math.random();
      let nextNode = -1;

      for (let i = 0; i < probabilities.length; i++) {
        if (!visited.has(i)) {
          rand -= probabilities[i];
          if (rand <= 0) {
            nextNode = i;
            break;
          }
        }
      }

      if (nextNode === -1) break; // No valid moves

      path.push(nextNode);
      visited.add(nextNode);
    }

    return path;
  }

  /**
   * Calculate transition probabilities for ant
   */
  private calculateProbabilities(
    current: number,
    visited: Set<number>,
    graph: number[][],
    pheromones: number[][],
    alpha: number,
    beta: number
  ): number[] {
    const n = graph.length;
    const probabilities: number[] = [];
    let total = 0;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && graph[current][i] > 0) {
        const pheromone = Math.pow(pheromones[current][i], alpha);
        const heuristic = Math.pow(1 / graph[current][i], beta);
        const prob = pheromone * heuristic;
        probabilities.push(prob);
        total += prob;
      } else {
        probabilities.push(0);
      }
    }

    // Normalize
    return probabilities.map(p => p / total);
  }

  /**
   * Calculate total distance of a path
   */
  private calculatePathDistance(path: number[], graph: number[][]): number {
    let distance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      distance += graph[path[i]][path[i + 1]];
    }
    return distance;
  }

  /**
   * Utility function to clamp values
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Get population metrics
   */
  getMetrics(populationId: string): Record<string, number> {
    const population = this.populations.get(populationId);
    if (!population) return {};

    const fitnesses = population.agents.map(a => a.fitness);
    const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const bestFitness = Math.min(...fitnesses);
    const worstFitness = Math.max(...fitnesses);

    return {
      averageFitness: avgFitness,
      bestFitness,
      worstFitness,
      globalBestFitness: population.globalBestFitness,
      currentIteration: population.currentIteration,
      convergenceRatio: population.currentIteration / population.maxIterations
    };
  }
}