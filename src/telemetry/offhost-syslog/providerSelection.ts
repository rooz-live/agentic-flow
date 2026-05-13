interface Candidate { providerId: string; name: string; monthlyUsd: number; vcpu: number; ramGb: number; diskGb: number; jobSize: number; }
interface SelectionResult { candidate: Candidate; wsjfScore: number; }
interface SelectionCriteria { forcedProvider?: string; maxMonthlyUsd: number; minVcpu: number; minRamGb: number; minDiskGb: number; wsjfInputs?: { userBusinessValue: number; timeCriticality: number; riskOpportunity: number; }; }
const CANDIDATES: Candidate[] = [
  { providerId: 'aws_lightsail', name: 'AWS Lightsail', monthlyUsd: 5, vcpu: 1, ramGb: 1, diskGb: 40, jobSize: 1 },
  { providerId: 'hivelocity', name: 'Hivelocity VPS', monthlyUsd: 7, vcpu: 2, ramGb: 2, diskGb: 50, jobSize: 3 },
];
export function getOffhostSyslogCandidates(): Candidate[] { return [...CANDIDATES]; }
export function selectOffhostSyslogProvider(criteria: SelectionCriteria): SelectionResult | null {
  let filtered = CANDIDATES.filter(c => c.monthlyUsd <= criteria.maxMonthlyUsd && c.vcpu >= criteria.minVcpu && c.ramGb >= criteria.minRamGb && c.diskGb >= criteria.minDiskGb);
  if (criteria.forcedProvider) filtered = filtered.filter(c => c.providerId === criteria.forcedProvider);
  if (filtered.length === 0) return null;
  const w = criteria.wsjfInputs || { userBusinessValue: 5, timeCriticality: 5, riskOpportunity: 5 };
  // WSJF = CoD / jobSize, where CoD = userBusinessValue * timeCriticality * riskOpportunity
  const cod = w.userBusinessValue * w.timeCriticality * w.riskOpportunity;
  const best = filtered.sort((a, b) => (cod / a.jobSize) - (cod / b.jobSize)).reverse()[0];
  return { candidate: best, wsjfScore: cod / best.jobSize };
}
