/**
 * UtilitiesDispute Aggregate
 * Tracks FCRA disputes for WSJF priority 35.0 (Utilities/Credit)
 */
export class UtilitiesDispute {
  constructor(
    public readonly id: string,
    public readonly bureau: 'equifax' | 'experian' | 'transunion',
    public readonly disputeType: 'identity-theft' | 'incorrect-info' | 'fraud',
    public readonly filedDate: Date,
    public readonly responseDeadline: Date,
    public readonly status: 'filed' | 'investigating' | 'resolved' | 'escalated',
    public readonly utilityProvider?: string
  ) {}
  
  get daysUntilDeadline(): number {
    const diff = this.responseDeadline.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  get isOverdue(): boolean {
    return this.daysUntilDeadline < 0;
  }
}
