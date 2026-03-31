export interface Skill {
    id: string;
    name: string;
    description: string;
    confidence: number;
    usageCount: number;
    successCount: number;
    lastUsedAt: number;
    createdAt: number;
    metadata?: Record<string, any>;
}
export declare class SkillManager {
    private db;
    private dbPath;
    constructor(baseDir?: string);
    private initializeSchema;
    registerSkill(name: string, confidence?: number, description?: string): void;
    getSkill(name: string): Skill | undefined;
    updateOutcome(name: string, success: boolean, runId?: string): void;
    exportSkills(path: string): void;
    importSkills(path: string): void;
    close(): void;
}
export default SkillManager;
//# sourceMappingURL=skill_manager.d.ts.map