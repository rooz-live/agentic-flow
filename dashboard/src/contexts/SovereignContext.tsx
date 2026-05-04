import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SovereignContextType {
  pulse: boolean;
  yieldData: any[];
  tensorLedger: any[];
  expandedRows: Record<string, boolean>;
  sortConfig: { key: string; direction: string };
  activeView: string;
  operatorRole: string | null;
  commandOutputs: Record<string, string>;
  pwConfig: any;
  kvmConfig: any;
  astConfig: any;
  guiTheme: string;
  esp32Config: any;
  goodreadsQuotes: Record<string, string>;

  setPulse: React.Dispatch<React.SetStateAction<boolean>>;
  setYieldData: React.Dispatch<React.SetStateAction<any[]>>;
  setTensorLedger: React.Dispatch<React.SetStateAction<any[]>>;
  setExpandedRows: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setSortConfig: React.Dispatch<React.SetStateAction<{ key: string; direction: string }>>;
  setActiveView: React.Dispatch<React.SetStateAction<string>>;
  setOperatorRole: React.Dispatch<React.SetStateAction<string | null>>;
  setCommandOutputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setPwConfig: React.Dispatch<React.SetStateAction<any>>;
  setKvmConfig: React.Dispatch<React.SetStateAction<any>>;
  setAstConfig: React.Dispatch<React.SetStateAction<any>>;
  setGuiTheme: React.Dispatch<React.SetStateAction<string>>;
  setEsp32Config: React.Dispatch<React.SetStateAction<any>>;

  executeSwarmAction: (swarmType: string, payload: any, outputKey?: string) => Promise<void>;
  toggleRow: (id: string) => void;
  handleSort: (key: string) => void;

  currentTtfb: number;
  currentZScore: number;
  totalSymmetryChecks: number;
  passedSymmetryChecks: number;
  symmetryRatio: number;
  filteredLedger: any[];
  sortedLedger: any[];
}

const SovereignContext = createContext<SovereignContextType | undefined>(undefined);

export const SovereignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pulse, setPulse] = useState(false);
  const [yieldData, setYieldData] = useState<any[]>([]);
  const [tensorLedger, setTensorLedger] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState({ key: 'time', direction: 'desc' });
  const [activeView, setActiveView] = useState('legtech');
  const [operatorRole, setOperatorRole] = useState<string | null>(null);
  const [commandOutputs, setCommandOutputs] = useState<Record<string, string>>({});

  const [pwConfig, setPwConfig] = useState({ target: 'de_novo_intake_portal', harness: 'pytest-playwright-async', headless: true, browser: 'chromium' });
  const [kvmConfig, setKvmConfig] = useState({ targetIP: '23.92.79.2', harness: 'STX Hostbill API', tombstone: true, nodeStyle: 'Bare-Metal KVM' });
  const [astConfig, setAstConfig] = useState({ targetWebhook: 'HackerOne_Webhook', harness: 'ollama_local', highNuance: true, embedding: 'mxbai-embed-large' });
  const [guiTheme, setGuiTheme] = useState('mesh_dark');
  const [esp32Config, setEsp32Config] = useState({ baudRate: 115200, pinConfig: 'DevKitC_V4', I2C_Address: '0x3C', liveTelemetry: true });
  
  const goodreadsQuotes = {
    cfo: "We do not merely survive the crisis; we treat the disruption as an arbitrage opportunity. Efficiency is blind. Actionability requires undeniable physical consequence.",
    cfo_sub: "Capital Yield is driven not by nominal holdings, but by our capacity to execute an arbitrage lock exactly at the event horizon of volatility.",
    vip: "We do not mock reality; we measure it. Render autonomic nervous system visibility."
  };

  const executeSwarmAction = async (swarmType: string, payload: any, outputKey?: string) => {
    const key = outputKey || swarmType;
    try {
      console.log(`Dispatching [${swarmType}] execution...`, payload);
      setCommandOutputs(prev => ({ ...prev, [key]: 'Executing physical routine... Please wait.' }));
      
      const response = await fetch('http://localhost:8123/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swarm: swarmType, config: payload, timestamp: Date.now() })
      });
      if (!response.ok) throw new Error('API Execution Failed');
      
      const data = await response.json();
      setCommandOutputs(prev => ({ ...prev, [key]: data.output || data.error || 'Execution Complete (No Output)' }));
      alert(`Successfully dispatched ${swarmType} vector.`);
    } catch (err) {
      console.error(err);
      setCommandOutputs(prev => ({ ...prev, [key]: 'EXECUTION ERROR: Network boundary or API failure.' }));
      alert(`[SYSTEM WARNING] Local DBOS execution API (localhost:8123) is disconnected.\nPayload Staged:\n${JSON.stringify(payload, null, 2)}`);
    }
  };

  const toggleRow = (id: string) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const filteredLedger = tensorLedger.filter(row => row.dimension === activeView);

  const sortedLedger = [...filteredLedger].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/opex.json');
        const data = await response.json();
        if (data.yieldData) setYieldData(data.yieldData);
        if (data.tensorLedger) setTensorLedger(data.tensorLedger);
      } catch (err) {
        console.error('Error fetching OPEX data:', err);
      }
    };

    fetchData();
    const dataInterval = setInterval(fetchData, 2000);
    const pulseInterval = setInterval(() => setPulse(p => !p), 2000);
    
    const searchParams = new URLSearchParams(window.location.search);
    const state = searchParams.get('state');
    const code = searchParams.get('code');
    if (code || state) {
      if (state === 'cfo_fintech' || window.location.href.includes('linkedin')) {
        setOperatorRole('cfo');
        setActiveView('fintech');
      } else if (state === 'lawyer_legtech' || window.location.href.includes('discord')) {
        setOperatorRole('lawyer');
        setActiveView('legtech');
      } else if (state === 'auditor_deftech' || window.location.href.includes('telegram')) {
        setOperatorRole('auditor');
        setActiveView('deftech');
      } else if (state === 'vip_vibecast' || window.location.href.includes('whatsapp')) {
        setOperatorRole('vip');
        setActiveView('vibecast');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(pulseInterval);
    };
  }, []);

  const currentTtfb = tensorLedger.length > 0 ? tensorLedger[0].ttfb : 0;
  const currentZScore = yieldData.length > 0 ? yieldData[yieldData.length - 1].zScore : 0.0;
  
  const totalSymmetryChecks = tensorLedger.filter(t => t.action === 'SYMMETRY_VERIFIED').length;
  const passedSymmetryChecks = tensorLedger.filter(t => t.action === 'SYMMETRY_VERIFIED' && t.status === 'PASS').length;
  const symmetryRatio = totalSymmetryChecks > 0 ? Math.round((passedSymmetryChecks / totalSymmetryChecks) * 100) : 0;

  const value = {
    pulse, yieldData, tensorLedger, expandedRows, sortConfig, activeView, operatorRole, commandOutputs,
    pwConfig, kvmConfig, astConfig, guiTheme, esp32Config, goodreadsQuotes,
    setPulse, setYieldData, setTensorLedger, setExpandedRows, setSortConfig, setActiveView, setOperatorRole, setCommandOutputs,
    setPwConfig, setKvmConfig, setAstConfig, setGuiTheme, setEsp32Config,
    executeSwarmAction, toggleRow, handleSort,
    currentTtfb, currentZScore, totalSymmetryChecks, passedSymmetryChecks, symmetryRatio,
    filteredLedger, sortedLedger
  };

  return <SovereignContext.Provider value={value}>{children}</SovereignContext.Provider>;
};

export const useSovereign = () => {
  const context = useContext(SovereignContext);
  if (context === undefined) {
    throw new Error('useSovereign must be used within a SovereignProvider');
  }
  return context;
};
