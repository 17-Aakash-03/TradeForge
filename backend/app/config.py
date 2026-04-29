from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "TradeForge"
    database_url: str
    redis_url: str = "redis://localhost:6379"
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    environment: str = "development"
    news_api_key: str = ""
    email_sender: str = ""
    email_password: str = ""

    class Config:
        env_file = ".env"

settings = Settings()