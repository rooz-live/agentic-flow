import { describe, test, expect } from '@jest/globals';
import { existsSync } from 'fs';
import { join } from 'path';

describe('AISP v5.1 Integration', () => {
  test('should have AISP configuration', () => {
    const aispConfig = join(process.cwd(), 'reports/yolife/aisp-config.json');
    expect(existsSync(aispConfig)).toBe(true);
  });
  
  test('should have AISP validator script', () => {
    const validator = join(process.cwd(), 'scripts/ay-aisp-validate.sh');
    expect(existsSync(validator)).toBe(true);
  });
  
  test('should have 3D visualization deployed', () => {
    const deckgl = join(process.cwd(), 'src/visual-interface/metrics-deckgl.html');
    expect(existsSync(deckgl)).toBe(true);
  });
});
