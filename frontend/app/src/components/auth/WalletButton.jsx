import React from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';
import { formatAddress } from '../../lib/utils';
import { useWeb3Modal } from '@web3modal/wagmi/react';

export const WalletButton = () => {
  const { isAuthenticated, walletAddress, disconnect } = useAuth();
  const { open } = useWeb3Modal();

  if (isAuthenticated && walletAddress) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => open()}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            <span className="font-mono text-sm">{formatAddress(walletAddress)}</span>
          </div>
          <LogOut 
            className="h-4 w-4 opacity-50" 
            onClick={(e) => {
              e.stopPropagation();
              disconnect();
            }}
          />
        </div>
      </Button>
    );
  }

  return (
    <Button
      variant="gradient"
      className="w-full"
      onClick={() => open()}
    >
      <Wallet className="mr-2 h-4 w-4" />
      Connect Wallet
    </Button>
  );
};
