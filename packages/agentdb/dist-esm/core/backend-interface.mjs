/**
 * Backend interface for vector database implementations
 * Supports both native (better-sqlite3) and WASM (sql.js) backends
 */
/**
 * Backend type enum
 */
export var BackendType;
(function (BackendType) {
    BackendType["NATIVE"] = "native";
    BackendType["WASM"] = "wasm";
})(BackendType || (BackendType = {}));
