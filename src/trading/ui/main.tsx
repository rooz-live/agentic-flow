import React from 'react';
import { createRoot } from 'react-dom/client';
import './trading-api.css';
import App from './App';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
