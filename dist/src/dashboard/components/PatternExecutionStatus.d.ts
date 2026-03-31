/**
 * Real-time pattern execution status component
 */
import { PatternExecutionStatus as IPatternExecutionStatus } from '../types/patterns';
interface PatternExecutionStatusProps {
    statuses: IPatternExecutionStatus[];
    loading?: boolean;
    maxItems?: number;
}
export declare function PatternExecutionStatus({ statuses, loading, maxItems }: PatternExecutionStatusProps): any;
export {};
//# sourceMappingURL=PatternExecutionStatus.d.ts.map