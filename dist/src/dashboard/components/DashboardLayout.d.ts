/**
 * Main dashboard layout component with navigation and sidebar
 */
import { ReactNode } from 'react';
interface DashboardLayoutProps {
    children: ReactNode;
    activeView: string;
    onViewChange: (view: string) => void;
    isConnected: boolean;
    onRefresh: () => void;
}
export declare function DashboardLayout({ children, activeView, onViewChange, isConnected, onRefresh }: DashboardLayoutProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=DashboardLayout.d.ts.map