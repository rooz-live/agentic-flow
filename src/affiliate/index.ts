/**
 * Affiliate Affinity System - Module Exports
 * @module affiliate
 */

// Core class
export { AffiliateStateTracker } from './AffiliateStateTracker';
export type { AffiliateStateTrackerConfig } from './AffiliateStateTracker';

// Types
export type {
  // State types
  AffiliateStatus,
  AffiliateTier,
  AffiliateState,
  CreateAffiliateInput,
  UpdateAffiliateInput,
  
  // Activity types
  ActivityType,
  ActivitySource,
  AffiliateActivity,
  CreateActivityInput,
  
  // Risk types
  RiskType,
  RiskSeverity,
  RoamStatus,
  AffiliateRisk,
  CreateRiskInput,
  
  // Affinity types
  RelationshipType,
  AffiliateAffinity,
  CreateAffinityInput,
  
  // Event types
  AffiliateEventType,
  AffiliateEvent,
  AffiliateEventHandler,
  
  // State machine
  StateTransition,
} from './types';

export { STATE_TRANSITIONS } from './types';
