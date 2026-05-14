from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    app_name: str = "TradeForge API"
    environment: str = "development"
    database_url: str = "postgresql://postgres:postgres123@localhost:5432/tradeforge_db"
    jwt_secret_key: str = "tradeforge-super-secret-key-2024"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 1440
    news_api_key: str = ""
    email_sender: str = ""
    email_password: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
