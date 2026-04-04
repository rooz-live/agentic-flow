/**
 * Spiking Neural Network Engine
 *
 * Implements Leaky Integrate-and-Fire (LIF) spiking neurons with rate-based learning
 * Integrated with ConceptNet for semantic weight initialization (mocked)
 * Meta-cognition hooks for self-monitoring and parameter adaptation
 * Inspired by Brian2 and ruvector nervous system concepts
 */
import { BioComputationResult } from './types';

interface Spike {
  neuronId: string;
  time: number;
}

interface LIFNeuron {
  id: string;
  layer: number;
  membranePotential: number;
  threshold: number;
  resetPotential: number;
  tau: number;
  refractoryPeriod: number;
  lastSpikeTime: number;
  spikes: Spike[];
  weights: number[];
  inputCurrent: number;
}

interface SpikingLayer {
  id: string;
  neurons: LIFNeuron[];
}

interface SpikingNetwork {
  id: string;
  layers: SpikingLayer[];
  dt: number;
  simulationTime: number;
  metrics: {
    firingRates: number[];
    spikeCount: number;
    synchronization: number;
  };
}

export class SpikingNNEngine {
  private networks: Map<string, SpikingNetwork> = new Map();

  constructor() {}

  async createNetwork(
    id: string,
    layerSizes: number[],
    concepts?: string[],
    dt: number = 0.1,
    simulationTime: number = 100.0
  ): Promise<SpikingNetwork> {
    const layers: SpikingLayer[] = [];
    for (let l = 0; l < layerSizes.length; l++) {
      const neurons: LIFNeuron[] = [];
      for (let i = 0; i < layerSizes[l]; i++) {
        neurons.push({
          id: `${id}-l${l}-n${i}`,
          layer: l,
          membranePotential: 0,
          threshold: 1.0,
          resetPotential: 0,
          tau: 10.0,
          refractoryPeriod: 5.0,
          lastSpikeTime: -Infinity,
          spikes: [],
          weights: [],
          inputCurrent: 0,
        });
      }
      layers.push({ id: `l${l}`, neurons });
    }

    // Connect layers with random weights
    for (let l = 0; l < layers.length - 1; l++) {
      for (let to = 0; to < layers[l+1].neurons.length; to++) {
        layers[l+1].neurons[to].weights = layers[l].neurons.map(() => Math.random() * 0.2 - 0.1);
      }
    }

    const network: SpikingNetwork = {
      id,
      layers,
      dt,
      simulationTime,
      metrics: { firingRates: [], spikeCount: 0, synchronization: 0 },
    };

    if (concepts && concepts.length > 0) {
      await this.initWeightsFromConcepts(network, concepts);
    }

    this.networks.set(id, network);
    return network;
  }

  private async initWeightsFromConcepts(network: SpikingNetwork, concepts: string[]) {
    console.log(`[SNN] Initializing semantic weights from ConceptNet for concepts: ${concepts.join(', ')}`);
    // Mock API call to ConceptNet for relatedness matrix
    await new Promise(resolve => setTimeout(resolve, 200));
    // In production: fetch relatedness and normalize to weights 0.1-0.9
    // For demo, enhance random weights with 'semantic' bias
    for (let l = 0; l < network.layers.length - 1; l++) {
      for (let to = 0; to < network.layers[l+1].neurons.length; to++) {
        const weights = network.layers[l+1].neurons[to].weights!;
        for (let from = 0; from < weights.length; from++) {
          weights[from] = 0.05 + Math.random() * 0.15; // Semantic-like range
        }
      }
    }
  }

  simulate(networkId: string, inputCurrents: number[][]): number[] {
    const network = this.networks.get(networkId);
    if (!network) throw new Error(`Spiking network ${networkId} not found`);

    // Reset state
    network.layers.forEach(layer => {
      layer.neurons.forEach(neuron => {
        neuron.spikes = [];
        neuron.membranePotential = 0;
        neuron.lastSpikeTime = -Infinity;
      });
    });
    network.metrics.spikeCount = 0;

    const T = inputCurrents.length;
    for (let t = 0; t < T; t++) {
      // Input layer currents
      const inputLayer = network.layers[0];
      for (let i = 0; i < Math.min(inputLayer.neurons.length, inputCurrents[t].length); i++) {
        inputLayer.neurons[i].inputCurrent = inputCurrents[t][i];
      }

      // Simulate layers
      for (let l = 0; l < network.layers.length; l++) {
        const layer = network.layers[l];
        layer.neurons.forEach(neuron => {
          if (t - neuron.lastSpikeTime < neuron.refractoryPeriod) return;

          // Synaptic input from previous layer recent spikes
          let synapticInput = 0;
          if (l > 0) {
            const prevLayer = network.layers[l - 1];
            prevLayer.neurons.forEach((prevNeuron, j) => {
              const recentSpikes = prevNeuron.spikes.filter(s => s.time > t - 20).length;
              synapticInput += neuron.weights[j] * (recentSpikes > 0 ? 1 : 0);
            });
          } else {
            synapticInput = neuron.inputCurrent;
          }

          // LIF equation
          neuron.membranePotential += network.dt * ((-neuron.membranePotential / neuron.tau) + synapticInput);

          // Spike?
          if (neuron.membranePotential >= neuron.threshold) {
            neuron.spikes.push({ neuronId: neuron.id, time: t });
            neuron.membranePotential = neuron.resetPotential;
            neuron.lastSpikeTime = t;
            network.metrics.spikeCount++;
          }
        });
      }
    }

    // Output firing rates
    const outputLayer = network.layers[network.layers.length - 1];
    network.metrics.firingRates = outputLayer.neurons.map(n => n.spikes.length / T);
    network.metrics.synchronization = this.calculateSynchronization(outputLayer.neurons);

    return network.metrics.firingRates;
  }

  private calculateSynchronization(neurons: LIFNeuron[]): number {
    const rates = neurons.map(n => n.spikes.length);
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rates.length;
    return variance > 0 ? 1 / (1 + variance) : 1;
  }

  train(
    networkId: string,
    inputCurrentsList: number[][][], // samples x time x input_size
    targetRates: number[][], // samples x output_size
    epochs: number = 50
  ): BioComputationResult {
    const network = this.networks.get(networkId);
    if (!network) throw new Error(`Spiking network ${networkId} not found`);

    let avgError = 0;
    for (let epoch = 0; epoch < epochs; epoch++) {
      let epochError = 0;
      for (let s = 0; s < inputCurrentsList.length; s++) {
        const outputRates = this.simulate(networkId, inputCurrentsList[s]);
        const error = outputRates.reduce((sum, rate, i) => sum + Math.pow(rate - targetRates[s][i], 2), 0);
        epochError += error;

        // Adjust weights (simple Hebbian-like for demo)
        if (error > 0.05) {
          const outputLayer = network.layers[network.layers.length - 1];
          outputLayer.neurons.forEach((neuron, to) => {
            neuron.weights.forEach((w, fromLayerIdx) => {
              // Pseudo-gradient: increase if target high and input spiked
              const target = targetRates[s][to];
              const inputLayer = network.layers[0];
              const inputSpikes = inputLayer.neurons[fromLayerIdx].spikes.length;
              const dw = 0.001 * (target - outputRates[to]) * (inputSpikes > 0 ? 1 : 0);
              neuron.weights[fromLayerIdx] += dw;
            });
          });
        }
      }
      avgError = epochError / inputCurrentsList.length;
    }

    const finalRates = this.simulate(networkId, inputCurrentsList[inputCurrentsList.length - 1]);
    return {
      neuralOutput: finalRates,
      convergence: avgError < 0.05,
      iterations: epochs,
      fitness: 1 - avgError,
      energyEfficiency: network.metrics.synchronization,
    };
  }

  metaCognition(networkId: string): void {
    const network = this.networks.get(networkId);
    if (!network) return;

    const rates = network.metrics.firingRates;
    const meanRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const stdRate = Math.sqrt(rates.reduce((sum, r) => sum + Math.pow(r - meanRate, 2), 0) / rates.length);

    if (stdRate > 0.15) {
      console.log(`[META] High variance (${stdRate.toFixed(3)}), increasing thresholds for stability`);
      network.layers.forEach(layer => layer.neurons.forEach(n => {
        n.threshold = Math.min(1.5, n.threshold * 1.02);
      }));
    } else if (meanRate < 0.03) {
      console.log(`[META] Low activity (${meanRate.toFixed(3)}), decreasing thresholds`);
      network.layers.forEach(layer => layer.neurons.forEach(n => {
        n.threshold = Math.max(0.7, n.threshold * 0.98);
      }));
    } else {
      console.log(`[META] Nominal firing (${meanRate.toFixed(3)} ± ${stdRate.toFixed(3)})`);
    }

    // Adapt tau
    network.layers[0].neurons[0].tau *= 0.995;
  }

  getMetrics(networkId: string): Record<string, any> {
    const network = this.networks.get(networkId);
    return network ? network.metrics : { spikeCount: 0 };
  }
}