import { TopologyRiskAnalyzer, NetworkTopologyShape, MessageState } from '../../src/primitives/topology';
import { RiskAssessmentSystem } from '../../src/risk/core/risk_assessment';

describe('TopologyRiskAnalyzer', () => {
  let analyzer: TopologyRiskAnalyzer;

  beforeEach(() => {
    analyzer = new TopologyRiskAnalyzer();
  });

  test('correctly identifies orientable shapes', () => {
    const shape = analyzer.getPrimitive(NetworkTopologyShape.ThreeTorus);
    expect(shape.type).toBe('orientable');
    expect(shape.mirrored).toBe(false);
  });

  test('correctly identifies nonorientable shapes', () => {
    const shape = analyzer.getPrimitive(NetworkTopologyShape.KleinSpace);
    expect(shape.type).toBe('nonorientable');
    expect(shape.mirrored).toBe(true);
  });

  test('flips state handedness, sign, and role on nonorientable loop traversal', () => {
    const initialState: MessageState = {
      payload: { amount: 100 },
      originHandedness: 'right',
      currentHandedness: 'right',
      roleInverted: false,
      valueSignMultiplier: 1
    };

    const finalState = analyzer.traverseLoop(NetworkTopologyShape.KleinSpace, initialState);
    
    expect(finalState.currentHandedness).toBe('left');
    expect(finalState.roleInverted).toBe(true);
    expect(finalState.valueSignMultiplier).toBe(-1);
  });

  test('preserves state handedness and sign on orientable loop traversal', () => {
    const initialState: MessageState = {
      payload: { amount: 100 },
      originHandedness: 'right',
      currentHandedness: 'right',
      roleInverted: false,
      valueSignMultiplier: 1
    };

    const finalState = analyzer.traverseLoop(NetworkTopologyShape.ThreeTorus, initialState);
    
    expect(finalState.currentHandedness).toBe('right');
    expect(finalState.roleInverted).toBe(false);
    expect(finalState.valueSignMultiplier).toBe(1);
  });

  test('assesses low risk for orientable open topologies', () => {
    const assessment = analyzer.assessTopologicalRisk(NetworkTopologyShape.InfiniteFlatSpace);
    expect(assessment.overallScore).toBe(0.05);
    expect(assessment.recommendations[0]).toContain('[ROAM: Accepted]');
  });

  test('assesses critical risk for nonorientable topologies', () => {
    const assessment = analyzer.assessTopologicalRisk(NetworkTopologyShape.KleinSpace);
    expect(assessment.overallScore).toBe(0.95);
    expect(assessment.recommendations[0]).toContain('[ROAM: Avoided]');
  });
});

describe('RiskAssessmentSystem Integration', () => {
  let riskSystem: RiskAssessmentSystem;

  beforeEach(() => {
    riskSystem = new RiskAssessmentSystem();
  });

  test('evaluates baseline system risk without metadata', async () => {
    const assessment = await riskSystem.assessRisk({
      entityId: 'test-entity',
      entityType: 'billing'
    });

    expect(assessment.overallScore).toBe(0.1);
    expect(assessment.metrics.length).toBe(1);
    expect(assessment.metrics[0].id).toBe('baseline-risk');
  });

  test('includes topological risk when topologyShape is provided', async () => {
    const assessment = await riskSystem.assessRisk({
      entityId: 'test-entity',
      entityType: 'workflow',
      metadata: {
        topologyShape: NetworkTopologyShape.KleinSpace
      }
    });

    expect(assessment.overallScore).toBe(0.95);
    expect(assessment.metrics.some(m => m.id === 'topological-inversion-klein-space')).toBe(true);
    expect(assessment.recommendations.some(r => r.includes('[ROAM: Avoided]'))).toBe(true);
  });
});
