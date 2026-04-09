/**
 * WSJF File Selector
 *
 * Dynamically selects files/modules for processing based on WSJF (Weighted Shortest Job First)
 * scoring to optimize cognitive load and maximize business value delivery.
 */
export interface FileMetadata {
    path: string;
    name: string;
    size: number;
    lines: number;
    extension: string;
    lastModified: Date;
    dependencies: string[];
}
export interface WSJFFileScore {
    file: FileMetadata;
    businessValue: number;
    timeCriticality: number;
    riskReduction: number;
    jobSize: number;
    wsjfScore: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
}
export interface SelectionCriteria {
    maxFiles?: number;
    minBusinessValue?: number;
    maxJobSize?: number;
    extensions?: string[];
    excludePatterns?: string[];
    sortBy?: 'wsjf' | 'businessValue' | 'timeCriticality' | 'riskReduction';
}
export interface FileSelectionResult {
    selectedFiles: WSJFFileScore[];
    totalScanned: number;
    averageWSJF: number;
    totalJobSize: number;
    selectionRationale: string;
}
export declare class WSJFFileSelector {
    private baseDir;
    private fileScores;
    constructor(baseDir: string);
    scanDirectory(dir?: string, excludePatterns?: string[]): Promise<FileMetadata[]>;
    private extractFileMetadata;
    private extractDependencies;
    scoreFile(file: FileMetadata, criteria?: {
        businessValueHeuristic?: (file: FileMetadata) => number;
        timeCriticalityHeuristic?: (file: FileMetadata) => number;
        riskReductionHeuristic?: (file: FileMetadata) => number;
    }): WSJFFileScore;
    private calculateBusinessValue;
    private calculateTimeCriticality;
    private calculateRiskReduction;
    private calculateJobSize;
    private determinePriority;
    selectFiles(criteria?: SelectionCriteria): Promise<FileSelectionResult>;
    private generateSelectionRationale;
    getFileScore(filePath: string): WSJFFileScore | undefined;
    getAllScores(): WSJFFileScore[];
    exportScores(outputPath: string): void;
}
export declare function createFileSelector(baseDir: string): WSJFFileSelector;
export declare function quickSelect(baseDir: string, maxFiles?: number, extensions?: string[]): Promise<FileSelectionResult>;
//# sourceMappingURL=wsjf-file-selector.d.ts.map