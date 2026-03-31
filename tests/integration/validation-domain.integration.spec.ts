/**
 * Integration Tests: ValidationReport Domain Aggregate
 * 
 * Purpose: Verify boundary behavior between domain and infrastructure
 * Context: Gate 3 - Deployment risk mitigation for trial prep
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationReport } from '../../domain/aggregates/ValidationReport';
import { ValidationCheck } from '../../domain/value_objects/ValidationCheck';

describe('ValidationReport Domain Integration', () => {
  describe('Event Sourcing', () => {
    it('should emit ValidationRequestedEvent when created', () => {
      // Arrange
      const checks = [
        ValidationCheck.pass('file_exists', 'File found', 'FILE_EXISTENCE')
      ];
      
      // Act
      const report = ValidationReport.create(checks, {
        caseId: '26CV007491-590',
        filePath: '/BHOPTI-LEGAL/TRIAL-DEBRIEF-MARCH-3-2026.md'
      });
      
      // Assert
      const events = report.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('VALIDATION_REQUESTED');
      expect(events[0].filePath).toContain('TRIAL-DEBRIEF');
    });
    
    it('should emit ValidationCompletedEvent when complete() called', () => {
      // Arrange
      const checks = [
        ValidationCheck.error('citation_check', 'Missing citation', 'CITATION')
      ];
      const report = ValidationReport.create(checks);
      
      // Act
      const completedEvent = report.complete();
      
      // Assert
      expect(completedEvent.eventType).toBe('VALIDATION_COMPLETED');
      expect(completedEvent.status).toBe('FAIL');
      expect(completedEvent.checksCount).toBe(1);
      
      const allEvents = report.getEvents();
      expect(allEvents).toHaveLength(2); // Requested + Completed
    });
  });
  
  describe('Business Rules', () => {
    it('should identify trial-critical validation by case ID', () => {
      // Arrange
      const checks = [ValidationCheck.pass('test', 'ok')];
      const report = ValidationReport.create(checks, {
        caseId: '26CV007491-590',
        wsjfScore: 50.0
      });
      
      // Act & Assert
      expect(report.isTrialCritical()).toBe(true);
      expect(report.isHighRisk()).toBe(true);
    });
    
    it('should calculate FAIL status when ERROR severity check fails', () => {
      // Arrange
      const checks = [
        ValidationCheck.pass('check1', 'ok'),
        ValidationCheck.error('check2', 'Critical error', 'CITATION'),
        ValidationCheck.warning('check3', 'Minor issue')
      ];
      
      // Act
      const report = ValidationReport.create(checks);
      
      // Assert
      expect(report.status).toBe('FAIL');
    });
    
    it('should calculate WARNING status when only WARNING checks fail', () => {
      // Arrange
      const checks = [
        ValidationCheck.pass('check1', 'ok'),
        ValidationCheck.warning('check2', 'Minor issue', 'DATE_FORMAT')
      ];
      
      // Act
      const report = ValidationReport.create(checks);
      
      // Assert
      expect(report.status).toBe('WARNING');
    });
  });
  
  describe('WSJF Risk Escalation', () => {
    it('should detect high-risk validation (WSJF >= 40.0)', () => {
      // Arrange
      const checks = [ValidationCheck.pass('test', 'ok')];
      const highRiskReport = ValidationReport.create(checks, { wsjfScore: 45.0 });
      const lowRiskReport = ValidationReport.create(checks, { wsjfScore: 30.0 });
      
      // Act & Assert
      expect(highRiskReport.isHighRisk()).toBe(true);
      expect(lowRiskReport.isHighRisk()).toBe(false);
    });
  });
  
  describe('Audit Trail', () => {
    it('should maintain complete event timeline for testimony', () => {
      // Arrange
      const checks = [
        ValidationCheck.error('signature_check', 'Missing signature', 'SIGNATURE')
      ];
      
      // Act
      const report = ValidationReport.create(checks, {
        caseId: '26CV007491-590',
        filePath: '/ARBITRATION-ORDER-MARCH-3-2026.pdf',
        validatorVersion: '12.0'
      });
      report.complete();
      
      // Assert - Can answer "When was this file validated?"
      const events = report.getEvents();
      expect(events).toHaveLength(2);
      
      const timeline = events.map(e => ({
        type: e.eventType,
        timestamp: e.timestamp
      }));
      
      expect(timeline[0].type).toBe('VALIDATION_REQUESTED');
      expect(timeline[1].type).toBe('VALIDATION_COMPLETED');
      
      // Verify timestamps are sequential
      expect(timeline[1].timestamp >= timeline[0].timestamp).toBe(true);
    });
  });
});
