import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import TLDDashboard from './dashboard/pages/TLDDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tld-dashboard" element={<TLDDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
