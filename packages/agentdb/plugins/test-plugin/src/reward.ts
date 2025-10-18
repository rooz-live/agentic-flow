/**
 * Reward function for test-plugin
 */

export class RewardFunction {
  constructor(private config: any) {}

  compute(outcome: any, context: any): number {
    return outcome.success ? 1.0 : -1.0;
  }
}
