import React from 'react';
import { Coins, TrendingUp, Droplets } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Card } from '../ui/card';

const strategyOptions = [
  {
    type: 'lending',
    title: 'Lending',
    description: 'Backtest lending strategies on protocols like Venus, Aave, and Compound',
    icon: Coins,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    type: 'perps',
    title: 'Perps',
    description: 'Backtest perpetual futures strategies on GMX, dYdX, and other platforms',
    icon: TrendingUp,
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    type: 'cl',
    title: 'Concentrated Liquidity',
    description: 'Backtest LP positions on PancakeSwap V3, Uniswap V3 with custom ranges',
    icon: Droplets,
    gradient: 'from-green-500 to-emerald-500',
  },
];

export const ElementSelector = ({ open, onOpenChange, onSelect }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Select Strategy Type</DialogTitle>
          <DialogDescription>
            Choose the type of strategy you want to backtest
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {strategyOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.type}
                className="p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 hover:border-blue-400 group"
                onClick={() => {
                  onSelect(option.type);
                  onOpenChange(false);
                }}
              >
                <div className={`w-14 h-14 bg-gradient-to-r ${option.gradient} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  {option.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {option.description}
                </p>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
