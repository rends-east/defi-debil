import React, { useState } from 'react';
import { Label } from '../ui/label';
import { Select } from '../ui/select';

export const PerpsModule = ({
  onConfigChange,
  locked = false,
  investedAmt = 0,
  investedAsset = 'USDC',
}) => {
  const [config, setConfig] = useState({
    exchange: 'Aster',
    pair: 'BNB/USDC',
    leverage: 1,
    direction: 'long',
  });

  const handleChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    if (onConfigChange) onConfigChange(newConfig);
  };

  const leverage = Number(config.leverage) || 1;
  const positionSize = investedAmt * leverage;
  const fillPct = ((leverage - 1) / 19) * 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Exchange */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Exchange</Label>
          <Select value={config.exchange} onChange={() => {}} disabled className="w-full">
            <option value="Aster">Aster</option>
          </Select>
          <p className="text-xs text-muted-foreground">Only Aster available for now</p>
        </div>

        {/* Trading Pair */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Trading Pair</Label>
          <Select value={config.pair} onChange={() => {}} disabled className="w-full">
            <option value="BNB/USDC">BNB/USDC</option>
          </Select>
          <p className="text-xs text-muted-foreground">Only BNB/USDC available for now</p>
        </div>

        {/* Direction */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Direction</Label>
          <div className="flex gap-2">
            {[
              { value: 'long',  label: '↑ Long',  active: 'bg-emerald-500 border-transparent text-white shadow-sm' },
              { value: 'short', label: '↓ Short', active: 'bg-red-500 border-transparent text-white shadow-sm' },
            ].map(({ value, label, active }) => (
              <button
                key={value}
                type="button"
                disabled={locked}
                onClick={() => handleChange('direction', value)}
                className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed ${
                  config.direction === value
                    ? active
                    : locked
                      ? 'border-gray-100 text-gray-300'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage slider */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Leverage{' '}
            <span className="font-bold text-gray-700 normal-case">{leverage}×</span>
          </Label>
          <div className="pt-1">
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={config.leverage}
              disabled={locked}
              onChange={(e) => handleChange('leverage', Number(e.target.value))}
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #9333ea ${fillPct}%, #e5e7eb ${fillPct}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>1×</span>
              <span>20×</span>
            </div>
          </div>
        </div>
      </div>

      {/* Position size summary */}
      {investedAmt > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 leading-none">
              Position Size
            </p>
            <p className="text-[10px] text-blue-400 mt-0.5">
            {leverage} × {investedAmt.toLocaleString(undefined, { maximumFractionDigits: 4 })}  {investedAsset}
            </p>
          </div>
          <span className="text-base font-bold text-blue-700 tabular-nums">
            {positionSize.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
            <span className="text-sm font-semibold text-blue-500">{investedAsset}</span>
          </span>
        </div>
      )}
    </div>
  );
};
