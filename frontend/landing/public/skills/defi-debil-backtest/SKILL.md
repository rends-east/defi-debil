---
name: defi-debil-backtest
description: Run crypto backtests (Lending, Perp, CLMM) on BNB Chain. Handles x402 payments automatically.
metadata:
  openclaw:
    requires:
      bins: ["curl", "cast"]
      env: ["EVM_PRIVATE_KEY", "BSC_RPC_URL"]
---

# DeFi Debil Backtest Skill

This skill allows you to run financial backtests. The API requires payment (0.01 USDC) for each run if you are not authenticated.

## Prerequisites
1. **cast**: Install via `foundryup` (Foundry). Used for signing transactions.
2. **Env Vars**:
   - `EVM_PRIVATE_KEY`: Your wallet private key (must have BNB for gas and USDC for fees).
   - `BSC_RPC_URL`: RPC URL for BNB Chain (e.g., `https://binance.llama.rpc.com`).

## Instructions

To run a backtest, follow this flow:

1. **Attempt the Request**
   Use `curl` to hit the desired endpoint.
   
   *Lending Example:*
   ```bash
   curl -i -X POST http://localhost:8000/backtest/lending \
     -H "Content-Type: application/json" \
     -d '{"supply_amount": 1000, "borrow_amount": 500, "is_bnb_supply": true}'
   ```

2. **Handle 402 Payment Required**
   If the response code is `402`, extract the `WWW-Authenticate` header.
   It looks like: `x402 scheme="exact", price="0.01", token="0x...", network="eip155:56", payTo="0x..."`

   **Parse these values:**
   - `price`: Amount to send (e.g., 0.01).
   - `token`: Token address (USDС on BSC).
   - `payTo`: Recipient address.

3. **Execute Payment**
   Use `cast` to send the payment.
   
   *Note: USDС on BSC has 18 decimals.*
   Calculate amount: `0.01 * 10^18 = 10000000000000000`
   
   ```bash
   cast send --rpc-url $BSC_RPC_URL --private-key $EVM_PRIVATE_KEY \
     <token_address> "transfer(address,uint256)" <payTo_address> <amount_wei>
   ```
   
   Capture the **Transaction Hash** from the output.

4. **Retry with Payment Proof**
   Call the API again with the `Authorization` header.
   
   ```bash
   curl -X POST http://localhost:8000/backtest/lending \
     -H "Content-Type: application/json" \
     -H "Authorization: x402 <tx_hash>" \
     -d '{"supply_amount": 1000, "borrow_amount": 500, "is_bnb_supply": true}'
   ```

## Backtest Types & Parameters

- **Lending**: `{"supply_amount": float, "borrow_amount": float, "is_bnb_supply": bool}`
- **Perp**: `{"initial_collateral": float, "leverage": float, "is_long": bool}`
- **CLMM**: `{"initial_token0": float, "initial_token1": float, "min_price": float, "max_price": float}`
