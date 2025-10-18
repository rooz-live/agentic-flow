/**
 * Policy/action selection for test-plugin
 */

import type { Vector, Action } from 'agentdb/plugins';

export class PolicyFunction {
  constructor(private config: any) {}

  async selectAction(state: Vector, context?: any): Promise<Action> {
    // epsilon_greedy strategy
    // TODO: Implement action selection logic
    return { id: 0, type: 'discrete' };
  }
}
