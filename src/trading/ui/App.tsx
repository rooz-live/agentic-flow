/**
 * Trading Dashboard App — API-driven, no prop dependencies.
 * Renders TradingDashboardAPI which fetches live data from Flask.
 */
import React from 'react';
import { TradingDashboardAPI } from './TradingDashboardAPI';

export const App: React.FC = () => <TradingDashboardAPI />;
export default App;
