import { type WsjfInputs } from '../wsjf/ssot';
export interface SkillFrontmatter {
    name: string;
    description: string;
    triggers: string[];
    wsjf?: Partial<WsjfInputs>;
    optionality?: number;
    implementability?: number;
    methodPatterns: string[];
}
export interface MethodPatternFactorSignals {
    method: number;
    pattern: number;
    protocol: number;
    factors: number;
    wsjf: number;
}
export interface SkillRankingItem {
    slug: string;
    name: string;
    description: string;
    filePath: string;
    triggers: string[];
    methodPatterns: string[];
    signals: MethodPatternFactorSignals;
    wsjf: WsjfInputs;
    wsjfScore: number;
    optionalityScore: number;
    implementabilityScore: number;
    evidenceOrientationScore: number;
    rankScore: number;
    bodyBytes: number;
    scriptCount: number;
}
export interface SkillsSnapshot {
    generatedAt: string;
    skills: SkillRankingItem[];
}
export interface ParsedSkillMarkdown {
    frontmatter: SkillFrontmatter;
    body: string;
}
export declare function parseSkillMarkdown(markdown: string): ParsedSkillMarkdown | undefined;
export declare function buildSkillRankingFromMarkdown(slug: string, filePath: string, markdown: string, scriptCount?: number): SkillRankingItem | undefined;
export declare function buildSkillsSnapshotFromDirectory(skillsDir: string): SkillsSnapshot;
//# sourceMappingURL=skillsSnapshot.d.ts.map