
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { EnginePage } from './pages/EnginePage';
import { CapabilitiesPage } from './pages/CapabilitiesPage';
import { GovernancePage } from './pages/GovernancePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { WhopAuthProvider } from './contexts/WhopAuthContext';
import { RequireAuth } from './components/RequireAuth';
import { ArtChatPage } from './pages/ArtChatPage';
import { OnboardingPage } from './pages/OnboardingPage';
import './App.css';

export const App = () => {
  return (
    <WhopAuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/auth" replace />} />
            <Route path="auth" element={<AuthPage />} />
            
            {/* Protected Top-Level Boundaries */}
            <Route path="engine" element={<RequireAuth><EnginePage /></RequireAuth>} />
            <Route path="capabilities" element={<CapabilitiesPage />} />
            <Route path="governance" element={<RequireAuth><GovernancePage /></RequireAuth>} />
            <Route path="admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
            <Route path="artchat" element={<ArtChatPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WhopAuthProvider>
  );
}

export default App;
