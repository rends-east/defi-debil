import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Flame, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import confetti from 'canvas-confetti';

const fireAnimation = {
  hidden: { opacity: 0, scale: 0.5, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      type: "spring",
      stiffness: 260,
      damping: 20,
      duration: 0.5 
    }
  },
  exit: { opacity: 0, scale: 0.5, y: 20 }
};

const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: { repeat: Infinity, duration: 2 }
};

export const AuthModal = ({ 
  isOpen, 
  state, // 'connect' | 'sign' | 'loading' | 'success'
  onConnect,
  onSign,
  error
}) => {
  useEffect(() => {
    if (state === 'success' && isOpen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#9333ea', '#f59e0b']
      });
    }
  }, [state, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 relative"
        >
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50 opacity-50 pointer-events-none" />
          
          <div className="relative p-8 text-center space-y-6">
            
            {/* Icon State */}
            <div className="flex justify-center">
              <AnimatePresence mode="wait">
                {state === 'connect' && (
                  <motion.div
                    key="connect"
                    initial="hidden" animate="visible" exit="exit" variants={fireAnimation}
                    className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/30"
                  >
                    <Wallet className="w-10 h-10 text-white" />
                  </motion.div>
                )}
                {state === 'sign' && (
                  <motion.div
                    key="sign"
                    initial="hidden" animate="visible" exit="exit" variants={fireAnimation}
                    className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-red-600 rounded-3xl flex items-center justify-center shadow-lg shadow-orange-500/30 relative"
                  >
                    <motion.div animate={pulseAnimation} className="absolute inset-0 bg-orange-400 rounded-3xl blur-xl opacity-40" />
                    <Flame className="w-10 h-10 text-white" />
                  </motion.div>
                )}
                {state === 'loading' && (
                  <motion.div
                    key="loading"
                    initial="hidden" animate="visible" exit="exit" variants={fireAnimation}
                    className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center"
                  >
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  </motion.div>
                )}
                {state === 'success' && (
                  <motion.div
                    key="success"
                    initial="hidden" animate="visible" exit="exit" variants={fireAnimation}
                    className="w-20 h-20 bg-gradient-to-tr from-emerald-400 to-green-600 rounded-3xl flex items-center justify-center shadow-lg shadow-green-500/30"
                  >
                    <span className="text-4xl">😎</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Text Content */}
            <div className="space-y-2">
              <motion.h2 
                key={state + "title"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold text-gray-900"
              >
                {state === 'connect' && "Connect Wallet"}
                {state === 'sign' && "Verify Ownership"}
                {state === 'loading' && "Authenticating..."}
                {state === 'success' && "Welcome, Chad!"}
              </motion.h2>
              <motion.p 
                key={state + "desc"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-gray-500 text-sm font-medium"
              >
                {state === 'connect' && "Connect your wallet to start backtesting like a pro."}
                {state === 'sign' && "Please sign the message in your wallet to prove you own this address. It's free!"}
                {state === 'loading' && "Verifying your cryptographic signature..."}
                {state === 'success' && "You're in. Let's make some gains. 🔥"}
              </motion.p>
            </div>

            {/* Actions */}
            <div className="pt-2">
              {state === 'connect' && (
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 h-12 text-base"
                  onClick={onConnect}
                >
                  Connect Wallet <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              )}
              {state === 'sign' && (
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/25 h-12 text-base"
                  onClick={onSign}
                >
                  Sign Message <ShieldCheck className="ml-2 w-4 h-4" />
                </Button>
              )}
              {state === 'loading' && (
                <div className="h-12 flex items-center justify-center text-sm text-gray-400 font-medium bg-gray-50 rounded-lg border border-gray-100">
                  Waiting for wallet...
                </div>
              )}
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="text-xs text-red-500 bg-red-50 p-2 rounded-lg"
              >
                {error}
              </motion.p>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
