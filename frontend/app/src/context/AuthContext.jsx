import React, { createContext, useContext } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isLoading: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const value = {
    isAuthenticated: isConnected,
    walletAddress: address,
    isLoading: isConnecting,
    isConnecting,
    connect: () => {
      // WalletConnect connector will be available via Web3Modal UI
      const walletConnectConnector = connectors.find(c => c.id === 'walletConnect');
      if (walletConnectConnector) {
        connect({ connector: walletConnectConnector });
      }
    },
    disconnect,
    connectors, // Expose connectors for Web3Modal
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
