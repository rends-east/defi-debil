"""
Backtesting utilities for Venus lending positions on BNB Chain.

This module exposes a single entrypoint:

    simulate_lending(supply_amount, borrow_amount, is_bnb)

which:
    - reads historical Venus market data for BNB and USDC
      from `data/lending/bnb_history.csv` and `data/lending/usdc_history.csv`;
    - reconstructs **per-block supply and borrow rates** for each asset
      based on the protocol relation between supply and borrow rates;
    - simulates the evolution of a simple leveraged position over time
      (supply in one asset, borrow in the other);
    - returns an array of state snapshots, one per row of historical data
      (length = min(len(bnb_csv), len(usdc_csv))).

All rates returned by this module are NORMALIZED per-block floats,
not 1e18-scaled mantissas.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Literal, Optional, TypedDict
import csv


DATA_DIR = Path("data") / "lending"
BNB_CSV = DATA_DIR / "bnb_history.csv"
USDC_CSV = DATA_DIR / "usdc_history.csv"

# Venus-style rates are typically expressed as mantissas scaled by 1e18.
MANTISSA_SCALE = 1e18

# Reserve factor: fraction of interest that goes to protocol reserves
# rather than suppliers. For USDC it is constant; for BNB (vBNB) it changed
# several times in history and is modeled as a piecewise function of block.
DEFAULT_RESERVE_FACTOR_USDC = 0.10


class StepState(TypedDict):
    """
    One simulation step (one row in the returned array).

    All amounts are notionals in the underlying asset units (e.g. BNB, USDC).
    Rates are normalized per-block values (e.g. 2.5e-9).
    """
    timestamp: int
    block: int

    supply_bnb: float
    borrow_bnb: float
    supply_usdc: float
    borrow_usdc: float

    bnb_supply_rate_per_block: float
    bnb_borrow_rate_per_block: float
    usdc_supply_rate_per_block: float
    usdc_borrow_rate_per_block: float


@dataclass
class MarketPoint:
    timestamp: int
    block: int
    supply_rate_mantissa: int
    cash: float
    borrows: float
    reserves: float
    utilization: float

    @property
    def supply_rate_per_block(self) -> float:
        """Normalized per-block supply rate (float)."""
        return self.supply_rate_mantissa / MANTISSA_SCALE


def _read_market_history(csv_path: Path) -> List[MarketPoint]:
    """
    Read Venus market history CSV into a list of MarketPoint.

    Expected columns:
        index, block, supply_rate_per_block, cash, borrows, reserves, utilization
    """
    points: List[MarketPoint] = []

    with csv_path.open("r", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Defensive parsing with minimal casting.
            block = int(row["block"])
            timestamp = int(row["timestamp"])
            supply_rate_mantissa = int(row["supply_rate_per_block"])
            cash = float(row["cash"])
            borrows = float(row["borrows"])
            reserves = float(row["reserves"])
            utilization = float(row["utilization"])

            points.append(
                MarketPoint(
                    timestamp=timestamp,
                    block=block,
                    supply_rate_mantissa=supply_rate_mantissa,
                    cash=cash,
                    borrows=borrows,
                    reserves=reserves,
                    utilization=utilization,
                )
            )

    # Ensure sorted by block in ascending order.
    points.sort(key=lambda p: p.block)
    return points


def _bnb_reserve_factor_for_block(block: int) -> float:
    """
    Historical reserve factor schedule for vBNB, inferred from on-chain data.

    Values are in fractions (mantissa / 1e18):
        - up to block 44_869_103:         0.25
        - 44_869_104 .. 48_612_083:      0.30
        - 48_612_084 .. 51_097_143:      0.10
        - from 51_097_144 and onwards:   0.30

    Boundaries are chosen so that each range starts from the block where the
    new parameter value becomes effective.
    """
    if block < 44_869_104:
        return 0.25
    if block <= 48_612_083:
        return 0.30
    if block <= 51_097_143:
        return 0.10
    return 0.30


def _compute_borrow_rate_per_block(
    supply_rate_per_block: float,
    utilization: float,
    reserve_factor: float,
) -> float:
    """
    Infer borrow_rate_per_block from supply_rate_per_block and utilization.

    Venus / Compound-style relation (simplified):
        supplyRate = borrowRate * utilization * (1 - reserveFactor)

    All rates here are normalized per-block floats, not mantissas.
    """
    # Guard against pathological or zero utilization / reserve settings.
    if utilization <= 0.0:
        return 0.0

    effective_share = utilization * (1.0 - reserve_factor)
    if effective_share <= 0.0:
        return 0.0

    return supply_rate_per_block / effective_share


def _growth_factor(rate_per_block: float, delta_blocks: int) -> float:
    """
    Compound a per-block rate over delta_blocks blocks.

    For very small rates (as in money markets) this is numerically stable.
    """
    if delta_blocks <= 0:
        return 1.0
    # (1 + r) ** n, where r is per-block rate.
    return (1.0 + rate_per_block) ** delta_blocks


def simulate_lending(
    supply_amount: float,
    borrow_amount: float,
    is_bnb: bool,
    start_timestamp: Optional[int] = None,
) -> List[StepState]:
    """
    Simulate a simple supply/borrow position across historical Venus data.

    Arguments:
        supply_amount: initial notional on supply side.
        borrow_amount: initial notional on borrow side.
        is_bnb:
            - True:  supply in BNB,  borrow in USDC;
            - False: supply in USDC, borrow in BNB.
        start_timestamp:
            Unix timestamp (seconds) at which to start the backtest.
            The function finds the closest snapshot by timestamp in the
            historical CSV data and starts from that row. If None (default),
            the simulation starts from the first available snapshot.

    Returns:
        List[StepState] with length equal to the minimum of the two
        historical CSVs (BNB and USDC). Each element corresponds to one
        historical snapshot (approx. one block range).

    Notes:
        - All rates in the returned structure are per-block floats.
        - Amounts are compounded between blocks using the corresponding
          per-block supply / borrow rates of each asset.
    """
    bnb_history = _read_market_history(BNB_CSV)
    usdc_history = _read_market_history(USDC_CSV)

    # Use the shorter of the two histories to keep indices aligned.
    n = min(len(bnb_history), len(usdc_history))
    if n == 0:
        return []

    # Trim both histories to the same length for deterministic indexing.
    bnb_history = bnb_history[:n]
    usdc_history = usdc_history[:n]

    # If a start timestamp is provided, find the closest snapshot (by timestamp)
    # in the aligned histories and start from that index.
    if start_timestamp is not None:
        # Use BNB timestamps as the reference; histories are aligned in time.
        closest_idx = min(
            range(n),
            key=lambda i: abs(bnb_history[i].timestamp - start_timestamp),
        )
        bnb_history = bnb_history[closest_idx:]
        usdc_history = usdc_history[closest_idx:]
        n = len(bnb_history)
        if n == 0:
            return []

    # Initial positions at the first snapshot.
    if is_bnb:
        supply_bnb = float(supply_amount)
        borrow_usdc = float(borrow_amount)
        supply_usdc = 0.0
        borrow_bnb = 0.0
    else:
        supply_usdc = float(supply_amount)
        borrow_bnb = float(borrow_amount)
        supply_bnb = 0.0
        borrow_usdc = 0.0

    result: List[StepState] = []

    # We will iterate over all points and compound from the previous block
    # to the current one. For the very first point, we assume no elapsed
    # time yet (delta_blocks = 0), so balances remain equal to the initial
    # values, but we still record the step with rates from that snapshot.
    prev_block = bnb_history[0].block

    for i in range(n):
        bnb_point = bnb_history[i]
        usdc_point = usdc_history[i]

        # Compute time delta since previous recorded block.
        current_block = bnb_point.block
        delta_blocks = current_block - prev_block
        if delta_blocks < 0:
            # If blocks go backwards due to data issues, treat as 0.
            delta_blocks = 0

        # Per-block supply rates (normalized).
        bnb_supply_r = bnb_point.supply_rate_per_block
        usdc_supply_r = usdc_point.supply_rate_per_block

        # Infer borrow per-block rates from supply rate, utilization and
        # historical reserve factors.
        bnb_reserve_factor = _bnb_reserve_factor_for_block(current_block)
        bnb_borrow_r = _compute_borrow_rate_per_block(
            bnb_supply_r,
            bnb_point.utilization,
            bnb_reserve_factor,
        )
        usdc_borrow_r = _compute_borrow_rate_per_block(
            usdc_supply_r,
            usdc_point.utilization,
            DEFAULT_RESERVE_FACTOR_USDC,
        )

        # Compound positions from prev_block to current_block.
        if delta_blocks > 0:
            # BNB positions compounded with BNB market rates.
            bnb_supply_growth = _growth_factor(bnb_supply_r, delta_blocks)
            bnb_borrow_growth = _growth_factor(bnb_borrow_r, delta_blocks)

            supply_bnb *= bnb_supply_growth
            borrow_bnb *= bnb_borrow_growth

            # USDC positions compounded with USDC market rates.
            usdc_supply_growth = _growth_factor(usdc_supply_r, delta_blocks)
            usdc_borrow_growth = _growth_factor(usdc_borrow_r, delta_blocks)

            supply_usdc *= usdc_supply_growth
            borrow_usdc *= usdc_borrow_growth

        # Record snapshot for this block.
        step: StepState = {
            "timestamp": bnb_point.timestamp,
            "block": current_block,
            "supply_bnb": supply_bnb,
            "borrow_bnb": borrow_bnb,
            "supply_usdc": supply_usdc,
            "borrow_usdc": borrow_usdc,
            "bnb_supply_rate_per_block": bnb_supply_r,
            "bnb_borrow_rate_per_block": bnb_borrow_r,
            "usdc_supply_rate_per_block": usdc_supply_r,
            "usdc_borrow_rate_per_block": usdc_borrow_r,
        }
        result.append(step)

        prev_block = current_block

    return result

