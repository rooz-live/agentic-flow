import { describe, it, expect, beforeEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('AY Maturity System', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const reportsDir = path.join(projectRoot, 'reports');

  describe('P0 Validation: Knowledge Persistence', () => {
    it('should persist skills across runs', async () => {
      const skillsStore = path.join(reportsDir, 'skills-store.json');
      const exists = await fs.access(skillsStore).then(() => true).catch(() => false);
      
      expect(exists).toBe(true);
      
      if (exists) {
        const content = await fs.readFile(skillsStore, 'utf-8');
        const data = JSON.parse(content);
        
        expect(data).toHaveProperty('skills');
        expect(Array.isArray(data.skills)).toBe(true);
      }
    });

    it('should maintain skill confidence scores', async () => {
      const skillsStore = path.join(reportsDir, 'skills-store.json');
      const content = await fs.readFile(skillsStore, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.skills.length > 0) {
        data.skills.forEach((skill: any) => {
          expect(skill).toHaveProperty('success_rate');
          expect(skill.success_rate).toBeGreaterThanOrEqual(0);
          expect(skill.success_rate).toBeLessThanOrEqual(1);
        });
      }
    });
  });

  describe('P1 Feedback Loop', () => {
    it('should track skill validations', async () => {
      const validations = path.join(reportsDir, 'skill-validations.json');
      const exists = await fs.access(validations).then(() => true).catch(() => false);
      
      expect(exists).toBe(true);
      
      if (exists) {
        const content = await fs.readFile(validations, 'utf-8');
        const data = JSON.parse(content);
        
        expect(data).toHaveProperty('validations');
        expect(data).toHaveProperty('confidence_updates');
      }
    });
  });

  describe('ROAM Observability', () => {
    it('should have MYM scores', async () => {
      const roamEnhanced = path.join(reportsDir, 'roam-assessment-enhanced.json');
      const exists = await fs.access(roamEnhanced).then(() => true).catch(() => false);
      
      if (exists) {
        const content = await fs.readFile(roamEnhanced, 'utf-8');
        const data = JSON.parse(content);
        
        expect(data).toHaveProperty('mym_scores');
        expect(data.mym_scores).toHaveProperty('manthra');
        expect(data.mym_scores).toHaveProperty('yasna');
        expect(data.mym_scores).toHaveProperty('mithra');
      }
    });

    it('should track staleness', async () => {
      const roamEnhanced = path.join(reportsDir, 'roam-assessment-enhanced.json');
      const exists = await fs.access(roamEnhanced).then(() => true).catch(() => false);
      
      if (exists) {
        const content = await fs.readFile(roamEnhanced, 'utf-8');
        const data = JSON.parse(content);
        
        expect(data).toHaveProperty('staleness');
        expect(data.staleness).toHaveProperty('age_days');
        expect(data.staleness).toHaveProperty('target_age_days');
        expect(data.staleness.target_age_days).toBe(3);
      }
    });
  });
});
