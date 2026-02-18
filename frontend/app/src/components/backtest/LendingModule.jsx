import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { AssetIcon } from '../ui/AssetIcon';

// Custom icon-aware dropdown for borrow asset
const BorrowAssetSelect = ({ value, options, onChange, locked }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={locked}
        onClick={() => setOpen(o => !o)}
        className="w-full h-10 flex items-center justify-between gap-2 px-3 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
      >
        <div className="flex items-center gap-2">
          {value !== 'none' && <AssetIcon asset={value} size="sm" />}
          <span>{value === 'none' ? 'None' : value}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
      </button>
      {open && !locked && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                opt === value
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 font-medium'
              }`}
            >
              {opt !== 'none' && <AssetIcon asset={opt} size="sm" />}
              {opt === 'none' ? 'None' : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const LendingModule = ({ supplyAsset = 'BNB', onConfigChange, locked = false }) => {
  const [config, setConfig] = useState({
    protocol: 'venus',
    borrowAsset: 'none',
    borrowAmount: '',
  });

  // Track previous supplyAsset so we only reset on actual changes, not on mount.
  const prevSupplyAsset = useRef(supplyAsset);

  useEffect(() => {
    if (prevSupplyAsset.current === supplyAsset) return;
    prevSupplyAsset.current = supplyAsset;

    // Supply asset switched — wipe borrow state to avoid invalid cross-asset config.
    const reset = { protocol: 'venus', borrowAsset: 'none', borrowAmount: '' };
    setConfig(reset);
    if (onConfigChange) onConfigChange({ ...reset, supplyAsset });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplyAsset]);

  const handleChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    if (onConfigChange) onConfigChange({ ...newConfig, supplyAsset });
  };

  const borrowOptions = ['none', 'BNB', 'USDC'].filter(
    opt => opt === 'none' || opt !== supplyAsset
  );

  return (
    <div className="space-y-4">
      {/* Protocol */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Protocol</Label>
        <Select
          value={config.protocol}
          onChange={(e) => handleChange('protocol', e.target.value)}
          disabled={true}
          className="w-full"
        >
          <option value="venus">Venus</option>
        </Select>
        <p className="text-xs text-muted-foreground">Only Venus is available for now</p>
      </div>

      {/* Supply → Borrow flow */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
        {/* Supply asset — read-only */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Supply Asset</Label>
          <div className="h-10 flex items-center gap-2 px-3 rounded-md border border-gray-200 bg-gray-50">
            <AssetIcon asset={supplyAsset} size="md" />
            <span className="text-sm font-semibold text-gray-700">{supplyAsset}</span>
          </div>
        </div>

        {/* Arrow — label-height spacer keeps it vertically centered with the inputs */}
        <div className="flex flex-col gap-1.5">
          <div className="h-[18px]" />{/* matches label height */}
          <div className="h-10 flex items-center justify-center">
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Borrow asset — icon dropdown */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Borrow Asset</Label>
          <BorrowAssetSelect
            value={config.borrowAsset}
            options={borrowOptions}
            onChange={(val) => handleChange('borrowAsset', val)}
            locked={locked}
          />
        </div>
      </div>

      {/* Borrow Amount */}
      {config.borrowAsset !== 'none' && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Borrow Amount
            <span className="ml-1 text-blue-600 normal-case font-normal">
              (adds to {config.borrowAsset} position)
            </span>
          </Label>
          <Input
            type="number"
            min="0"
            placeholder="0.00"
            value={config.borrowAmount}
            disabled={locked}
            onChange={(e) => handleChange('borrowAmount', e.target.value)}
          />
        </div>
      )}
    </div>
  );
};
