/**
 * Metabolic Pathway Simulator
 *
 * Implements metabolic pathway simulation for resource allocation and energy management
 * in bio-inspired computational architectures
 */

import { MetabolicPathway, MetabolicNode, MetabolicConnection, BioComputationResult } from './types';

export class MetabolicPathwaySimulator {
  private pathways: Map<string, MetabolicPathway> = new Map();

  constructor() {}

  /**
   * Create a new metabolic pathway
   */
  createPathway(
    id: string,
    nodes: Omit<MetabolicNode, 'connections'>[],
    connections: MetabolicConnection[]
  ): MetabolicPathway {
    const fullNodes: MetabolicNode[] = nodes.map(node => ({
      ...node,
      connections: connections.filter(conn => conn.from === node.id || conn.to === node.id)
    }));

    // Validate connections
    connections.forEach(conn => {
      const fromExists = fullNodes.some(n => n.id === conn.from);
      const toExists = fullNodes.some(n => n.id === conn.to);
      if (!fromExists || !toExists) {
        throw new Error(`Invalid connection: ${conn.from} -> ${conn.to}`);
      }
    });

    const pathway: MetabolicPathway = {
      id,
      nodes: fullNodes,
      totalEnergy: fullNodes.reduce((sum, node) => sum + node.energy, 0),
      efficiency: 1.0,
      stability: 1.0,
      cycles: 0
    };

    this.pathways.set(id, pathway);
    return pathway;
  }

  /**
   * Simulate energy flow through the pathway
   */
  simulateFlow(pathwayId: string, timeSteps: number = 100, timeStep: number = 0.1): BioComputationResult {
    const pathway = this.pathways.get(pathwayId);
    if (!pathway) throw new Error(`Pathway ${pathwayId} not found`);

    const energyFlows: Record<string, number[]> = {};
    pathway.nodes.forEach(node => {
      energyFlows[node.id] = [node.energy];
    });

    let totalEnergy = pathway.totalEnergy;
    let stability = 1.0;
    let efficiency = 1.0;

    for (let t = 0; t < timeSteps; t++) {
      const newEnergies: Record<string, number> = {};

      // Calculate energy changes for each node
      pathway.nodes.forEach(node => {
        let energyChange = 0;

        // Outgoing connections (energy leaving)
        const outgoing = node.connections.filter(conn => conn.from === node.id && conn.active);
        outgoing.forEach(conn => {
          const rate = Math.min(conn.rate * timeStep, node.energy);
          energyChange -= rate;
        });

        // Incoming connections (energy arriving)
        const incoming = node.connections.filter(conn => conn.to === node.id && conn.active);
        incoming.forEach(conn => {
          const sourceNode = pathway.nodes.find(n => n.id === conn.from);
          if (sourceNode) {
            const rate = Math.min(conn.rate * timeStep, sourceNode.energy);
            energyChange += rate * (1 - conn.cost); // Account for energy cost
          }
        });

        // Apply efficiency and degradation
        energyChange *= node.efficiency;
        energyChange -= node.energy * node.degradation * timeStep;

        newEnergies[node.id] = Math.max(0, node.energy + energyChange);
      });

      // Update node energies
      pathway.nodes.forEach(node => {
        node.energy = newEnergies[node.id];
        energyFlows[node.id].push(node.energy);
      });

      // Update pathway metrics
      totalEnergy = pathway.nodes.reduce((sum, node) => sum + node.energy, 0);
      stability = this.calculateStability(pathway);
      efficiency = this.calculateEfficiency(pathway);

      pathway.totalEnergy = totalEnergy;
      pathway.stability = stability;
      pathway.efficiency = efficiency;
      pathway.cycles = t + 1;
    }

    return {
      metabolicFlow: pathway.nodes.reduce((acc, node) => {
        acc[node.id] = node.energy;
        return acc;
      }, {} as Record<string, number>),
      convergence: stability > 0.8,
      iterations: timeSteps,
      fitness: efficiency,
      energyEfficiency: efficiency
    };
  }

  /**
   * Optimize pathway structure using evolutionary algorithms
   */
  optimizePathway(
    pathwayId: string,
    optimizationTarget: 'efficiency' | 'stability' | 'energy' = 'efficiency',
    generations: number = 50
  ): BioComputationResult {
    const pathway = this.pathways.get(pathwayId);
    if (!pathway) throw new Error(`Pathway ${pathwayId} not found`);

    let bestPathway = { ...pathway };
    let bestFitness = this.evaluatePathwayFitness(pathway, optimizationTarget);

    for (let gen = 0; gen < generations; gen++) {
      // Create mutated pathway
      const mutatedPathway = this.mutatePathway(pathway);
      const fitness = this.evaluatePathwayFitness(mutatedPathway, optimizationTarget);

      if (fitness > bestFitness) {
        bestPathway = { ...mutatedPathway };
        bestFitness = fitness;
      }
    }

    // Apply best pathway
    this.pathways.set(pathwayId, bestPathway);

    return {
      metabolicFlow: bestPathway.nodes.reduce((acc, node) => {
        acc[node.id] = node.energy;
        return acc;
      }, {} as Record<string, number>),
      convergence: true,
      iterations: generations,
      fitness: bestFitness,
      energyEfficiency: bestPathway.efficiency
    };
  }

  /**
   * Evaluate pathway fitness based on optimization target
   */
  private evaluatePathwayFitness(pathway: MetabolicPathway, target: 'efficiency' | 'stability' | 'energy'): number {
    switch (target) {
      case 'efficiency':
        return pathway.efficiency;
      case 'stability':
        return pathway.stability;
      case 'energy':
        return pathway.totalEnergy;
      default:
        return 0;
    }
  }

  /**
   * Mutate pathway structure
   */
  private mutatePathway(pathway: MetabolicPathway): MetabolicPathway {
    const mutated = JSON.parse(JSON.stringify(pathway)) as MetabolicPathway;

    // Random mutations
    mutated.nodes.forEach(node => {
      // Mutate efficiency
      node.efficiency += (Math.random() - 0.5) * 0.1;
      node.efficiency = Math.max(0.1, Math.min(1.0, node.efficiency));

      // Mutate degradation
      node.degradation += (Math.random() - 0.5) * 0.01;
      node.degradation = Math.max(0, Math.min(0.1, node.degradation));

      // Mutate connections
      node.connections.forEach(conn => {
        if (Math.random() < 0.1) { // 10% chance to mutate each connection
          conn.rate += (Math.random() - 0.5) * 0.1;
          conn.rate = Math.max(0.01, conn.rate);

          conn.cost += (Math.random() - 0.5) * 0.01;
          conn.cost = Math.max(0, Math.min(0.5, conn.cost));
        }
      });
    });

    // Recalculate metrics
    mutated.totalEnergy = mutated.nodes.reduce((sum, node) => sum + node.energy, 0);
    mutated.efficiency = this.calculateEfficiency(mutated);
    mutated.stability = this.calculateStability(mutated);

    return mutated;
  }

  /**
   * Calculate pathway efficiency
   */
  private calculateEfficiency(pathway: MetabolicPathway): number {
    const totalInput = pathway.nodes
      .filter(n => n.type === 'source')
      .reduce((sum, node) => sum + node.energy, 0);

    const totalOutput = pathway.nodes
      .filter(n => n.type === 'sink')
      .reduce((sum, node) => sum + node.energy, 0);

    if (totalInput === 0) return 0;
    return totalOutput / totalInput;
  }

  /**
   * Calculate pathway stability
   */
  private calculateStability(pathway: MetabolicPathway): number {
    const energies = pathway.nodes.map(n => n.energy);
    const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
    const variance = energies.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / energies.length;

    // Stability is inversely related to variance
    return Math.exp(-variance / (mean * mean || 1));
  }

  /**
   * Implement feedback control for pathway regulation
   */
  regulatePathway(
    pathwayId: string,
    targetLevels: Record<string, number>,
    kp: number = 0.1, // Proportional gain
    ki: number = 0.01, // Integral gain
    kd: number = 0.05  // Derivative gain
  ): void {
    const pathway = this.pathways.get(pathwayId);
    if (!pathway) return;

    pathway.nodes.forEach(node => {
      const target = targetLevels[node.id];
      if (target === undefined) return;

      const error = target - node.energy;
      const controlSignal = kp * error; // Simple proportional control

      // Adjust connection rates based on control signal
      node.connections.forEach(conn => {
        if (conn.from === node.id) {
          conn.rate += controlSignal * 0.1;
          conn.rate = Math.max(0.01, conn.rate);
        }
      });
    });
  }

  /**
   * Simulate stress response (adaptive capacity)
   */
  stressResponse(pathwayId: string, stressFactor: number): BioComputationResult {
    const pathway = this.pathways.get(pathwayId);
    if (!pathway) throw new Error(`Pathway ${pathwayId} not found`);

    // Stress affects efficiency and increases degradation
    pathway.nodes.forEach(node => {
      node.efficiency *= (1 - stressFactor * 0.1);
      node.efficiency = Math.max(0.1, node.efficiency);

      node.degradation *= (1 + stressFactor * 0.2);
      node.degradation = Math.min(0.2, node.degradation);
    });

    // Simulate adaptation over time
    const result = this.simulateFlow(pathwayId, 20, 0.05);

    // Recovery phase
    pathway.nodes.forEach(node => {
      node.efficiency = Math.min(1.0, node.efficiency * 1.05); // Gradual recovery
      node.degradation *= 0.95; // Reduce degradation
    });

    return result;
  }

  /**
   * Implement metabolic memory (learning from past states)
   */
  metabolicMemory(pathwayId: string, memorySize: number = 10): void {
    const pathway = this.pathways.get(pathwayId);
    if (!pathway) return;

    // Store current state in memory
    if (!pathway.memory) {
      (pathway as any).memory = [];
    }

    const memory = (pathway as any).memory as Array<{
      timestamp: number;
      energies: Record<string, number>;
      efficiency: number;
      stability: number;
    }>;

    memory.push({
      timestamp: Date.now(),
      energies: pathway.nodes.reduce((acc, node) => {
        acc[node.id] = node.energy;
        return acc;
      }, {} as Record<string, number>),
      efficiency: pathway.efficiency,
      stability: pathway.stability
    });

    // Keep only recent memory
    if (memory.length > memorySize) {
      memory.shift();
    }

    // Use memory for adaptation
    if (memory.length > 1) {
      const recent = memory.slice(-3); // Last 3 states
      const avgEfficiency = recent.reduce((sum, m) => sum + m.efficiency, 0) / recent.length;

      if (avgEfficiency < 0.7) {
        // Trigger adaptation
        pathway.nodes.forEach(node => {
          node.efficiency *= 1.02; // Small efficiency boost
          node.efficiency = Math.min(1.0, node.efficiency);
        });
      }
    }
  }

  /**
   * Get pathway metrics
   */
  getMetrics(pathwayId: string): Record<string, number> {
    const pathway = this.pathways.get(pathwayId);
    if (!pathway) return {};

    const sourceEnergy = pathway.nodes
      .filter(n => n.type === 'source')
      .reduce((sum, n) => sum + n.energy, 0);

    const intermediateEnergy = pathway.nodes
      .filter(n => n.type === 'intermediate')
      .reduce((sum, n) => sum + n.energy, 0);

    const sinkEnergy = pathway.nodes
      .filter(n => n.type === 'sink')
      .reduce((sum, n) => sum + n.energy, 0);

    return {
      totalEnergy: pathway.totalEnergy,
      efficiency: pathway.efficiency,
      stability: pathway.stability,
      cycles: pathway.cycles,
      sourceEnergy,
      intermediateEnergy,
      sinkEnergy,
      activeConnections: pathway.nodes.reduce((sum, node) =>
        sum + node.connections.filter(c => c.active).length, 0)
    };
  }
}