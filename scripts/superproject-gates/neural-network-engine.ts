/**
 * Neural Network Engine
 *
 * Implements adaptive neural networks for pattern recognition and learning
 * in bio-inspired computational architectures
 */

import { NeuralNetwork, Neuron, NeuralLayer, ActivationFunction, LossFunction, Optimizer, BioComputationResult } from './types';

export class NeuralNetworkEngine {
  private networks: Map<string, NeuralNetwork> = new Map();

  constructor() {}

  /**
   * Create a new neural network with specified architecture
   */
  createNetwork(
    id: string,
    layerSizes: number[],
    activationFunctions: ActivationFunction[],
    learningRate: number = 0.01,
    lossFunction: LossFunction = 'mse',
    optimizer: Optimizer = 'adam'
  ): NeuralNetwork {
    const layers: NeuralLayer[] = [];

    // Input layer
    layers.push(this.createLayer(`layer-0`, layerSizes[0], activationFunctions[0] || 'relu'));

    // Hidden layers
    for (let i = 1; i < layerSizes.length - 1; i++) {
      layers.push(this.createLayer(`layer-${i}`, layerSizes[i], activationFunctions[i] || 'relu'));
    }

    // Output layer
    layers.push(this.createLayer(`layer-${layerSizes.length - 1}`, layerSizes[layerSizes.length - 1], activationFunctions[layerSizes.length - 1] || 'sigmoid'));

    // Connect layers
    for (let i = 1; i < layers.length; i++) {
      this.connectLayers(layers[i - 1], layers[i]);
    }

    const network: NeuralNetwork = {
      id,
      layers,
      learningRate,
      lossFunction,
      optimizer,
      metrics: {
        accuracy: 0,
        loss: 0,
        epochs: 0
      }
    };

    this.networks.set(id, network);
    return network;
  }

  /**
   * Create a neural layer
   */
  private createLayer(id: string, size: number, activation: ActivationFunction): NeuralLayer {
    const neurons: Neuron[] = [];

    for (let i = 0; i < size; i++) {
      neurons.push({
        id: `${id}-neuron-${i}`,
        layer: parseInt(id.split('-')[1]),
        activation: 0,
        bias: Math.random() * 0.1 - 0.05,
        weights: [],
        inputs: [],
        output: 0
      });
    }

    return {
      id,
      neurons,
      activationFunction: activation
    };
  }

  /**
   * Connect two layers with random weights
   */
  private connectLayers(fromLayer: NeuralLayer, toLayer: NeuralLayer): void {
    toLayer.neurons.forEach(neuron => {
      neuron.weights = fromLayer.neurons.map(() => Math.random() * 0.1 - 0.05);
    });
  }

  /**
   * Forward propagation through the network
   */
  forward(networkId: string, inputs: number[]): number[] {
    const network = this.networks.get(networkId);
    if (!network) throw new Error(`Network ${networkId} not found`);

    // Set input layer activations
    network.layers[0].neurons.forEach((neuron, i) => {
      neuron.activation = inputs[i] || 0;
      neuron.output = this.activate(inputs[i] || 0, network.layers[0].activationFunction);
    });

    // Propagate through hidden and output layers
    for (let i = 1; i < network.layers.length; i++) {
      const layer = network.layers[i];
      const prevLayer = network.layers[i - 1];

      layer.neurons.forEach(neuron => {
        const sum = neuron.weights.reduce((acc, weight, j) => {
          return acc + weight * prevLayer.neurons[j].output;
        }, neuron.bias);

        neuron.activation = sum;
        neuron.output = this.activate(sum, layer.activationFunction);
      });
    }

    // Return output layer
    return network.layers[network.layers.length - 1].neurons.map(n => n.output);
  }

  /**
   * Apply activation function
   */
  private activate(x: number, func: ActivationFunction): number {
    switch (func) {
      case 'sigmoid':
        return 1 / (1 + Math.exp(-x));
      case 'tanh':
        return Math.tanh(x);
      case 'relu':
        return Math.max(0, x);
      case 'leakyRelu':
        return x > 0 ? x : 0.01 * x;
      case 'softmax':
        // Softmax is handled at layer level
        return x;
      default:
        return x;
    }
  }

  /**
   * Train the network with backpropagation
   */
  train(networkId: string, inputs: number[][], targets: number[][], epochs: number = 100): BioComputationResult {
    const network = this.networks.get(networkId);
    if (!network) throw new Error(`Network ${networkId} not found`);

    let totalLoss = 0;
    let correct = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      totalLoss = 0;
      correct = 0;

      for (let i = 0; i < inputs.length; i++) {
        const output = this.forward(networkId, inputs[i]);
        const loss = this.calculateLoss(output, targets[i], network.lossFunction);
        totalLoss += loss;

        // Calculate accuracy for classification
        if (network.layers[network.layers.length - 1].activationFunction === 'softmax') {
          const predicted = output.indexOf(Math.max(...output));
          const actual = targets[i].indexOf(Math.max(...targets[i]));
          if (predicted === actual) correct++;
        }

        this.backpropagate(networkId, output, targets[i]);
        this.updateWeights(networkId);
      }

      network.metrics.loss = totalLoss / inputs.length;
      network.metrics.accuracy = correct / inputs.length;
      network.metrics.epochs = epoch + 1;
    }

    return {
      neuralOutput: this.forward(networkId, inputs[inputs.length - 1]),
      convergence: network.metrics.loss < 0.01,
      iterations: epochs,
      fitness: 1 - network.metrics.loss,
      energyEfficiency: 0.95 // Placeholder
    };
  }

  /**
   * Calculate loss
   */
  private calculateLoss(output: number[], target: number[], lossFunc: LossFunction): number {
    switch (lossFunc) {
      case 'mse':
        return output.reduce((sum, o, i) => sum + Math.pow(o - target[i], 2), 0) / output.length;
      case 'crossEntropy':
        return -output.reduce((sum, o, i) => sum + target[i] * Math.log(o + 1e-10), 0);
      case 'mae':
        return output.reduce((sum, o, i) => sum + Math.abs(o - target[i]), 0) / output.length;
      default:
        return 0;
    }
  }

  /**
   * Backpropagation
   */
  private backpropagate(networkId: string, output: number[], target: number[]): void {
    const network = this.networks.get(networkId);
    if (!network) return;

    const outputLayer = network.layers[network.layers.length - 1];

    // Calculate output layer gradients
    outputLayer.neurons.forEach((neuron, i) => {
      const error = output[i] - target[i];
      neuron.gradient = error * this.activationDerivative(neuron.activation, outputLayer.activationFunction);
    });

    // Backpropagate through hidden layers
    for (let i = network.layers.length - 2; i >= 0; i--) {
      const layer = network.layers[i];
      const nextLayer = network.layers[i + 1];

      layer.neurons.forEach((neuron, j) => {
        const error = nextLayer.neurons.reduce((sum, nextNeuron, k) => {
          return sum + nextNeuron.weights[j] * (nextNeuron.gradient || 0);
        }, 0);

        neuron.gradient = error * this.activationDerivative(neuron.activation, layer.activationFunction);
      });
    }
  }

  /**
   * Activation function derivative
   */
  private activationDerivative(x: number, func: ActivationFunction): number {
    switch (func) {
      case 'sigmoid':
        const sig = 1 / (1 + Math.exp(-x));
        return sig * (1 - sig);
      case 'tanh':
        return 1 - Math.pow(Math.tanh(x), 2);
      case 'relu':
        return x > 0 ? 1 : 0;
      case 'leakyRelu':
        return x > 0 ? 1 : 0.01;
      default:
        return 1;
    }
  }

  /**
   * Update weights using gradients
   */
  private updateWeights(networkId: string): void {
    const network = this.networks.get(networkId);
    if (!network) return;

    for (let i = 1; i < network.layers.length; i++) {
      const layer = network.layers[i];
      const prevLayer = network.layers[i - 1];

      layer.neurons.forEach(neuron => {
        // Update bias
        neuron.bias -= network.learningRate * (neuron.gradient || 0);

        // Update weights
        neuron.weights.forEach((weight, j) => {
          neuron.weights[j] -= network.learningRate * (neuron.gradient || 0) * prevLayer.neurons[j].output;
        });
      });
    }
  }

  /**
   * Get network metrics
   */
  getMetrics(networkId: string): Record<string, number> {
    const network = this.networks.get(networkId);
    return network ? { ...network.metrics } : {};
  }
}