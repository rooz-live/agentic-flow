import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface DSPyOptions {
  scriptPath: string;
  args?: string[];
  cwd?: string;
}

interface DSPyResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Executes a Python DSPy script via child_process.
 * This acts as a bridge to leverage Python's native DSPy capabilities from TypeScript.
 */
export async function executeDSPyScript(options: DSPyOptions): Promise<DSPyResult> {
  return new Promise((resolve) => {
    const { scriptPath, args = [], cwd } = options;
    
    // Ensure we resolve the absolute path if not already provided
    const absoluteScriptPath = path.isAbsolute(scriptPath) 
      ? scriptPath 
      : path.resolve(cwd || process.cwd(), scriptPath);

    console.log(`[DSPy Bridge] Executing: python3 ${absoluteScriptPath} ${args.join(' ')}`);

    const pythonProcess = spawn('python3', [absoluteScriptPath, ...args], {
      cwd: cwd || process.cwd(),
      env: { ...process.env, PYTHONUNBUFFERED: '1' }, // Ensure real-time output
    });

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          output: stdoutData.trim(),
        });
      } else {
        resolve({
          success: false,
          output: stdoutData.trim(),
          error: stderrData.trim() || `Process exited with code ${code}`,
        });
      }
    });

    pythonProcess.on('error', (err) => {
      resolve({
        success: false,
        output: stdoutData.trim(),
        error: err.message,
      });
    });
  });
}

// Simple CLI wrapper for testing the bridge independently
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const script = process.argv[2];
  const scriptArgs = process.argv.slice(3);
  
  if (!script) {
    console.error('Usage: npx ts-node dspy.ts <python_script_path> [args...]');
    process.exit(1);
  }

  executeDSPyScript({ scriptPath: script, args: scriptArgs })
    .then((result) => {
      if (result.success) {
        console.log(result.output);
      } else {
        console.error('DSPy execution failed:', result.error);
        process.exit(1);
      }
    });
}