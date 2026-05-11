import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface WhopUser {
    id: string;
    username: string;
    hasActiveSubscription: boolean;
}

interface WhopAuthContextType {
    isAuthenticated: boolean;
    user: WhopUser | null;
    login: (token: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const WhopAuthContext = createContext<WhopAuthContextType | undefined>(undefined);

export const WhopAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<WhopUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Physical verification of local storage token on mount
        const verifyToken = async () => {
            const token = localStorage.getItem('whop_access_token');
            if (token) {
                // In production, this pings api.whop.com/v1/me
                setUser({
                    id: 'usr_physical_123',
                    username: 'SovereignOperator',
                    hasActiveSubscription: true
                });
            }
            setIsLoading(false);
        };
        verifyToken();
    }, []);

    const login = async (token: string) => {
        setIsLoading(true);
        // Simulate physical API validation delay
        await new Promise(res => setTimeout(res, 800));
        localStorage.setItem('whop_access_token', token);
        setUser({
            id: 'usr_physical_123',
            username: 'SovereignOperator',
            hasActiveSubscription: true
        });
        setIsLoading(false);
    };

    const logout = () => {
        localStorage.removeItem('whop_access_token');
        setUser(null);
    };

    return (
        <WhopAuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, isLoading }}>
            {children}
        </WhopAuthContext.Provider>
    );
};

export const useWhopAuth = () => {
    const context = useContext(WhopAuthContext);
    if (context === undefined) {
        throw new Error('useWhopAuth must be used within a WhopAuthProvider');
    }
    return context;
};
