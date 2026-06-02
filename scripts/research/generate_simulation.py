#!/usr/bin/env python3
"""BitNet 1-Bit Weight Quantization Simulator.

Demonstrates the mathematical constraints, forward pass, and weight clipping
associated with 1-bit linear layers (weights quantized to {-1, +1})
without external dependencies (pure Python standard library).
"""

import os
import json
import math
import random

def sign(val):
    return 1.0 if val >= 0 else -1.0

def mean(lst):
    return sum(lst) / len(lst) if lst else 0.0

def sign_quantize(weights):
    """Quantize weights using the sign function and scale parameter beta."""
    abs_weights = [abs(w) for w in weights]
    beta = mean(abs_weights)
    quantized_weights = [sign(w) for w in weights]
    return quantized_weights, beta

def dot_product(v1, v2):
    return sum(x * y for x, y in zip(v1, v2))

def simulated_forward_pass(x, weights_fp, bias):
    """Execute simulated forward pass for both full precision and 1-bit quantized states."""
    # 1. Full precision inference
    out_fp = [dot_product(x, weights_fp) + bias]
    
    # 2. 1-bit quantized inference
    weights_q, beta = sign_quantize(weights_fp)
    out_q = [beta * dot_product(x, weights_q) + bias]
    
    # Calculate Mean Squared Error
    mse = mean([(a - b) ** 2 for a, b in zip(out_fp, out_q)])
    return out_fp[0], out_q[0], mse

def main():
    random.seed(42)
    
    # Single sample features (8 inputs)
    x = [random.normalvariate(0, 1) for _ in range(8)]
    
    # Weights for a single output node (8 inputs)
    weights_fp = [random.normalvariate(0, 1) for _ in range(8)]
    bias = random.normalvariate(0, 1)
    
    out_fp, out_q, mse = simulated_forward_pass(x, weights_fp, bias)
    
    # Package results into a research artifact
    artifact = {
        "model_architecture": "BitNet-1-Bit-Linear-Sim-Stdlib",
        "input_shape": [1, len(x)],
        "weights_shape": [1, len(weights_fp)],
        "mean_squared_error_loss": float(mse),
        "quantized_states": {
            "beta": float(mean([abs(w) for w in weights_fp])),
            "difference_percentage": float(abs(out_fp - out_q) / (abs(out_fp) + 1e-9) * 100.0)
        }
    }
    
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    evidence_dir = os.path.join(project_root, ".goalie", "evidence", "research")
    os.makedirs(evidence_dir, exist_ok=True)
    
    report_path = os.path.join(evidence_dir, "bitnet_simulation_report.json")
    with open(report_path, "w") as f:
        json.dump(artifact, f, indent=2)
        f.write("\n")
        
    print(f"✅ Pure Python BitNet 1-bit simulation completed successfully.")
    print(f"Report written to: {report_path}")
    print(f"FP Output: {out_fp:.4f}, Quantized Output: {out_q:.4f}, MSE: {mse:.6f}")

if __name__ == "__main__":
    main()
