/**
 * MoverQuote Aggregate
 * Tracks mover quotes for WSJF priority 45.0 (Physical Move)
 */
export class MoverQuote {
  constructor(
    public readonly id: string,
    public readonly provider: string,
    public readonly ratePerHour: number,
    public readonly estimatedHours: number,
    public readonly insuranceIncluded: boolean,
    public readonly availableDate: Date,
    public readonly status: 'pending' | 'accepted' | 'declined',
    public readonly source: 'thumbtack' | 'email' | 'phone'
  ) {}
  
  get totalEstimate(): number {
    return this.ratePerHour * this.estimatedHours;
  }
  
  get isWithinBudget(): boolean {
    return this.totalEstimate >= 500 && this.totalEstimate <= 600;
  }
}
