import React, { useState, useRef, useEffect } from 'react';
import { Plus, Wallet, Sparkles, Play, X, Lock, Unlock, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AssetIcon } from '../ui/AssetIcon';
import { useAuth } from '../../context/AuthContext';
import { LendingModule } from '../backtest/LendingModule';
import { PerpsModule } from '../backtest/PerpsModule';
import { ConcentratedLiquidityModule } from '../backtest/ConcentratedLiquidityModule';
import { BacktestResults } from '../backtest/BacktestResults';
import { runLendingBacktest, runPerpBacktest, runClmmBacktest, runBatchBacktest } from '../../lib/api';

// Compute remaining balance for one asset after a list of strategies.
// Handles both allocation-% strategies (lending/perps) and absolute-amount CL strategies.
const seqRemaining = (total, asset, strategies) => {
  let rem = total;
  for (const s of strategies) {
    if (s.type === 'cl') {
      const amt = asset === 'BNB'
        ? parseFloat(s.config?.amountBNB) || 0
        : parseFloat(s.config?.amountUSDC) || 0;
      rem = Math.max(0, rem - amt);
    } else if (s.asset === asset) {
      rem *= (1 - s.allocation / 100);
    }
  }
  return Math.max(0, rem);
};

const ASSET_CONFIG = {
  BNB: {
    gradient: 'from-yellow-400 to-orange-400',
    bg: 'bg-yellow-50 border-yellow-200',
    selectedBg: 'bg-gradient-to-r from-yellow-400 to-orange-400',
    text: 'text-yellow-700',
  },
  USDC: {
    gradient: 'from-blue-400 to-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    selectedBg: 'bg-gradient-to-r from-blue-400 to-blue-600',
    text: 'text-blue-700',
  },
};

const STRATEGY_CONFIG = {
  lending: { gradient: 'from-blue-500 to-cyan-500', label: 'Lending', icon: '💰' },
  perps: { gradient: 'from-purple-500 to-pink-500', label: 'Perpetuals', icon: '📈' },
  cl: { gradient: 'from-green-500 to-emerald-500', label: 'Conc. Liquidity', icon: '💧' },
};

// Dropdown with outside-click close — two visual variants:
//   variant="ghost"  → subtle inline text button (for "Add Strategy")
//   variant="dashed" → prominent dashed card button (for "Add Asset")
const AddDropdown = ({ options, onSelect, label, disabled = false, variant = 'ghost' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (options.length === 0) return null;

  const triggerClass =
    variant === 'dashed'
      ? `w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed
         border-blue-300 text-blue-600 text-sm font-semibold
         hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98]
         disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150`
      : `flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700
         disabled:opacity-40 disabled:cursor-not-allowed transition-colors group`;

  const iconClass =
    variant === 'dashed'
      ? 'w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0'
      : 'w-7 h-7 rounded-full border-2 border-blue-500 group-hover:bg-blue-50 flex items-center justify-center transition-colors shrink-0';

  return (
    <div className={`relative ${variant === 'dashed' ? 'w-full' : 'inline-flex'}`} ref={ref}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={triggerClass}
      >
        <div className={iconClass}>
          <Plus className="h-3 w-3" />
        </div>
        <span>{label}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 z-50 min-w-[180px] overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              disabled={opt.disabled}
              title={opt.disabledReason}
              onClick={() => { if (!opt.disabled) { onSelect(opt.value); setOpen(false); } }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2.5 ${
                opt.disabled
                  ? 'opacity-40 cursor-not-allowed text-gray-400'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              {opt.iconEl
                ? opt.iconEl
                : opt.icon
                  ? <span className="text-base">{opt.icon}</span>
                  : null}
              {opt.label}
              {opt.disabled && opt.disabledReason && (
                <span className="ml-auto text-[10px] text-gray-400 font-normal truncate max-w-[100px]">
                  {opt.disabledReason}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Format a numeric amount for display (up to 4 decimals, no trailing zeros)
const fmtAmt = (n) => {
  if (n === 0) return '0';
  if (n < 0.0001) return '< 0.0001';
  if (n % 1 === 0) return String(n);
  return parseFloat(n.toFixed(4)).toString();
};

// Allocation Slider — shows absolute invested amount to the left of the percentage
const AllocationSlider = ({ value, onChange, locked, effectiveBalance, asset }) => {
  const fillPct = (value / 100) * 100; // max is always 100 now

  const absoluteAmt =
    effectiveBalance > 0 ? (value / 100) * effectiveBalance : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500 shrink-0">
          Allocation
        </Label>
        <div className="flex items-center gap-4 ml-auto">
          {absoluteAmt !== null && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 tabular-nums">
              <AssetIcon asset={asset} size="xs" />
              {fmtAmt(absoluteAmt)} {asset}
            </span>
          )}
          <span className="text-sm font-bold text-blue-600 tabular-nums">{value}%</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={locked}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: locked
            ? `linear-gradient(to right, #d1d5db ${fillPct}%, #e5e7eb ${fillPct}%)`
            : `linear-gradient(to right, #3b82f6 ${fillPct}%, #e5e7eb ${fillPct}%)`,
        }}
      />
    </div>
  );
};

// Asset dropdown selector — scales to any number of assets
const INVEST_ASSETS = ['BNB', 'USDC'];

const AssetSelector = ({ value, onChange, locked, label = 'Invest Asset' }) => {
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
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</Label>
      <div className="relative" ref={ref}>
        <button
          type="button"
          disabled={locked}
          onClick={() => setOpen(o => !o)}
          className="w-full h-10 flex items-center justify-between gap-2 px-3 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
        >
          <div className="flex items-center gap-2">
            {value && <AssetIcon asset={value} size="sm" />}
            <span>{value || 'Select asset'}</span>
          </div>
          <svg className="h-4 w-4 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {open && !locked && (
          <div className="absolute left-0 top-full mt-1 z-50 w-full bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
            {INVEST_ASSETS.map(asset => (
              <button
                key={asset}
                type="button"
                onClick={() => { onChange(asset); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  asset === value
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50 font-medium'
                }`}
              >
                <AssetIcon asset={asset} size="sm" />
                {asset}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Remaining balance panel shown to the right of each strategy card.
// `strategies` is the cumulative slice 0..i (inclusive) so the panel reflects
// the state of the portfolio AFTER this strategy and all strategies above it.
const RemainingPanel = ({ portfolio, strategies, borrowedByAsset, strategyIndex }) => {
  const data = ['BNB', 'USDC']
    .map(asset => {
      const base = parseFloat(portfolio.find(a => a.asset === asset)?.balance) || 0;
      const borrowed = borrowedByAsset[asset] || 0;
      const total = base + borrowed;
      // Show row if original balance OR borrow exists
      if (base === 0 && borrowed === 0) return null;

      const remainingAmt = seqRemaining(total, asset, strategies);

      // Express remaining as % of the ORIGINAL (pre-borrow) portfolio balance.
      // Can exceed 100% when borrowed assets haven't all been allocated yet.
      const remainingPct = base > 0
        ? Math.round((remainingAmt / base) * 100)
        : null; // original balance is 0 — show only absolute amount

      const overOriginal = remainingPct !== null && remainingPct > 100;

      return { asset, base, total, remainingPct, remainingAmt, overOriginal };
    })
    .filter(Boolean);

  const label =
    strategyIndex === 0
      ? 'After strategy 1'
      : `After strategies 1–${strategyIndex + 1}`;

  return (
    <div className="w-full md:w-44 shrink-0 static md:sticky md:top-8 self-start">
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none">
              Remaining
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
          </div>

          {data.length === 0 && (
            <p className="text-[11px] text-gray-400 leading-snug">
              Add portfolio balances to see remaining amounts
            </p>
          )}

          {data.map(({ asset, remainingPct, remainingAmt, overOriginal }) => {
            const ac = ASSET_CONFIG[asset];
            const isEmpty = remainingAmt <= 0;
            const amtStr = fmtAmt(remainingAmt);
            // Bar fill: capped at 100%; green when over-collateralised (>100%)
            const barPct = remainingPct === null ? 100 : Math.min(remainingPct, 100);
            const barClass = overOriginal
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              : `bg-gradient-to-r ${ac.gradient}`;

            return (
              <div key={asset} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AssetIcon asset={asset} size="sm" />
                    <span className="text-xs font-semibold text-gray-600">{asset}</span>
                  </div>
                  {remainingPct !== null && (
                    <span className={`text-xs font-bold tabular-nums ${
                      isEmpty ? 'text-gray-400' : overOriginal ? 'text-emerald-600' : 'text-gray-700'
                    }`}>
                      {remainingPct}%
                    </span>
                  )}
                </div>

                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${isEmpty ? 'w-0' : barClass}`}
                    style={{ width: `${isEmpty ? 0 : barPct}%` }}
                  />
                </div>

                <p className={`text-xs font-bold tabular-nums leading-none ${isEmpty ? 'text-gray-400' : 'text-gray-800'}`}>
                  {amtStr}{' '}
                  <span className="font-semibold text-gray-400">{asset}</span>
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

// Individual strategy card wrapper
const StrategyCard = ({
  strategy,
  effectiveBalance,
  investedAmt,
  investedAsset,
  availableBNB,
  availableUSDC,
  onRemove,
  onAllocationChange,
  onAssetChange,
  onConfigChange,
  onToggleLock,
  onPositionHealthChange,
}) => {
  const sc = STRATEGY_CONFIG[strategy.type];
  const locked = strategy.locked ?? false;

  const moduleProps = { onConfigChange, locked };
  if (strategy.type === 'lending') {
    moduleProps.supplyAsset = strategy.asset;
    moduleProps.supplyAmount = effectiveBalance * (strategy.allocation / 100);
    moduleProps.onPositionHealthChange = (health) => onPositionHealthChange?.(strategy.id, health);
  }
  if (strategy.type === 'perps') {
    moduleProps.investedAmt = investedAmt ?? 0;
    moduleProps.investedAsset = investedAsset ?? 'USDC';
    moduleProps.effectiveBalance = effectiveBalance ?? 0;
    strategy.asset = 'USDC';
  }
  if (strategy.type === 'cl') {
    moduleProps.availableBNB = availableBNB ?? 0;
    moduleProps.availableUSDC = availableUSDC ?? 0;
  }

  const ModuleMap = { lending: LendingModule, perps: PerpsModule, cl: ConcentratedLiquidityModule };
  const Module = ModuleMap[strategy.type];

  return (
    <Card className={`shadow-md border transition-all duration-200 ${
      locked ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'
    }`}>
      {/* Colored top accent — clip only here so inner dropdowns aren't cut off */}
      <div className="rounded-t-lg overflow-hidden">
        <div className={`h-1 ${locked ? 'bg-gray-200' : `bg-gradient-to-r ${sc.gradient}`}`} />
      </div>

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              locked ? 'bg-gray-200' : `bg-gradient-to-r ${sc.gradient}`
            }`}>
              <span className="text-lg">{sc.icon}</span>
            </div>
            <span className={locked ? 'text-gray-400' : ''}>{sc.label} Strategy</span>
            {locked && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                locked
              </span>
            )}
          </CardTitle>
          <button
            onClick={onRemove}
            disabled={locked}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        {strategy.type !== 'cl' && (
          <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl ${locked ? 'bg-gray-50' : 'bg-gray-50'}`}>
            <div className="col-span-2">
              <AllocationSlider
                value={strategy.allocation}
                onChange={onAllocationChange}
                locked={locked}
                effectiveBalance={effectiveBalance}
                asset={strategy.asset}
              />
            </div>
            {strategy.type === 'lending' && (
              <div className="col-span-2">
                <AssetSelector value={strategy.asset} onChange={onAssetChange} locked={locked} />
              </div>
            )}
          </div>
        )}

        {Module && <Module {...moduleProps} />}

        {/* Lock / Unlock button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onToggleLock}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              locked
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            }`}
          >
            {locked
              ? <><Lock className="h-3.5 w-3.5" /> Unlock to edit</>
              : <><Unlock className="h-3.5 w-3.5" /> Lock</>
            }
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export const Workspace = ({
  currentView,
  portfolio,
  strategies,
  onAddAsset,
  onRemoveAsset,
  onAssetBalanceChange,
  onAddStrategy,
  onRemoveStrategy,
  onAllocationChange,
  onStrategyAssetChange,
  onStrategyConfigChange,
  onToggleLock,
  onRunBacktest,
  historyMode = false,
  historyResult = null,
}) => {
  const { isAuthenticated, requireAuth } = useAuth();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lendingPositionHealth, setLendingPositionHealth] = useState({});

  // Clean up position health when a lending strategy is removed so Run Backtest unlocks
  const strategyIdsKey = strategies.map(s => s.id).sort().join(',');
  useEffect(() => {
    const ids = new Set(strategies.map(s => s.id));
    setLendingPositionHealth(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(id => {
        if (!ids.has(id)) { delete next[id]; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [strategyIdsKey]);

  // If historyResult is provided (from App -> Workspace), set it as results
  useEffect(() => {
    if (historyResult) {
      // Fix: Check if it's a batch response wrapper and extract results
      if (historyResult.results && Array.isArray(historyResult.results)) {
        setResults(historyResult.results);
      } else {
        setResults(historyResult);
      }
    } else if (!historyMode) {
        setResults(null);
    }
  }, [historyResult, historyMode]);

  const handleRunBacktest = async () => {
    if (historyMode) return; // Disable running in history mode
    // ... existing logic ...
    // Wrap execution in requireAuth to ensure user is logged in before running
    requireAuth(async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Calculate effective balances and invested amounts for all strategies
        // Reuse the same logic as render
        
        // Aggregate borrow amounts
        const borrowedByAsset = strategies
          .filter(s => s.type === 'lending' && s.config?.borrowAsset && s.config.borrowAsset !== 'none')
          .reduce((acc, s) => {
            const asset = s.config.borrowAsset;
            const amount = parseFloat(s.config.borrowAmount) || 0;
            acc[asset] = (acc[asset] || 0) + amount;
            return acc;
          }, {});

        // Effective balance per asset = base portfolio + borrowed
        const effectiveBalances = ['BNB', 'USDC'].reduce((acc, asset) => {
          const base = parseFloat(portfolio.find(a => a.asset === asset)?.balance) || 0;
          acc[asset] = base + (borrowedByAsset[asset] || 0);
          return acc;
        }, {});

        // 2. Prepare request items
        const requestItems = strategies.map((strategy, index) => {
          const prior = strategies.slice(0, index);
          const strategyEffectiveBalance = seqRemaining(effectiveBalances[strategy.asset] ?? 0, strategy.asset, prior);
          const strategyInvestedAmt = strategyEffectiveBalance * (strategy.allocation / 100);

          if (strategy.type === 'lending') {
            return {
              type: 'lending',
              params: {
                supply_amount: strategyInvestedAmt,
                borrow_amount: parseFloat(strategy.config.borrowAmount) || 0,
                is_bnb_supply: strategy.asset === 'BNB'
              }
            };
          } else if (strategy.type === 'perps') {
            return {
              type: 'perp',
              params: {
                initial_collateral: strategyInvestedAmt,
                leverage: parseFloat(strategy.config.leverage) || 1,
                is_long: strategy.config.direction === 'long'
              }
            };
          } else if (strategy.type === 'cl') {
            return {
              type: 'clmm',
              params: {
                initial_token0: parseFloat(strategy.config.amountBNB) || 0,
                initial_token1: parseFloat(strategy.config.amountUSDC) || 0,
                min_price: parseFloat(strategy.config.minPrice) || 0,
                max_price: parseFloat(strategy.config.maxPrice) || 0
              }
            };
          }
          return null;
        }).filter(Boolean);

        // 3. Send request
        let res;
        if (requestItems.length === 1) {
          const item = requestItems[0];
          if (item.type === 'lending') res = await runLendingBacktest(item.params);
          else if (item.type === 'perp') res = await runPerpBacktest(item.params);
          else if (item.type === 'clmm') res = await runClmmBacktest(item.params);
        } else if (requestItems.length > 1) {
          const batchRes = await runBatchBacktest(requestItems);
          res = batchRes.results; // Extract results array
        }

        setResults(res);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to run backtest");
      } finally {
        setLoading(false);
      }
    });
  };

  if (results) {
    return <BacktestResults results={results} onBack={() => {
        // If in history mode, onBack resets the view to empty workspace or keeps config?
        // Let's say it keeps config but exits result view.
        // But in history mode, we probably want to stay in read-only config view if we go back.
        setResults(null);
    }} />;
  }

  if (currentView === 'empty') {
    return (
      <div className="flex-1 h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Start</h2>
          <p className="text-gray-600 mb-8">
            Click "New Backtest" in the sidebar to start configuring your first strategy
          </p>
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <p>✓ Historical data from Biggest BNB protocols</p>
            <p>✓ Support for multiple strategy types</p>
            <p>✓ Comprehensive risk analytics</p>
          </div>
        </div>
      </div>
    );
  }

  // New backtest view
  const totalAllocation = strategies.reduce((sum, s) => sum + s.allocation, 0);
  const usedAssets = portfolio.map(a => a.asset);
  const availableAssets = ['BNB', 'USDC'].filter(a => !usedAssets.includes(a));

  // Aggregate borrow amounts from all lending strategies
  const borrowedByAsset = strategies
    .filter(s => s.type === 'lending' && s.config?.borrowAsset && s.config.borrowAsset !== 'none')
    .reduce((acc, s) => {
      const asset = s.config.borrowAsset;
      const amount = parseFloat(s.config.borrowAmount) || 0;
      acc[asset] = (acc[asset] || 0) + amount;
      return acc;
    }, {});
  const borrowedEntries = Object.entries(borrowedByAsset).filter(([, amt]) => amt > 0);

  // Effective balance per asset = base portfolio + borrowed
  const effectiveBalances = ['BNB', 'USDC'].reduce((acc, asset) => {
    const base = parseFloat(portfolio.find(a => a.asset === asset)?.balance) || 0;
    acc[asset] = base + (borrowedByAsset[asset] || 0);
    return acc;
  }, {});

  // Remaining after ALL strategies — used to disable "Add Strategy" options
  const addableBNB = seqRemaining(effectiveBalances['BNB'] ?? 0, 'BNB', strategies);
  const addableUSDC = seqRemaining(effectiveBalances['USDC'] ?? 0, 'USDC', strategies);

  // Run Backtest blockers
  const runBlockers = (() => {
    const blockers = [];
    strategies.forEach((s, i) => {
      const asset = s.type === 'perps' ? 'USDC' : s.asset;
      const prior = strategies.slice(0, i);
      const effBal = seqRemaining(effectiveBalances[asset] ?? 0, asset, prior);

      if (s.type === 'cl') {
        const bnbAmt = parseFloat(s.config?.amountBNB) || 0;
        const usdcAmt = parseFloat(s.config?.amountUSDC) || 0;
        if (bnbAmt === 0 && usdcAmt === 0) {
          blockers.push(`Strategy ${i + 1} (CL) — enter at least one amount`);
        } else {
          const CURRENT_PRICE = 311.33;
          // min price required only when USDC is set; max price only when BNB is set
          const minRequired = usdcAmt > 0;
          const maxRequired = bnbAmt > 0;
          const minVal = parseFloat(s.config?.minPrice) || 0;
          const maxVal = parseFloat(s.config?.maxPrice) || 0;
          const minPresent = minVal > 0;
          const maxPresent = maxVal > 0;
          if (!minPresent && !maxPresent && minRequired && maxRequired) {
            blockers.push(`Strategy ${i + 1} (CL) — set min & max price`);
          } else {
            if (minRequired && !minPresent) blockers.push(`Strategy ${i + 1} (CL) — set min price`);
            if (maxRequired && !maxPresent) blockers.push(`Strategy ${i + 1} (CL) — set max price`);
            if (minPresent && minVal >= CURRENT_PRICE) blockers.push(`Strategy ${i + 1} (CL) — min price must be below ${CURRENT_PRICE}`);
            if (maxPresent && maxVal <= CURRENT_PRICE) blockers.push(`Strategy ${i + 1} (CL) — max price must be above ${CURRENT_PRICE}`);
          }
        }
      } else if (effBal === 0) {
        const label = s.type === 'perps' ? 'Perpetuals' : 'Lending';
        blockers.push(`Strategy ${i + 1} (${label}) — no ${asset} available`);
      }
    });
    return blockers;
  })();

  return (
    <div className="flex-1 h-full bg-gray-50 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* Portfolio Balance — same flex layout as strategy rows so widths align */}
        <div className="flex flex-col md:flex-row gap-3 items-start mb-5">
        <div className="flex-1 min-w-0 w-full">
        <Card className="shadow-md border border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-r from-blue-600 to-purple-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-bold">$</span>
                </div>
                Portfolio Setup
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {portfolio.length === 0 && borrowedEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">
                Add assets to define your starting portfolio
              </p>
            )}

            {/* Base portfolio assets */}
            {portfolio.map(item => {
              const ac = ASSET_CONFIG[item.asset];
              const borrowed = borrowedByAsset[item.asset] || 0;
              const baseVal = parseFloat(item.balance) || 0;
              const effectiveVal = baseVal + borrowed;

              return (
                <div key={item.id} className="space-y-1">
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${ac.bg} transition-all`}>
                    <div className={`w-10 h-10 bg-gradient-to-r ${ac.gradient} rounded-lg flex items-center justify-center shrink-0 shadow-sm`}>
                      <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <AssetIcon asset={item.asset} size="md" />
                      </div>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={item.balance}
                      onChange={(e) => onAssetBalanceChange(item.id, e.target.value)}
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-medium h-8 p-0"
                    />
                    <span className={`text-xs font-semibold ${ac.text} shrink-0`}>{item.asset}</span>
                    <button
                      onClick={() => onRemoveAsset(item.id)}
                      className="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                  
                </div>
              );
            })}

            {/* Divider before add button */}
            {(portfolio.length > 0 || borrowedEntries.length > 0) && (
              <div className="pt-1" />
            )}

            <AddDropdown
              variant="dashed"
              label="Add Asset"
              options={availableAssets.map(a => ({
                value: a,
                label: a,
                iconEl: <AssetIcon asset={a} size="md" />,
              }))}
              onSelect={onAddAsset}
            />
          </CardContent>
        </Card>
        </div>{/* close flex-1 */}
        <div className="w-44 shrink-0 hidden md:block" />{/* spacer matching RemainingPanel */}

        {/* Timeline origin — aligns with strategy timeline columns */}
        <div className="w-14 shrink-0 self-stretch relative hidden md:block">
          {/* Date label */}
          <span className="absolute right-4 top-1 text-[9px] font-bold text-gray-400 whitespace-nowrap leading-none">
            01.01.2024
          </span>
          {/* Origin dot — slightly larger / darker to mark the start */}
          <div className="absolute right-0 top-[22px] w-3 h-3 rounded-full bg-gray-400 border-2 border-white shadow ring-1 ring-gray-400" />
          {/* Line downward — extends through mb-5 gap */}
          {strategies.length > 0 && (
            <div className="absolute right-[5px] top-[34px] bottom-[-20px] w-0.5 bg-gray-200 rounded-full" />
          )}
        </div>

        </div>{/* close flex row */}

        {/* Strategy rows: card on left, remaining panel on right */}
        <div className="space-y-5">
          {strategies.map((strategy, index) => {
            const prior = strategies.slice(0, index);
            // Available balance for this strategy's asset after all prior strategies
            const strategyEffectiveBalance = seqRemaining(effectiveBalances[strategy.asset] ?? 0, strategy.asset, prior);
            const strategyInvestedAmt = strategyEffectiveBalance * (strategy.allocation / 100);
            // For CL: available balances of both assets after prior strategies
            const clAvailableBNB = seqRemaining(effectiveBalances['BNB'] ?? 0, 'BNB', prior);
            const clAvailableUSDC = seqRemaining(effectiveBalances['USDC'] ?? 0, 'USDC', prior);

            // Cumulative slice 0..index for the panel.
            const strategiesUpTo = strategies.slice(0, index + 1);
            const borrowedUpTo = strategiesUpTo
              .filter(s => s.type === 'lending' && s.config?.borrowAsset && s.config.borrowAsset !== 'none')
              .reduce((acc, s) => {
                const asset = s.config.borrowAsset;
                const amount = parseFloat(s.config.borrowAmount) || 0;
                acc[asset] = (acc[asset] || 0) + amount;
                return acc;
              }, {});

            const isLast = index === strategies.length - 1;

            return (
              <div key={strategy.id} className="flex flex-col md:flex-row gap-3 items-start">
                <div className="flex-1 min-w-0 w-full">
                  <StrategyCard
                    strategy={strategy}
                    effectiveBalance={strategyEffectiveBalance}
                    investedAmt={strategyInvestedAmt}
                    investedAsset={strategy.asset}
                    availableBNB={clAvailableBNB}
                    availableUSDC={clAvailableUSDC}
                    onRemove={() => onRemoveStrategy(strategy.id)}
                    onAllocationChange={(val) => onAllocationChange(strategy.id, val)}
                    onAssetChange={(asset) => onStrategyAssetChange(strategy.id, asset)}
                    onConfigChange={(config) => onStrategyConfigChange(strategy.id, config)}
                    onToggleLock={() => onToggleLock(strategy.id)}
                    onPositionHealthChange={(id, health) => setLendingPositionHealth(prev => {
                    const next = { ...prev };
                    if (health === null) delete next[id]; else next[id] = health;
                    return next;
                  })}
                  />
                </div>
                <div className="w-full md:w-44 shrink-0">
                  <RemainingPanel
                    portfolio={portfolio}
                    strategies={strategiesUpTo}
                    borrowedByAsset={borrowedUpTo}
                    strategyIndex={index}
                  />
                </div>

                {/* Timeline column */}
                <div className="w-14 shrink-0 self-stretch relative hidden md:block">
                  {/* Large ordinal number */}
                  <span className="absolute left-0 right-5 top-1 text-right text-4xl font-black text-gray-200 leading-none select-none">
                    {index + 1}
                  </span>
                  {/* Dot */}
                  <div className="absolute right-0 top-[22px] w-3 h-3 rounded-full bg-gray-300 border-2 border-white shadow-sm ring-1 ring-gray-300" />
                  {/* Connecting line — extends through space-y-5 gap */}
                  {!isLast && (
                    <div className="absolute right-[5px] top-[34px] bottom-[-20px] w-0.5 bg-gray-200 rounded-full" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Strategy — same row as strategy cards & Run Backtest, centered in the strategy column */}
          <div className="flex flex-col md:flex-row gap-3 items-start">
            <div className="flex-1 min-w-0 w-full flex justify-center py-2">
              <AddDropdown
                label="Add Strategy"
                options={[
                  {
                    value: 'lending',
                    label: 'Lending',
                    icon: '💰',
                    disabled: addableBNB === 0 && addableUSDC === 0,
                    disabledReason: 'No assets left',
                  },
                  {
                    value: 'perps',
                    label: 'Perpetuals',
                    icon: '📈',
                    disabled: addableUSDC === 0,
                    disabledReason: 'No USDC left',
                  },
                  {
                    value: 'cl',
                    label: 'Conc. Liquidity',
                    icon: '💧',
                    disabled: addableBNB === 0 && addableUSDC === 0,
                    disabledReason: 'No assets left',
                  },
                ]}
                onSelect={onAddStrategy}
              />
            </div>
            <div className="w-full md:w-44 shrink-0" />
            <div className="w-14 shrink-0 hidden md:block" />
          </div>

          {/* Run Backtest */}
          {strategies.length > 0 && !historyMode && (() => {
            const hasLiquidatableLending = Object.values(lendingPositionHealth).some(h => h === 0);
            const isBlocked = portfolio.length === 0 || loading || hasLiquidatableLending || runBlockers.length > 0;
            return (
            <div className="flex flex-col md:flex-row gap-3 items-start">
              <div className="flex-1 min-w-0 w-full pb-6 space-y-2">
                <Button
                  variant="gradient"
                  size="lg"
                  className="w-full relative"
                  onClick={handleRunBacktest}
                  disabled={isBlocked}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Simulating Strategy...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Run Backtest
                    </>
                  )}
                </Button>
                {error && (
                  <p className="text-sm text-center text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                    {error}
                  </p>
                )}
                {portfolio.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Add assets to your portfolio before running
                  </p>
                )}
                {portfolio.length > 0 && runBlockers.length > 0 && (
                  <ul className="space-y-1">
                    {runBlockers.map((msg, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <span className="shrink-0 mt-px">⚠</span>
                        {msg}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="w-full md:w-44 shrink-0" />
              <div className="w-14 shrink-0 hidden md:block" />
            </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
};
