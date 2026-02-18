"""
Backtesting utilities for Perpetual Futures positions on BNB Chain (BNB/USDT).

This module exposes a single entrypoint:

    simulate_perp(initial_collateral, leverage, is_long)

which:
    - reads historical BNB price data from `data/perps/bnb-klines.csv`;
    - simulates a perpetual futures position (Long or Short) with specified leverage;
    - calculates PnL, equity, and liquidation status for each 5m candle;
    - assumes 0 funding rate (for now);
    - returns an array of state snapshots.

All calculations are vectorized using NumPy for performance.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import List, TypedDict, Dict

import numpy as np

DATA_DIR = Path("data") / "perps"
BNB_KLINES_CSV = DATA_DIR / "bnb-klines.csv"

# Trading constants
MAINTENANCE_MARGIN_RATE = 0.005  # 0.5%
LIQUIDATION_FEE = 0.01  # 1%


class PerpStepState(TypedDict):
    """
    One simulation step (one candle).
    """
    timestamp: int
    price: float
    pnl: float
    equity: float
    is_liquidated: bool
    funding_rate: float
    position_size_bnb: float
    liquidation_price: float


def simulate_perp(
    initial_collateral: float,
    leverage: float,
    is_long: bool,
) -> List[PerpStepState]:
    """
    Simulate a perpetual futures position.

    Arguments:
        initial_collateral: Amount of USDT collateral.
        leverage: Leverage multiplier (e.g. 10.0).
        is_long: True for Long, False for Short.

    Returns:
        List[PerpStepState] for each candle in the history.
    """
    if not BNB_KLINES_CSV.exists():
        print(f"Error: {BNB_KLINES_CSV} not found.")
        return []

    # Read CSV data into numpy arrays
    # Columns: timestamp, open, high, low, close
    # We skip the header
    try:
        data = np.loadtxt(BNB_KLINES_CSV, delimiter=",", skiprows=1)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return []

    if data.size == 0:
        return []

    timestamps = data[:, 0].astype(np.int64)
    opens = data[:, 1]
    closes = data[:, 4]
    
    n_steps = len(timestamps)
    
    # Entry parameters
    entry_price = opens[0]
    position_value_usdt = initial_collateral * leverage
    position_size_bnb = position_value_usdt / entry_price
    
    # Funding rate (placeholder, 0 for now)
    funding_rates = np.zeros(n_steps)
    
    # Calculate PnL
    # For Long: (Current Price - Entry Price) * Size
    # For Short: (Entry Price - Current Price) * Size
    if is_long:
        pnl = (closes - entry_price) * position_size_bnb
    else:
        pnl = (entry_price - closes) * position_size_bnb
        
    # Calculate Equity
    equity = initial_collateral + pnl
    
    # Calculate Liquidation Price (Simplified)
    # Long: Entry * (1 - 1/Lev + MM)
    # Short: Entry * (1 + 1/Lev - MM)
    # This is a static approximation. For dynamic equity, we check equity ratio.
    # Liquidation condition: Equity < Maintenance Margin * Position Value
    # Maintenance Margin Value = Position Value * MM_RATE
    # Since position size is fixed in BNB (linear contract), Position Value = Price * Size
    
    maintenance_margin_required = (closes * position_size_bnb) * MAINTENANCE_MARGIN_RATE
    is_liquidated_mask = equity < maintenance_margin_required
    
    # Handle liquidation logic: once liquidated, equity stays 0 (or -fee) and position is closed.
    # We can use np.maximum.accumulate to propagate the liquidation state?
    # Actually, simply finding the first liquidation index is enough.
    
    first_liq_idx = np.argmax(is_liquidated_mask) 
    
    # If argmax returns 0, it means either index 0 is true, or NO True values found (if all False).
    # We check if index 0 is actually liquidated.
    has_liquidation = is_liquidated_mask[first_liq_idx]
    
    if has_liquidation:
        # Zero out equity and PnL after liquidation
        # (This assumes effective bankruptcy/closure at that candle)
        # We set is_liquidated to True for all subsequent steps
        is_liquidated_sequence = np.arange(n_steps) >= first_liq_idx
        
        # Clamp equity to 0 (or negative if we want to show bankruptcy)
        equity[is_liquidated_sequence] = 0.0
        pnl[is_liquidated_sequence] = -initial_collateral # Loss of all collateral
    else:
        is_liquidated_sequence = np.zeros(n_steps, dtype=bool)

    # Calculate Liquidation Price (Exact)
    # Long: Price < Entry * (1 - 1/Lev) / (1 - MM)
    # Short: Price > Entry * (1 + 1/Lev) / (1 + MM)
    if is_long:
        liq_price = entry_price * (1.0 - (1.0 / leverage)) / (1.0 - MAINTENANCE_MARGIN_RATE)
    else:
        liq_price = entry_price * (1.0 + (1.0 / leverage)) / (1.0 + MAINTENANCE_MARGIN_RATE)
    
    liquidation_prices = np.full(n_steps, liq_price)

    # Construct result list
    # Since we want a list of dicts, we iterate once to build it.
    # This is unavoidable for returning standard Python objects, but calculation was fast.
    
    result: List[PerpStepState] = []
    
    # Convert numpy arrays to standard python types for the output dict
    timestamps_list = timestamps.tolist()
    closes_list = closes.tolist()
    pnl_list = pnl.tolist()
    equity_list = equity.tolist()
    is_liq_list = is_liquidated_sequence.tolist()
    funding_list = funding_rates.tolist()
    
    for i in range(n_steps):
        step: PerpStepState = {
            "timestamp": int(timestamps_list[i]),
            "price": float(closes_list[i]),
            "pnl": float(pnl_list[i]),
            "equity": float(equity_list[i]),
            "is_liquidated": bool(is_liq_list[i]),
            "funding_rate": float(funding_list[i]),
            "position_size_bnb": float(position_size_bnb),
            "liquidation_price": float(liquidation_prices[i])
        }
        result.append(step)
        
    return result

if __name__ == "__main__":
    # Simple test
    print("Testing perp backtest...")
    res = simulate_perp(1000.0, 10.0, True)
    if res:
        print(f"Simulated {len(res)} candles.")
        print(f"First: {res[0]}")
        print(f"Last: {res[-1]}")
        
        # Find if liquidated
        liq_steps = [s for s in res if s["is_liquidated"]]
        if liq_steps:
            print(f"Liquidated at step: {liq_steps[0]}")
        else:
            print("Not liquidated.")
    else:
        print("No result.")
