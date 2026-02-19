"""
FastAPI Backend for DeFi Debil Backtesting.
"""
from typing import List, Union, Literal, Optional, Any
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import math
import sys
from pathlib import Path
import secrets

# Add project root to sys path
sys.path.append(str(Path(__file__).parent.parent))

from backend.lending_backtest import simulate_lending
from backend.perp_backtest import simulate_perp
from backend.clmm_backtest import simulate_clmm
from backend.database import users_collection, history_collection
from backend.auth import create_access_token, verify_signature, get_current_user
import secrets
from datetime import datetime, timezone

app = FastAPI(title="DeFi Debil Backtest API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Restrict to frontend origin for credentials
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---

class NonceRequest(BaseModel):
    address: str

class VerifyRequest(BaseModel):
    address: str
    signature: str

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

class HistoryItem(BaseModel):
    id: str
    type: str
    params: Any
    summary: BacktestSummary
    timestamp: datetime

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

# --- Auth Endpoints ---

@app.post("/auth/nonce")
async def get_nonce(req: NonceRequest):
    nonce = secrets.token_hex(16)
    # Store nonce in DB associated with address
    # Upsert: if user exists update nonce, else create
    await users_collection.update_one(
        {"address": req.address},
        {"$set": {"nonce": nonce, "address": req.address}},
        upsert=True
    )
    return {"nonce": nonce}

@app.post("/auth/verify")
async def verify(req: VerifyRequest, response: Response):
    # 1. Get user from DB
    user = await users_collection.find_one({"address": req.address})
    if not user or "nonce" not in user:
        raise HTTPException(status_code=400, detail="Nonce not found. Please request nonce first.")
    
    nonce = user["nonce"]
    
    # 2. Verify signature
    # Reconstruct the message that was signed on frontend
    # "Sign this message to log in to DeFi Debil: <nonce>"
    message = f"Sign this message to log in to DeFi Debil: {nonce}"
    
    # We use web3 to recover address from signature
    from eth_account.messages import encode_defunct
    from web3 import Web3
    
    w3 = Web3()
    try:
        encoded_message = encode_defunct(text=message)
        recovered_address = w3.eth.account.recover_message(encoded_message, signature=req.signature)
    except Exception as e:
         raise HTTPException(status_code=400, detail=f"Invalid signature format: {e}")

    if recovered_address.lower() != req.address.lower():
        raise HTTPException(status_code=401, detail="Signature verification failed")
        
    # 3. Generate JWT
    access_token = create_access_token(data={"sub": req.address})
    
    # 4. Set HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False, # Set True in production (HTTPS)
        samesite="lax",
        max_age=60 * 60 * 24 # 1 day
    )
    
    return {"status": "success", "address": req.address}

@app.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"status": "success"}


@app.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"address": user["address"]}

# --- History Endpoints ---

@app.get("/history", response_model=List[HistoryItem])
async def get_history(user: dict = Depends(get_current_user)):
    cursor = history_collection.find({"user_address": user["address"]}).sort("timestamp", -1).limit(50)
    history = []
    async for doc in cursor:
        history.append(HistoryItem(
            id=str(doc["_id"]),
            type=doc["type"],
            params=doc["params"],
            summary=doc["summary"],
            timestamp=doc["timestamp"]
        ))
    return history

@app.get("/history/{history_id}", response_model=Union[BacktestResult, BatchResponse])
async def get_history_detail(history_id: str, user: dict = Depends(get_current_user)):
    from bson import ObjectId
    try:
        doc = await history_collection.find_one({"_id": ObjectId(history_id), "user_address": user["address"]})
        if not doc:
            raise HTTPException(status_code=404, detail="History not found")
        
        # If we stored full result, return it.
        # But we currently only store summary and params to save space.
        # So we need to RE-RUN the backtest with stored params.
        # This ensures we always get the full steps without bloating DB.
        
        type = doc["type"]
        params = doc["params"]
        
        if type == "lending":
            req = LendingRequest(**params)
            return await run_lending_backtest(req, user, save=False)
        elif type == "perp":
            req = PerpRequest(**params)
            return await run_perp_backtest(req, user, save=False)
        elif type == "clmm":
            req = CLMMRequest(**params)
            return await run_clmm_backtest(req, user, save=False)
        elif type == "batch":
            # For batch, we need to reconstruct the batch request
            # This is complex because run_batch returns BatchResponse, not BacktestResult
            # We might need to adjust the response model or handle batch differently
            # For now, let's just re-run batch
            req = BatchRequest(**params)
            # We need to call run_batch_backtest but it returns BatchResponse
            # The frontend expects BacktestResult (singular) for the chart?
            # Actually, the frontend handles batch results array.
            # But this endpoint is typed as BacktestResult...
            # Let's support batch re-run by calling the batch endpoint logic
            return await run_batch_backtest(req, user, save=False)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Backtest Endpoints (Protected) ---

async def save_history(user_address: str, type: str, params: dict, result: BacktestResult):
    await history_collection.insert_one({
        "user_address": user_address,
        "type": type,
        "params": params,
        "summary": result.summary.dict(),
        "timestamp": datetime.now(timezone.utc)
    })

@app.post("/backtest/lending", response_model=BacktestResult)
async def run_lending_backtest(req: LendingRequest, user: dict = Depends(get_current_user), save: bool = True):
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
        
        result = BacktestResult(
            summary=BacktestSummary(
                final_pnl_usd=pnl_usd,
                roi_percentage=roi,
                apy_percentage=calculate_apy(roi, duration_days),
                final_equity_usd=final_equity_usd,
                steps_count=len(steps)
            ),
            steps=final_steps
        )
        
        if save:
            await save_history(user["address"], "lending", req.dict(), result)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/backtest/perp", response_model=BacktestResult)
async def run_perp_backtest(req: PerpRequest, user: dict = Depends(get_current_user), save: bool = True):
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
        
        result = BacktestResult(
            summary=BacktestSummary(
                final_pnl_usd=pnl,
                roi_percentage=roi,
                apy_percentage=calculate_apy(roi, duration_days),
                final_equity_usd=final_equity,
                steps_count=len(steps)
            ),
            steps=final_steps
        )
        
        if save:
            await save_history(user["address"], "perp", req.dict(), result)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/backtest/clmm", response_model=BacktestResult)
async def run_clmm_backtest(req: CLMMRequest, user: dict = Depends(get_current_user), save: bool = True):
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
        
        result = BacktestResult(
            summary=BacktestSummary(
                final_pnl_usd=pnl,
                roi_percentage=roi,
                apy_percentage=calculate_apy(roi, duration_days),
                final_equity_usd=final_equity,
                steps_count=len(steps)
            ),
            steps=final_steps
        )
        
        if save:
            await save_history(user["address"], "clmm", req.dict(), result)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/backtest/batch", response_model=BatchResponse)
async def run_batch_backtest(batch: BatchRequest, user: dict = Depends(get_current_user), save: bool = True):
    results = []
    for item in batch.items:
        try:
            if item.type == "lending":
                # Convert dict params to model
                req = LendingRequest(**item.params)
                res = await run_lending_backtest(req, user, save=False)
                results.append(res)
            elif item.type == "perp":
                req = PerpRequest(**item.params)
                res = await run_perp_backtest(req, user, save=False)
                results.append(res)
            elif item.type == "clmm":
                req = CLMMRequest(**item.params)
                res = await run_clmm_backtest(req, user, save=False)
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
    
    # Calculate aggregate summary for batch history
    # Simple aggregation
    total_pnl = sum(r.summary.final_pnl_usd for r in results)
    total_equity = sum(r.summary.final_equity_usd for r in results)
    # Weighted ROI? Or just simple PnL / Initial
    # Initial = Final - PnL
    total_initial = total_equity - total_pnl
    roi = (total_pnl / total_initial * 100) if total_initial != 0 else 0
    apy = sum(r.summary.apy_percentage for r in results) / len(results) if results else 0
    
    if save:
        # Save as a single batch entry
        summary = BacktestSummary(
            final_pnl_usd=total_pnl,
            roi_percentage=roi,
            apy_percentage=apy,
            final_equity_usd=total_equity,
            steps_count=0 # Not relevant for aggregate
        )
        # Store the batch request params
        await save_history(user["address"], "batch", batch.dict(), BacktestResult(summary=summary, steps=[]))
            
    return BatchResponse(results=results)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
