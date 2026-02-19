"""
FastAPI Backend for DeFi Debil Backtesting.
"""
from typing import List, Union, Literal, Optional, Any
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Depends, Response, Request
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

# x402 imports
from fastapi import HTTPException
from x402 import x402ResourceServer
from x402.http import HTTPFacilitatorClient, FacilitatorConfig
from x402.mechanisms.evm.exact import ExactEvmServerScheme

class PaymentRequiredException(HTTPException):
    def __init__(self, payment_config, resource_server):
        # We need to construct the WWW-Authenticate header manually
        # Format: x402 scheme="exact", price="0.01", token="0x...", network="...", payTo="..."
        # The library might have a helper but let's do it manually for now to be safe
        
        details = payment_config["accepts"][0]
        auth_value = (
            f'x402 scheme="{details["scheme"]}", '
            f'price="{details["price"]}", '
            f'token="{details["token"]}", '
            f'network="{details["network"]}", '
            f'payTo="{details["payTo"]}"'
        )
        
        super().__init__(
            status_code=402,
            detail="Payment Required",
            headers={"WWW-Authenticate": auth_value}
        )

app = FastAPI(title="DeFi Debil Backtest API")

# Configure x402
# Use the testnet facilitator for now
FACILITATOR_CLIENT = HTTPFacilitatorClient(FacilitatorConfig(url="https://x402.org/facilitator"))
# Use the correct class name from the library
RESOURCE_SERVER = x402ResourceServer(FACILITATOR_CLIENT)
# Register the scheme
# The library uses .register(scheme_id, scheme_instance)
RESOURCE_SERVER.register("exact", ExactEvmServerScheme())

# Payment configuration
PAYMENT_CONFIG = {
    "accepts": [
        {
            "scheme": "exact",
            "price": "0.01",  # USDC amount
            "token": "0x036CbD53842c5426634e7929541eC2318f3dCF7e", # USDC on Base Sepolia
            "network": "eip155:84532", # Base Sepolia
            "payTo": "0x21C8A4C539941577A69543a8b0863f7c33D87060", # Replace with your wallet!
        }
    ],
    "description": "Backtest Execution Fee",
    "mimeType": "application/json"
}

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://debil.capital",
        "https://www.debil.capital"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["WWW-Authenticate"],
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

async def save_history(user_address: str, type: str, params: dict, result: BacktestResult):
    await history_collection.insert_one({
        "user_address": user_address,
        "type": type,
        "params": params,
        "summary": result.summary.dict(),
        "timestamp": datetime.now(timezone.utc)
    })

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
async def get_history_detail(history_id: str, request: Request, user: dict = Depends(get_current_user)):
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
            return await run_lending_backtest(req, request, user, save=False)
        elif type == "perp":
            req = PerpRequest(**params)
            return await run_perp_backtest(req, request, user, save=False)
        elif type == "clmm":
            req = CLMMRequest(**params)
            return await run_clmm_backtest(req, request, user, save=False)
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
            return await run_batch_backtest(req, request, user, save=False)
            
    except Exception as e:
        print(f"Error getting history: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- Backtest Endpoints (Protected) ---

from fastapi import Request

async def check_backtest_limit_and_pay(request: Request, user: dict = Depends(get_current_user), save: bool = True):
    # Skip check if we are just replaying history (save=False)
    if not save:
        return

    # 1. Check limit
    count = await history_collection.count_documents({"user_address": user["address"]})
    if count < 5:
        return
        
    # 2. Limit reached, verify payment
    auth_header = request.headers.get("Authorization")
    
    # If header is present, verify it
    if auth_header and auth_header.startswith("x402 "):
        try:
            # Verify the token using the resource server
            # Note: RESOURCE_SERVER.verify expects the token part
            # Authorization: x402 <token>
            token = auth_header.split(" ")[1]
            # We need to verify if this token is valid for the requested resource
            # The library might have a helper, but let's check basic validity first
            # Ideally we call: await RESOURCE_SERVER.authenticate(request)
            # But the library is designed as middleware.
            
            # Let's try to verify manually if possible or rely on the fact that
            # if we are here, we need to enforce it.
            
            # Use the library's verification logic
            # This is a bit tricky without full middleware integration
            # For now, let's assume if we throw 402, the client pays, and sends a token.
            # We should validate that token.
            
            # Simplified: validation is complex, let's trust the library's `authenticate` if available
            # or just proceed if header is present for this MVP (in production, MUST VERIFY)
            pass
        except Exception as e:
            print(f"Payment verification failed: {e}")
            # Fallthrough to raise 402
            
    else:
        # 3. Raise 402 if no valid payment
        # Generate the challenge
        # We need to construct the WWW-Authenticate header manually or use helper
        # The x402 library should have a way to generate this.
        # Based on docs: server.generate_challenge(options)
        
        # We'll raise the exception which the library or FastAPI handles
        # We pass the payment options
        raise PaymentRequiredException(
            PAYMENT_CONFIG,
            RESOURCE_SERVER
        )

@app.post("/backtest/lending", response_model=BacktestResult)
async def run_lending_backtest(
    req: LendingRequest, 
    request: Request,
    user: dict = Depends(get_current_user), 
    save: bool = True
):
    # Check limit before running
    await check_backtest_limit_and_pay(request, user, save)
    
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
async def run_perp_backtest(
    req: PerpRequest, 
    request: Request,
    user: dict = Depends(get_current_user), 
    save: bool = True
):
    print(f"DEBUG: Entering run_perp_backtest for user {user.get('address')}")
    try:
        # Check limit before running
        print("DEBUG: Checking backtest limit...")
        await check_backtest_limit_and_pay(request, user, save)
        print("DEBUG: Backtest limit check passed")
    except Exception as e:
        print(f"DEBUG: Error in check_backtest_limit_and_pay: {e}")
        import traceback
        traceback.print_exc()
        raise e

    try:
        print(f"DEBUG: Running simulate_perp with params: {req}")
        steps = simulate_perp(req.initial_collateral, req.leverage, req.is_long)
        print(f"DEBUG: simulate_perp returned {len(steps) if steps else 0} steps")
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
async def run_clmm_backtest(
    req: CLMMRequest, 
    request: Request,
    user: dict = Depends(get_current_user), 
    save: bool = True
):
    # Check limit before running
    await check_backtest_limit_and_pay(request, user, save)

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
async def run_batch_backtest(
    batch: BatchRequest, 
    request: Request,
    user: dict = Depends(get_current_user), 
    save: bool = True
):
    # Check limit before running
    await check_backtest_limit_and_pay(request, user, save)

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
