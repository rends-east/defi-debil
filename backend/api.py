"""
FastAPI Backend for DeFi Debil Backtesting.
"""
import os
from typing import List, Union, Literal, Optional, Any
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Response
import uvicorn
import math

# Import existing backtest functions
# We need to make sure the imports work from the root directory
import sys
from pathlib import Path

from x402.mechanisms.evm.constants import NETWORK_CONFIGS
sys.path.append(str(Path(__file__).parent.parent))

from backend.lending_backtest import simulate_lending
from backend.perp_backtest import simulate_perp
from backend.clmm_backtest import simulate_clmm

# --- x402 payment protocol (testnet) ---
from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http.types import RouteConfig
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.schemas import AssetAmount, Network
from x402.server import x402ResourceServer


# Testnet: Base Sepolia. Для продакшена см. x402 docs (eip155:8453 для Base mainnet).
X402_NETWORK: Network = "eip155:56"
X402_FACILITATOR_URL = os.getenv("X402_FACILITATOR_URL", "https://api.x402.unibase.com/v2")
# Адрес для приёма платежей (USDC). Для теста можно любой EVM-адрес.
X402_PAY_TO = os.getenv("X402_PAY_TO", "0x0000000000000000000000000000000000000001")

NETWORK_CONFIGS[X402_NETWORK] = {
        "chain_id": 56,
        "default_asset": {
            "address": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
            "name": "USD Coin",
            "version": "2",
            "decimals": 18,
        },
        "supported_assets": {
            "USDC": {
                "address": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
                "name": "USD Coin",
                "version": "2",
                "decimals": 18,
            },
        },
    }


facilitator = HTTPFacilitatorClient(FacilitatorConfig(url=X402_FACILITATOR_URL))
x402_server = x402ResourceServer(facilitator)
x402_server.register(X402_NETWORK, ExactEvmServerScheme())

x402_routes: dict[str, RouteConfig] = {
    "GET /secretpay": RouteConfig(
        accepts=[
            PaymentOption(
                scheme="exact",
                pay_to=X402_PAY_TO,
                price=AssetAmount(
                    amount="1000000000000000", 
                    asset="0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
                    extra={"name": "USDC", "version": "2", "chain_id": 56, "decimals": 18}),
                network=X402_NETWORK
            ),
        ],
        mime_type="application/json",
        description="Secret paywalled response (x402 test endpoint)",
    ),
}

app = FastAPI(title="DeFi Debil Backtest API")
app.add_middleware(PaymentMiddlewareASGI, routes=x402_routes, server=x402_server)

# --- Models ---

class LendingRequest(BaseModel):
    supply_amount: float = Field(..., description="Initial amount to supply (in BNB or USDC)")
    borrow_amount: float = Field(..., description="Initial amount to borrow (in USDC or BNB)")
    is_bnb_supply: bool = Field(..., description="True if supplying BNB and borrowing USDC, False otherwise")

class PerpRequest(BaseModel):
    initial_collateral: float = Field(..., description="Initial collateral in USDT")
    leverage: float = Field(..., description="Leverage multiplier (e.g. 10.0)")
    is_long: bool = Field(..., description="True for Long, False for Short")

class CLMMRequest(BaseModel):
    initial_token0: float = Field(..., description="Initial BNB amount")
    initial_token1: float = Field(..., description="Initial USDC amount")
    min_price: float = Field(..., description="Min price of the range (BNB/USDC)")
    max_price: float = Field(..., description="Max price of the range (BNB/USDC)")

class BacktestSummary(BaseModel):
    final_pnl_usd: float
    roi_percentage: float
    apy_percentage: float
    max_drawdown_usd: float = 0.0
    final_equity_usd: float
    steps_count: int

class BacktestResult(BaseModel):
    summary: BacktestSummary
    steps: List[Any] # Detailed steps from the backtest functions

class BatchRequestItem(BaseModel):
    type: Literal["lending", "perp", "clmm"]
    params: dict # Polymorphic parameters

class BatchResponse(BaseModel):
    results: List[BacktestResult]

class BatchRequest(BaseModel):
    items: List[BatchRequestItem]

# --- Helpers ---

def calculate_apy(roi_pct: float, duration_days: float) -> float:
    if duration_days <= 0: return 0.0
    return (roi_pct / duration_days) * 365.0

def downsample_steps(steps: List[Any], target_count: int = 500) -> List[Any]:
    """
    Downsample a list of steps to a target count to reduce payload size.
    Always includes the first and last step.
    """
    if not steps:
        return []
    if len(steps) <= target_count:
        return steps
    
    # Calculate step size
    step_size = len(steps) / target_count
    
    downsampled = []
    for i in range(target_count):
        idx = int(i * step_size)
        if idx < len(steps):
            downsampled.append(steps[idx])
            
    # Ensure last step is included if not already
    if downsampled[-1] != steps[-1]:
        downsampled.append(steps[-1])
        
    return downsampled

# --- Endpoints ---

@app.post("/backtest/lending", response_model=BacktestResult)
def run_lending_backtest(req: LendingRequest):
    try:
        steps = simulate_lending(req.supply_amount, req.borrow_amount, req.is_bnb_supply)
        if not steps:
            raise HTTPException(status_code=404, detail="No data available for lending backtest")
        
        # Calculate summary
        first = steps[0]
        last = steps[-1]
        
        # Duration
        # Lending backtest uses 'block' not 'timestamp'
        duration_seconds = (last["block"] - first["block"]) * 3.0
        duration_days = duration_seconds / (24 * 3600)
        
        # PnL (Token Net Change)
        # Supply Interest Earned (in Token)
        # Borrow Interest Paid (in Token)
        # We can sum up or just take difference
        
        if req.is_bnb_supply:
            # Supply BNB, Borrow USDC
            supply_start = req.supply_amount
            borrow_start = req.borrow_amount
            
            supply_end = last["supply_bnb"]
            borrow_end = last["borrow_usdc"]
            
            # Net Tokens
            net_bnb = supply_end - supply_start
            net_usdc = -(borrow_end - borrow_start)
            
            # Convert to USD (Approx Price)
            # Assume 1 BNB = 300 USD (Static for summary purposes if no price available)
            # Assume 1 USDC = 1 USD
            price_bnb = 300.0
            
            pnl_usd = (net_bnb * price_bnb) + net_usdc
            initial_equity_usd = (supply_start * price_bnb) - borrow_start
            
        else:
            # Supply USDC, Borrow BNB
            supply_start = req.supply_amount
            borrow_start = req.borrow_amount
            
            supply_end = last["supply_usdc"]
            borrow_end = last["borrow_bnb"]
            
            net_usdc = supply_end - supply_start
            net_bnb = -(borrow_end - borrow_start)
            
            price_bnb = 300.0
            
            pnl_usd = net_usdc + (net_bnb * price_bnb)
            initial_equity_usd = supply_start - (borrow_start * price_bnb)

        final_equity_usd = initial_equity_usd + pnl_usd
        roi = (pnl_usd / initial_equity_usd * 100) if initial_equity_usd != 0 else 0.0
        
        # Downsample steps
        final_steps = downsample_steps(steps, target_count=500)
        
        return BacktestResult(
            summary=BacktestSummary(
                final_pnl_usd=pnl_usd,
                roi_percentage=roi,
                apy_percentage=calculate_apy(roi, duration_days),
                final_equity_usd=final_equity_usd,
                steps_count=len(steps)
            ),
            steps=final_steps
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/backtest/perp", response_model=BacktestResult)
def run_perp_backtest(req: PerpRequest):
    try:
        steps = simulate_perp(req.initial_collateral, req.leverage, req.is_long)
        if not steps:
            raise HTTPException(status_code=404, detail="No data available for perp backtest")
            
        last = steps[-1]
        first = steps[0]
        
        # Calculate summary
        initial_equity = req.initial_collateral
        final_equity = last["equity"]
        pnl = final_equity - initial_equity
        roi = (pnl / initial_equity) * 100
        
        duration_ms = last["timestamp"] - first["timestamp"]
        duration_days = duration_ms / (1000 * 3600 * 24)
        
        # Downsample steps
        final_steps = downsample_steps(steps, target_count=500)
        
        return BacktestResult(
            summary=BacktestSummary(
                final_pnl_usd=pnl,
                roi_percentage=roi,
                apy_percentage=calculate_apy(roi, duration_days),
                final_equity_usd=final_equity,
                steps_count=len(steps)
            ),
            steps=final_steps
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/backtest/clmm", response_model=BacktestResult)
def run_clmm_backtest(req: CLMMRequest):
    try:
        steps = simulate_clmm(req.initial_token0, req.initial_token1, req.min_price, req.max_price)
        if not steps:
            raise HTTPException(status_code=404, detail="No data available for clmm backtest")
            
        last = steps[-1]
        first = steps[0]
        
        # Initial Value (Hold Value at start)
        # Hold value at step 0 is (initial_0 * price_0) + initial_1
        # Use first step hold value
        initial_equity = steps[0]["hold_value_usd"] 
        
        # Final Value (Position + Fees)
        final_equity = last["position_value_usd"] + last["fees_usd_cumulative"]
        
        pnl = final_equity - initial_equity
        roi = (pnl / initial_equity) * 100
        
        duration_ms = last["timestamp"] - first["timestamp"]
        duration_days = duration_ms / (1000 * 3600 * 24)
        
        # Downsample steps
        final_steps = downsample_steps(steps, target_count=500)
        
        return BacktestResult(
            summary=BacktestSummary(
                final_pnl_usd=pnl,
                roi_percentage=roi,
                apy_percentage=calculate_apy(roi, duration_days),
                final_equity_usd=final_equity,
                steps_count=len(steps)
            ),
            steps=final_steps
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- x402 protected endpoint: полный цикл протокола ---
# 1) Запрос без оплаты → сервер отвечает 402 + инструкции по оплате в теле.
# 2) Клиент платит (подписывает payload) и повторяет запрос с заголовком PAYMENT-SIGNATURE (Base64 JSON).
# 3) Мидлварь проверяет платёж через facilitator (verify/settle), затем отдаёт запрос в этот handler.
# 4) Успешный ответ возвращается с заголовком PAYMENT-RESPONSE (подтверждение settlement).

class SecretPayResponse(BaseModel):
    secret: str = Field(..., description="Paywalled secret content")
    paid: bool = True

@app.get("/secretpay", response_model=SecretPayResponse)
async def get_secretpay() -> SecretPayResponse:
    """Тестовый эндпоинт, закрытый по протоколу x402. Доступен только после успешной оплаты."""
    return SecretPayResponse(
        secret="DeFi Debil secret: 402 Payment Required works!",
        paid=True,
    )

@app.head("/secretpay")
async def head_secretpay():
    return Response(status_code=200)

@app.post("/backtest/batch", response_model=BatchResponse)
def run_batch_backtest(batch: BatchRequest):
    results = []
    for item in batch.items:
        try:
            if item.type == "lending":
                # Convert dict params to model
                req = LendingRequest(**item.params)
                res = run_lending_backtest(req)
                results.append(res)
            elif item.type == "perp":
                req = PerpRequest(**item.params)
                res = run_perp_backtest(req)
                results.append(res)
            elif item.type == "clmm":
                req = CLMMRequest(**item.params)
                res = run_clmm_backtest(req)
                results.append(res)
            else:
                # Add empty result or error placeholder
                # For now, just skip or error?
                # Let's append a dummy error result if possible, or raise
                pass 
        except Exception as e:
            # For batch, we might want to return partial results or error info
            # Here we just print and continue with empty/error
            print(f"Error in batch item {item}: {e}")
            # We can't return None if model expects BacktestResult
            # We'll skip for now to keep it simple
            continue
            
    return BatchResponse(results=results)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
