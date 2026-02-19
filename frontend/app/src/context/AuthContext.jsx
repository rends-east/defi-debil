import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { getNonce, verifySignature, getMe, logout as apiLogout } from '../lib/api';
import { AuthModal } from '../components/auth/AuthModal';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  // 'connect' | 'sign' | 'loading' | 'success' | null (closed)
  const [modalState, setModalState] = useState(null); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const me = await getMe();
        if (me && me.address) {
          setIsAuthenticated(true);
          setUser(me);
        }
      } catch (e) {
        // Not authenticated
        setIsAuthenticated(false);
        setUser(null);
      }
    };
    checkSession();
  }, []);

  // Handle wallet connection changes
  useEffect(() => {
    // Only logout if wallet disconnects and we were authenticated
    if (!isConnected && isAuthenticated) {
      handleLogout();
    }
    // REMOVED: Auto-trigger of sign modal.
    // We now rely on user action (clicking "Login" or accessing protected route)
    // to trigger the sign flow, preventing the infinite loop/race condition.
  }, [isConnected, isAuthenticated]);

  // Transition from 'connect' to 'sign' automatically if wallet connects
  // while the modal is open in 'connect' state.
  useEffect(() => {
    if (isConnected && modalState === 'connect') {
      setModalState('sign');
    }
  }, [isConnected, modalState]);

  const handleLogin = useCallback(async () => {
    if (!isConnected) {
      setModalState('connect');
      return;
    }
    
    setModalState('loading');
    setError(null);

    try {
      // 1. Get Nonce
      const { nonce } = await getNonce(address);

      // 2. Sign Message
      const message = `Sign this message to log in to DeFi Debil: ${nonce}`;
      const signature = await signMessageAsync({ message });

      // 3. Verify Signature
      const { address: verifiedAddress } = await verifySignature(address, signature);

      if (verifiedAddress) {
        setModalState('success');
        setIsAuthenticated(true);
        setUser({ address: verifiedAddress });
        
        // Close modal after animation
        setTimeout(() => {
          setModalState(null);
        }, 2000);
      }
    } catch (err) {
      console.error("Login failed:", err);
      // Friendly error messages
      let msg = err.message || "Login failed";
      if (msg.includes("User rejected")) msg = "User rejected the signature.";
      if (msg.includes("Connector not found")) msg = "Wallet not found or locked.";
      
      setError(msg);
      // Don't auto-reopen modal if user rejected, let them try again
      setModalState('sign'); 
    }
  }, [address, isConnected, signMessageAsync]);

  const handleLogout = useCallback(async () => {
    try {
      await apiLogout();
      await disconnectAsync();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setModalState(null);
    }
  }, [disconnectAsync]);

  const connect = () => {
    open();
  };

  // Intercept actions that require auth
  const requireAuth = (callback) => {
    if (isAuthenticated) {
      callback();
    } else {
      if (!isConnected) setModalState('connect');
      else setModalState('sign');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      address, 
      login: handleLogin, 
      logout: handleLogout,
      connect,
      requireAuth 
    }}>
      {children}
      
      {/* Global Auth Modal */}
      {modalState && (
        <AuthModal 
          isOpen={!!modalState}
          state={modalState}
          onConnect={() => open()}
          onSign={handleLogin}
          error={error}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
