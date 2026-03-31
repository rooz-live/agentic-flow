export class NotImplementedRustBridge {
    async call(moduleName, functionName, _input) {
        throw new Error(`Rust bridge not implemented. Attempted call: ${moduleName}.${functionName}. ` +
            'Next step: ship a Rust crate and expose it via Node-API (napi-rs) or WASM.');
    }
}
//# sourceMappingURL=rustBridge.js.map