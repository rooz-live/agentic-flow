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
export declare function executeDSPyScript(options: DSPyOptions): Promise<DSPyResult>;
export {};
//# sourceMappingURL=dspy.d.ts.map