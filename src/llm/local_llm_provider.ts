/**
 * Local LLM Provider - Offline Inference Support
 * 
 * Integrates local LLM models (HuggingFace) for offline inference.
 * Primary model: GLM-4.7-REAP (pruned + quantized) for efficient deployment.
 * 
 * Models supported:
 * - GLM-4.7-REAP-50-W4A16: 50% pruned + INT4 quantized (~92GB, 179B params)
 * - GLM-4.7-REAP-218B-A32B-W4A16: 40% pruned + INT4 quantized (~108GB, 218B params)
 * 
 * Based on:
 * - https://huggingface.co/0xSero/GLM-4.7-REAP-50-W4A16
 * - https://huggingface.co/0xSero/GLM-4.7-REAP-218B-A32B-W4A16
 * 
 * WSJF Score: 3.33 (High value for offline capability)
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface LocalLLMConfig {
  modelId: string;
  modelPath?: string;  // Path to local model directory
  quantization: 'int4' | 'int8' | 'fp16' | 'bf16';
  device: 'cpu' | 'cuda' | 'mps';  // Apple Metal Performance Shaders
  maxTokens: number;
  temperature: number;
  topP: number;
}

export interface LocalLLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LocalLLMResponse {
  content: string;
  tokens: number;
  inferenceTimeMs: number;
  model: string;
}

export interface ModelMetadata {
  name: string;
  size: string;
  parameters: string;
  quantization: string;
  vramRequired: string;
  compression: string;
  capabilities: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORTED MODELS REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const SUPPORTED_MODELS: Record<string, ModelMetadata> = {
  'glm-4.7-reap-50': {
    name: 'GLM-4.7-REAP-50-W4A16',
    size: '~92GB',
    parameters: '179B total, 32B active per forward',
    quantization: 'INT4 weights, FP16 activations (W4A16)',
    vramRequired: '~95GB',
    compression: '6.5x from original (700GB → 92GB)',
    capabilities: [
      'code-generation',
      'function-calling',
      'conversational',
      'reasoning',
      'tool-use'
    ]
  },
  'glm-4.7-reap-218': {
    name: 'GLM-4.7-REAP-218B-A32B-W4A16',
    size: '~108GB',
    parameters: '218B total, 32B active per forward',
    quantization: 'INT4 weights, FP16 activations (W4A16)',
    vramRequired: '~110GB',
    compression: '6.5x from original (700GB → 108GB)',
    capabilities: [
      'code-generation',
      'function-calling',
      'conversational',
      'reasoning',
      'tool-use',
      'mixture-of-experts'
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL LLM PROVIDER IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

export class LocalLLMProvider {
  private config: LocalLLMConfig;
  private modelLoaded: boolean = false;
  private pythonProcess: any = null;
  private modelCache: Map<string, any> = new Map();

  constructor(config: Partial<LocalLLMConfig> = {}) {
    this.config = {
      modelId: 'glm-4.7-reap-50',
      quantization: 'int4',
      device: this.detectDevice(),
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      ...config
    };
  }

  /**
   * Initialize local LLM model
   * Downloads from HuggingFace if not cached locally
   */
  async initialize(): Promise<void> {
    console.log(`[LocalLLM] Initializing ${this.config.modelId}...`);
    
    const modelMeta = SUPPORTED_MODELS[this.config.modelId];
    if (!modelMeta) {
      throw new Error(`Unsupported model: ${this.config.modelId}`);
    }

    // Check if model is already cached
    const cacheDir = await this.getModelCacheDir();
    const modelPath = path.join(cacheDir, modelMeta.name);
    
    const exists = await this.checkModelExists(modelPath);
    if (!exists) {
      console.log(`[LocalLLM] Model not found locally. Downloading from HuggingFace...`);
      console.log(`[LocalLLM] This is a ${modelMeta.size} download and may take a while.`);
      await this.downloadModel(modelMeta.name, modelPath);
    } else {
      console.log(`[LocalLLM] Model found in cache: ${modelPath}`);
    }

    this.config.modelPath = modelPath;
    
    // Load model into memory
    await this.loadModel();
    
    this.modelLoaded = true;
    console.log(`[LocalLLM] ✓ Model loaded successfully`);
    console.log(`[LocalLLM] Device: ${this.config.device}`);
    console.log(`[LocalLLM] VRAM required: ${modelMeta.vramRequired}`);
  }

  /**
   * Generate response from local LLM
   */
  async generate(messages: LocalLLMMessage[]): Promise<LocalLLMResponse> {
    if (!this.modelLoaded) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    
    // Format messages for GLM-4 chat template
    const formattedPrompt = this.formatChatMessages(messages);
    
    // Run inference via Python subprocess (HuggingFace Transformers)
    const response = await this.runInference(formattedPrompt);
    
    const inferenceTimeMs = Date.now() - startTime;
    
    return {
      content: response.text,
      tokens: response.tokens,
      inferenceTimeMs,
      model: this.config.modelId
    };
  }

  /**
   * Stream response from local LLM (generator pattern)
   */
  async *generateStream(messages: LocalLLMMessage[]): AsyncGenerator<string, void, unknown> {
    if (!this.modelLoaded) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const formattedPrompt = this.formatChatMessages(messages);
    
    // Stream tokens as they're generated
    for await (const token of this.runInferenceStreaming(formattedPrompt)) {
      yield token;
    }
  }

  /**
   * Get model capabilities
   */
  getCapabilities(): string[] {
    const modelMeta = SUPPORTED_MODELS[this.config.modelId];
    return modelMeta?.capabilities || [];
  }

  /**
   * Check if model supports specific capability
   */
  hasCapability(capability: string): boolean {
    return this.getCapabilities().includes(capability);
  }

  /**
   * Unload model from memory
   */
  async unload(): Promise<void> {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
    this.modelLoaded = false;
    console.log('[LocalLLM] Model unloaded');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE IMPLEMENTATION METHODS
  // ───────────────────────────────────────────────────────────────────────────

  private detectDevice(): 'cpu' | 'cuda' | 'mps' {
    // Detect Apple Silicon (M-series chips)
    if (process.platform === 'darwin' && process.arch === 'arm64') {
      return 'mps';  // Metal Performance Shaders
    }
    
    // Check for CUDA availability
    // In production, would use nvidia-smi or similar
    return 'cpu';  // Fallback to CPU
  }

  private async getModelCacheDir(): Promise<string> {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const cacheDir = path.join(homeDir, '.cache', 'huggingface', 'hub');
    
    // Ensure directory exists
    await fs.mkdir(cacheDir, { recursive: true });
    
    return cacheDir;
  }

  private async checkModelExists(modelPath: string): Promise<boolean> {
    try {
      await fs.access(modelPath);
      return true;
    } catch {
      return false;
    }
  }

  private async downloadModel(modelName: string, targetPath: string): Promise<void> {
    console.log(`[LocalLLM] Downloading ${modelName}...`);
    console.log('[LocalLLM] Using HuggingFace CLI: huggingface-cli download');
    
    // Download using HuggingFace CLI
    const downloadScript = `
import sys
from huggingface_hub import snapshot_download

model_id = "0xSero/${modelName}"
cache_dir = "${targetPath}"

try:
    print(f"Downloading {model_id}...")
    snapshot_download(repo_id=model_id, cache_dir=cache_dir, resume_download=True)
    print("Download complete!")
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

    await this.runPythonScript(downloadScript);
  }

  private async loadModel(): Promise<void> {
    console.log('[LocalLLM] Loading model into memory...');
    
    const modelPath = this.config.modelPath!;
    const device = this.config.device;
    
    // Initialize Python inference server
    const inferenceScript = `
import sys
import json
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

model_path = "${modelPath}"
device = "${device}"

print("Loading tokenizer...", file=sys.stderr)
tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)

print("Loading model...", file=sys.stderr)
model = AutoModelForCausalLM.from_pretrained(
    model_path,
    trust_remote_code=True,
    torch_dtype=torch.float16 if device == "cuda" or device == "mps" else torch.float32,
    device_map="auto" if device == "cuda" else device
)

print("Model loaded successfully", file=sys.stderr)
print(json.dumps({"status": "ready"}))
sys.stdout.flush()

# Keep process alive for inference requests
while True:
    try:
        line = sys.stdin.readline()
        if not line:
            break
            
        request = json.loads(line)
        prompt = request["prompt"]
        max_tokens = request.get("max_tokens", 2048)
        temperature = request.get("temperature", 0.7)
        
        inputs = tokenizer(prompt, return_tensors="pt")
        if device == "cuda" or device == "mps":
            inputs = {k: v.to(device) for k, v in inputs.items()}
        
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=temperature,
            do_sample=True
        )
        
        response_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        num_tokens = len(outputs[0])
        
        result = {
            "text": response_text,
            "tokens": num_tokens
        }
        
        print(json.dumps(result))
        sys.stdout.flush()
        
    except Exception as e:
        error = {"error": str(e)}
        print(json.dumps(error))
        sys.stdout.flush()
`;

    this.pythonProcess = spawn('python3', ['-c', inferenceScript], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for model to be loaded
    return new Promise((resolve, reject) => {
      let buffer = '';
      
      this.pythonProcess.stdout.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          try {
            const message = JSON.parse(line);
            if (message.status === 'ready') {
              resolve();
            }
          } catch {
            // Ignore non-JSON output
          }
        }
      });

      this.pythonProcess.stderr.on('data', (data: Buffer) => {
        console.log(`[LocalLLM] ${data.toString()}`);
      });

      this.pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });

      this.pythonProcess.on('exit', (code: number) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}`));
        }
      });
    });
  }

  private formatChatMessages(messages: LocalLLMMessage[]): string {
    // GLM-4 chat template format
    let formatted = '';
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        formatted += `[System]\n${msg.content}\n\n`;
      } else if (msg.role === 'user') {
        formatted += `[User]\n${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        formatted += `[Assistant]\n${msg.content}\n\n`;
      }
    }
    
    formatted += '[Assistant]\n';
    return formatted;
  }

  private async runInference(prompt: string): Promise<{ text: string; tokens: number }> {
    if (!this.pythonProcess) {
      throw new Error('Python inference process not initialized');
    }

    const request = {
      prompt,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature
    };

    return new Promise((resolve, reject) => {
      let buffer = '';
      
      const dataHandler = (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.error) {
              reject(new Error(response.error));
            } else if (response.text) {
              this.pythonProcess.stdout.off('data', dataHandler);
              resolve(response);
            }
          } catch {
            // Ignore non-JSON output
          }
        }
      };

      this.pythonProcess.stdout.on('data', dataHandler);
      this.pythonProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  private async *runInferenceStreaming(prompt: string): AsyncGenerator<string, void, unknown> {
    // Streaming implementation would use model.generate with streamer
    // For now, fallback to non-streaming
    const response = await this.runInference(prompt);
    yield response.text;
  }

  private async runPythonScript(script: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('python3', ['-c', script]);
      
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        console.log(data.toString());
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python script failed: ${stderr}`));
        }
      });
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USAGE EXAMPLES & TESTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example: Initialize and use local LLM
 */
export async function exampleUsage() {
  const llm = new LocalLLMProvider({
    modelId: 'glm-4.7-reap-50',  // Smaller model
    temperature: 0.7,
    maxTokens: 1024
  });

  await llm.initialize();

  const messages: LocalLLMMessage[] = [
    {
      role: 'system',
      content: 'You are a helpful AI assistant specialized in code generation.'
    },
    {
      role: 'user',
      content: 'Write a Python function to calculate Fibonacci numbers.'
    }
  ];

  const response = await llm.generate(messages);
  console.log('Response:', response.content);
  console.log(`Generated ${response.tokens} tokens in ${response.inferenceTimeMs}ms`);

  await llm.unload();
}

/**
 * Example: Streaming generation
 */
export async function exampleStreaming() {
  const llm = new LocalLLMProvider({
    modelId: 'glm-4.7-reap-50'
  });

  await llm.initialize();

  const messages: LocalLLMMessage[] = [
    {
      role: 'user',
      content: 'Explain quantum computing in simple terms.'
    }
  ];

  process.stdout.write('Assistant: ');
  for await (const token of llm.generateStream(messages)) {
    process.stdout.write(token);
  }
  console.log('\n');

  await llm.unload();
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default LocalLLMProvider;
