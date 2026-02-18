"""
Backtesting utilities for Concentrated Liquidity Market Maker (CLMM) positions on BNB Chain (PancakeSwap V3).

This module exposes a single entrypoint:

    simulate_clmm(initial_token0, initial_token1, min_price, max_price)

which:
    - reads historical BNB price data (5m) from `data/perps/bnb-klines.csv` (Price Source);
    - reads historical Volume data from `data/clmm/pancakeswap_v3_bnb_usdc.csv` (Volume Source);
    - reads historical Liquidity Snapshots from `data/clmm/processed_liquidity.pkl` (Liquidity Source);
    - simulates a CLMM position (Uniswap V3 math);
    - calculates Fees, IL, Position Value, APR;
    - returns an array of state snapshots.

All calculations are vectorized where possible.
"""

from __future__ import annotations

import pickle
import numpy as np
import csv
# import pandas as pd # Avoid pandas dependency if possible, or assume env issue.
# Rewrite to use only numpy and csv for speed and compatibility.
from dataclasses import dataclass
from pathlib import Path
from typing import List, TypedDict, Tuple

# Paths
DATA_DIR = Path("data")
BNB_KLINES_CSV = DATA_DIR / "perps" / "bnb-klines.csv"
VOLUME_CSV = DATA_DIR / "clmm" / "pancakeswap_v3_bnb_usdc.csv"
LIQUIDITY_PKL = DATA_DIR / "clmm" / "processed_liquidity.pkl"

# Constants
FEE_TIER = 0.0001  # 0.01%
BNB_DECIMALS = 18
USDC_DECIMALS = 18 # Assuming standard, need to verify if it's 6 or 18 on BSC. usually 18 for BSC-USD? 
# Actually on BSC:
# BNB (WBNB) is 18.
# USDC (BSC-USD) is 18.
# Let's assume 18 for both for now based on typical BSC tokens, but if prices are around 300-600, it matches 18/18 or 6/6 diff.
# If Price is ~300, tick = log_1.0001(300 * 10^(dec1-dec0)). If dec1=dec0, it's just log(300).
# We will treat inputs as "human readable amounts" and prices as "human readable prices".

class CLMMStepState(TypedDict):
    timestamp: int
    price: float
    tick: int
    
    # Position status
    amount_0: float # BNB
    amount_1: float # USDC
    position_value_usd: float
    
    # Fees
    fees_0: float # Accumulated
    fees_1: float # Accumulated
    fees_usd_cumulative: float
    
    # Analysis
    il_usd: float # Impermanent Loss
    hold_value_usd: float # Value if held
    active_liquidity_pct: float # Market liquidity share
    in_range: bool

def price_to_tick(price: float) -> int:
    # tick = log_1.0001(price)
    return int(np.floor(np.log(price) / np.log(1.0001)))

def tick_to_price(tick: int) -> float:
    return 1.0001 ** tick

def get_liquidity_for_amount0(sqrtA, sqrtB, amount0):
    # L = amount0 * (sqrtA * sqrtB) / (sqrtB - sqrtA)
    if sqrtA > sqrtB: sqrtA, sqrtB = sqrtB, sqrtA
    return amount0 * (sqrtA * sqrtB) / (sqrtB - sqrtA)

def get_liquidity_for_amount1(sqrtA, sqrtB, amount1):
    # L = amount1 / (sqrtB - sqrtA)
    if sqrtA > sqrtB: sqrtA, sqrtB = sqrtB, sqrtA
    return amount1 / (sqrtB - sqrtA)

def get_amounts_for_liquidity(sqrtRatio, sqrtA, sqrtB, liquidity):
    if sqrtA > sqrtB: sqrtA, sqrtB = sqrtB, sqrtA
    
    # Current price below range
    if sqrtRatio <= sqrtA:
        amount0 = liquidity * (sqrtB - sqrtA) / (sqrtA * sqrtB)
        amount1 = 0.0
    # Current price above range
    elif sqrtRatio >= sqrtB:
        amount0 = 0.0
        amount1 = liquidity * (sqrtB - sqrtA)
    # Current price in range
    else:
        amount0 = liquidity * (sqrtB - sqrtRatio) / (sqrtRatio * sqrtB)
        amount1 = liquidity * (sqrtRatio - sqrtA)
        
    return amount0, amount1

def simulate_clmm(
    initial_token0: float, # BNB
    initial_token1: float, # USDC
    min_price: float,
    max_price: float,
) -> List[CLMMStepState]:
    
    # 1. Load Data
    print("Loading data...")
    if not BNB_KLINES_CSV.exists() or not VOLUME_CSV.exists() or not LIQUIDITY_PKL.exists():
        print("Missing data files.")
        return []

    # Load Price (5m candles)
    # timestamp,open,high,low,close
    try:
        # Load with numpy
        klines_data = []
        with open(BNB_KLINES_CSV, 'r') as f:
            reader = csv.reader(f)
            next(reader) # skip header
            for row in reader:
                if row:
                    # timestamp, open, high, low, close
                    klines_data.append([float(row[0]), float(row[4])]) # keep ts and close
        
        klines_arr = np.array(klines_data)
        # klines_arr[:, 0] is timestamp
        # klines_arr[:, 1] is close
    except Exception as e:
        print(f"Error loading klines: {e}")
        return []

    # Load Volume (Sparse)
    try:
        # timestamp, time_8h, volume_usd, trade_count
        vol_data = []
        with open(VOLUME_CSV, 'r') as f:
            reader = csv.reader(f)
            next(reader)
            for row in reader:
                if row:
                    vol_data.append([float(row[0]), float(row[2])]) # timestamp, volume_usd
        
        vol_arr = np.array(vol_data)
        # Sort by timestamp
        vol_arr = vol_arr[vol_arr[:, 0].argsort()]
    except Exception as e:
        print(f"Error loading volume: {e}")
        return []

    # Load Liquidity Map
    try:
        with open(LIQUIDITY_PKL, 'rb') as f:
            liquidity_snapshots = pickle.load(f) # {block_int: (indices, liquidity)}
        
        sorted_snapshot_blocks = np.array(sorted(liquidity_snapshots.keys()))
        
        ref_ts = 1704067200000
        ref_block = 34870000
        
    except Exception as e:
        print(f"Error loading liquidity: {e}")
        return []

    # 2. Merge/Align Data
    print("Aligning data...")
    
    # Align volume to klines
    # For each kline timestamp, find the volume period covering it.
    # Volume data is sparse. We assume volume represents the period starting at timestamp?
    # Or previous? Let's assume uniform distribution between volume points.
    
    # We will interpolate volume rate.
    # Create an array of vol_per_ms for each volume interval
    # vol_intervals: [start_ts, end_ts, rate]
    
    vol_timestamps = vol_arr[:, 0]
    vol_values = vol_arr[:, 1]
    
    # Calculate duration to next
    # If last point, assume 8h (28800000 ms)
    vol_durations = np.diff(vol_timestamps)
    vol_durations = np.append(vol_durations, 28800000.0) 
    
    # Handle gaps? Assuming contiguous or close enough.
    # vol_per_ms
    vol_rates = vol_values / vol_durations
    
    # Map klines to volume rates
    # np.searchsorted to find index of volume period for each kline
    # side='right' -> index i means vol_timestamps[i-1] <= kline_ts < vol_timestamps[i]
    kline_ts = klines_arr[:, 0]
    vol_indices = np.searchsorted(vol_timestamps, kline_ts, side='right') - 1
    
    # Clamp indices
    vol_indices = np.clip(vol_indices, 0, len(vol_rates) - 1)
    
    # Get rates
    kline_vol_rates = vol_rates[vol_indices]
    
    # 5m volume = rate * 300000
    kline_volumes = kline_vol_rates * 300000
    
    # Estimate blocks
    kline_est_blocks = ref_block + (kline_ts - ref_ts) / 3000
    
    # Combined Data Arrays
    # TS, Price, Volume, EstBlock
    
    # 3. Setup Simulation
    print("Setting up simulation...")
    
    # Invert prices for USDC/BNB pool
    # Pool Price = 1 / Market Price (BNB/USDC)
    # Range: min_price (BNB/USDC) -> max_price (BNB/USDC)
    # Inverted: 1/max -> 1/min
    
    pool_min_price = 1.0 / max_price
    pool_max_price = 1.0 / min_price
    
    tick_lower = price_to_tick(pool_min_price)
    tick_upper = price_to_tick(pool_max_price)
    
    # Ensure tick alignment (Pancake V3 spacing usually 10 or 50)
    tick_lower = (tick_lower // 10) * 10
    tick_upper = (tick_upper // 10) * 10
    
    if len(klines_arr) == 0:
        return []
        
    market_price = klines_arr[0, 1]
    pool_entry_price = 1.0 / market_price
    entry_tick = price_to_tick(pool_entry_price)
    
    # Map Tokens
    # Market Token0 = BNB (initial_token0)
    # Market Token1 = USDC (initial_token1)
    # Pool Token0 = USDC = Market Token1
    # Pool Token1 = BNB = Market Token0
    pool_token0 = initial_token1
    pool_token1 = initial_token0
    
    positions = []
    
    if pool_token1 > 0:
        # Provide BNB (Token1) in [tick_lower, min(entry_tick, tick_upper)]
        p1_lower = tick_lower
        p1_upper = min(entry_tick, tick_upper)
        
        p1_lower = (p1_lower // 10) * 10
        p1_upper = (p1_upper // 10) * 10
        
        if p1_lower < p1_upper:
            sa = np.sqrt(1.0001 ** p1_lower)
            sb = np.sqrt(1.0001 ** p1_upper)
            L_bnb = get_liquidity_for_amount1(sa, sb, pool_token1)
            positions.append({
                "L": L_bnb,
                "lower": p1_lower,
                "upper": p1_upper,
                "fees0": 0.0,
                "fees1": 0.0
            })

    if pool_token0 > 0:
        # Provide USDC (Token0) in [max(entry_tick, tick_lower), tick_upper]
        p2_lower = max(entry_tick, tick_lower)
        p2_upper = tick_upper
        
        p2_lower = (p2_lower // 10) * 10
        p2_upper = (p2_upper // 10) * 10
        
        if p2_lower < p2_upper:
            sa = np.sqrt(1.0001 ** p2_lower)
            sb = np.sqrt(1.0001 ** p2_upper)
            L_usdc = get_liquidity_for_amount0(sa, sb, pool_token0)
            positions.append({
                "L": L_usdc,
                "lower": p2_lower,
                "upper": p2_upper,
                "fees0": 0.0,
                "fees1": 0.0
            })

    # 4. Run Loop
    print(f"Simulating {len(klines_arr)} steps with {len(positions)} sub-positions...")
    
    results = []
    
    # Pre-fetch columns for speed
    ts_arr = klines_arr[:, 0]
    price_arr = klines_arr[:, 1]
    vol_arr = kline_volumes
    est_block_arr = kline_est_blocks
    
    # Cache liquidity snapshots keys
    snap_blocks = np.array(sorted(liquidity_snapshots.keys()))
    
    # Calculate Hold Value (Static)
    hold_token0 = initial_token0
    hold_token1 = initial_token1
    
    for i in range(len(klines_arr)):
        ts = ts_arr[i]
        market_price = price_arr[i] # BNB/USDC (e.g. 300)
        vol_usd = vol_arr[i]
        curr_block = est_block_arr[i]
        
        # Pool Price (USDC/BNB)
        pool_price = 1.0 / market_price
        tick = price_to_tick(pool_price)
        sqrt_p = np.sqrt(pool_price)
        
        # 4.1 Find Active Market Liquidity
        idx = np.searchsorted(snap_blocks, curr_block, side='right') - 1
        if idx < 0: idx = 0
        
        snap_block_num = snap_blocks[idx]
        (snap_ticks, snap_cum_liquidity) = liquidity_snapshots[snap_block_num]
        
        l_idx = np.searchsorted(snap_ticks, tick, side='right') - 1
        
        if l_idx < 0 or l_idx >= len(snap_cum_liquidity):
            L_market = 0.0
        else:
            L_market = snap_cum_liquidity[l_idx]
            
        # 4.2 Process Positions
        step_fees_0 = 0.0
        step_fees_1 = 0.0
        curr_amount_0 = 0.0
        curr_amount_1 = 0.0
        
        in_range_any = False
        
        for pos in positions:
            L_pos = pos["L"]
            lower = pos["lower"]
            upper = pos["upper"]
            
            # Check if active
            if lower <= tick < upper:
                in_range_any = True
                
                # Fee Calculation
                if "L_atomic" not in pos:
                     pos["L_atomic"] = L_pos * (10**18)
                
                L_pos_atomic = pos["L_atomic"]
                
                share = L_pos_atomic / (L_market + L_pos_atomic) if (L_market + L_pos_atomic) > 0 else 0
                
                fee_income = vol_usd * FEE_TIER * share
                
                # Fees are collected in tokens? 
                # Uniswap V3: fees are collected in Token0 if Price < Tick, Token1 if Price > Tick?
                # Actually, fees are collected in the token that is being SWAPPED IN.
                # Since we use aggregate volume, we assume 50/50 split of volume for fee purposes?
                # Let's simplify: Fees in USD value.
                fee_usd = fee_income
                
                # Store fees in tokens
                # Token0 is USDC (Value 1)
                # Token1 is BNB (Value market_price)
                
                # Split 50/50
                pos["fees0"] += (fee_usd * 0.5) # USDC
                pos["fees1"] += (fee_usd * 0.5) / market_price # BNB
            
            # Calculate Current Amounts in Position
            sa = np.sqrt(1.0001 ** lower)
            sb = np.sqrt(1.0001 ** upper)
            a0, a1 = get_amounts_for_liquidity(sqrt_p, sa, sb, L_pos)
            
            # a0 is Pool Token0 (USDC)
            # a1 is Pool Token1 (BNB)
            curr_amount_0 += a0 # USDC
            curr_amount_1 += a1 # BNB
            
            step_fees_0 += pos["fees0"]
            step_fees_1 += pos["fees1"]

        # 4.3 Metrics
        # Value in USD
        # curr_amount_0 is USDC
        # curr_amount_1 is BNB
        pos_value_usd = (curr_amount_0) + (curr_amount_1 * market_price)
        
        # Fees in USD
        fees_value_usd = (step_fees_0) + (step_fees_1 * market_price)
        
        total_value = pos_value_usd + fees_value_usd
        
        hold_value = (hold_token0 * market_price) + hold_token1
        il_usd = pos_value_usd - hold_value
        
        active_liq_pct = 0.0
        if in_range_any and L_market > 0:
             total_L_pos = sum(p["L"] for p in positions if p["lower"] <= tick < p["upper"])
             active_liq_pct = total_L_pos / (L_market + total_L_pos)
             
        results.append({
            "timestamp": int(ts),
            "price": float(market_price),
            "tick": int(tick),
            "amount_0": float(curr_amount_1), # BNB
            "amount_1": float(curr_amount_0), # USDC
            "position_value_usd": float(pos_value_usd),
            "fees_0": float(step_fees_1), # BNB Fees
            "fees_1": float(step_fees_0), # USDC Fees
            "fees_usd_cumulative": float(fees_value_usd),
            "il_usd": float(il_usd),
            "hold_value_usd": float(hold_value),
            "active_liquidity_pct": float(active_liq_pct),
            "in_range": in_range_any
        })
        
    return results

if __name__ == "__main__":
    # Test
    print("Testing CLMM Backtest...")
    # Example: 10 BNB (~3000 USD), 3000 USDC. Price ~310.
    
    # Test 1: Original Wide Range (250-400)
    print("\n--- Test 1: Range 250-400 (Likely Out of Range quickly) ---")
    res1 = simulate_clmm(10.0, 3000.0, 250.0, 400.0)
    if res1:
        last = res1[-1]
        print(f"Final Value: ${last['position_value_usd']:.2f}")
        print(f"Fees Earned: ${last['fees_usd_cumulative']:.2f}")
        print(f"In Range Steps: {sum(1 for s in res1 if s['in_range'])} / {len(res1)}")

    # Test 2: Full Range (200-1000) to ensure we capture fees throughout the run
    print("\n--- Test 2: Range 200-1000 (Ideally In Range mostly) ---")
    res2 = simulate_clmm(10.0, 3000.0, 200.0, 1000.0)
    if res2:
        last = res2[-1]
        print(f"Final Value: ${last['position_value_usd']:.2f}")
        print(f"Fees Earned: ${last['fees_usd_cumulative']:.2f}")
        print(f"In Range Steps: {sum(1 for s in res2 if s['in_range'])} / {len(res2)}")
        
    # Test 3: Tight Range around start price (300-350)
    print("\n--- Test 3: Range 300-350 (Concentrated, high fees initially, then 0) ---")
    res3 = simulate_clmm(10.0, 3000.0, 300.0, 350.0)
    if res3:
        last = res3[-1]
        print(f"Final Value: ${last['position_value_usd']:.2f}")
        print(f"Fees Earned: ${last['fees_usd_cumulative']:.2f}")
        print(f"In Range Steps: {sum(1 for s in res3 if s['in_range'])} / {len(res3)}")
