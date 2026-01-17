/**
 * WSJF (Weighted Shortest Job First) Visualization Auto-Selector
 * 
 * Integrates with MCP (Model Context Protocol) and MPP (Method Pattern Protocol)
 * to automatically select optimal visualization framework based on:
 * - Business Value
 * - Time Criticality
 * - Risk Reduction
 * - Job Size
 * 
 * Frameworks evaluated:
 * 1. Deck.gl (GPU-powered, React-friendly, proven scale)
 * 2. Three.js (more control, steeper learning curve)
 * 3. Babylon.js (game engine, full 3D scenes)
 * 4. Cesium (geospatial 3D, massive datasets)
 * 5. WebGPU/Rio Terminal (next-gen GPU compute)
 */

export interface WSJFScore {
  businessValue: number; // 1-10
  timeCriticality: number; // 1-10
  riskReduction: number; // 1-10
  jobSize: number; // 1-20 (smaller = better)
  wsjf: number; // (BV + TC + RR) / JS
}

export interface VisualizationFramework {
  name: string;
  type: 'webgl' | 'webgpu' | 'canvas';
  reactFriendly: boolean;
  gpuPowered: boolean;
  learningCurve: 'easy' | 'moderate' | 'steep';
  maturity: 'experimental' | 'stable' | 'proven';
  dataScale: 'small' | 'medium' | 'large' | 'massive';
  use3D: boolean;
  geospatial: boolean;
  packageSize: string; // MB
  wsjfScore?: WSJFScore;
}

export interface ProjectRequirements {
  // MCP Factors
  mcpFactors: {
    modelComplexity: 'low' | 'medium' | 'high';
    contextSize: number; // MB
    protocolOverhead: 'minimal' | 'moderate' | 'high';
  };

  // MPP Factors
  mppFactors: {
    methodPattern: 'iterate' | 'flow' | 'pi' | 'spike' | 'sprint' | 'sync';
    timeboxed: boolean;
    sprintDuration: number; // weeks
    velocity: number; // story points/sprint
  };

  // Technical Requirements
  technical: {
    dataSize: number; // MB
    recordCount: number;
    requires3D: boolean;
    requiresGeospatial: boolean;
    reactStack: boolean;
    performanceCritical: boolean;
  };

  // Business Requirements
  business: {
    timeToMarket: number; // weeks
    budget: number; // hours
    riskTolerance: 'low' | 'medium' | 'high';
    productionDeadline?: Date;
  };
}

export class WSJFVisualizationSelector {
  private frameworks: VisualizationFramework[] = [
    {
      name: 'Deck.gl',
      type: 'webgl',
      reactFriendly: true,
      gpuPowered: true,
      learningCurve: 'easy',
      maturity: 'proven',
      dataScale: 'massive',
      use3D: true,
      geospatial: true,
      packageSize: '2.5',
    },
    {
      name: 'Three.js',
      type: 'webgl',
      reactFriendly: false,
      gpuPowered: true,
      learningCurve: 'steep',
      maturity: 'proven',
      dataScale: 'large',
      use3D: true,
      geospatial: false,
      packageSize: '0.6',
    },
    {
      name: 'Babylon.js',
      type: 'webgl',
      reactFriendly: false,
      gpuPowered: true,
      learningCurve: 'steep',
      maturity: 'stable',
      dataScale: 'large',
      use3D: true,
      geospatial: false,
      packageSize: '3.2',
    },
    {
      name: 'Cesium',
      type: 'webgl',
      reactFriendly: false,
      gpuPowered: true,
      learningCurve: 'moderate',
      maturity: 'proven',
      dataScale: 'massive',
      use3D: true,
      geospatial: true,
      packageSize: '8.5',
    },
    {
      name: 'WebGPU/Rio Terminal',
      type: 'webgpu',
      reactFriendly: false,
      gpuPowered: true,
      learningCurve: 'steep',
      maturity: 'experimental',
      dataScale: 'massive',
      use3D: true,
      geospatial: false,
      packageSize: '1.2',
    },
  ];

  /**
   * Calculate WSJF score for a framework given project requirements
   */
  private calculateWSJF(
    framework: VisualizationFramework,
    requirements: ProjectRequirements
  ): WSJFScore {
    // Business Value (1-10)
    let businessValue = 5;
    if (framework.maturity === 'proven') businessValue += 2;
    if (framework.reactFriendly && requirements.technical.reactStack) businessValue += 2;
    if (framework.dataScale === 'massive' && requirements.technical.recordCount > 1000000)
      businessValue += 1;
    businessValue = Math.min(10, businessValue);

    // Time Criticality (1-10)
    let timeCriticality = 5;
    const weeksToDeadline = requirements.business.productionDeadline
      ? (requirements.business.productionDeadline.getTime() - Date.now()) /
        (1000 * 60 * 60 * 24 * 7)
      : 999;
    if (weeksToDeadline < 4) timeCriticality += 3;
    else if (weeksToDeadline < 8) timeCriticality += 2;
    else if (weeksToDeadline < 12) timeCriticality += 1;

    if (framework.learningCurve === 'easy') timeCriticality += 2;
    else if (framework.learningCurve === 'steep') timeCriticality -= 1;
    timeCriticality = Math.max(1, Math.min(10, timeCriticality));

    // Risk Reduction (1-10)
    let riskReduction = 5;
    if (framework.maturity === 'proven') riskReduction += 3;
    else if (framework.maturity === 'stable') riskReduction += 1;
    else if (framework.maturity === 'experimental') riskReduction -= 2;

    if (requirements.business.riskTolerance === 'low') {
      if (framework.maturity === 'proven') riskReduction += 2;
      if (framework.learningCurve === 'easy') riskReduction += 1;
    }
    riskReduction = Math.max(1, Math.min(10, riskReduction));

    // Job Size (1-20, lower is better)
    let jobSize = 10;
    
    // Learning curve impact
    if (framework.learningCurve === 'easy') jobSize -= 3;
    else if (framework.learningCurve === 'steep') jobSize += 4;

    // React integration impact
    if (requirements.technical.reactStack && !framework.reactFriendly) jobSize += 3;

    // Package size impact
    const pkgSize = parseFloat(framework.packageSize);
    if (pkgSize > 5) jobSize += 2;
    else if (pkgSize < 2) jobSize -= 1;

    // Maturity impact (proven = less custom work)
    if (framework.maturity === 'proven') jobSize -= 2;
    else if (framework.maturity === 'experimental') jobSize += 3;

    jobSize = Math.max(1, Math.min(20, jobSize));

    // Calculate WSJF
    const wsjf = (businessValue + timeCriticality + riskReduction) / jobSize;

    return {
      businessValue,
      timeCriticality,
      riskReduction,
      jobSize,
      wsjf,
    };
  }

  /**
   * Evaluate all frameworks and return ranked list
   */
  evaluateFrameworks(requirements: ProjectRequirements): VisualizationFramework[] {
    // Calculate WSJF for each framework
    const scored = this.frameworks.map((framework) => ({
      ...framework,
      wsjfScore: this.calculateWSJF(framework, requirements),
    }));

    // Filter based on hard requirements
    let filtered = scored.filter((f) => {
      if (requirements.technical.requires3D && !f.use3D) return false;
      if (requirements.technical.requiresGeospatial && !f.geospatial) return false;
      if (requirements.business.riskTolerance === 'low' && f.maturity === 'experimental')
        return false;
      return true;
    });

    // Sort by WSJF (descending)
    filtered.sort((a, b) => (b.wsjfScore?.wsjf || 0) - (a.wsjfScore?.wsjf || 0));

    return filtered;
  }

  /**
   * Get recommended framework with explanation
   */
  getRecommendation(requirements: ProjectRequirements): {
    framework: VisualizationFramework;
    rationale: string;
    alternatives: VisualizationFramework[];
  } {
    const ranked = this.evaluateFrameworks(requirements);

    if (ranked.length === 0) {
      throw new Error('No frameworks match the requirements');
    }

    const recommended = ranked[0];
    const alternatives = ranked.slice(1, 3);

    // Generate rationale
    const score = recommended.wsjfScore!;
    const rationale = this.generateRationale(recommended, score, requirements);

    return {
      framework: recommended,
      rationale,
      alternatives,
    };
  }

  private generateRationale(
    framework: VisualizationFramework,
    score: WSJFScore,
    requirements: ProjectRequirements
  ): string {
    const reasons: string[] = [];

    reasons.push(`**WSJF Score: ${score.wsjf.toFixed(2)}**`);
    reasons.push(
      `- Business Value: ${score.businessValue}/10 (${this.explainBusinessValue(framework, requirements)})`
    );
    reasons.push(
      `- Time Criticality: ${score.timeCriticality}/10 (${this.explainTimeCriticality(framework, requirements)})`
    );
    reasons.push(
      `- Risk Reduction: ${score.riskReduction}/10 (${this.explainRiskReduction(framework, requirements)})`
    );
    reasons.push(`- Job Size: ${score.jobSize}/20 (${this.explainJobSize(framework, requirements)})`);

    reasons.push('\n**Key Strengths:**');
    if (framework.reactFriendly && requirements.technical.reactStack) {
      reasons.push('- Native React integration (reduces development time)');
    }
    if (framework.gpuPowered && requirements.technical.performanceCritical) {
      reasons.push('- GPU acceleration (critical for performance requirements)');
    }
    if (framework.maturity === 'proven') {
      reasons.push('- Proven in production (reduces implementation risk)');
    }
    if (framework.dataScale === 'massive' && requirements.technical.recordCount > 1000000) {
      reasons.push('- Handles massive datasets (required for your scale)');
    }

    return reasons.join('\n');
  }

  private explainBusinessValue(
    framework: VisualizationFramework,
    requirements: ProjectRequirements
  ): string {
    const reasons: string[] = [];
    if (framework.maturity === 'proven') reasons.push('proven maturity');
    if (framework.reactFriendly && requirements.technical.reactStack) reasons.push('React fit');
    return reasons.join(', ') || 'baseline';
  }

  private explainTimeCriticality(
    framework: VisualizationFramework,
    requirements: ProjectRequirements
  ): string {
    const reasons: string[] = [];
    if (framework.learningCurve === 'easy') reasons.push('easy learning curve');
    if (requirements.business.timeToMarket < 4) reasons.push('urgent deadline');
    return reasons.join(', ') || 'standard timeline';
  }

  private explainRiskReduction(
    framework: VisualizationFramework,
    requirements: ProjectRequirements
  ): string {
    const reasons: string[] = [];
    if (framework.maturity === 'proven') reasons.push('production-proven');
    if (requirements.business.riskTolerance === 'low') reasons.push('low risk tolerance');
    return reasons.join(', ') || 'standard risk';
  }

  private explainJobSize(
    framework: VisualizationFramework,
    requirements: ProjectRequirements
  ): string {
    const reasons: string[] = [];
    if (framework.learningCurve === 'easy') reasons.push('easy to learn');
    if (framework.reactFriendly && requirements.technical.reactStack)
      reasons.push('minimal integration');
    return reasons.join(', ') || 'standard effort';
  }
}

/**
 * Example usage for agentic-flow project
 */
export function selectVisualizationForAgenticFlow(): void {
  const selector = new WSJFVisualizationSelector();

  const requirements: ProjectRequirements = {
    mcpFactors: {
      modelComplexity: 'high',
      contextSize: 100, // MB
      protocolOverhead: 'moderate',
    },
    mppFactors: {
      methodPattern: 'sprint',
      timeboxed: true,
      sprintDuration: 1, // weeks
      velocity: 20, // story points
    },
    technical: {
      dataSize: 50, // MB
      recordCount: 1000000, // 1M ROAM metrics
      requires3D: true,
      requiresGeospatial: false,
      reactStack: true,
      performanceCritical: true,
    },
    business: {
      timeToMarket: 2, // weeks
      budget: 40, // hours
      riskTolerance: 'low',
      productionDeadline: new Date('2026-01-30'),
    },
  };

  const recommendation = selector.getRecommendation(requirements);

  console.log('🎯 WSJF Visualization Recommendation\n');
  console.log(`✅ Recommended: ${recommendation.framework.name}`);
  console.log(`   WSJF Score: ${recommendation.framework.wsjfScore?.wsjf.toFixed(2)}\n`);
  console.log('📊 Rationale:');
  console.log(recommendation.rationale);
  console.log('\n🔄 Alternatives:');
  recommendation.alternatives.forEach((alt, i) => {
    console.log(
      `   ${i + 1}. ${alt.name} (WSJF: ${alt.wsjfScore?.wsjf.toFixed(2)}) - ${alt.learningCurve} learning curve`
    );
  });
}

/**
 * MCP Integration: Store decision in Model Context Protocol
 */
export interface MCPVisualizationDecision {
  timestamp: Date;
  framework: string;
  wsjfScore: number;
  requirements: ProjectRequirements;
  rationale: string;
}

export function storeMCPDecision(decision: MCPVisualizationDecision): void {
  // Store in MCP server for future reference
  console.log('[MCP] Storing visualization decision:', {
    framework: decision.framework,
    wsjf: decision.wsjfScore,
    timestamp: decision.timestamp,
  });
  // In production: call claude-flow@v3alpha memory store
  // npx claude-flow@v3alpha memory store --key "viz-decision" --value "..." --namespace decisions
}

/**
 * MPP Integration: Track method pattern protocol factors
 */
export function trackMPPFactors(
  methodPattern: 'iterate' | 'flow' | 'pi' | 'spike' | 'sprint' | 'sync',
  duration: number,
  velocity: number
): void {
  console.log('[MPP] Tracking method pattern:', {
    pattern: methodPattern,
    duration,
    velocity,
  });
  // In production: integrate with sprint tracking
}
