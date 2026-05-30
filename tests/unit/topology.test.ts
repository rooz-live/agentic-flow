import { TopologyRiskAnalyzer, NetworkTopologyShape, MessageState, EdgePythonVMConfig } from '../../src/primitives/topology';
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

  test('assesses critical risk for nonorientable topologies without VM assertions', () => {
    const assessment = analyzer.assessTopologicalRisk(NetworkTopologyShape.KleinSpace);
    expect(assessment.overallScore).toBe(0.95);
    expect(assessment.recommendations.some(r => r.includes('[ROAM: Avoided]'))).toBe(true);
  });

  test('mitigates risk when VM cryptographic assertions are enabled', () => {
    const vmConfig: EdgePythonVMConfig = {
      maxRecursionDepth: 100,
      maxInstructions: 500000,
      memoryLimitBytes: 256 * 1024,
      enableDunderCaching: true,
      cryptographicSignAssertions: true
    };
    const assessment = analyzer.assessTopologicalRisk(NetworkTopologyShape.KleinSpace, vmConfig);
    
    // Inversion risk drops to 0.15
    const inversionMetric = assessment.metrics.find(m => m.id === 'topological-inversion-klein-space');
    expect(inversionMetric?.score).toBe(0.15);
    expect(inversionMetric?.level).toBe('low');
    expect(assessment.recommendations.some(r => r.includes('[ROAM: Mitigated]'))).toBe(true);
  });

  test('flags high risk when VM maxRecursionDepth is dangerously low for looping spaces', () => {
    const vmConfig: EdgePythonVMConfig = {
      maxRecursionDepth: 10,
      maxInstructions: 10000,
      memoryLimitBytes: 64 * 1024,
      enableDunderCaching: true,
      cryptographicSignAssertions: false
    };
    const assessment = analyzer.assessTopologicalRisk(NetworkTopologyShape.ThreeTorus, vmConfig);
    
    const recursionMetric = assessment.metrics.find(m => m.id === 'edge-python-recursion-exhaustion-three-torus');
    expect(recursionMetric?.score).toBe(0.85);
    expect(recursionMetric?.level).toBe('high');
    expect(assessment.recommendations.some(r => r.includes('[ROAM: Mitigated]'))).toBe(true);
  });

  test('handles unknown/invalid topology shape in risk assessment', () => {
    const assessment = analyzer.assessTopologicalRisk('InvalidShape' as any);
    expect(assessment.overallScore).toBe(0);
    expect(assessment.metrics.length).toBe(0);
    expect(assessment.recommendations[0]).toContain('Unknown topological primitive shape');
  });

  test('flags medium risk when VM maxRecursionDepth is low but not critically low for looping spaces', () => {
    const vmConfig: EdgePythonVMConfig = {
      maxRecursionDepth: 15,
      maxInstructions: 10000,
      memoryLimitBytes: 64 * 1024,
      enableDunderCaching: true,
      cryptographicSignAssertions: false
    };
    const assessment = analyzer.assessTopologicalRisk(NetworkTopologyShape.ChimneySpace, vmConfig);
    
    const recursionMetric = assessment.metrics.find(m => m.id === 'edge-python-recursion-exhaustion-chimney-space');
    expect(recursionMetric?.score).toBe(0.65);
    expect(recursionMetric?.level).toBe('medium');
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

  test('integrates VM configuration mitigations', async () => {
    const assessment = await riskSystem.assessRisk({
      entityId: 'test-entity',
      entityType: 'workflow',
      metadata: {
        topologyShape: NetworkTopologyShape.KleinSpace,
        vmConfig: {
          maxRecursionDepth: 100,
          maxInstructions: 500000,
          memoryLimitBytes: 256 * 1024,
          enableDunderCaching: true,
          cryptographicSignAssertions: true
        }
      }
    });

    // Both baseline risk (0.05 for workflow) and mitigated inversion (0.15) and recursion (0.05).
    // The dimensional loop complexity for KleinSpace is 3 * 0.25 = 0.75.
    // Overall score will be the max of all metrics, which is 0.75.
    expect(assessment.overallScore).toBe(0.75);
    const inversionMetric = assessment.metrics.find(m => m.id === 'topological-inversion-klein-space');
    expect(inversionMetric?.score).toBe(0.15);
    expect(assessment.recommendations.some(r => r.includes('cryptographic signature assertions'))).toBe(true);
  });

  test('evaluates portfolio risk', async () => {
    const assessment = await riskSystem.getPortfolioRisk('test-portfolio');
    expect(assessment.overallScore).toBe(0.15);
    expect(assessment.metrics[0].id).toBe('portfolio-drift');
  });

  test('resolves correct risk levels from scores', async () => {
    expect(await riskSystem.getRiskLevel(0.1)).toBe('low');
    expect(await riskSystem.getRiskLevel(0.35)).toBe('medium');
    expect(await riskSystem.getRiskLevel(0.6)).toBe('high');
    expect(await riskSystem.getRiskLevel(0.8)).toBe('critical');
  });

  test('executes monitorRisk successfully without errors', async () => {
    await expect(riskSystem.monitorRisk('test-entity')).resolves.not.toThrow();
  });
});
