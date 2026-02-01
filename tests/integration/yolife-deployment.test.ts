import { describe, test, expect } from '@jest/globals';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('YOLIFE Deployment Configuration', () => {
  test('should have all required environment variables', () => {
    const requiredVars = [
      'YOLIFE_STX_HOST',
      'YOLIFE_STX_PORTS',
      'YOLIFE_STX_KEY',
      'YOLIFE_CPANEL_HOST',
      'YOLIFE_CPANEL_KEY',
      'YOLIFE_GITLAB_HOST',
      'YOLIFE_GITLAB_KEY'
    ];
    
    const envFile = join(process.cwd(), '.env.yolife');
    expect(existsSync(envFile)).toBe(true);
    
    const envContent = readFileSync(envFile, 'utf-8');
    requiredVars.forEach(varName => {
      expect(envContent).toContain(varName);
    });
  });
  
  test('should have ROAM tracker current (<30 days)', () => {
    const roamFile = join(process.cwd(), 'docs/ROAM-tracker.md');
    expect(existsSync(roamFile)).toBe(true);
    
    const stats = require('fs').statSync(roamFile);
    const ageMs = Date.now() - stats.mtimeMs;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    expect(ageDays).toBeLessThan(30);
  });
  
  test('should have skills database', () => {
    const skillsFile = join(process.cwd(), 'reports/skills-store.json');
    expect(existsSync(skillsFile)).toBe(true);
    
    const skillsData = JSON.parse(readFileSync(skillsFile, 'utf-8'));
    expect(skillsData.skills).toBeDefined();
    expect(Array.isArray(skillsData.skills)).toBe(true);
    expect(skillsData.skills.length).toBeGreaterThan(0);
  });
});
