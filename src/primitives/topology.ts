import { RiskMetric, RiskAssessment, RiskLevel } from '../types/risk';

export type TopologyType = 'orientable' | 'nonorientable';

export enum NetworkTopologyShape {
  // Orientable
  InfiniteFlatSpace = 'Infinite Flat Space',
  ThreeTorus = 'Three-Torus',
  HalfTwistTorus = 'Half-Twist Torus',
  QuarterTwistTorus = 'Quarter-Twist Torus',
  ThirdTwistTorus = 'Third-Twist Torus',
  SixthTwistTorus = 'Sixth-Twist Torus',
  ChimneySpace = 'Chimney Space',
  GimletSpace = 'Gimlet Space',
  SlabSpace = 'Slab Space',
  TurnedSlabSpace = 'Turned Slab Space',

  // Nonorientable
  KleinSpace = 'Klein Space',
  CoastSpace = 'Coast Space',
  HalfTwistKleinSpace = 'Half-Twist Klein Space',
  BunSpace = 'Bun Space',
  GirdleSpace = 'Girdle Space',
  VerticalKleinChimney = 'Vertical Klein Chimney',
  HorizontalKleinChimney = 'Horizontal Klein Chimney',
  NonorientableSlab = 'Nonorientable Slab'
}

// Alias for backwards compatibility with UniverseShape
export const UniverseShape = {
  INFINITE_FLAT_SPACE: NetworkTopologyShape.InfiniteFlatSpace,
  THREE_TORUS: NetworkTopologyShape.ThreeTorus,
  HALF_TWIST_TORUS: NetworkTopologyShape.HalfTwistTorus,
  QUARTER_TWIST_TORUS: NetworkTopologyShape.QuarterTwistTorus,
  THIRD_TWIST_TORUS: NetworkTopologyShape.ThirdTwistTorus,
  SIXTH_TWIST_TORUS: NetworkTopologyShape.SixthTwistTorus,
  CHIMNEY_SPACE: NetworkTopologyShape.ChimneySpace,
  GIMLET_SPACE: NetworkTopologyShape.GimletSpace,
  SLAB_SPACE: NetworkTopologyShape.SlabSpace,
  TURNED_SLAB_SPACE: NetworkTopologyShape.TurnedSlabSpace,
  KLEIN_SPACE: NetworkTopologyShape.KleinSpace,
  COAST_SPACE: NetworkTopologyShape.CoastSpace,
  HALF_TWIST_KLEIN_SPACE: NetworkTopologyShape.HalfTwistKleinSpace,
  BUN_SPACE: NetworkTopologyShape.BunSpace,
  GIRDLE_SPACE: NetworkTopologyShape.GirdleSpace,
  VERTICAL_KLEIN_CHIMNEY: NetworkTopologyShape.VerticalKleinChimney,
  HORIZONTAL_KLEIN_CHIMNEY: NetworkTopologyShape.HorizontalKleinChimney,
  NONORIENTABLE_SLAB: NetworkTopologyShape.NonorientableSlab
} as const;

export type UniverseShape = NetworkTopologyShape;

export interface TopologyShape {
  id: NetworkTopologyShape;
  name: string;
  isOrientable: boolean;
  gluingMechanics: string;
  vmRiskScore: number;
  mitigations: string[];
  cryptographicGuards: string[];
}

export interface TopologyPrimitive {
  shape: NetworkTopologyShape;
  type: TopologyType;
  description: string;
  loopingDimensions: number; // 0, 1, 2, 3
  twistDegrees?: number; // 0, 60, 90, 120, 180
  mirrored: boolean;
}

export interface MessageState {
  payload: Record<string, any>;
  originHandedness: 'right' | 'left';
  currentHandedness: 'right' | 'left';
  roleInverted: boolean;
  valueSignMultiplier: number; // 1 or -1
}

export interface TraversalState {
  x: number;
  y: number;
  z: number;
  handedness: 'left' | 'right';
  role: 'standard' | 'inverted';
  payloadValue: number;
}

export interface EdgePythonVMConfig {
  maxRecursionDepth: number;
  maxInstructions: number;
  memoryLimitBytes: number;
  enableDunderCaching: boolean;
  cryptographicSignAssertions: boolean;
}

export const DEFAULT_VM_CONFIG: EdgePythonVMConfig = {
  maxRecursionDepth: 100,
  maxInstructions: 500000,
  memoryLimitBytes: 256 * 1024, // 256 KB minimal binary standard
  enableDunderCaching: true,
  cryptographicSignAssertions: false
};

// Merged database maps
export const TOPOLOGY_SHAPES: Record<NetworkTopologyShape, TopologyShape> = {
  [NetworkTopologyShape.InfiniteFlatSpace]: {
    id: NetworkTopologyShape.InfiniteFlatSpace,
    name: 'Infinite Flat Space (R^3)',
    isOrientable: true,
    gluingMechanics: 'Extends infinitely; no looping.',
    vmRiskScore: 0.05,
    mitigations: ['No recursion issues.'],
    cryptographicGuards: []
  },
  [NetworkTopologyShape.ThreeTorus]: {
    id: NetworkTopologyShape.ThreeTorus,
    name: 'Three-Torus (3-Torus)',
    isOrientable: true,
    gluingMechanics: 'Solid cube; opposite faces glued directly.',
    vmRiskScore: 0.35,
    mitigations: ['Loop complexity triggers stack recursion check.'],
    cryptographicGuards: []
  },
  [NetworkTopologyShape.HalfTwistTorus]: {
    id: NetworkTopologyShape.HalfTwistTorus,
    name: 'Half-Twist Torus',
    isOrientable: true,
    gluingMechanics: 'Solid cube; opposite faces glued with 180° rotation.',
    vmRiskScore: 0.45,
    mitigations: ['Requires moderate recursion limits (>50 depth).'],
    cryptographicGuards: []
  },
  [NetworkTopologyShape.QuarterTwistTorus]: {
    id: NetworkTopologyShape.QuarterTwistTorus,
    name: 'Quarter-Twist Torus',
    isOrientable: true,
    gluingMechanics: 'Solid cube; opposite faces glued with 90° rotation.',
    vmRiskScore: 0.50,
    mitigations: ['High-frequency traversal requires caching.'],
    cryptographicGuards: []
  },
  [NetworkTopologyShape.ThirdTwistTorus]: {
    id: NetworkTopologyShape.ThirdTwistTorus,
    name: 'Third-Twist Torus',
    isOrientable: true,
    gluingMechanics: 'Hexagonal prism; ends glued with 120° rotation.',
    vmRiskScore: 0.55,
    mitigations: ['Complex boundary check; dunder-caching helps.'],
    cryptographicGuards: []
  },
  [NetworkTopologyShape.SixthTwistTorus]: {
    id: NetworkTopologyShape.SixthTwistTorus,
    name: 'Sixth-Twist Torus',
    isOrientable: true,
    gluingMechanics: 'Hexagonal prism; ends glued with 60° rotation.',
    vmRiskScore: 0.60,
    mitigations: ['High complexity; requires memory budget scaling.'],
    cryptographicGuards: []
  },
  [NetworkTopologyShape.ChimneySpace]: {
    id: NetworkTopologyShape.ChimneySpace,
    name: 'Chimney Space',
    isOrientable: true,
    gluingMechanics: 'Loops in 1 direction (cylinder); 2 infinite directions.',
    vmRiskScore: 0.20,
    mitigations: ['Single-loop recursion; low depth budget needed.'],
    cryptographicGuards: []
  },
  [NetworkTopologyShape.GimletSpace]: {
    id: NetworkTopologyShape.GimletSpace,
    name: 'Gimlet Space',
    isOrientable: true,
    gluingMechanics: 'Chimney space; looping path has half-twist rotation.',
    vmRiskScore: 0.40,
    mitigations: ['Intermediate loop risk; rotation checks active.'],
    cryptographicGuards: []
  },
  [NetworkTopologyShape.SlabSpace]: {
    id: NetworkTopologyShape.SlabSpace,
    name: 'Slab Space',
    isOrientable: true,
    gluingMechanics: 'Loops in 2 directions (2D torus); 1 infinite direction.',
    vmRiskScore: 0.30,
    mitigations: ['Multi-loop traversal; checks loop dimension bounds.'],
    cryptographicGuards: []
  },
  [NetworkTopologyShape.TurnedSlabSpace]: {
    id: NetworkTopologyShape.TurnedSlabSpace,
    name: 'Turned Slab Space',
    isOrientable: true,
    gluingMechanics: 'Slab space; infinite directions shifted relative to loop.',
    vmRiskScore: 0.45,
    mitigations: ['Shifted coordinate checks; caching essential.'],
    cryptographicGuards: []
  },
  [NetworkTopologyShape.KleinSpace]: {
    id: NetworkTopologyShape.KleinSpace,
    name: 'Klein Space',
    isOrientable: false,
    gluingMechanics: 'Infinite universe; Klein-bottle style twist along X-axis.',
    vmRiskScore: 0.85,
    mitigations: ['Reverse handedness/role.', 'Strict assertion signing.'],
    cryptographicGuards: ['cryptographicSignAssertions']
  },
  [NetworkTopologyShape.CoastSpace]: {
    id: NetworkTopologyShape.CoastSpace,
    name: 'Coast Space',
    isOrientable: false,
    gluingMechanics: 'Nonorientable slab space; plane twist boundary.',
    vmRiskScore: 0.75,
    mitigations: ['State mirrored.', 'Intercept sign change at boundary.'],
    cryptographicGuards: ['interceptSignChangeBoundary']
  },
  [NetworkTopologyShape.HalfTwistKleinSpace]: {
    id: NetworkTopologyShape.HalfTwistKleinSpace,
    name: 'Half-Twist Klein Space',
    isOrientable: false,
    gluingMechanics: 'Compact 3-manifold; multiple faces glued with twist.',
    vmRiskScore: 0.90,
    mitigations: ['Multiple inversion planes.', 'Strict verification required.'],
    cryptographicGuards: ['multiInversionPlaneVerify']
  },
  [NetworkTopologyShape.BunSpace]: {
    id: NetworkTopologyShape.BunSpace,
    name: 'Bun Space',
    isOrientable: false,
    gluingMechanics: 'Closed space; face-gluing mirrored across specific axis.',
    vmRiskScore: 0.80,
    mitigations: ['Inversion happens along mirror plane.', 'Role flips to inverted.'],
    cryptographicGuards: ['mirrorPlaneInversionCheck']
  },
  [NetworkTopologyShape.GirdleSpace]: {
    id: NetworkTopologyShape.GirdleSpace,
    name: 'Girdle Space',
    isOrientable: false,
    gluingMechanics: 'Mirror-symmetrical bounding zones with specific layout.',
    vmRiskScore: 0.85,
    mitigations: ['Coordinates inverted on cross-over.', 'Block transaction without signatures.'],
    cryptographicGuards: ['signatureVerificationEnforcement']
  },
  [NetworkTopologyShape.VerticalKleinChimney]: {
    id: NetworkTopologyShape.VerticalKleinChimney,
    name: 'Vertical Klein Chimney',
    isOrientable: false,
    gluingMechanics: 'Infinite in 2 directions; Z-axis loops like Klein bottle.',
    vmRiskScore: 0.70,
    mitigations: ['Traversal along Z reverses payload value signs.'],
    cryptographicGuards: ['payloadValueSignReversalCheck']
  },
  [NetworkTopologyShape.HorizontalKleinChimney]: {
    id: NetworkTopologyShape.HorizontalKleinChimney,
    name: 'Horizontal Klein Chimney',
    isOrientable: false,
    gluingMechanics: 'Infinite in 2 directions; X/Y axis loops with Klein twist.',
    vmRiskScore: 0.75,
    mitigations: ['Traversal along loop flips current handedness.'],
    cryptographicGuards: ['handednessFlipCheck']
  },
  [NetworkTopologyShape.NonorientableSlab]: {
    id: NetworkTopologyShape.NonorientableSlab,
    name: 'Nonorientable Slab',
    isOrientable: false,
    gluingMechanics: 'Slab space; finite loop forces mirrored inversion.',
    vmRiskScore: 0.95,
    mitigations: ['Direct inversion of all numbers and transaction values.'],
    cryptographicGuards: ['directValueInversionGuard']
  }
};

export class TopologyRiskAnalyzer {
  private primitives: Record<NetworkTopologyShape, TopologyPrimitive> = {
    [NetworkTopologyShape.InfiniteFlatSpace]: {
      shape: NetworkTopologyShape.InfiniteFlatSpace,
      type: 'orientable',
      description: 'The traditional textbook universe. Extends infinitely in every direction along the X, Y, and Z axes without looping.',
      loopingDimensions: 0,
      mirrored: false
    },
    [NetworkTopologyShape.ThreeTorus]: {
      shape: NetworkTopologyShape.ThreeTorus,
      type: 'orientable',
      description: 'Solid cube with opposite faces glued. Loop back from top to bottom, front to back, left to right.',
      loopingDimensions: 3,
      mirrored: false
    },
    [NetworkTopologyShape.HalfTwistTorus]: {
      shape: NetworkTopologyShape.HalfTwistTorus,
      type: 'orientable',
      description: 'Three-Torus with one opposite face pair glued after a 180-degree rotation.',
      loopingDimensions: 3,
      twistDegrees: 180,
      mirrored: false
    },
    [NetworkTopologyShape.QuarterTwistTorus]: {
      shape: NetworkTopologyShape.QuarterTwistTorus,
      type: 'orientable',
      description: 'Three-Torus with one opposite face pair rotated by exactly 90 degrees before gluing.',
      loopingDimensions: 3,
      twistDegrees: 90,
      mirrored: false
    },
    [NetworkTopologyShape.ThirdTwistTorus]: {
      shape: NetworkTopologyShape.ThirdTwistTorus,
      type: 'orientable',
      description: 'Hexagonal prism with end faces glued after a 120-degree rotation.',
      loopingDimensions: 3,
      twistDegrees: 120,
      mirrored: false
    },
    [NetworkTopologyShape.SixthTwistTorus]: {
      shape: NetworkTopologyShape.SixthTwistTorus,
      type: 'orientable',
      description: 'Hexagonal prism with end faces glued after a 60-degree rotation.',
      loopingDimensions: 3,
      twistDegrees: 60,
      mirrored: false
    },
    [NetworkTopologyShape.ChimneySpace]: {
      shape: NetworkTopologyShape.ChimneySpace,
      type: 'orientable',
      description: 'Finite and loops back in one direction (like a cylinder) but infinite in the other two directions.',
      loopingDimensions: 1,
      mirrored: false
    },
    [NetworkTopologyShape.GimletSpace]: {
      shape: NetworkTopologyShape.GimletSpace,
      type: 'orientable',
      description: 'A chimney space variant where the looping direction includes a half-twist or specific rotation.',
      loopingDimensions: 1,
      twistDegrees: 180,
      mirrored: false
    },
    [NetworkTopologyShape.SlabSpace]: {
      shape: NetworkTopologyShape.SlabSpace,
      type: 'orientable',
      description: 'Loops back in two directions (forming a 2D torus boundary) but remains infinite in the third.',
      loopingDimensions: 2,
      mirrored: false
    },
    [NetworkTopologyShape.TurnedSlabSpace]: {
      shape: NetworkTopologyShape.TurnedSlabSpace,
      type: 'orientable',
      description: 'A slab space where the two infinite directions are shifted or rotated relative to the looping paths.',
      loopingDimensions: 2,
      twistDegrees: 90,
      mirrored: false
    },
    [NetworkTopologyShape.KleinSpace]: {
      shape: NetworkTopologyShape.KleinSpace,
      type: 'nonorientable',
      description: 'An infinite universe featuring a Klein-bottle style twist along one of its spatial dimensions.',
      loopingDimensions: 3,
      mirrored: true
    },
    [NetworkTopologyShape.CoastSpace]: {
      shape: NetworkTopologyShape.CoastSpace,
      type: 'nonorientable',
      description: 'A variant of a nonorientable slab space where boundaries twist across an infinite plane.',
      loopingDimensions: 2,
      mirrored: true
    },
    [NetworkTopologyShape.HalfTwistKleinSpace]: {
      shape: NetworkTopologyShape.HalfTwistKleinSpace,
      type: 'nonorientable',
      description: 'A compact 3-manifold where multiple faces are glued with opposing orientation twists.',
      loopingDimensions: 3,
      twistDegrees: 180,
      mirrored: true
    },
    [NetworkTopologyShape.BunSpace]: {
      shape: NetworkTopologyShape.BunSpace,
      type: 'nonorientable',
      description: 'A nonorientable closed space where face-gluing rules mirror across a specific axis.',
      loopingDimensions: 3,
      mirrored: true
    },
    [NetworkTopologyShape.GirdleSpace]: {
      shape: NetworkTopologyShape.GirdleSpace,
      type: 'nonorientable',
      description: 'A nonorientable manifold with a highly specific layout of mirrored bounding zones.',
      loopingDimensions: 3,
      mirrored: true
    },
    [NetworkTopologyShape.VerticalKleinChimney]: {
      shape: NetworkTopologyShape.VerticalKleinChimney,
      type: 'nonorientable',
      description: 'A chimney space infinite in two directions but loops like a Klein bottle in the third.',
      loopingDimensions: 1,
      mirrored: true
    },
    [NetworkTopologyShape.HorizontalKleinChimney]: {
      shape: NetworkTopologyShape.HorizontalKleinChimney,
      type: 'nonorientable',
      description: 'A chimney space where the Klein-bottle twist happens across a different dimensional plane.',
      loopingDimensions: 1,
      mirrored: true
    },
    [NetworkTopologyShape.NonorientableSlab]: {
      shape: NetworkTopologyShape.NonorientableSlab,
      type: 'nonorientable',
      description: 'A slab space where one of the finite, looping dimensions forces a mirrored inversion.',
      loopingDimensions: 2,
      mirrored: true
    }
  };

  getPrimitive(shape: NetworkTopologyShape): TopologyPrimitive {
    return this.primitives[shape];
  }

  traverseLoop(shape: NetworkTopologyShape, state: MessageState): MessageState {
    const primitive = this.primitives[shape];
    if (!primitive) return state;

    if (primitive.mirrored) {
      const newHandedness = state.currentHandedness === 'right' ? 'left' : 'right';
      return {
        ...state,
        currentHandedness: newHandedness,
        roleInverted: !state.roleInverted,
        valueSignMultiplier: state.valueSignMultiplier * -1
      };
    }

    return state;
  }

  assessTopology(shapeId: NetworkTopologyShape): RiskAssessment {
    const shape = TOPOLOGY_SHAPES[shapeId];
    if (!shape) {
      throw new Error(`Unknown topology shape: ${shapeId}`);
    }

    const metrics: RiskMetric[] = [];
    const recommendations: string[] = [...shape.mitigations];

    if (!shape.isOrientable) {
      metrics.push({
        id: 'state-inversion-risk',
        name: 'State Inversion (Nonorientability) Risk',
        score: 0.9,
        level: 'critical',
        timestamp: new Date()
      });
      
      shape.cryptographicGuards.forEach(guard => {
        recommendations.push(`Enable cryptographic guard: ${guard}`);
      });
    } else {
      metrics.push({
        id: 'state-inversion-risk',
        name: 'State Inversion (Nonorientability) Risk',
        score: 0.05,
        level: 'low',
        timestamp: new Date()
      });
    }

    const loopRisk = shape.vmRiskScore;
    let loopLevel: RiskLevel = 'low';
    if (loopRisk >= 0.75) loopLevel = 'critical';
    else if (loopRisk >= 0.5) loopLevel = 'high';
    else if (loopRisk >= 0.25) loopLevel = 'medium';

    metrics.push({
      id: 'loop-complexity-risk',
      name: 'Dimensional Loop Traversal Risk',
      score: loopRisk,
      level: loopLevel,
      timestamp: new Date()
    });

    if (shape.cryptographicGuards.length > 0) {
      metrics.push({
        id: 'cryptographic-guard-risk',
        name: 'Cryptographic Enforcement Risk',
        score: 0.85,
        level: 'high',
        timestamp: new Date()
      });
    } else {
      metrics.push({
        id: 'cryptographic-guard-risk',
        name: 'Cryptographic Enforcement Risk',
        score: 0.0,
        level: 'low',
        timestamp: new Date()
      });
    }

    return {
      overallScore: shape.vmRiskScore,
      metrics,
      recommendations
    };
  }

  assessTopologicalRisk(shape: NetworkTopologyShape, vmConfig: EdgePythonVMConfig = DEFAULT_VM_CONFIG): RiskAssessment {
    const primitive = this.primitives[shape];
    if (!primitive) {
      return {
        overallScore: 0,
        metrics: [],
        recommendations: ['Unknown topological primitive shape.']
      };
    }

    const metrics: RiskMetric[] = [];
    const recommendations: string[] = [];

    let orientationScore = primitive.type === 'nonorientable' ? 0.95 : 0.05;
    if (primitive.type === 'nonorientable' && vmConfig.cryptographicSignAssertions) {
      orientationScore = 0.15;
    }

    metrics.push({
      id: `topological-inversion-${shape.toLowerCase().replace(/\s+/g, '-')}`,
      name: 'State Orientation Inversion Risk',
      score: orientationScore,
      level: orientationScore > 0.7 ? 'critical' : orientationScore > 0.4 ? 'medium' : 'low',
      timestamp: new Date()
    });

    const complexityScore = (primitive.loopingDimensions * 0.25) + (primitive.twistDegrees ? (primitive.twistDegrees / 360) * 0.2 : 0);
    metrics.push({
      id: `topological-complexity-${shape.toLowerCase().replace(/\s+/g, '-')}`,
      name: 'Looping Dimensional Complexity',
      score: complexityScore,
      level: complexityScore > 0.7 ? 'high' : complexityScore > 0.4 ? 'medium' : 'low',
      timestamp: new Date()
    });

    let recursionScore = 0.05;
    if (primitive.loopingDimensions > 1 && vmConfig.maxRecursionDepth < 50) {
      recursionScore = 0.85;
    } else if (primitive.loopingDimensions > 0 && vmConfig.maxRecursionDepth < 20) {
      recursionScore = 0.65;
    }

    metrics.push({
      id: `edge-python-recursion-exhaustion-${shape.toLowerCase().replace(/\s+/g, '-')}`,
      name: 'Edge Python Recursion Exhaustion Risk',
      score: recursionScore,
      level: recursionScore > 0.7 ? 'high' : recursionScore > 0.4 ? 'medium' : 'low',
      timestamp: new Date()
    });

    const topoShape = TOPOLOGY_SHAPES[shape];

    if (primitive.type === 'nonorientable') {
      if (vmConfig.cryptographicSignAssertions) {
        recommendations.push(
          `[ROAM: Mitigated] Nonorientable shape '${shape}' is fully secured by Edge Python cryptographic signature assertions. State inversion is blocked at VM boundary.`,
          `[ROAM: Owned] System Architect must periodically audit VM dual-inline caching and instance-dunder performance under 150% peak load.`
        );
      } else {
        recommendations.push(
          `[ROAM: Avoided] Topology shape '${shape}' is nonorientable (breaks state consistency). Implement topological filter to reject client message routes that loop through Klein bottle/Möbius boundaries.`,
          `[ROAM: Mitigated] Enable Edge Python 'cryptographicSignAssertions' to dynamically detect and intercept sign-flips and role-inversion exceptions.`,
          `[ROAM: Owned] Assign accountabilities to Billing Gateway Roles to monitor mirrored state inversion payloads.`
        );
      }
      if (topoShape) {
        topoShape.cryptographicGuards.forEach(guard => {
          recommendations.push(`Enable cryptographic guard: ${guard}`);
        });
      }
    } else {
      if (primitive.loopingDimensions > 0) {
        recommendations.push(
          `[ROAM: Monitored] Loop topology '${shape}' is orientable but loops in ${primitive.loopingDimensions} dimension(s). Verify loop-termination bounds to prevent stack overflow or endless routing cycles.`,
          `[ROAM: Accepted] The closed looping space has stable handedness. Keep standard billing logic without orientation guards.`
        );
      } else {
        recommendations.push(
          `[ROAM: Accepted] Infinite open space requires standard linear message routing.`
        );
      }
    }

    if (recursionScore > 0.5) {
      recommendations.push(
        `[ROAM: Mitigated] Upgrade Edge Python VM configuration 'maxRecursionDepth' to at least 150 to handle nested topological bounds of '${shape}' safely.`
      );
    }

    const overallScore = Math.max(...metrics.map(m => m.score));

    return {
      overallScore,
      metrics,
      recommendations
    };
  }
}

export function simulateBoundaryCross(
  shapeId: NetworkTopologyShape,
  state: TraversalState,
  boundary: 'x' | 'y' | 'z'
): TraversalState {
  const nextState = { ...state };

  switch (shapeId) {
    case NetworkTopologyShape.KleinSpace:
      if (boundary === 'x') {
        nextState.handedness = state.handedness === 'left' ? 'right' : 'left';
        nextState.role = state.role === 'standard' ? 'inverted' : 'standard';
      }
      break;

    case NetworkTopologyShape.CoastSpace:
      if (boundary === 'y') {
        nextState.payloadValue = -state.payloadValue;
      }
      break;

    case NetworkTopologyShape.VerticalKleinChimney:
      if (boundary === 'z') {
        nextState.payloadValue = -state.payloadValue;
      }
      break;

    case NetworkTopologyShape.HorizontalKleinChimney:
      if (boundary === 'x' || boundary === 'y') {
        nextState.handedness = state.handedness === 'left' ? 'right' : 'left';
      }
      break;

    case NetworkTopologyShape.NonorientableSlab:
      nextState.payloadValue = -state.payloadValue;
      nextState.handedness = state.handedness === 'left' ? 'right' : 'left';
      nextState.role = state.role === 'standard' ? 'inverted' : 'standard';
      break;

    case NetworkTopologyShape.BunSpace:
      nextState.role = 'inverted';
      break;

    case NetworkTopologyShape.GirdleSpace:
      nextState.x = -state.x;
      nextState.y = -state.y;
      nextState.z = -state.z;
      break;

    default:
      break;
  }

  return nextState;
}
