import { logPattern } from './pattern-metrics-logger';
import type { WSJFInput } from './types';

function calculateWSJF(input: WSJFInput): number {
  return (input.businessValue + input.timeCriticality + input.riskReduction) / input.jobSize;
}

function calculateRiskScore(wsjf: number, jobSize: number): number {
  return jobSize / wsjf; // Higher value indicates higher risk
}

function assessRisk(bv: number, tc: number, rr: number, size: number): {wsjf: number; riskScore: number; level: string} {
  const wsjf = calculateWSJF({businessValue: bv, timeCriticality: tc, riskReduction: rr, jobSize: size});
  const risk = calculateRiskScore(wsjf, size);
  const level = risk > 3 ? 'high' : risk > 1.5 ? 'medium' : 'low';
  logPattern({ 
    pattern: 'risk_assessment', 
    triggers: risk > 1.5 ? 1 : 0, 
    circle: 'assessor', 
    description: `Merged risk-analytics scoring: WSJF=${wsjf.toFixed(2)}, Risk=${risk.toFixed(2)} (${level})`
  });
  return { wsjf, riskScore: risk, level };
}

if (require.main === module) {
  if (process.argv.length === 6) {
    const bv = parseFloat(process.argv[2]);
    const tc = parseFloat(process.argv[3]);
    const rr = parseFloat(process.argv[4]);
    const size = parseFloat(process.argv[5]);
    const result = assessRisk(bv, tc, rr, size);
    console.log('Risk Assessment Result:', result);
  } else {
    console.log('Usage: node risk-assessment.js <bv 1-10> <tc 1-10> <rr 1-10> <size points>');
    // Example high WSJF MCP-QE-risk-analytics
    const example = assessRisk(10, 9, 10, 5);
    console.log('Example (MCP-QE-risk-analytics):', example);
  }
}