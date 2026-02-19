import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Loader2, CheckCircle2, AlertCircle, Network, HeartHandshake } from 'lucide-react';
import { Button } from '../ui/button';
import { useAccount, useSendTransaction, useWaitForTransaction, useContractWrite, useNetwork, useSwitchNetwork } from 'wagmi';
import { parseUnits } from 'viem';
import { bsc } from 'wagmi/chains';

export const DonationModal = ({ isOpen, onClose }) => {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork();
  const { data: hash, sendTransaction, isLoading: isSending, error: sendError } = useSendTransaction();
  
  // Hardcoded donation details
  const DONATION_AMOUNT = "133.7";
  const DONATION_TOKEN = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"; // USDT on BSC
  const DONATION_RECIPIENT = "0xFEdB11BB6E59362852f151D7Cf07c59677831c90";

  // Contract Write Hook
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
  
  const { write: donateUSDT, isLoading: isWriting, isSuccess: isWriteSuccess, data: writeData, error: writeError } = 
    useContractWrite({
      chainId: bsc.id, // Enforce BSC Mainnet
      address: DONATION_TOKEN,
      abi: ERC20_ABI,
      functionName: 'transfer',
    });

  // Wait for Transaction
  const { isLoading: isWaiting, isSuccess: isConfirmed } = useWaitForTransaction({
    hash: hash?.hash || writeData?.hash,
  });

  const isCorrectChain = chain?.id === bsc.id;

  const handleDonate = () => {
      if (!isCorrectChain) {
        switchNetwork?.(bsc.id);
        return;
      }

      // 133.7 USDT (18 decimals on BSC)
      const amount = parseUnits(DONATION_AMOUNT, 18); 
      
      donateUSDT({
          args: [DONATION_RECIPIENT, amount]
      });
  };
  
  const error = sendError || writeError;
  const isLoading = isSending || isWriting || isWaiting || isSwitching;
  
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
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-white text-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
              >
                🚀
              </motion.div>
              <h2 className="text-2xl font-bold mb-1">Work in Progress</h2>
              <p className="text-pink-100 text-sm">Help us build automatic deployment</p>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-4">
                  Automatic strategy deployment is currently under development. To speed up the process, you can support the team with a donation.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 rounded-full font-bold text-lg">
                  <span>Donate</span>
                  <span className="text-2xl">133.7</span>
                  <span>USDC</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  on BNB Smart Chain
                </div>
              </div>

              {/* Status Messages */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-4 text-pink-600">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p>
                    {isSwitching ? "Switching Network..." : 
                     isWaiting ? "Waiting for confirmation..." : 
                     "Processing donation..."}
                  </p>
                </div>
              ) : isConfirmed ? (
                <div className="flex flex-col items-center justify-center py-4 text-emerald-600">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mb-2"
                  >
                    <HeartHandshake className="w-12 h-12" />
                  </motion.div>
                  <p className="font-bold">Thank you for your support!</p>
                  <p className="text-sm text-gray-500 mt-1">We are working hard to ship this feature.</p>
                </div>
              ) : (
                <Button 
                  onClick={handleDonate} 
                  className="w-full h-12 text-lg bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg shadow-pink-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {!isCorrectChain ? (
                    <>
                      <Network className="w-5 h-5 mr-2" />
                      Switch to BNB Chain
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5 mr-2" />
                      Donate with Wallet
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
