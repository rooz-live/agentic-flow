import React from 'react'
import ReactDOM from 'react-dom/client'
import TradingDashboardAPI from './trading/ui/TradingDashboardAPI'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TradingDashboardAPI />
  </React.StrictMode>,
)
