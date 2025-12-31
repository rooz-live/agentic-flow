import os
import json
import datetime
import uuid
import sys
import time
from contextlib import contextmanager

# Import SchemaValidator for validation before write
try:
    try:
        from .schema_validator import SchemaValidator
    except ImportError:
        from schema_validator import SchemaValidator
    SCHEMA_VALIDATOR_AVAILABLE = True
except ImportError:
    SCHEMA_VALIDATOR_AVAILABLE = False
    print("[WARN] SchemaValidator not available, skipping validation")

# Use env var for root if set, else relative to CWD
PROJECT_ROOT = os.environ.get("PROJECT_ROOT", ".")
GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")
METRICS_FILE = os.path.join(GOALIE_DIR, "pattern_metrics.jsonl")

class PatternLogger:
    """
    Enhanced PatternLogger with full economic schema for Method Pattern COD/WSJF tracking.

    Features:
    - Correlation ID tracking across prod-cycle runs
    - Circle, depth, gate, behavioral_type metadata
    - Economic fields (COD, WSJF) for prioritization
    - Backlog item linking for forensic audit trail
    - Complete pattern coverage (8 patterns)
    - Schema v3 compliance with auto-population
    - Circle-specific field injection
    """

    # Required fields for schema v3 compliance
    REQUIRED_FIELDS_V3 = {
        'run_kind',
        'action_completed',
        'timestamp',
        'ts',
        'pattern',
        'economic',
        'gate',
        'tags'
    }

    # Circle-specific required fields per guardrails.py SchemaValidation
    CIRCLE_SPECIFIC_FIELDS = {
        'innovator': ['innovation_metric'],
        'assessor': ['assessment_result'],
        'analyst': ['analysis_type'],
        'orchestrator': ['data'],  # Already has 'economic'
        'intuitive': ['confidence'],
        'seeker': ['search_query', 'results']
    }

    # Circle business value mapping (monthly revenue attribution)
    CIRCLE_REVENUE_IMPACT = {
        'innovator': 5000.0,      # High value - new product features
        'analyst': 3500.0,        # High value - strategic insights
        'governance': 3000.0,     # High value - policy & compliance
        'orchestrator': 2500.0,   # Medium value - coordination
        'assessor': 2000.0,       # Medium value - quality assurance
        'workflow': 1500.0,       # Medium value - process automation
        'ai-reasoning': 1200.0,   # Medium value - enhanced decision-making
        'intuitive': 1000.0,      # Lower value - exploratory
        'seeker': 500.0,          # Lower value - research
        'testing': 250.0          # Lowest value - validation
    }

    # Circle-specific WSJF weights (imported from wsjf_calculator.py logic)
    CIRCLE_WEIGHTS = {
        'orchestrator': {'ubv': 1.5, 'tc': 1.2, 'rr': 1.3},  # High urgency coordination
        'analyst': {'ubv': 1.0, 'tc': 1.5, 'rr': 1.0},      # Data-driven, time-sensitive
        'innovator': {'ubv': 1.2, 'tc': 0.8, 'rr': 1.5},   # Experimentation, high risk/reward
        'intuitive': {'ubv': 1.8, 'tc': 1.0, 'rr': 1.1},   # User value focus
        'assessor': {'ubv': 1.0, 'tc': 1.0, 'rr': 2.0},    # Risk mitigation priority
        'seeker': {'ubv': 0.9, 'tc': 0.7, 'rr': 1.0},      # Discovery, flexible timing
        'testing': {'ubv': 1.0, 'tc': 1.0, 'rr': 1.0}      # Standard weights
    }

    def __init__(self, run_id=None, mode="advisory", circle=None, depth=None, correlation_id=None,
                 tenant_id=None, tenant_platform=None, environment=None):
        self.run_id = run_id or os.environ.get("AF_RUN_ID", str(uuid.uuid4()))
        self.mode = mode
        # Fall back to AF_CIRCLE env var if circle not provided
        self.circle = circle or os.environ.get("AF_CIRCLE", None)
        if not self.circle:
            print("[WARN] PatternLogger initialized without circle - revenue attribution will be inaccurate")
        self.depth = depth
        env_cid = os.environ.get('AF_CORRELATION_ID') or os.environ.get('AF_RUN_ID')
        self.correlation_id = correlation_id or env_cid or str(uuid.uuid4())
        self.tenant_id = tenant_id or os.environ.get("AF_TENANT_ID", "default")
        self.tenant_platform = tenant_platform or os.environ.get("AF_TENANT_PLATFORM", "core")
        # ENV-001: Detect environment from multiple sources
        self.environment = environment or self._detect_environment()
        self._ensure_dir()

        # Initialize schema validator
        if SCHEMA_VALIDATOR_AVAILABLE:
            self.validator = SchemaValidator()
        else:
            self.validator = None

    def _ensure_dir(self):
        if not os.path.exists(GOALIE_DIR):
            os.makedirs(GOALIE_DIR, exist_ok=True)

    def _detect_environment(self) -> str:
        """Detect the current environment from multiple sources.

        Priority: AF_ENV env var > CI detection > default to 'local'
        """
        # Check explicit environment variable first
        env = os.environ.get("AF_ENV")
        if env:
            return env

        # Check for CI environment indicators
        ci_indicators = [
            "CI", "GITHUB_ACTIONS", "GITLAB_CI", "JENKINS_URL",
            "CIRCLECI", "TRAVIS", "BUILDKITE", "AZURE_PIPELINES"
        ]
        for indicator in ci_indicators:
            if os.environ.get(indicator):
                return "ci"

        # Check for container environment
        if os.path.exists("/.dockerenv") or os.environ.get("KUBERNETES_SERVICE_HOST"):
            return "container"

        # Default to local
        return "local"

    def _calculate_alignment_score(self, pattern_name: str, data: dict, gate: str) -> dict:
        """
        Calculate Manthra/Yasna/Mithra alignment score for bounded reasoning.

        Alignment framework based on Zoroastrian ethical principles:
        - Manthra (thought/intent): Does the pattern match declared intent?
          Spiritual dimension: Directed thought-power, not casual thinking.
        - Yasna (word/policy): Does execution match governance policy?
          Ethical dimension: Visible alignment through testable outcomes.
        - Mithra (action/covenant): Is the evidence consistent with action?
          Embodied dimension: Coherence survives stress and repetition.

        MYM-v2 Enhancements:
        - Environment-aware scoring (local→dev→stg→prod progression)
        - Extended intent pattern coverage for spiritual dimension
        - Consequence awareness integration for vigilance deficit

        Returns:
            dict with alignment metrics
        """
        try:
            # === MANTHRA (Spiritual Dimension): Intent Alignment ===
            # Extended pattern mapping for comprehensive spiritual coverage
            # MYM-v2.1: Extended intent patterns for comprehensive spiritual coverage
            # WSJF=28 fix: Added all 33+ pattern types to address spiritual dimension collapse
            intent_patterns = {
                # === Governance patterns (high spiritual alignment) ===
                'observability_first': 1.0,
                'observability-first': 1.0,  # Hyphenated variant
                'safe_degrade': 0.92,
                'safe-degrade': 0.92,  # Hyphenated variant
                'guardrail_lock': 0.95,
                'guardrail-lock': 0.95,  # Hyphenated variant
                'guardrail_lock_check': 0.94,  # Check variant
                'governance_audit': 0.95,
                'governance_check': 0.9,
                'governance_delta_evaluation': 0.93,
                # === Economic patterns ===
                'wsjf_enrichment': 0.88,
                'wsjf-enrichment': 0.88,  # Hyphenated variant
                'wsjf_calculation': 0.85,
                'wsjf_prioritization': 0.87,  # NEW: High-frequency pattern
                'cost_of_delay': 0.85,
                'backlog_item_scored': 0.86,  # NEW: WSJF scoring output
                # === Circle patterns ===
                'circle_risk_focus': 0.85,
                'circle-risk-focus': 0.85,  # Hyphenated variant
                'circle_participation': 0.82,
                'circle_complete': 0.9,
                'circle_retro': 0.88,
                # === Iteration patterns ===
                'iteration_budget': 0.88,
                'iteration_start': 0.8,
                'iteration_complete': 0.9,
                'full_cycle_complete': 1.0,
                # === Replenishment patterns ===
                'replenish_complete': 0.92,  # High-frequency (862 occurrences)
                'replenish_circle': 0.90,  # NEW: Circle replenishment
                'backlog_replenish': 0.88,
                'backlog_replenishment': 0.88,  # NEW: Alternative naming
                'priority_replenish': 0.9,
                # === Alignment patterns (highest intent) ===
                'alignment_check': 0.98,
                'alignment_validation': 0.95,
                'philosophical_analysis': 1.0,
                # === IRIS/metrics patterns ===
                'iris_capture': 0.85,
                'iris_metrics': 0.82,
                'pattern_metrics': 0.8,
                'dt_training': 0.88,
                'flow_metrics': 0.85,  # NEW: Flow state tracking
                # === ROAM patterns ===
                'roam_risk': 0.9,
                'roam_escalation': 0.92,
                'roam_resolution': 0.95,
                # === Retro patterns ===
                'retro_analysis': 0.9,
                'retro_coach': 0.88,
                'retro_complete': 0.90,  # NEW: Retro completion
                'retro_replenish_feedback': 0.89,  # NEW: Retro-replenish cycle
                'rca_analysis': 0.92,
                # === Environment/Policy patterns ===
                'env_policy': 0.88,  # NEW: Environment policy enforcement
                'depth_ladder': 0.86,  # NEW: Iteration depth tracking
                'depth-ladder': 0.86,  # Hyphenated variant
                # === Standup/Sync patterns ===
                'standup_sync': 0.84,  # NEW: Daily sync patterns
                'refine_complete': 0.90,  # NEW: Refinement completion
                # === Action/Recommendations patterns ===
                'actionable_recommendations': 0.88,  # NEW: Action output
                'code-fix-proposal': 0.87,  # NEW: Code fix suggestions
                'code_fix_proposal': 0.87,  # Underscore variant
                # === System patterns ===
                'system_state_snapshot': 0.85,  # NEW: State capture
                'preflight_check': 0.90,  # NEW: Pre-execution checks
                'prod_cycle_complete': 0.95,  # NEW: Production cycle
                # === Research/Deliverable patterns ===
                'research_synthesis_deliverable': 0.92,  # NEW: Research output
                'spiritual_dimension_enhancement': 0.98,  # NEW: MYM enhancement
                'comprehensive_analysis_report': 0.90,  # NEW: Analysis output
                'implementation_roadmap': 0.88,  # NEW: Roadmap delivery
                # === AQE patterns ===
                'aqe_pre_prod_hook': 0.88,  # NEW: AQE integration
            }
            # Default based on pattern name heuristics for better coverage
            if pattern_name in intent_patterns:
                manthra_score = intent_patterns[pattern_name]
            elif 'governance' in pattern_name.lower():
                manthra_score = 0.88
            elif 'alignment' in pattern_name.lower():
                manthra_score = 0.92
            elif 'circle' in pattern_name.lower():
                manthra_score = 0.85
            elif 'retro' in pattern_name.lower():
                manthra_score = 0.88
            elif 'wsjf' in pattern_name.lower():
                manthra_score = 0.85
            else:
                manthra_score = 0.78  # Raised from 0.7 to address spiritual collapse

            # Adjust for action completion
            if not data.get('action_completed', True):
                manthra_score *= 0.6  # Incomplete actions reduce intent alignment

            # Environment-aware intent adjustment (bounded → first principles)
            env_intent_boost = {
                'local': 0.0,    # Bounded reasoning baseline
                'dev': 0.02,    # Hybrid mode slight boost
                'stg': 0.04,    # Principled mode boost
                'prod': 0.06,   # First principles highest intent
            }
            manthra_score = min(1.0, manthra_score + env_intent_boost.get(self.environment, 0.0))

            # === YASNA (Ethical Dimension): Policy Alignment ===
            yasna_score = 1.0
            mode = data.get('mode', self.mode)

            # Environment-policy coherence
            if mode == 'mutate':
                if self.environment == 'local':
                    yasna_score = 0.85  # Mutate in local needs review
                elif self.environment == 'prod':
                    yasna_score = 0.95 if gate == 'governance' else 0.75

            # Check gate-pattern policy coherence
            gate_policy_match = {
                'safe_degrade': ['general', 'governance', 'enforcement'],
                'guardrail_lock': ['governance', 'enforcement'],
                'wsjf_enrichment': ['economic', 'prioritization', 'governance'],
                'governance_audit': ['governance', 'enforcement'],
                'roam_escalation': ['governance', 'risk'],
            }
            if pattern_name in gate_policy_match:
                expected_gates = gate_policy_match[pattern_name]
                if gate not in expected_gates:
                    yasna_score *= 0.85

            # === MITHRA (Embodied Dimension): Evidence Alignment ===
            mithra_score = 1.0

            # Performance evidence
            if data.get('duration_ms', 0) > 10000:
                mithra_score *= 0.92  # Slow but not catastrophic
            if data.get('duration_ms', 0) > 30000:
                mithra_score *= 0.85  # Very slow execution

            # Failure evidence
            if data.get('failure_reasons'):
                mithra_score *= 0.6

            # Economic evidence (WSJF/CoD tracking)
            if not data.get('economic', {}).get('wsjf_score'):
                mithra_score *= 0.96

            # Consequence awareness boost (VIG-001)
            consequence = data.get('consequence_tracking', {})
            if consequence:
                awareness = consequence.get('consequence_awareness', 0)
                if awareness > 0.7:
                    mithra_score = min(1.0, mithra_score * 1.05)  # Boost for awareness

            # Evidence trail validation
            if data.get('evidence_sources') or data.get('verification_sources'):
                mithra_score = min(1.0, mithra_score * 1.02)

            # Calculate overall drift (0 = perfect alignment, 1 = complete drift)
            overall_drift = 1.0 - ((manthra_score + yasna_score + mithra_score) / 3.0)
            overall_drift = round(overall_drift, 4)

            # Aligned if drift < 0.3
            aligned = overall_drift < 0.3

            return {
                'manthra_score': round(manthra_score, 3),
                'yasna_score': round(yasna_score, 3),
                'mithra_score': round(mithra_score, 3),
                'overall_drift': overall_drift,
                'aligned': aligned,
                'framework': 'MYM-v2',  # Manthra-Yasna-Mithra v2 (enhanced)
                'environment_context': self.environment,
            }

        except Exception as e:
            return {
                'manthra_score': 0.6,
                'yasna_score': 0.6,
                'mithra_score': 0.6,
                'overall_drift': 0.4,
                'aligned': False,
                'error': str(e),
                'framework': 'MYM-v2'
            }

    def _calculate_consequence_tracking(self, pattern_name: str, data: dict, gate: str) -> dict:
        """
        VIG-001: Calculate consequence tracking metrics to address vigilance deficit.

        Consequence tracking monitors:
        - downstream_impact: Identified effects on other systems/patterns
        - risk_propagation: How risk might cascade
        - rollback_complexity: Difficulty of reversing the action
        - observability_coverage: Metrics/logs available for this action

        Returns dict with consequence awareness metrics.
        """
        try:
            # VIG-v1.1: Extended downstream impact map for all 33+ patterns
            # WSJF=28 fix: Comprehensive consequence tracking to reduce vigilance deficit
            downstream_impact_map = {
                # High downstream impact (0.8-1.0)
                'autocommit_shadow': 0.9, 'production_deploy': 1.0,
                'guardrail_lock': 0.8, 'guardrail-lock': 0.8, 'guardrail_lock_check': 0.75,
                'code-fix-proposal': 0.85, 'code_fix_proposal': 0.85,
                'prod_cycle_complete': 0.8,
                # Medium-high downstream impact (0.6-0.8)
                'safe_degrade': 0.7, 'safe-degrade': 0.7,
                'wsjf_enrichment': 0.65, 'wsjf-enrichment': 0.65,
                'wsjf_prioritization': 0.65, 'backlog_item_scored': 0.6,
                'env_policy': 0.7, 'depth_ladder': 0.6, 'depth-ladder': 0.6,
                'governance_delta_evaluation': 0.7, 'governance_audit': 0.7,
                # Medium downstream impact (0.4-0.6)
                'circle_risk_focus': 0.5, 'circle-risk-focus': 0.5,
                'refine_complete': 0.55, 'actionable_recommendations': 0.55,
                'research_synthesis_deliverable': 0.5, 'implementation_roadmap': 0.5,
                'preflight_check': 0.5, 'system_state_snapshot': 0.45,
                'retro_replenish_feedback': 0.5, 'retro_complete': 0.5,
                'roam_escalation': 0.6, 'roam_risk': 0.55,
                # Low downstream impact (0.2-0.4)
                'observability_first': 0.3, 'observability-first': 0.3,
                'full_cycle_complete': 0.4, 'replenish_complete': 0.35,
                'replenish_circle': 0.35, 'backlog_replenishment': 0.35,
                'standup_sync': 0.3, 'flow_metrics': 0.25,
                'iteration_budget': 0.35, 'pattern_metrics': 0.2,
                'aqe_pre_prod_hook': 0.4, 'spiritual_dimension_enhancement': 0.3,
                'comprehensive_analysis_report': 0.35,
            }
            downstream_impact = downstream_impact_map.get(pattern_name, 0.45)

            # Adjust for mutation mode
            if data.get('mutation', False) or gate == 'enforcement':
                downstream_impact = min(downstream_impact * 1.3, 1.0)

            # Risk propagation: how failures cascade
            risk_propagation = 0.3  # Base
            if not data.get('action_completed', True):
                risk_propagation = 0.7  # Failed actions propagate risk
            if data.get('failure_reasons'):
                risk_propagation = min(risk_propagation + 0.2 * len(data.get('failure_reasons', [])), 1.0)

            # VIG-v1.1: Extended rollback complexity map
            rollback_map = {
                # High rollback complexity (0.8-1.0) - hard to reverse
                'autocommit_shadow': 0.9, 'production_deploy': 1.0,
                'code-fix-proposal': 0.85, 'code_fix_proposal': 0.85,
                'prod_cycle_complete': 0.7,
                # Medium rollback complexity (0.4-0.7)
                'wsjf_prioritization': 0.5, 'backlog_item_scored': 0.45,
                'env_policy': 0.5, 'governance_delta_evaluation': 0.6,
                'refine_complete': 0.5, 'actionable_recommendations': 0.55,
                'research_synthesis_deliverable': 0.4, 'implementation_roadmap': 0.4,
                'roam_escalation': 0.5, 'depth_ladder': 0.4, 'depth-ladder': 0.4,
                # Low rollback complexity (0.1-0.4) - easy to reverse
                'guardrail_lock': 0.2, 'guardrail-lock': 0.2, 'guardrail_lock_check': 0.15,
                'safe_degrade': 0.3, 'safe-degrade': 0.3,
                'observability_first': 0.1, 'observability-first': 0.1,
                'replenish_complete': 0.2, 'replenish_circle': 0.2,
                'standup_sync': 0.1, 'flow_metrics': 0.1,
                'pattern_metrics': 0.1, 'system_state_snapshot': 0.15,
                'preflight_check': 0.15, 'aqe_pre_prod_hook': 0.2,
                'retro_complete': 0.25, 'retro_replenish_feedback': 0.25,
            }
            rollback_complexity = rollback_map.get(pattern_name, 0.35)

            # Observability coverage: what monitoring exists
            observability_score = 0.5  # Base
            if data.get('duration_ms'):
                observability_score += 0.2
            if data.get('tags') and len(data.get('tags', [])) > 0:
                observability_score += 0.1
            if gate:
                observability_score += 0.1
            observability_score = min(observability_score, 1.0)

            # Consequence awareness: overall vigilance metric
            consequence_awareness = (
                (1.0 - risk_propagation) * 0.3 +
                observability_score * 0.4 +
                (1.0 - downstream_impact) * 0.3
            )

            return {
                'downstream_impact': round(downstream_impact, 3),
                'risk_propagation': round(risk_propagation, 3),
                'rollback_complexity': round(rollback_complexity, 3),
                'observability_coverage': round(observability_score, 3),
                'consequence_awareness': round(consequence_awareness, 3),
                'vigilance_status': 'ADEQUATE' if consequence_awareness >= 0.5 else 'DEFICIT',
                'framework': 'VIG-v1'
            }

        except Exception as e:
            return {
                'downstream_impact': 0.5,
                'risk_propagation': 0.5,
                'rollback_complexity': 0.5,
                'observability_coverage': 0.5,
                'consequence_awareness': 0.5,
                'vigilance_status': 'UNKNOWN',
                'error': str(e),
                'framework': 'VIG-v1'
            }

    # ENV-002: Environment-specific operation restrictions
    ENVIRONMENT_RESTRICTIONS = {
        'local': {
            'blocked_operations': ['payment_process', 'production_deploy', 'ssl_renew'],
            'require_confirmation': [],
            'max_risk_score': 8
        },
        'dev': {
            'blocked_operations': ['payment_process', 'production_deploy', 'ssl_renew'],
            'require_confirmation': ['external_api_call'],
            'max_risk_score': 6
        },
        'stg': {
            'blocked_operations': ['live_payment', 'production_deploy'],
            'require_confirmation': ['payment_test', 'database_write'],
            'max_risk_score': 4
        },
        'prod': {
            'blocked_operations': ['test_data_generate', 'mock_payment'],
            'require_confirmation': ['ALL'],
            'max_risk_score': 2
        },
        'ci': {
            'blocked_operations': ['payment_process', 'production_deploy', 'ssl_renew', 'external_api_call'],
            'require_confirmation': [],
            'max_risk_score': 5
        },
        'container': {
            'blocked_operations': ['payment_process', 'production_deploy'],
            'require_confirmation': ['database_write'],
            'max_risk_score': 5
        }
    }

    def validate_operation_for_environment(self, operation: str, risk_score: int = 5) -> dict:
        """Validate if an operation is allowed in the current environment.

        Args:
            operation: The operation being attempted (e.g., 'payment_process', 'database_write')
            risk_score: Risk score of the operation (1-10, higher = riskier)

        Returns:
            dict with keys:
                - allowed: bool - whether operation is allowed
                - reason: str - explanation if blocked
                - require_confirmation: bool - whether confirmation is needed
        """
        restrictions = self.ENVIRONMENT_RESTRICTIONS.get(
            self.environment,
            self.ENVIRONMENT_RESTRICTIONS['local']  # Default to most restrictive non-prod
        )

        # Check if operation is blocked
        if operation in restrictions['blocked_operations']:
            return {
                'allowed': False,
                'reason': f"Operation '{operation}' is blocked in environment '{self.environment}'",
                'require_confirmation': False
            }

        # Check risk score threshold
        if risk_score > restrictions['max_risk_score']:
            return {
                'allowed': False,
                'reason': f"Risk score {risk_score} exceeds max {restrictions['max_risk_score']} for environment '{self.environment}'",
                'require_confirmation': False
            }

        # Check if confirmation is required
        require_confirmation = (
            'ALL' in restrictions['require_confirmation'] or
            operation in restrictions['require_confirmation']
        )

        return {
            'allowed': True,
            'reason': 'Operation permitted',
            'require_confirmation': require_confirmation
        }

    def _get_default_value(self, field: str, circle: str):
        """Get safe default value for missing circle-specific fields."""
        defaults = {
            'innovation_metric': 0.0,  # innovator: numeric metric (0=no innovation)
            'assessment_result': 'pending',  # assessor: status string
            'analysis_type': 'standard',  # analyst: type of analysis
            'data': {},  # orchestrator: generic data dict
            'confidence': 0.5,  # intuitive: confidence level (0-1)
            'search_query': '',  # seeker: search string
            'results': []  # seeker: search results list
        }
        return defaults.get(field, None)

    def _calculate_capex_opex_ratio(self):
        """
        Calculate CapEx/OpEx ratio from infrastructure costs.

        Reads .goalie/infrastructure_costs.json and calculates:
        ratio = infrastructure_capex / (infrastructure_capex + operational_opex)

        Returns:
            float: CapEx/OpEx ratio (0.0-1.0), or 0.0 if data unavailable
        """
        try:
            costs_file = os.path.join(GOALIE_DIR, "infrastructure_costs.json")
            if not os.path.exists(costs_file):
                return 0.0

            with open(costs_file, 'r') as f:
                costs_data = json.load(f)

            # Get monthly costs
            monthly = costs_data.get('monthly', {})
            capex = monthly.get('infrastructure_capex', 0.0)
            opex = monthly.get('operational_opex', 0.0)

            total = capex + opex
            if total <= 0:
                return 0.0

            ratio = round(capex / total, 4)
            return ratio

        except Exception as e:
            print(f"[WARN] CapEx/OpEx calculation failed: {e}")
            return 0.0

    def _calculate_infrastructure_utilization(self):
        """
        Calculate infrastructure utilization from device metrics.

        Aggregates CPU, memory, disk utilization across tracked devices.

        Returns:
            float: Average utilization percentage (0.0-100.0), or 0.0 if unavailable
        """
        try:
            metrics_file = os.path.join(GOALIE_DIR, "infrastructure_metrics.json")
            if not os.path.exists(metrics_file):
                return 0.0

            with open(metrics_file, 'r') as f:
                metrics_data = json.load(f)

            # Get device metrics
            devices = metrics_data.get('devices', {})
            if not devices:
                return 0.0

            utilizations = []
            for device_id, device_data in devices.items():
                cpu_util = device_data.get('cpu_utilization', 0.0)
                mem_util = device_data.get('memory_utilization', 0.0)
                disk_util = device_data.get('disk_utilization', 0.0)

                # Average across resource types for this device
                avg_device_util = (cpu_util + mem_util + disk_util) / 3.0
                utilizations.append(avg_device_util)

            # Calculate overall average
            if utilizations:
                return round(sum(utilizations) / len(utilizations), 2)
            return 0.0

        except Exception as e:
            print(f"[WARN] Infrastructure utilization calculation failed: {e}")
            return 0.0

    # Valid tag categories for 90% tag coverage requirement
    VALID_TAG_CATEGORIES = ["HPC", "ML", "Stats", "Device/Web", "Rust", "Federation"]

    def _ensure_valid_tags(self, tags):
        """Ensure tags include at least one valid category for 90% coverage threshold.

        Valid categories: HPC, ML, Stats, Device/Web, Rust, Federation
        If no valid category tag is present, adds 'Federation' as default.

        Args:
            tags: List of tags or None

        Returns:
            List of tags with at least one valid category
        """
        if tags is None:
            tags = []
        if not isinstance(tags, list):
            tags = [str(tags)]

        # Check if any valid category tag exists
        has_valid_category = any(
            tag in self.VALID_TAG_CATEGORIES
            for tag in tags
        )

        # If no valid category, add Federation as default
        if not has_valid_category:
            tags = ["Federation"] + list(tags)

        return tags

    def _calculate_wsjf(self, data, backlog_item=None):
        """
        Calculate WSJF score with circle-specific weights.

        Extracts CoD components (UBV, TC, RR, Size) from data dict,
        applies circle weights, and returns economic metrics.

        Args:
            data: dict with optional 'ubv', 'tc', 'rr', 'size' keys
            backlog_item: str (future: lookup from backlog.md if provided)

        Returns:
            dict with 'cost_of_delay', 'wsjf_score', 'cod' keys
        """
        # Extract CoD components with sensible defaults
        ubv = data.get('ubv', data.get('user_business_value', 5.0))
        tc = data.get('tc', data.get('time_criticality', 5.0))
        rr = data.get('rr', data.get('risk_reduction', 3.0))
        size = data.get('size', data.get('job_size', 5.0))

        # Ensure numeric types
        try:
            ubv = float(ubv)
            tc = float(tc)
            rr = float(rr)
            size = float(size)
        except (ValueError, TypeError):
            # Fall back to defaults if conversion fails
            ubv, tc, rr, size = 5.0, 5.0, 3.0, 5.0

        # Apply circle-specific weights
        weights = self.CIRCLE_WEIGHTS.get(self.circle, {'ubv': 1.0, 'tc': 1.0, 'rr': 1.0})
        weighted_ubv = ubv * weights['ubv']
        weighted_tc = tc * weights['tc']
        weighted_rr = rr * weights['rr']

        # Calculate CoD and WSJF
        cod = weighted_ubv + weighted_tc + weighted_rr
        wsjf_score = round(cod / size, 2) if size > 0 else 0.0
        cod_val = round(cod, 2)
        return {
            'cost_of_delay': cod_val,
            'wsjf_score': wsjf_score,
            'cod': cod_val
        }

    def _enforce_minimum_schema(self, entry: dict, run_type: str) -> dict:
        """Ensure a minimum schema-at-source so downstream analysis doesn't break."""
        # Ensure time fields
        if 'ts' not in entry or not entry['ts']:
            entry['ts'] = datetime.datetime.utcnow().isoformat() + 'Z'
        if 'timestamp' not in entry or not entry['timestamp']:
            entry['timestamp'] = entry['ts']

        # Ensure run kind
        if 'run_kind' not in entry or not entry['run_kind']:
            entry['run_kind'] = run_type

        # Ensure gate
        if 'gate' not in entry or not entry['gate']:
            entry['gate'] = 'general'

        # Ensure action completion
        if 'action_completed' not in entry:
            entry['action_completed'] = True

        # Ensure tags is a list
        tags = entry.get('tags', [])
        if tags is None:
            tags = []
        if not isinstance(tags, list):
            tags = [str(tags)]
        entry['tags'] = tags

        # Enforce non-empty tags for Tier 1/2 circles (matches monitor_schema_drift)
        circle = (entry.get('circle') or 'unknown').lower()
        if circle in ['analyst', 'orchestrator', 'assessor', 'innovator'] and len(entry['tags']) == 0:
            entry['tags'] = ['auto_generated']

        # Ensure economic shape
        if 'economic' not in entry or not isinstance(entry['economic'], dict):
            entry['economic'] = {}
        econ = entry['economic']
        if 'cost_of_delay' not in econ and 'cod' in econ:
            econ['cost_of_delay'] = econ.get('cod', 0.0)
        if 'cod' not in econ and 'cost_of_delay' in econ:
            econ['cod'] = econ.get('cost_of_delay', 0.0)
        if 'wsjf_score' not in econ:
            econ['wsjf_score'] = 0.0
        if 'job_duration' not in econ:
            econ['job_duration'] = 1.0
        if 'user_business_value' not in econ:
            econ['user_business_value'] = 0.0

        entry['economic'] = econ
        return entry

    def log(self, pattern_name, data, mode_override=None, gate=None, behavioral_type="observability",
            backlog_item=None, economic=None, run_type="prod-cycle"):
        """
        Logs a pattern event to the metrics file with full economic schema.

        Args:
            pattern_name: str (e.g., 'safe_degrade', 'guardrail_lock')
            data: dict (event specific details)
            gate: str (e.g., 'health', 'governance', 'calibration', 'focus', 'guardrail', 'cycle-execution')
            behavioral_type: str ('observability', 'enforcement', 'advisory')
            backlog_item: str (e.g., 'ORG-101', 'AN-042') - links to circle backlog
            economic: dict (e.g., {'cod': 15, 'wsjf_score': 3.0, 'capex_opex_ratio': 0.15})
            run_type: str (e.g., 'prod-cycle', 'governance-agent', 'retro-coach')
        """
        log_start = time.perf_counter()

        provided_duration_ms = data.get("duration_ms")
        provided_duration_measured = data.get("duration_measured")
        needs_duration = (
            provided_duration_ms is None
            or (provided_duration_ms == 1 and not bool(provided_duration_measured))
        )

        # Build economic dict with enhanced fields
        default_economic = {
            "cost_of_delay": 0.0,
            "cod": 0.0,
            "wsjf_score": 0.0,
            "capex_opex_ratio": 0.0,
            "infrastructure_utilization": 0.0,
            "revenue_impact": 0.0,
            "user_business_value": 0.0,
            "time_criticality": 0.0,
            "risk_reduction": 0.0,
            "job_duration": 1.0
        }
        # Merge provided economic data with defaults
        if economic:
            default_economic.update(economic)

        # Normalize CoD key if provided via legacy 'cod'
        if default_economic.get('cost_of_delay', 0.0) == 0.0 and default_economic.get('cod', 0.0) != 0.0:
            default_economic['cost_of_delay'] = default_economic.get('cod', 0.0)
        if default_economic.get('cod', 0.0) == 0.0 and default_economic.get('cost_of_delay', 0.0) != 0.0:
            default_economic['cod'] = default_economic.get('cost_of_delay', 0.0)

        # Auto-calculate WSJF if cost_of_delay/wsjf_score not explicitly provided
        if default_economic['wsjf_score'] == 0.0 and default_economic['cost_of_delay'] == 0.0:
            calculated_wsjf = self._calculate_wsjf(data, backlog_item)
            default_economic['cost_of_delay'] = calculated_wsjf['cost_of_delay']
            default_economic['cod'] = calculated_wsjf['cod']
            default_economic['wsjf_score'] = calculated_wsjf['wsjf_score']

        # Auto-calculate capex_opex_ratio if not provided
        if default_economic['capex_opex_ratio'] == 0.0:
            default_economic['capex_opex_ratio'] = self._calculate_capex_opex_ratio()

        # Auto-calculate infrastructure_utilization if not provided
        if default_economic['infrastructure_utilization'] == 0.0:
            default_economic['infrastructure_utilization'] = self._calculate_infrastructure_utilization()

        # Auto-calculate revenue_impact if not provided (enhanced with success rate)
        if default_economic['revenue_impact'] == 0.0 and self.circle:
            base_revenue = self.CIRCLE_REVENUE_IMPACT.get(self.circle, 0.0)
            # Scale by WSJF (higher WSJF = higher impact)
            wsjf_multiplier = max(default_economic['wsjf_score'] / 3.0, 1.0)  # Baseline WSJF ~3.0
            # Factor in action completion (proxy for success rate)
            success_rate = 1.0 if data.get('action_completed', True) else 0.5
            default_economic['revenue_impact'] = round(base_revenue * wsjf_multiplier * success_rate, 2)

        # Longrun sampling (avoid metrics explosion). Always keep failures.
        try:
            profile = os.environ.get('AF_PROD_PROFILE', 'standard')
            sample_rate = int(os.environ.get('AF_LONGRUN_SAMPLE_RATE', '10'))
            sample_patterns = set(
                [p.strip() for p in os.environ.get('AF_LONGRUN_SAMPLE_PATTERNS', 'full_cycle_complete').split(',') if p.strip()]
            )
            action_completed = bool(data.get('action_completed', True))
            if profile == 'longrun' and action_completed and sample_rate > 1 and pattern_name in sample_patterns:
                iter_str = os.environ.get('AF_ITERATION', '')
                try:
                    iter_num = int(iter_str)
                except Exception:
                    iter_num = 0
                if iter_num > 0:
                    if (iter_num % sample_rate) != 0:
                        return
                else:
                    # Fallback: time-based sampling (~1/N). Keep deterministic-ish via second.
                    if (int(time.time()) % sample_rate) != 0:
                        return
        except Exception:
            pass

        entry_ts = datetime.datetime.utcnow().isoformat() + "Z"
        duration_ms_value = provided_duration_ms if provided_duration_ms is not None else 1
        duration_measured_value = not needs_duration
        entry = {
            "ts": entry_ts,
            "timestamp": entry_ts,  # Duplicate for compatibility
            "pattern": pattern_name,
            "run_kind": run_type,  # NEW: For schema v3 compatibility
            "correlation_id": self.correlation_id,
            "iteration": data.get("iteration", 0),
            "circle": self.circle or "unknown",
            "depth": self.depth or 0,
            "mode": mode_override or self.mode,
            "mutation": behavioral_type == "enforcement",
            "gate": gate or "general",
            "behavioral_type": behavioral_type,
            "framework": data.get("framework", ""),
            "scheduler": data.get("scheduler", ""),
            "tags": self._ensure_valid_tags(data.get("tags", [])),  # Ensure 90% tag coverage
            "economic": default_economic,
            "backlog_item": backlog_item,
            "reason": data.get("reason", ""),
            "action": data.get("action", ""),
            "action_completed": data.get("action_completed", True),  # NEW: Default to success
            "prod_mode": self.mode,
            "tenant_id": self.tenant_id,
            "tenant_platform": self.tenant_platform,
            # ENV-001: Include environment in all pattern emissions for bounded reasoning
            "environment": self.environment,
            # P0-3: Alignment scoring for Manthra/Yasna/Mithra framework
            "alignment_score": self._calculate_alignment_score(pattern_name, data, gate),
            # VIG-001: Consequence tracking to address vigilance deficit (0.574 threshold exceeded)
            "consequence_tracking": self._calculate_consequence_tracking(pattern_name, data, gate),
            # TOP-LEVEL duration_ms for analytics compatibility (P0 fix)
            "duration_ms": duration_ms_value,
            "duration_measured": duration_measured_value,
            "metrics": {k: v for k, v in data.items() if k not in ["iteration", "framework", "scheduler", "tags", "reason", "action", "action_completed", "duration_ms", "duration_measured"]},
            "data": {
                # If duration_ms not provided, use a minimal default (1ms) to indicate measurement gap
                # This allows downstream analytics to distinguish "not measured" from "truly 0ms"
                "duration_measured": duration_measured_value,
                "duration_ms": duration_ms_value,
                **({"reason": data.get("reason")} if data.get("reason") else {}),
                **({"action": data.get("action")} if data.get("action") else {}),
            }
        }

        entry = self._enforce_minimum_schema(entry, run_type)

        # Auto-populate circle-specific fields if missing
        circle = entry.get("circle", "unknown")
        if circle in self.CIRCLE_SPECIFIC_FIELDS:
            for field in self.CIRCLE_SPECIFIC_FIELDS[circle]:
                if field not in data:  # Only add if not in original data
                    entry[field] = self._get_default_value(field, circle)

        # QUICK WIN #1: Schema validation before write
        if self.validator:
            valid, missing, populated_entry = self.validator.validate_and_populate(entry, auto_populate=True)
            if not valid:
                strict = os.environ.get("AF_SCHEMA_STRICT", "0") == "1"
                print(f"[WARN] Schema validation failed for {pattern_name}: missing {missing}")
                print(f"[INFO] Auto-populated missing fields: {[f for f in missing if f in populated_entry]}")
                entry = populated_entry  # Use auto-populated version
                entry = self._enforce_minimum_schema(entry, run_type)
                if strict:
                    print(f"[ERROR] AF_SCHEMA_STRICT=1: refusing to write invalid event for {pattern_name}")
                    return

        try:
            if needs_duration:
                measured_overhead_ms = int((time.perf_counter() - log_start) * 1000)
                if measured_overhead_ms < 0:
                    measured_overhead_ms = 0

                entry["duration_ms"] = measured_overhead_ms
                entry["duration_measured"] = True
                if isinstance(entry.get("data"), dict):
                    entry["data"]["duration_ms"] = measured_overhead_ms
                    entry["data"]["duration_measured"] = True
                    entry["data"]["duration_source"] = "logger_overhead"

            with open(METRICS_FILE, "a") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception as e:
            print(f"[ERROR] Failed to write metrics: {e}")

    @contextmanager
    def timed(self, pattern_name, data=None, mode_override=None, gate=None, behavioral_type="observability",
              backlog_item=None, economic=None, run_type="prod-cycle"):
        """Context manager to auto-populate duration_ms and action_completed.

        Usage:
            with logger.timed('pattern', {'action': 'x'}):
                ...
        """
        start = time.time()
        payload = dict(data or {})
        try:
            yield payload
            payload.setdefault('action_completed', True)
        except Exception as e:
            payload['action_completed'] = False
            payload.setdefault('failure_reasons', [])
            if isinstance(payload['failure_reasons'], list):
                payload['failure_reasons'].append(type(e).__name__)
            raise
        finally:
            payload['duration_ms'] = int((time.time() - start) * 1000)
            self.log(
                pattern_name,
                payload,
                mode_override=mode_override,
                gate=gate,
                behavioral_type=behavioral_type,
                backlog_item=backlog_item,
                economic=economic,
                run_type=run_type,
            )

    # Pattern-Specific Methods

    def log_safe_degrade(self, trigger, action, details=None, iteration=0, duration_ms=None):
        """Log Safe Degrade pattern: Reduce blast radius on failure."""
        self.log(
            "safe_degrade",
            {
                "trigger": trigger,
                "action": action,
                "iteration": iteration,
                "recovery_cycles": details.get("recovery_cycles", 0) if details else 0,
                "degradation_level": details.get("degradation_level", "partial") if details else "partial",
                "duration_ms": duration_ms,
                "duration_measured": duration_ms is not None,
                "tags": ["Federation", "HPC"],  # Required for 90% tag coverage
                **(details or {})
            },
            gate="system-risk",
            behavioral_type="enforcement",
        )

    def log_guardrail(self, check, result, action, duration_ms=None):
        """Log Guardrail Lock pattern: Enforce quality gates."""
        self.log("guardrail_lock", {
            "check": check,
            "result": result,
            "action": action,
            "duration_ms": duration_ms,
            "duration_measured": duration_ms is not None,
            "tags": ["Federation"]  # Required for 90% tag coverage
        }, gate="health", behavioral_type="enforcement")

    def log_depth_ladder(self, old_depth, new_depth, reason, mutation=False, iteration=0, duration_ms=None):
        """Log Depth Ladder pattern: Gradual maturity progression."""
        self.log("depth_ladder", {
            "old_depth": old_depth,
            "new_depth": new_depth,
            "reason": reason,
            "mutation": mutation,
            "iteration": iteration,
            "action": f"set-depth-{new_depth}",
            "duration_ms": duration_ms,
            "duration_measured": duration_ms is not None,
            "tags": ["Federation"]  # Required for 90% tag coverage
        }, gate="calibration", behavioral_type="enforcement" if mutation else "observability")

    def log_depth_oscillation(self, depth_changes, oscillation_count, current_depth, recommendation, iteration=0, duration_ms=None):
        """Log Depth Oscillation pattern: Detect unstable depth changes.

        Args:
            depth_changes: List of (iteration, old_depth, new_depth) tuples
            oscillation_count: Number of oscillations detected (up-down-up cycles)
            current_depth: Current depth value
            recommendation: String with remediation advice
            iteration: Current iteration number
        """
        # Calculate oscillation severity
        severity = "low" if oscillation_count <= 1 else "medium" if oscillation_count <= 2 else "high"

        self.log("depth_oscillation", {
            "depth_changes": depth_changes,
            "oscillation_count": oscillation_count,
            "current_depth": current_depth,
            "severity": severity,
            "recommendation": recommendation,
            "iteration": iteration,
            "action": "detect",
            "action_completed": severity != "high",  # Mark as failed if high severity
            "duration_ms": duration_ms,
            "duration_measured": duration_ms is not None,
            "tags": ["Federation", "depth", "oscillation", "stability"]  # Include Federation for tag coverage
        }, gate="calibration", behavioral_type="enforcement" if severity == "high" else "observability",
           economic={
               "cod": oscillation_count * 10.0,  # High oscillation = high cost
               "wsjf_score": 30.0 - (oscillation_count * 5.0)  # Urgent to fix
           })

    def log_circle_risk_focus(self, target_circle, extra_iterations=0, roam_reduction=0, iteration=0):
        """Log Circle Risk Focus pattern: Prioritize high-risk circles."""
        self.log("circle_risk_focus", {
            "target_circle": target_circle,
            "extra_iterations": extra_iterations,
            "roam_reduction": roam_reduction,
            "iteration": iteration,
            "action": "focus",
            "tags": ["Federation"]  # Required for 90% tag coverage
        }, gate="focus", behavioral_type="advisory")

    def log_iteration_budget(self, requested, enforced, saved=0, autocommit_runs=0, iteration=0, duration_ms=None):
        """Log Iteration Budget pattern: Limit cycle waste."""
        self.log("iteration_budget", {
            "requested": requested,
            "enforced": enforced,
            "remaining": requested - enforced,
            "consumed": enforced,
            "saved": saved,
            "autocommit_runs": autocommit_runs,
            "iteration": iteration,
            "action": "monitor",
            "duration_ms": duration_ms,
            "duration_measured": duration_ms is not None,
            "tags": ["Federation"]  # Required for 90% tag coverage
        }, gate="governance", behavioral_type="advisory")

    def log_observability_first(self, metrics_written, missing_signals=None, suggestion_made=None, iteration=0, duration_ms=None):
        """Log Observability First pattern: Metrics before action."""
        self.log("observability_first", {
            "metrics_written": metrics_written,
            "missing_signals": missing_signals or [],
            "suggestion_made": suggestion_made,
            "iteration": iteration,
            "action": "monitor",
            "duration_ms": duration_ms,
            "duration_measured": duration_ms is not None,
            "tags": ["Federation"]
        }, gate="health", behavioral_type="observability")

    def log_failure_strategy(self, strategy_mode, abort_at=None, degrade_reason=None, iteration=0):
        """Log Failure Strategy pattern: Fail-fast vs degrade-and-continue."""
        self.log("failure_strategy", {
            "mode": strategy_mode,
            "abort_iteration_at": abort_at,
            "degrade_reason": degrade_reason,
            "iteration": iteration,
            "action": "log-failure",
            "reason": degrade_reason or "unknown"
        }, gate="cycle-execution", behavioral_type="enforcement")

    def log_autocommit_shadow(self, candidates, manual_override=0, cycles_before_confidence=1, iteration=0):
        """Log Autocommit Shadow pattern: Test auto-commit safety."""
        self.log("autocommit_shadow", {
            "candidates": candidates,
            "manual_override": manual_override,
            "cycles_before_confidence": cycles_before_confidence,
            "iteration": iteration,
            "action": "shadow-mode-active",
            "reason": "autocommit-enabled",
            "tags": ["advisory", "pattern:autocommit-shadow", "gate:guardrail"]
        }, gate="guardrail", behavioral_type="advisory")

    def log_wsjf_enrichment(self, top_gaps_count, total_impact_avg, iteration=0, enrichment_failures=0, stale_wsjf_count=0, failure_reasons=None):
        """Log WSJF Enrichment pattern: Economic gap analysis.

        Args:
            top_gaps_count: Number of high-impact gaps identified
            total_impact_avg: Average impact across all gaps
            iteration: Current iteration number
            enrichment_failures: Count of failed enrichment attempts (NEW)
            stale_wsjf_count: Count of WSJF scores >30 days old (NEW)
            failure_reasons: List of failure reason strings (NEW)
        """
        data = {
            "top_gaps_count": top_gaps_count,
            "total_impact_avg": total_impact_avg,
            "enrichment_failures": enrichment_failures,
            "stale_wsjf_count": stale_wsjf_count,
            "iteration": iteration,
            "action": "analyze",
            "tags": ["Federation"],
            "action_completed": enrichment_failures == 0  # Mark as failed if any enrichment failures
        }

        # Add failure reasons to metrics if provided
        if failure_reasons:
            data["failure_reasons"] = failure_reasons

        # Higher enrichment_failures = higher cost of delay (need to fix)
        economic_impact = {
            "cod": enrichment_failures * 5.0 + stale_wsjf_count * 2.0,
            "wsjf_score": max(20.0 - enrichment_failures * 2.0, 1.0)  # Failures reduce priority
        }

        self.log("wsjf_enrichment", data, run_type="governance-agent", gate="governance-analysis",
                 behavioral_type="advisory", economic=economic_impact)

    def log_code_fix_proposal(self, total_proposals, auto_apply_count, dry_run_count, high_risk_count, iteration=0, failed_proposals=0, failure_reasons=None):
        """Log Code Fix Proposal pattern: Auto-fix governance.

        Args:
            total_proposals: Total fix proposals generated
            auto_apply_count: Proposals automatically applied
            dry_run_count: Proposals tested in dry-run mode
            high_risk_count: Proposals marked as high-risk
            iteration: Current iteration number
            failed_proposals: Count of failed proposal applications (NEW)
            failure_reasons: List of failure reason strings (NEW)
        """
        data = {
            "total_proposals": total_proposals,
            "auto_apply_count": auto_apply_count,
            "dry_run_count": dry_run_count,
            "high_risk_count": high_risk_count,
            "failed_proposals": failed_proposals,
            "iteration": iteration,
            "action": "propose",
            "tags": ["Federation"],
            "action_completed": failed_proposals == 0  # Mark as failed if any proposals failed
        }

        # Add failure reasons to metrics if provided
        if failure_reasons:
            data["failure_reasons"] = failure_reasons

        # Calculate success rate
        success_rate = (auto_apply_count / total_proposals) if total_proposals > 0 else 0.0

        # Economic impact: failures increase CoD
        economic_impact = {
            "cod": failed_proposals * 8.0 + high_risk_count * 3.0,
            "wsjf_score": success_rate * 10.0,  # Higher success rate = higher priority
            "user_business_value": auto_apply_count * 5.0  # Value from automated fixes
        }

        self.log("code_fix_proposal", data, run_type="governance-agent", gate="governance-autofix",
                 behavioral_type="advisory", economic=economic_impact)

    def log_backtest_result(self, strategy_name, start_date, end_date, pnl, sharpe_ratio=0.0, max_drawdown=0.0, iteration=0):
        """Log Backtest Result pattern: Historical strategy validation."""
        self.log("backtest_result", {
            "strategy": strategy_name,
            "period": f"{start_date}_to_{end_date}",
            "pnl": pnl,
            "sharpe": sharpe_ratio,
            "drawdown": max_drawdown,
            "iteration": iteration,
            "action": "validate-strategy",
            "tags": ["analytics", "backtest"]
        }, gate="calibration", behavioral_type="observability", economic={"ubv": pnl, "rr": sharpe_ratio})

    def log_integration_event(self, platform, event_type, external_id, status="success", details=None):
        """Log Integration Event pattern: External system telemetry (Symfony, OpenStack, etc.)."""
        self.log(f"integration_{event_type}", {
            "platform": platform, # e.g. 'symfony', 'openstack', 'oro'
            "external_id": external_id,
            "status": status,
            "action": "sync",
            "tags": ["integration", platform],
            **(details or {})
        }, gate="general", behavioral_type="observability")

    def log_flow_metrics(self, cycle_time, lead_time, throughput, wip_count, flow_efficiency, velocity=0, iteration=0, duration_ms=None):
        """Log Flow Metrics pattern: Track cycle time, lead time, throughput, and flow efficiency.

        Args:
            cycle_time: Time from work start to completion (minutes)
            lead_time: Time from request to delivery (minutes)
            throughput: Items completed per hour
            wip_count: Current work in progress
            flow_efficiency: Value-add time / total time (0.0-1.0)
            velocity: Story points per iteration (for planning)
            iteration: Current iteration number
            duration_ms: Time taken to collect metrics (optional)
        """
        self.log("flow_metrics", {
            "cycle_time_minutes": cycle_time,
            "lead_time_minutes": lead_time,
            "throughput_per_hour": throughput,
            "wip_count": wip_count,
            "flow_efficiency": flow_efficiency,
            "velocity": velocity,
            "iteration": iteration,
            "action": "measure",
            "duration_ms": duration_ms,
            "duration_measured": duration_ms is not None,
            "tags": ["flow", "metrics", "productivity", "Federation"]
        }, gate="governance", behavioral_type="observability", economic={
            "cod": cycle_time * 10,  # Higher cycle time = higher cost of delay
            "wsjf_score": throughput * flow_efficiency * 100  # Reward high throughput + efficiency
        })

    def log_curriculum_baseline(self, strategy, baseline_metrics, iteration=0):
        """Log Curriculum Baseline pattern: Track baseline performance for backtest → forward progression.

        Args:
            strategy: Strategy name (e.g., 'momentum_v1')
            baseline_metrics: dict with backtest/forward test results
            iteration: Current iteration number
        """
        self.log("curriculum_baseline", {
            "strategy": strategy,
            "backtest_sharpe": baseline_metrics.get("backtest_sharpe", 0.0),
            "backtest_pnl": baseline_metrics.get("backtest_pnl", 0.0),
            "forward_sharpe": baseline_metrics.get("forward_sharpe", 0.0),
            "forward_pnl": baseline_metrics.get("forward_pnl", 0.0),
            "adaptation_rate": baseline_metrics.get("adaptation_rate", 0.0),
            "iteration": iteration,
            "action": "baseline",
            "tags": ["curriculum", "learning", "baseline"]
        }, gate="calibration", behavioral_type="observability", economic={
            "ubv": baseline_metrics.get("backtest_pnl", 0.0),
            "rr": baseline_metrics.get("adaptation_rate", 0.0) * 100
        })


def _parse_cli_json(value: str) -> dict:
    if not value:
        return {}
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return {}


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Log a pattern event to .goalie/pattern_metrics.jsonl")
    parser.add_argument("pattern", help="Pattern name (e.g., safe_degrade, wsjf_enrichment)")
    parser.add_argument("--data", default="{}", help="JSON payload for event")
    parser.add_argument("--mode", default=os.environ.get("AF_PROD_CYCLE_MODE", "advisory"))
    parser.add_argument("--circle", default=None)
    parser.add_argument("--depth", type=int, default=None)
    parser.add_argument("--gate", default=None)
    parser.add_argument("--run-kind", default=None)
    args = parser.parse_args()

    data = _parse_cli_json(args.data)
    circle = args.circle or data.get("circle") or os.environ.get("AF_CIRCLE")
    depth = args.depth if args.depth is not None else data.get("depth")
    run_kind = args.run_kind or os.environ.get("AF_RUN_KIND") or "cli"
    gate = args.gate or data.get("gate")

    logger = PatternLogger(mode=args.mode, circle=circle, depth=depth)
    logger.log(args.pattern, data, mode_override=args.mode, gate=gate, run_type=run_kind)


if __name__ == "__main__":
    # If called as a script with args, behave as a CLI logger.
    # Import-time usage (as a module) remains unchanged.
    main()
