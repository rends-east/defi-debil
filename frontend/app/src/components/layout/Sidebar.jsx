import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { WalletButton } from '../auth/WalletButton';
import { BacktestHistory } from '../backtest/BacktestHistory';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ onNewBacktest }) => {
  return (
    <div className="w-full h-16 md:w-80 md:h-screen bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-row md:flex-col items-center md:items-stretch px-4 md:px-0 shrink-0">
      {/* Header */}
      <div className="md:p-6 flex items-center gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <span className="text-white font-bold text-lg md:text-xl">DD</span>
        </div>
        <h1 className="font-bold text-lg md:text-xl text-gray-900 tracking-tight whitespace-nowrap">DeFi Debil</h1>
      </div>

      {/* Wallet - Hidden on mobile for now, or move to top right */}
      <div className="hidden md:block px-6 mb-8">
        <WalletButton />
      </div>

      {/* New Backtest Button */}
      <div className="ml-auto md:ml-0 md:px-6 md:mb-8">
        <Button 
          onClick={onNewBacktest}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 w-auto md:w-full h-9 md:h-10 text-sm"
        >
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">New Backtest</span>
        </Button>
      </div>

      {/* History - Hidden on mobile to save space */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        <div className="px-6 mb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">History</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <BacktestHistory />
        </div>
      </div>
      
      {/* Mobile Menu Toggle could go here if needed */}
    </div>
  );
};
