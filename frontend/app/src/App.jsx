import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { WagmiConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';

const projectId = '5518cc59861565dc6d026aa16de35521';

const metadata = {
  name: 'DeFi Debil',
  description: 'Crypto Backtesting Platform for BNB Chain',
  url: 'https://defi-debil.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const wagmiConfig = defaultWagmiConfig({ chains: [bsc], projectId, metadata });
createWeb3Modal({ wagmiConfig, projectId, chains: [bsc] });

let _nextId = 1;
const genId = () => _nextId++;

function App() {
  const [currentView, setCurrentView] = useState('empty');
  const [portfolio, setPortfolio] = useState([]);
  const [strategies, setStrategies] = useState([]);

  const handleNewBacktest = () => {
    setCurrentView('newBacktest');
    setPortfolio([]);
    setStrategies([]);
  };

  const handleAddAsset = (asset) => {
    setPortfolio(prev => [...prev, { id: genId(), asset, balance: '' }]);
  };

  const handleRemoveAsset = (id) => {
    setPortfolio(prev => prev.filter(a => a.id !== id));
  };

  const handleAssetBalanceChange = (id, balance) => {
    setPortfolio(prev => prev.map(a => a.id === id ? { ...a, balance } : a));
  };

  const handleAddStrategy = (type) => {
    setStrategies(prev => [...prev, { id: genId(), type, allocation: 0, asset: 'BNB', config: {}, locked: false }]);
  };

  const handleRemoveStrategy = (id) => {
    setStrategies(prev => prev.filter(s => s.id !== id));
  };

  const handleAllocationChange = (id, value) => {
    const clamped = Math.max(0, Math.min(value, 100));
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, allocation: clamped } : s));
  };

  const handleStrategyAssetChange = (id, asset) => {
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, asset } : s));
  };

  const handleStrategyConfigChange = (id, config) => {
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, config } : s));
  };

  const handleToggleLock = (id) => {
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, locked: !s.locked } : s));
  };

  const handleRunBacktest = () => {
    console.log('Running backtest:', { portfolio, strategies });
    alert(`Running backtest with ${portfolio.length} assets and ${strategies.length} strategies!`);
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
              onNewBacktest={handleNewBacktest}
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
          </div>
        </Router>
      </AuthProvider>
    </WagmiConfig>
  );
}

export default App;
