import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWhopAuth } from '../contexts/WhopAuthContext';

/**
 * [RCA TRACE] Epic 44: React Router Route Guard
 * Physically blocks DOM mounting of protected components if unauthenticated.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isLoading } = useWhopAuth();
    const location = useLocation();

    if (isLoading) {
        return <div style={{ padding: '2rem', color: '#a5b4fc' }}>[Verifying Identity Matrix...]</div>;
    }

    if (!isAuthenticated) {
        // Redirect them to the /auth page, but save the current location they were
        // trying to go to when they were redirected.
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
