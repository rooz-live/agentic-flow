/**
 * @file Test Helpers
 * @description Utility functions and helpers for test execution and validation
 */

import { jest } from '@jest/globals';

/**
 * Test Helper Utilities
 */
export class TestHelpers {
  /**
   * Wait for a specified amount of time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for a condition to be true
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await this.wait(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 100
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.wait(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    return {
      result,
      duration: endTime - startTime
    };
  }

  /**
   * Generate random string
   */
  static randomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Generate random number within range
   */
  static randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random boolean
   */
  static randomBoolean(probability: number = 0.5): boolean {
    return Math.random() < probability;
  }

  /**
   * Generate random date within range
   */
  static randomDate(start: Date, end: Date): Date {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + Math.random() * (endTime - startTime);
    return new Date(randomTime);
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Compare two objects for deep equality
   */
  static deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  /**
   * Check if object has property
   */
  static hasProperty(obj: any, path: string): boolean {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined, obj) !== undefined;
  }

  /**
   * Get nested property from object
   */
  static getProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => 
      current && current[key], obj);
  }

  /**
   * Set nested property in object
   */
  static setProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  /**
   * Remove nested property from object
   */
  static removeProperty(obj: any, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => 
      current && current[key], obj);
    
    if (target && target[lastKey] !== undefined) {
      delete target[lastKey];
    }
  }

  /**
   * Create mock function with implementation
   */
  static mockFn<T extends any[], R>(
    implementation?: (...args: T) => R
  ): jest.MockedFunction<(...args: T) => R> {
    return jest.fn().mockImplementation(implementation || (() => {} as any));
  }

  /**
   * Create mock async function
   */
  static mockAsyncFn<T extends any[], R>(
    implementation?: (...args: T) => Promise<R>
  ): jest.MockedFunction<(...args: T) => Promise<R>> {
    return jest.fn().mockImplementation(
      implementation || (() => Promise.resolve({} as R))
    );
  }

  /**
   * Create mock object with properties
   */
  static mockObject<T extends Record<string, any>>(
    properties: Partial<T>
  ): T {
    return properties as T;
  }

  /**
   * Create mock class
   */
  static mockClass<T extends new (...args: any[]) => any>(
    constructor: T,
    methods?: Record<string, jest.Mock>
  ): jest.MockedClass<T> {
    const mockClass = jest.fn(constructor) as jest.MockedClass<T>;
    
    if (methods) {
      Object.assign(mockClass.prototype, methods);
    }
    
    return mockClass;
  }

  /**
   * Spy on object method
   */
  static spyOn<T extends object, K extends keyof T>(
    obj: T,
    method: K
  ): jest.SpyInstance<T[K]> {
    return jest.spyOn(obj, method);
  }

  /**
   * Restore all mocks
   */
  static restoreAllMocks(): void {
    jest.restoreAllMocks();
  }

  /**
   * Clear all mocks
   */
  static clearAllMocks(): void {
    jest.clearAllMocks();
  }

  /**
   * Reset all mocks
   */
  static resetAllMocks(): void {
    jest.resetAllMocks();
  }

  /**
   * Create test context with cleanup
   */
  static createTestContext(): {
    cleanup: () => void;
    addCleanup: (fn: () => void) => void;
  } {
    const cleanupFunctions: (() => void)[] = [];
    
    return {
      cleanup: () => {
        cleanupFunctions.forEach(fn => {
          try {
            fn();
          } catch (error) {
            console.error('Error during cleanup:', error);
          }
        });
        cleanupFunctions.length = 0;
      },
      
      addCleanup: (fn: () => void) => {
        cleanupFunctions.push(fn);
      }
    };
  }

  /**
   * Create performance monitor
   */
  static createPerformanceMonitor(): {
    start: (name: string) => void;
    end: (name: string) => number;
    getMeasurements: () => Record<string, number[]>;
    getAverage: (name: string) => number;
    clear: () => void;
  } {
    const measurements: Record<string, number[]> = {};
    const startTimes: Record<string, number> = {};
    
    return {
      start: (name: string) => {
        startTimes[name] = performance.now();
      },
      
      end: (name: string) => {
        const startTime = startTimes[name];
        if (startTime === undefined) {
          throw new Error(`No start time recorded for '${name}'`);
        }
        
        const duration = performance.now() - startTime;
        
        if (!measurements[name]) {
          measurements[name] = [];
        }
        measurements[name].push(duration);
        
        delete startTimes[name];
        return duration;
      },
      
      getMeasurements: () => ({ ...measurements }),
      
      getAverage: (name: string) => {
        const values = measurements[name];
        if (!values || values.length === 0) {
          return 0;
        }
        
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      },
      
      clear: () => {
        Object.keys(measurements).forEach(key => delete measurements[key]);
        Object.keys(startTimes).forEach(key => delete startTimes[key]);
      }
    };
  }

  /**
   * Create memory monitor
   */
  static createMemoryMonitor(): {
    getUsage: () => NodeJS.MemoryUsage;
    track: (name: string) => void;
    getSnapshots: () => Record<string, NodeJS.MemoryUsage[]>;
    clear: () => void;
  } {
    const snapshots: Record<string, NodeJS.MemoryUsage[]> = {};
    
    return {
      getUsage: () => process.memoryUsage(),
      
      track: (name: string) => {
        if (!snapshots[name]) {
          snapshots[name] = [];
        }
        snapshots[name].push(process.memoryUsage());
      },
      
      getSnapshots: () => ({ ...snapshots }),
      
      clear: () => {
        Object.keys(snapshots).forEach(key => delete snapshots[key]);
      }
    };
  }

  /**
   * Create error tracker
   */
  static createErrorTracker(): {
    track: (error: Error) => void;
    getErrors: () => Error[];
    hasErrors: () => boolean;
    clear: () => void;
  } {
    const errors: Error[] = [];
    
    return {
      track: (error: Error) => {
        errors.push(error);
      },
      
      getErrors: () => [...errors],
      
      hasErrors: () => errors.length > 0,
      
      clear: () => {
        errors.length = 0;
      }
    };
  }

  /**
   * Create event emitter for testing
   */
  static createEventEmitter(): {
    emit: (event: string, ...args: any[]) => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
    off: (event: string, listener: (...args: any[]) => void) => void;
    once: (event: string, listener: (...args: any[]) => void) => void;
    removeAllListeners: (event?: string) => void;
    getListeners: (event: string) => Function[];
  } {
    const listeners: Record<string, Function[]> = {};
    
    return {
      emit: (event: string, ...args: any[]) => {
        const eventListeners = listeners[event] || [];
        eventListeners.forEach(listener => {
          try {
            listener(...args);
          } catch (error) {
            console.error(`Error in event listener for '${event}':`, error);
          }
        });
      },
      
      on: (event: string, listener: (...args: any[]) => void) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(listener);
      },
      
      off: (event: string, listener: (...args: any[]) => void) => {
        const eventListeners = listeners[event];
        if (eventListeners) {
          const index = eventListeners.indexOf(listener);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      },
      
      once: (event: string, listener: (...args: any[]) => void) => {
        const onceListener = (...args: any[]) => {
          listener(...args);
          this.off(event, onceListener);
        };
        this.on(event, onceListener);
      },
      
      removeAllListeners: (event?: string) => {
        if (event) {
          delete listeners[event];
        } else {
          Object.keys(listeners).forEach(key => delete listeners[key]);
        }
      },
      
      getListeners: (event: string) => [...(listeners[event] || [])]
    };
  }

  /**
   * Create file system mock
   */
  static createFileSystemMock(): {
    files: Record<string, string | Buffer>;
    existsSync: (path: string) => boolean;
    readFileSync: (path: string) => string | Buffer;
    writeFileSync: (path: string, data: string | Buffer) => void;
    unlinkSync: (path: string) => void;
    mkdirSync: (path: string) => void;
    readdirSync: (path: string) => string[];
    statSync: (path: string) => { isFile: () => boolean; isDirectory: () => boolean };
  } {
    const files: Record<string, string | Buffer> = {};
    
    return {
      files,
      
      existsSync: (path: string) => {
        return files.hasOwnProperty(path);
      },
      
      readFileSync: (path: string) => {
        if (!files.hasOwnProperty(path)) {
          throw new Error(`ENOENT: no such file or directory, open '${path}'`);
        }
        return files[path];
      },
      
      writeFileSync: (path: string, data: string | Buffer) => {
        files[path] = data;
      },
      
      unlinkSync: (path: string) => {
        if (!files.hasOwnProperty(path)) {
          throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
        }
        delete files[path];
      },
      
      mkdirSync: (path: string) => {
        files[path] = '';
      },
      
      readdirSync: (path: string) => {
        return Object.keys(files).filter(file => file.startsWith(path));
      },
      
      statSync: (path: string) => {
        if (!files.hasOwnProperty(path)) {
          throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
        }
        
        const isFile = typeof files[path] === 'string' || Buffer.isBuffer(files[path]);
        return {
          isFile: () => isFile,
          isDirectory: () => !isFile
        };
      }
    };
  }

  /**
   * Create HTTP mock
   */
  static createHttpMock(): {
    requests: Array<{ method: string; url: string; headers: Record<string, string>; body?: any }>;
    responses: Record<string, { status: number; headers: Record<string, string>; body?: any }>;
    addResponse: (method: string, url: string, response: any) => void;
    clear: () => void;
  } {
    const requests: Array<{ method: string; url: string; headers: Record<string, string>; body?: any }> = [];
    const responses: Record<string, { status: number; headers: Record<string, string>; body?: any }> = {};
    
    return {
      requests,
      responses,
      
      addResponse: (method: string, url: string, response: any) => {
        const key = `${method.toUpperCase()}:${url}`;
        responses[key] = response;
      },
      
      clear: () => {
        requests.length = 0;
        Object.keys(responses).forEach(key => delete responses[key]);
      }
    };
  }

  /**
   * Create database mock
   */
  static createDatabaseMock(): {
    data: Record<string, Record<string, any>>;
    tables: Set<string>;
    createTable: (name: string) => void;
    dropTable: (name: string) => void;
    insert: (table: string, record: any) => void;
    find: (table: string, query?: any) => any[];
    findOne: (table: string, query: any) => any;
    update: (table: string, query: any, updates: any) => number;
    delete: (table: string, query: any) => number;
    count: (table: string, query?: any) => number;
    clear: () => void;
  } {
    const data: Record<string, Record<string, any>> = {};
    const tables = new Set<string>();
    
    return {
      data,
      tables,
      
      createTable: (name: string) => {
        if (!data[name]) {
          data[name] = {};
          tables.add(name);
        }
      },
      
      dropTable: (name: string) => {
        delete data[name];
        tables.delete(name);
      },
      
      insert: (table: string, record: any) => {
        if (!data[table]) {
          throw new Error(`Table '${table}' does not exist`);
        }
        
        const id = record.id || TestHelpers.randomString();
        data[table][id] = { ...record, id };
        return id;
      },
      
      find: (table: string, query?: any) => {
        if (!data[table]) {
          throw new Error(`Table '${table}' does not exist`);
        }
        
        const records = Object.values(data[table]);
        
        if (!query) {
          return records;
        }
        
        return records.filter(record => {
          return Object.entries(query).every(([key, value]) => {
            return record[key] === value;
          });
        });
      },
      
      findOne: (table: string, query: any) => {
        const results = this.find(table, query);
        return results.length > 0 ? results[0] : null;
      },
      
      update: (table: string, query: any, updates: any) => {
        const records = this.find(table, query);
        let count = 0;
        
        records.forEach(record => {
          Object.assign(record, updates);
          count++;
        });
        
        return count;
      },
      
      delete: (table: string, query: any) => {
        const records = this.find(table, query);
        let count = 0;
        
        records.forEach(record => {
          delete data[table][record.id];
          count++;
        });
        
        return count;
      },
      
      count: (table: string, query?: any) => {
        return this.find(table, query).length;
      },
      
      clear: () => {
        Object.keys(data).forEach(key => delete data[key]);
        tables.clear();
      }
    };
  }
}

/**
 * Custom matchers for Jest
 */
export const customMatchers = {
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  toBeValidUrl(received: string) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  },
  
  toBeValidUuid(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toHavePerformance(received: { duration: number }, maxDuration: number) {
    const pass = received.duration <= maxDuration;
    
    if (pass) {
      return {
        message: () => `expected performance ${received.duration}ms not to be <= ${maxDuration}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected performance ${received.duration}ms to be <= ${maxDuration}ms`,
        pass: false,
      };
    }
  },
  
  toHaveMemoryUsage(received: { heapUsed: number }, maxMemory: number) {
    const pass = received.heapUsed <= maxMemory;
    
    if (pass) {
      return {
        message: () => `expected memory usage ${received.heapUsed} bytes not to be <= ${maxMemory} bytes`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected memory usage ${received.heapUsed} bytes to be <= ${maxMemory} bytes`,
        pass: false,
      };
    }
  }
};

/**
 * Test environment utilities
 */
export class TestEnvironment {
  private static originalEnv: Record<string, string | undefined> = {};
  
  /**
   * Set environment variable for testing
   */
  static setEnv(key: string, value: string): void {
    if (!(key in this.originalEnv)) {
      this.originalEnv[key] = process.env[key];
    }
    process.env[key] = value;
  }
  
  /**
   * Remove environment variable
   */
  static unsetEnv(key: string): void {
    if (!(key in this.originalEnv)) {
      this.originalEnv[key] = process.env[key];
    }
    delete process.env[key];
  }
  
  /**
   * Restore all environment variables
   */
  static restoreEnv(): void {
    Object.entries(this.originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    this.originalEnv = {};
  }
  
  /**
   * Mock console methods
   */
  static mockConsole(): {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    info: jest.SpyInstance;
    debug: jest.SpyInstance;
    restore: () => void;
  } {
    const spies = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      restore: () => {
        Object.values(spies).forEach(spy => spy.mockRestore());
      }
    };
    
    return spies;
  }
  
  /**
   * Mock process methods
   */
  static mockProcess(): {
    exit: jest.SpyInstance;
    nextTick: jest.SpyInstance;
    restore: () => void;
  } {
    const spies = {
      exit: jest.spyOn(process, 'exit').mockImplementation(),
      nextTick: jest.spyOn(process, 'nextTick').mockImplementation(),
      restore: () => {
        Object.values(spies).forEach(spy => spy.mockRestore());
      }
    };
    
    return spies;
  }
}

/**
 * Assertion helpers
 */
export class Assertions {
  /**
   * Assert that a promise resolves
   */
  static async resolves(promise: Promise<any>): Promise<any> {
    try {
      return await promise;
    } catch (error) {
      throw new Error(`Expected promise to resolve, but it rejected with: ${error}`);
    }
  }
  
  /**
   * Assert that a promise rejects
   */
  static async rejects(promise: Promise<any>): Promise<Error> {
    try {
      await promise;
      throw new Error('Expected promise to reject, but it resolved');
    } catch (error) {
      return error as Error;
    }
  }
  
  /**
   * Assert that a function throws
   */
  static throws(fn: () => any): Error {
    try {
      fn();
      throw new Error('Expected function to throw, but it did not');
    } catch (error) {
      return error as Error;
    }
  }
  
  /**
   * Assert that a function throws with specific error type
   */
  static throwsErrorType<T extends Error>(
    fn: () => any,
    ErrorType: new (...args: any[]) => T
  ): T {
    const error = this.throws(fn);
    
    if (!(error instanceof ErrorType)) {
      throw new Error(`Expected error to be instance of ${ErrorType.name}, but got ${error.constructor.name}`);
    }
    
    return error;
  }
  
  /**
   * Assert that a function throws with specific message
   */
  static throwsWithMessage(fn: () => any, message: string): Error {
    const error = this.throws(fn);
    
    if (error.message !== message) {
      throw new Error(`Expected error message to be "${message}", but got "${error.message}"`);
    }
    
    return error;
  }
  
  /**
   * Assert that object has all required properties
   */
  static hasProperties(obj: any, properties: string[]): void {
    const missing = properties.filter(prop => !(prop in obj));
    
    if (missing.length > 0) {
      throw new Error(`Object is missing properties: ${missing.join(', ')}`);
    }
  }
  
  /**
   * Assert that object has only allowed properties
   */
  static hasOnlyProperties(obj: any, allowedProperties: string[]): void {
    const actualProperties = Object.keys(obj);
    const extra = actualProperties.filter(prop => !allowedProperties.includes(prop));
    
    if (extra.length > 0) {
      throw new Error(`Object has extra properties: ${extra.join(', ')}`);
    }
  }
  
  /**
   * Assert that array contains all expected items
   */
  static containsAll<T>(array: T[], expectedItems: T[]): void {
    const missing = expectedItems.filter(item => !array.includes(item));
    
    if (missing.length > 0) {
      throw new Error(`Array is missing items: ${missing.join(', ')}`);
    }
  }
  
  /**
   * Assert that array contains only expected items
   */
  static containsOnly<T>(array: T[], expectedItems: T[]): void {
    const extra = array.filter(item => !expectedItems.includes(item));
    
    if (extra.length > 0) {
      throw new Error(`Array has extra items: ${extra.join(', ')}`);
    }
  }
  
  /**
   * Assert that number is within range
   */
  static isWithinRange(value: number, min: number, max: number): void {
    if (value < min || value > max) {
      throw new Error(`Expected ${value} to be within range ${min}-${max}`);
    }
  }
  
  /**
   * Assert that string matches regex
   */
  static matchesRegex(value: string, regex: RegExp): void {
    if (!regex.test(value)) {
      throw new Error(`Expected "${value}" to match regex ${regex}`);
    }
  }
}