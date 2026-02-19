import React from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Wallet, LogOut, KeyRound } from 'lucide-react';

export const WalletButton = () => {
  const { open } = useWeb3Modal();
  const { isAuthenticated, user, logout, connect, login, address } = useAuth();

  const handleDisconnect = async (e) => {
    e.stopPropagation();
    await logout();
  };

  if (!isAuthenticated) {
    if (address) {
      return (
        <div className="flex gap-2 w-full">
          <Button 
            onClick={() => login()}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 font-semibold"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Sign In
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDisconnect}
            className="shrink-0 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200"
            title="Disconnect Wallet"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <Button 
        onClick={() => connect()}
        className="w-full bg-black hover:bg-gray-800 text-white shadow-lg shadow-black/20 font-semibold"
      >
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg border border-gray-200">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-medium text-gray-700 truncate">
          {user?.address?.slice(0, 6)}...{user?.address?.slice(-4)}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDisconnect}
        className="shrink-0 hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
};
