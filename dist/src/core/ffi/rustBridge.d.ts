export interface RustBridge {
    call<TInput, TOutput>(moduleName: string, functionName: string, input: TInput): Promise<TOutput>;
}
export declare class NotImplementedRustBridge implements RustBridge {
    call<TInput, TOutput>(moduleName: string, functionName: string, _input: TInput): Promise<TOutput>;
}
//# sourceMappingURL=rustBridge.d.ts.map