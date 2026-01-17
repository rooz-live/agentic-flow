import { describe, test, expect } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('StarlingX Connectivity', () => {
  test('should connect to StarlingX host', async () => {
    const host = process.env.YOLIFE_STX_HOST || '23.239.9.2';
    const key = process.env.YOLIFE_STX_KEY || '~/.ssh/starlingx_key';
    
    try {
      const { stdout } = await execAsync(
        `timeout 10 ssh -i ${key} -p 2222 -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@${host} "echo OK"`,
        { timeout: 15000 }
      );
      expect(stdout.trim()).toBe('OK');
    } catch (error) {
      throw new Error(`StarlingX connectivity failed: ${error}`);
    }
  }, 20000);
});
