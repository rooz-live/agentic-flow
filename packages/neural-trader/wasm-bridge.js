/**
 * wasm-bridge.js — CJS bridge for the neural-trader WASM engine.
 *
 * The wasm-pack generated pkg/ is ESM (Node.js v22 auto-detects `export`).
 * This bridge loads the WASM binary synchronously via WebAssembly API,
 * replicating the imports from the generated JS glue code.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const WASM_PATH = path.join(__dirname, 'pkg', 'neural_trader_bg.wasm');

if (!fs.existsSync(WASM_PATH)) {
  module.exports = null;
  return;
}

// ── Text encoding/decoding helpers ──────────────────────────────────
let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const cachedTextEncoder = new TextEncoder();

let cachedUint8ArrayMemory0 = null;
let cachedDataViewMemory0 = null;
let WASM_VECTOR_LEN = 0;
let wasm = null;

function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function getDataViewMemory0() {
  if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true ||
      (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

function decodeText(ptr, len) {
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return decodeText(ptr, len);
}

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }
  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;
  const mem = getUint8ArrayMemory0();
  let offset = 0;
  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7F) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) arg = arg.slice(offset);
    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);
    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }
  WASM_VECTOR_LEN = offset;
  return ptr;
}

function isLikeNone(x) { return x === undefined || x === null; }

function addToExternrefTable0(obj) {
  const idx = wasm.__externref_table_alloc();
  wasm.__wbindgen_externrefs.set(idx, obj);
  return idx;
}

function handleError(f, args) {
  try { return f.apply(this, args); }
  catch (e) { wasm.__wbindgen_exn_store(addToExternrefTable0(e)); }
}

// ── WASM imports ────────────────────────────────────────────────────
function getImports() {
  const import0 = {
    __proto__: null,
    __wbg___wbindgen_string_get_72fb696202c56729: function(arg0, arg1) {
      const obj = arg1;
      const ret = typeof obj === 'string' ? obj : undefined;
      var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      var len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4, len1, true);
      getDataViewMemory0().setInt32(arg0, ptr1, true);
    },
    __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbg_log_d80277cd666935de: function(arg0, arg1) {
      console.log(getStringFromWasm0(arg0, arg1));
    },
    __wbg_now_a3af9a2f4bbaa4d1: function() { return Date.now(); },
    __wbg_stringify_8d1cc6ff383e8bae: function() {
      return handleError(function(arg0) { return JSON.stringify(arg0); }, arguments);
    },
    __wbindgen_cast_0000000000000001: function(arg0, arg1) {
      return getStringFromWasm0(arg0, arg1);
    },
    __wbindgen_init_externref_table: function() {
      const table = wasm.__wbindgen_externrefs;
      const offset = table.grow(4);
      table.set(0, undefined);
      table.set(offset + 0, undefined);
      table.set(offset + 1, null);
      table.set(offset + 2, true);
      table.set(offset + 3, false);
    },
  };
  return { __proto__: null, './neural_trader_bg.js': import0 };
}

// ── Synchronous WASM load ───────────────────────────────────────────
const wasmBytes = fs.readFileSync(WASM_PATH);
const wasmModule = new WebAssembly.Module(wasmBytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, getImports());
wasm = wasmInstance.exports;
cachedDataViewMemory0 = null;
cachedUint8ArrayMemory0 = null;
wasm.__wbindgen_start();

// ── NeuralTrader class ──────────────────────────────────────────────
const NeuralTraderFinalization = (typeof FinalizationRegistry === 'undefined')
  ? { register: () => {}, unregister: () => {} }
  : new FinalizationRegistry(ptr => wasm.__wbg_neuraltrader_free(ptr >>> 0, 1));

class NeuralTrader {
  constructor(config) {
    const ret = wasm.neuraltrader_new(config);
    this.__wbg_ptr = ret >>> 0;
    NeuralTraderFinalization.register(this, this.__wbg_ptr, this);
  }
  free() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    NeuralTraderFinalization.unregister(this);
    wasm.__wbg_neuraltrader_free(ptr, 0);
  }
  initialize() { wasm.neuraltrader_initialize(this.__wbg_ptr); }
  analyze(market_data) { return wasm.neuraltrader_analyze(this.__wbg_ptr, market_data); }
  calculate_risk(position_data) { return wasm.neuraltrader_calculate_risk(this.__wbg_ptr, position_data); }
  get_health() { return wasm.neuraltrader_get_health(this.__wbg_ptr); }
}

function greet(name) {
  const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  wasm.greet(ptr0, WASM_VECTOR_LEN);
}

module.exports = { NeuralTrader, greet };
