
import requests
import json
import time

API_URL = "http://127.0.0.1:8000"

def test_lending():
    print("\n--- Testing Lending Endpoint ---")
    payload = {
        "supply_amount": 10.0,
        "borrow_amount": 1000.0,
        "is_bnb_supply": True
    }
    try:
        resp = requests.post(f"{API_URL}/backtest/lending", json=payload)
        resp.raise_for_status()
        data = resp.json()
        print(f"Status: {resp.status_code}")
        print(f"Summary: {json.dumps(data['summary'], indent=2)}")
        print(f"Steps count: {len(data['steps'])}")
    except Exception as e:
        print(f"Error: {e}")
        if 'resp' in locals():
            print(resp.text)

def test_perp():
    print("\n--- Testing Perp Endpoint ---")
    payload = {
        "initial_collateral": 1000.0,
        "leverage": 2.0,
        "is_long": True
    }
    try:
        resp = requests.post(f"{API_URL}/backtest/perp", json=payload)
        resp.raise_for_status()
        data = resp.json()
        print(f"Status: {resp.status_code}")
        print(f"Summary: {json.dumps(data['summary'], indent=2)}")
        print(f"Steps count: {len(data['steps'])}")
    except Exception as e:
        print(f"Error: {e}")
        if 'resp' in locals():
            print(resp.text)

def test_clmm():
    print("\n--- Testing CLMM Endpoint ---")
    payload = {
        "initial_token0": 10.0,
        "initial_token1": 3000.0,
        "min_price": 200.0,
        "max_price": 1000.0
    }
    try:
        resp = requests.post(f"{API_URL}/backtest/clmm", json=payload)
        resp.raise_for_status()
        data = resp.json()
        print(f"Status: {resp.status_code}")
        print(f"Summary: {json.dumps(data['summary'], indent=2)}")
        print(f"Steps count: {len(data['steps'])}")
    except Exception as e:
        print(f"Error: {e}")
        if 'resp' in locals():
            print(resp.text)

def test_batch():
    print("\n--- Testing Batch Endpoint ---")
    payload = {
        "items": [
            {
                "type": "lending",
                "params": {"supply_amount": 5.0, "borrow_amount": 500.0, "is_bnb_supply": True}
            },
            {
                "type": "perp",
                "params": {"initial_collateral": 500.0, "leverage": 5.0, "is_long": False}
            },
            {
                "type": "clmm",
                "params": {"initial_token0": 5.0, "initial_token1": 1500.0, "min_price": 250.0, "max_price": 400.0}
            }
        ]
    }
    try:
        resp = requests.post(f"{API_URL}/backtest/batch", json=payload)
        resp.raise_for_status()
        data = resp.json()
        print(f"Status: {resp.status_code}")
        print(f"Results count: {len(data['results'])}")
        for i, res in enumerate(data['results']):
            print(f"Result {i} Summary: {json.dumps(res['summary'], indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
        if 'resp' in locals():
            print(resp.text)

if __name__ == "__main__":
    # Wait for server to start if running in parallel (manual check usually)
    # Here we assume server is running.
    time.sleep(2) 
    test_lending()
    test_perp()
    test_clmm()
    test_batch()
