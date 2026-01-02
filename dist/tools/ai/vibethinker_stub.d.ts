/**
 * VibeThinker Integration Stub
 *
 * Model: WeiboAI/VibeThinker-1.5B
 * Use case: Enhanced WSJF reasoning and pattern analysis
 *
 * SFT (Spectrum Phase): Maximize solution diversity
 * RL (Signal Phase): MGPO to identify correct paths
 */
export interface ReasoningResult {
    solutions: string[];
    confidence: number;
    reasoning_trace: string[];
}
export declare class VibeThinkerClient {
    private modelEndpoint;
    reason(prompt: string, options?: {}): Promise<ReasoningResult>;
    enhanceWSJF(item: any): Promise<any>;
}
//# sourceMappingURL=vibethinker_stub.d.ts.map