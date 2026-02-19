from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from eth_account.messages import encode_defunct
from web3 import Web3
from fastapi import HTTPException, Security, Request, Depends
from fastapi.security import APIKeyCookie
import secrets
from backend.database import settings, users_collection

# --- JWT Helpers ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- SIWE Helpers ---

def generate_nonce():
    return secrets.token_hex(16)

def verify_signature(address: str, nonce: str, signature: str):
    """
    Verifies that the signature corresponds to the message "Sign this message to log in: <nonce>"
    signed by the given address.
    """
    message_text = f"Sign this message to log in to DeFi Debil: {nonce}"
    encoded_message = encode_defunct(text=message_text)
    w3 = Web3()
    try:
        recovered_address = w3.eth.account.recover_message(encoded_message, signature=signature)
        if recovered_address.lower() == address.lower():
            return True
        return False
    except Exception as e:
        print(f"Signature verification failed: {e}")
        return False

# --- Dependency ---

security = APIKeyCookie(name="access_token", auto_error=False)

async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_access_token(token)
    address = payload.get("sub")
    if not address:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    user = await users_collection.find_one({"address": address})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    return user
