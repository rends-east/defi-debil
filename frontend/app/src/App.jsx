import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { WagmiConfig } from 'wagmi';
import { bsc, baseSepolia } from 'wagmi/chains';
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { PaymentModal } from './components/ui/PaymentModal';
import { setPaymentModalCallback } from './lib/api';

const projectId = '5518cc59861565dc6d026aa16de35521';

// ... (keep metadata and config) ...
const metadata = {
  name: 'DeFi Debil',
  description: 'Crypto Backtesting Platform for BNB Chain',
  url: 'https://defi-debil.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const wagmiConfig = defaultWagmiConfig({ chains: [bsc, baseSepolia], projectId, metadata });
createWeb3Modal({ wagmiConfig, projectId, chains: [bsc, baseSepolia] });

let _nextId = 1;
const genId = () => _nextId++;

function App() {
  const [currentView, setCurrentView] = useState('empty');
  const [portfolio, setPortfolio] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [historyMode, setHistoryMode] = useState(false);
  const [historyResult, setHistoryResult] = useState(null);
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentResolver, setPaymentResolver] = useState(null);

  // Setup payment callback
  useEffect(() => {
    setPaymentModalCallback((details) => {
      setPaymentDetails(details);
      setIsPaymentModalOpen(true);
      return new Promise((resolve, reject) => {
        setPaymentResolver({ resolve, reject });
      });
    });
  }, []);

  const handlePaymentSuccess = (txHash) => {
    setIsPaymentModalOpen(false);
    if (paymentResolver) {
      paymentResolver.resolve(txHash);
      setPaymentResolver(null);
    }
  };

  const handlePaymentClose = () => {
    setIsPaymentModalOpen(false);
    if (paymentResolver) {
      paymentResolver.reject(new Error("Payment cancelled by user"));
      setPaymentResolver(null);
    }
  };

  const handleNewBacktest = () => {
    setCurrentView('newBacktest');
    setPortfolio([]);
    setStrategies([]);
    setHistoryMode(false);
    setHistoryResult(null);
  };

  const handleLoadHistory = (item, result) => {
    setHistoryMode(true);
    setHistoryResult(result);
    
    // Convert history item params back to strategy format
    let newStrategies = [];
    if (item.type === 'batch') {
      newStrategies = item.params.items.map((batchItem, idx) => ({
        id: `hist-${idx}`,
        type: batchItem.type === 'clmm' ? 'cl' : batchItem.type === 'perp' ? 'perps' : 'lending',
        asset: 'BNB', // Default
        allocation: 0,
        config: batchItem.params,
        isHistory: true
      }));
    } else {
       newStrategies = [{
        id: `hist-0`,
        type: item.type === 'clmm' ? 'cl' : item.type === 'perp' ? 'perps' : 'lending',
        asset: 'BNB',
        allocation: 0,
        config: item.params,
        isHistory: true
      }];
    }
    setStrategies(newStrategies);
    // Switch to workspace if not already
    // Actually we just stay on currentView or ensure we render Workspace
    // But Workspace renders strategies so this is enough
  };
  
  const handleAddAsset = (asset) => {
    if (historyMode) return;
    setPortfolio(prev => [...prev, { id: genId(), asset, balance: '' }]);
  };

  const handleRemoveAsset = (id) => {
    if (historyMode) return;
    setPortfolio(prev => prev.filter(a => a.id !== id));
  };

  const handleAssetBalanceChange = (id, balance) => {
    if (historyMode) return;
    setPortfolio(prev => prev.map(a => a.id === id ? { ...a, balance } : a));
  };

  const handleAddStrategy = (type) => {
    if (historyMode) return;
    setStrategies(prev => [...prev, { id: genId(), type, allocation: 0, asset: 'BNB', config: {}, locked: false }]);
  };

  const handleRemoveStrategy = (id) => {
    if (historyMode) return;
    setStrategies(prev => prev.filter(s => s.id !== id));
  };

  const handleAllocationChange = (id, value) => {
    if (historyMode) return;
    const clamped = Math.max(0, Math.min(value, 100));
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, allocation: clamped } : s));
  };

  const handleStrategyAssetChange = (id, asset) => {
    if (historyMode) return;
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, asset } : s));
  };

  const handleStrategyConfigChange = (id, config) => {
    if (historyMode) return;
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, config } : s));
  };

  const handleToggleLock = (id) => {
    if (historyMode) return;
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, locked: !s.locked } : s));
  };
  
  const handleRunBacktest = () => {
    // Override default handler from Workspace
    // This is passed to Workspace, but Workspace also has its own handler
    // We can remove this prop or keep it as a fallback
  };

  return (
    <WagmiConfig config={wagmiConfig}>
      <AuthProvider>
        <Router>
          <div className="App">
            <MainLayout
              currentView={currentView}
              portfolio={portfolio}
              strategies={strategies}
              historyMode={historyMode}
              historyResult={historyResult}
              onNewBacktest={handleNewBacktest}
              onLoadHistory={handleLoadHistory}
              onAddAsset={handleAddAsset}
              onRemoveAsset={handleRemoveAsset}
              onAssetBalanceChange={handleAssetBalanceChange}
              onAddStrategy={handleAddStrategy}
              onRemoveStrategy={handleRemoveStrategy}
              onAllocationChange={handleAllocationChange}
              onStrategyAssetChange={handleStrategyAssetChange}
              onStrategyConfigChange={handleStrategyConfigChange}
              onToggleLock={handleToggleLock}
              onRunBacktest={handleRunBacktest}
            />
            <PaymentModal 
              isOpen={isPaymentModalOpen}
              onClose={handlePaymentClose}
              paymentDetails={paymentDetails}
              onPaymentSuccess={handlePaymentSuccess}
            />
          </div>
        </Router>
      </AuthProvider>
    </WagmiConfig>
  );
}

export default App;
