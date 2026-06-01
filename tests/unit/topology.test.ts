import {
  TopologyRiskAnalyzer,
  NetworkTopologyShape,
  MessageState,
  EdgePythonVMConfig,
  TOPOLOGY_SHAPES,
  simulateBoundaryCross,
  TraversalState
} from '../../src/primitives/topology';
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

  // Backward compatibility legacy tests from subproject
  test('Verify all 18 network topology shapes exist and are mapped correctly', () => {
    const keys = Object.keys(TOPOLOGY_SHAPES) as NetworkTopologyShape[];
    expect(keys.length).toBe(18);

    const orientableShapes = [
      NetworkTopologyShape.InfiniteFlatSpace,
      NetworkTopologyShape.ThreeTorus,
      NetworkTopologyShape.HalfTwistTorus,
      NetworkTopologyShape.QuarterTwistTorus,
      NetworkTopologyShape.ThirdTwistTorus,
      NetworkTopologyShape.SixthTwistTorus,
      NetworkTopologyShape.ChimneySpace,
      NetworkTopologyShape.GimletSpace,
      NetworkTopologyShape.SlabSpace,
      NetworkTopologyShape.TurnedSlabSpace
    ];
    orientableShapes.forEach(id => {
      expect(TOPOLOGY_SHAPES[id].isOrientable).toBe(true);
    });

    const nonorientableShapes = [
      NetworkTopologyShape.KleinSpace,
      NetworkTopologyShape.CoastSpace,
      NetworkTopologyShape.HalfTwistKleinSpace,
      NetworkTopologyShape.BunSpace,
      NetworkTopologyShape.GirdleSpace,
      NetworkTopologyShape.VerticalKleinChimney,
      NetworkTopologyShape.HorizontalKleinChimney,
      NetworkTopologyShape.NonorientableSlab
    ];
    nonorientableShapes.forEach(id => {
      expect(TOPOLOGY_SHAPES[id].isOrientable).toBe(false);
      expect(TOPOLOGY_SHAPES[id].vmRiskScore).toBeGreaterThanOrEqual(0.70);
    });
  });

  test('Simulate boundary crossing for Orientable Universes (R^3, Torus)', () => {
    const initialState: TraversalState = {
      x: 10,
      y: 20,
      z: 30,
      handedness: 'left',
      role: 'standard',
      payloadValue: 100
    };

    const nextState = simulateBoundaryCross(
      NetworkTopologyShape.ThreeTorus,
      initialState,
      'x'
    );
    expect(nextState.handedness).toBe('left');
    expect(nextState.role).toBe('standard');
    expect(nextState.payloadValue).toBe(100);
  });

  test('Simulate boundary crossing for Nonorientable Universes (Klein, Coast, Slab)', () => {
    const initialState: TraversalState = {
      x: 5,
      y: 10,
      z: 15,
      handedness: 'left',
      role: 'standard',
      payloadValue: 50
    };

    const kleinState = simulateBoundaryCross(
      NetworkTopologyShape.KleinSpace,
      initialState,
      'x'
    );
    expect(kleinState.handedness).toBe('right');
    expect(kleinState.role).toBe('inverted');

    const coastState = simulateBoundaryCross(
      NetworkTopologyShape.CoastSpace,
      initialState,
      'y'
    );
    expect(coastState.payloadValue).toBe(-50);

    const vertState = simulateBoundaryCross(
      NetworkTopologyShape.VerticalKleinChimney,
      initialState,
      'z'
    );
    expect(vertState.payloadValue).toBe(-50);

    const horizState = simulateBoundaryCross(
      NetworkTopologyShape.HorizontalKleinChimney,
      initialState,
      'x'
    );
    expect(horizState.handedness).toBe('right');

    const slabState = simulateBoundaryCross(
      NetworkTopologyShape.NonorientableSlab,
      initialState,
      'z'
    );
    expect(slabState.payloadValue).toBe(-50);
    expect(slabState.handedness).toBe('right');
    expect(slabState.role).toBe('inverted');

    const bunState = simulateBoundaryCross(
      NetworkTopologyShape.BunSpace,
      initialState,
      'y'
    );
    expect(bunState.role).toBe('inverted');

    const girdleState = simulateBoundaryCross(
      NetworkTopologyShape.GirdleSpace,
      initialState,
      'x'
    );
    expect(girdleState.x).toBe(-5);
    expect(girdleState.y).toBe(-10);
    expect(girdleState.z).toBe(-15);
  });

  test('Assess risk of Orientable Universe Shape (Flat Space) via assessTopology', () => {
    const result = analyzer.assessTopology(NetworkTopologyShape.InfiniteFlatSpace);
    expect(result.overallScore).toBe(0.05);
    expect(result.metrics.length).toBeGreaterThan(0);
    
    const orientRisk = result.metrics.find(m => m.id === 'state-inversion-risk');
    expect(orientRisk).toBeDefined();
    expect(orientRisk?.level).toBe('low');
    expect(orientRisk?.score).toBe(0.05);
  });

  test('Assess risk of Nonorientable Universe Shape (Nonorientable Slab) via assessTopology', () => {
    const result = analyzer.assessTopology(NetworkTopologyShape.NonorientableSlab);
    expect(result.overallScore).toBe(0.95);
    
    const orientRisk = result.metrics.find(m => m.id === 'state-inversion-risk');
    expect(orientRisk).toBeDefined();
    expect(orientRisk?.level).toBe('critical');
    
    const loopRisk = result.metrics.find(m => m.id === 'loop-complexity-risk');
    expect(loopRisk).toBeDefined();
    expect(loopRisk?.level).toBe('critical');

    const cryptoRisk = result.metrics.find(m => m.id === 'cryptographic-guard-risk');
    expect(cryptoRisk).toBeDefined();
    expect(cryptoRisk?.level).toBe('high');

    expect(result.recommendations).toContain('Enable cryptographic guard: directValueInversionGuard');
  });

  test('Error boundary checking for invalid topology shape in assessTopology', () => {
    expect(() => {
      analyzer.assessTopology('invalid_shape' as NetworkTopologyShape);
    }).toThrow('Unknown topology shape: invalid_shape');
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
