
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { EnginePage } from './pages/EnginePage';
import { CapabilitiesPage } from './pages/CapabilitiesPage';
import { GovernancePage } from './pages/GovernancePage';
import { WhopAuthProvider } from './contexts/WhopAuthContext';
import { RequireAuth } from './components/RequireAuth';
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
            <Route path="capabilities" element={<RequireAuth><CapabilitiesPage /></RequireAuth>} />
            <Route path="governance" element={<RequireAuth><GovernancePage /></RequireAuth>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WhopAuthProvider>
  );
}

export default App;
