import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "defi_debil"
    JWT_SECRET: str = "super_secret_key_change_me_in_prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]
users_collection = db["users"]
tokens_collection = db["tokens"] # Optional: for blacklisting or refresh tokens if needed
history_collection = db["history"]
