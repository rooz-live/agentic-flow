export interface RustBridge {
  call<TInput, TOutput>(moduleName: string, functionName: string, input: TInput): Promise<TOutput>;
}

export class NotImplementedRustBridge implements RustBridge {
  async call<TInput, TOutput>(
    moduleName: string,
    functionName: string,
    _input: TInput,
  ): Promise<TOutput> {
    throw new Error(
      `Rust bridge not implemented. Attempted call: ${moduleName}.${functionName}. ` +
        'Next step: ship a Rust crate and expose it via Node-API (napi-rs) or WASM.',
    );
  }
}
