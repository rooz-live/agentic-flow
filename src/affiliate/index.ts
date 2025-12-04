/**
 * Affiliate Affinity System - Module Exports
 * @module affiliate
 */

// Core class
export { AffiliateStateTracker, AffiliateStateTrackerConfig } from './AffiliateStateTracker';

// Types
export {
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
  STATE_TRANSITIONS,
} from './types';

