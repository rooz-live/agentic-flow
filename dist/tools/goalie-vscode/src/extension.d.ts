import * as vscode from 'vscode';
export type KanbanSection = 'NOW' | 'NEXT' | 'LATER';
export interface KanbanEntry {
    id?: string;
    title?: string;
    summary?: string;
    filePath?: string;
    metrics?: string[];
    [key: string]: any;
}
export declare function activate(context: vscode.ExtensionContext): void;
export declare function deactivate(): void;
//# sourceMappingURL=extension.d.ts.map