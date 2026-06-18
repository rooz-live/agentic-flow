export interface RuleVector {
  pattern: RegExp;
  message: string;
  severity: '🔴' | '🟡';
}

export interface DirectMailScenarioConfig {
  vectors: RuleVector[];
  crossCheckRequirements?: string[];
}

export const DIRECT_MAIL_SCENARIOS: Record<string, DirectMailScenarioConfig> = {
  MAA_DENOVO: {
    vectors: [
      { pattern: /frazier/i, message: "Detected Frazier reference: [MATCH]", severity: '🟡' }
    ],
    crossCheckRequirements: ["maa"]
  },
  TITLE_IX: {
    vectors: [
      { pattern: /civil rights/i, message: "Detected Civil Rights reference: [MATCH]", severity: '🟡' }
    ],
    crossCheckRequirements: ["title ix"]
  },
  DAY1099: {
    vectors: [
      { pattern: /1099/i, message: "Detected 1099 reference: [MATCH]", severity: '🟡' }
    ],
    crossCheckRequirements: ["tax"]
  },
  GENERAL: {
    vectors: [],
    crossCheckRequirements: []
  },
  HIRING_REFERRAL: {
    vectors: [],
    crossCheckRequirements: []
  }
};
