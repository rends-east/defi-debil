import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { AssetIcon } from '../ui/AssetIcon';

const Chevron = () => (
  <svg className="h-3.5 w-3.5 text-gray-300 shrink-0" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
  </svg>
);

const DisabledAssetPill = ({ asset }) => (
  <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-gray-200 bg-gray-50 cursor-not-allowed">
    <AssetIcon asset={asset} size="sm" />
    <span className="text-sm font-semibold text-gray-500 flex-1">{asset}</span>
    <Chevron />
  </div>
);

export const ConcentratedLiquidityModule = ({
  onConfigChange,
  locked = false,
  availableBNB = 0,
  availableUSDC = 0,
}) => {
  const [config, setConfig] = useState({
    dex: 'pancakeswap',
    amountBNB: '',
    amountUSDC: '',
    minPrice: '',
    maxPrice: '',
    autoRebalance: false,
  });

  const handleChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    if (onConfigChange) onConfigChange(newConfig);
  };

  const fmt = (n) =>
    n > 0 ? n.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '';

  const bnb = parseFloat(config.amountBNB);
  const usdc = parseFloat(config.amountUSDC);
  const bnbOver  = availableBNB  > 0 && bnb  > availableBNB;
  const usdcOver = availableUSDC > 0 && usdc > availableUSDC;
  const impliedPrice =
    bnb > 0 && usdc > 0
      ? (usdc / bnb).toLocaleString(undefined, { maximumFractionDigits: 4 })
      : null;

  return (
    <div className="space-y-4">
      {/* DEX */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">DEX</Label>
        <Select value={config.dex} onChange={() => {}} disabled className="w-full">
          <option value="pancakeswap">PancakeSwap V3</option>
        </Select>
        <p className="text-xs text-muted-foreground">Only PancakeSwap V3 available for now</p>
      </div>

      {/* Amounts */}
      <div className="space-y-0">
        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">
          Amounts
        </Label>

        <div className="flex items-stretch">
          {/* BNB column */}
          <div className="flex-1 space-y-2 pb-3">
            <DisabledAssetPill asset="BNB" />
            <div className="flex gap-1.5">
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="0"
                value={config.amountBNB}
                disabled={locked}
                onChange={(e) => handleChange('amountBNB', e.target.value)}
                className={`flex-1 min-w-0 transition-colors ${bnbOver ? 'border-red-400 focus:ring-red-300 bg-red-50' : ''}`}
              />
              {availableBNB > 0 && !locked && (
                <button
                  type="button"
                  onClick={() => handleChange('amountBNB', fmt(availableBNB))}
                  className="px-2 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 shrink-0 transition-colors"
                >
                  Max
                </button>
              )}
            </div>
            {/* Fixed-height slot keeps layout stable */}
            <div className="h-4">
              {bnbOver && (
                <p className="text-[11px] text-red-500 font-medium leading-none">
                  Max {fmt(availableBNB)} BNB available
                </p>
              )}
            </div>
          </div>

          {/* Thick vertical divider */}
          <div className="self-stretch flex flex-col items-center px-4 pb-3">
            <div className="w-[3px] flex-1 bg-gray-300 rounded-full" />
          </div>

          {/* USDC column */}
          <div className="flex-1 space-y-2 pb-3">
            <DisabledAssetPill asset="USDC" />
            <div className="flex gap-1.5">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={config.amountUSDC}
                disabled={locked}
                onChange={(e) => handleChange('amountUSDC', e.target.value)}
                className={`flex-1 min-w-0 transition-colors ${usdcOver ? 'border-red-400 focus:ring-red-300 bg-red-50' : ''}`}
              />
              {availableUSDC > 0 && !locked && (
                <button
                  type="button"
                  onClick={() => handleChange('amountUSDC', fmt(availableUSDC))}
                  className="px-2 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 shrink-0 transition-colors"
                >
                  Max
                </button>
              )}
            </div>
            <div className="h-4">
              {usdcOver && (
                <p className="text-[11px] text-red-500 font-medium leading-none">
                  Max {fmt(availableUSDC)} USDC available
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Implied price — below both columns */}
        <div className="flex items-center gap-2 pt-0.5">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-500 px-1 tabular-nums whitespace-nowrap">
              <>311.33 USDC per BNB (01.01.2024)</>
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      </div>

      {/* Price range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Min Price</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={config.minPrice}
            disabled={locked}
            onChange={(e) => handleChange('minPrice', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Max Price</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={config.maxPrice}
            disabled={locked}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
          />
        </div>
      </div>

      {/* Auto-rebalance (unavailable) */}
      <label className="flex items-center gap-2.5 select-none cursor-not-allowed">
        <div className="w-9 h-5 rounded-full relative bg-gray-200">
          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow" />
          <input type="checkbox" checked={false} disabled onChange={() => {}} className="sr-only" />
        </div>
        <span className="text-sm font-medium text-gray-300">
          Auto-rebalance when out of range (currently unavailable)
        </span>
      </label>
    </div>
  );
};
