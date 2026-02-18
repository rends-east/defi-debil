import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { WalletButton } from '../auth/WalletButton';
import { BacktestHistory } from '../backtest/BacktestHistory';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ onNewBacktest }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">DD</span>
          </div>
          <span className="font-bold text-xl text-gray-900">DeFi Debil</span>
        </div>

        {/* Wallet Button */}
        <WalletButton />

        {/* New Backtest Button */}
        <Button
          variant="gradient"
          className="w-full mt-4"
          disabled={!isAuthenticated}
          onClick={onNewBacktest}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Backtest
        </Button>
      </div>

      <Separator />

      {/* History Section */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">History</h3>
        {isAuthenticated ? (
          <BacktestHistory />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-sm text-muted-foreground px-4">
            <p>Connect your wallet to view history</p>
          </div>
        )}
      </div>
    </div>
  );
};
