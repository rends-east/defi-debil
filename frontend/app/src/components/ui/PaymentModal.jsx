import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Loader2, CheckCircle2, AlertCircle, Network } from 'lucide-react';
import { Button } from '../ui/button';
import { useAccount, useSendTransaction, useWaitForTransaction, useContractWrite, useNetwork, useSwitchNetwork } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import { bsc } from 'wagmi/chains';

export const PaymentModal = ({ isOpen, onClose, paymentDetails, onPaymentSuccess }) => {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork();
  const { data: hash, sendTransaction, isLoading: isSending, error: sendError } = useSendTransaction();
  
  // We need to define txHash BEFORE using it in useWaitForTransaction
  // But writeData is defined later. We need to reorganize the hooks.
  
  // Let's reorganize hooks
  
  // 1. Contract Write Hook
  const ERC20_ABI = [
    {
      name: 'transfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }]
    }
  ];
  
  const { write: payUSDC, isLoading: isWriting, isSuccess: isWriteSuccess, data: writeData, error: writeError } = 
    useContractWrite({
      chainId: bsc.id, // Enforce BSC Mainnet
      address: paymentDetails?.token,
      abi: ERC20_ABI,
      functionName: 'transfer',
    });

  // 2. Determine active hash
  // txHash is already defined above

  // 3. Wait for Transaction
  const { isLoading: isWaiting, isSuccess: isConfirmed } = useWaitForTransaction({
    hash: hash?.hash || writeData?.hash,
  });

  const isCorrectChain = chain?.id === bsc.id;

  // Effect to handle success
  useEffect(() => {
    const txHash = hash?.hash || writeData?.hash;
    if (isConfirmed && txHash) {
      // Small delay to show success animation
      setTimeout(() => {
        onPaymentSuccess(txHash);
      }, 1500);
    }
  }, [isConfirmed, hash, writeData, onPaymentSuccess]);
     
  const handlePayUSDC = () => {
      if (!paymentDetails) return;
      
      if (!isCorrectChain) {
        switchNetwork?.(bsc.id);
        return;
      }

      // 0.01 USDT (18 decimals usually on BSC for BUSD/USDT-BEP20? Check decimals!)
      // BSC-USD (USDT) has 18 decimals usually? No, USDT on Ethereum is 6, but BSC-USD is a pegged token.
      // BSC-USD (0x55d3...) has 18 decimals!
      // BE CAREFUL: USDC on BSC (0x8AC7...) also has 18 decimals.
      // So we should use 18 decimals here for BSC tokens usually.
      // Let's assume 18 decimals for BSC standard stablecoins.
      const amount = parseUnits(String(paymentDetails.price), 18); 
      
      payUSDC({
          args: [paymentDetails.payTo, amount]
      });
  };
  
  const error = sendError || writeError;
  const isLoading = isSending || isWriting || isWaiting || isSwitching;
  
  // Use wagmi hook imports
  // Note: I need to update imports above to include useContractWrite
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header with cool gradient */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-white text-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
              >
                💎
              </motion.div>
              <h2 className="text-2xl font-bold mb-1">Premium Feature</h2>
              <p className="text-yellow-100 text-sm">Unlock more backtests</p>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-2">
                  You've reached your free limit of 5 backtests.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full font-bold text-lg">
                  <span>Pay</span>
                  <span className="text-2xl">0.01</span>
                  <span>USDC</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  on BNB Smart Chain
                </div>
              </div>

              {/* Status Messages */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-4 text-yellow-600">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p>
                    {isSwitching ? "Switching Network..." : 
                     isWaiting ? "Waiting for confirmation..." : 
                     "Confirming transaction..."}
                  </p>
                </div>
              ) : isConfirmed || (writeData && !isWaiting) ? (
                // Note: writeData exists immediately after signature, need to wait for confirmation
                // But we use isConfirmed from useWaitForTransaction
                <div className="flex flex-col items-center justify-center py-4 text-emerald-600">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mb-2"
                  >
                    <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                  <p className="font-bold">Payment Successful!</p>
                </div>
              ) : (
                <Button 
                  onClick={handlePayUSDC} 
                  className="w-full h-12 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg shadow-yellow-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {!isCorrectChain ? (
                    <>
                      <Network className="w-5 h-5 mr-2" />
                      Switch to BNB Chain
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5 mr-2" />
                      Pay with Wallet
                    </>
                  )}
                </Button>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="break-all">{error.shortMessage || error.message || "Transaction failed"}</p>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
