import { jsx as _jsx } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import './App.css';
function App() {
    return (_jsx(Router, { children: _jsx(Routes, { children: _jsx(Route, { path: "/", element: _jsx(LandingPage, {}) }) }) }));
}
export default App;
//# sourceMappingURL=App.js.map