# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Eko API"
    VERSION: str = "1.0.0"
    
    # Supabase / PostgreSQL Connection
    DATABASE_URL: "str"
    
    # Squad API Sandbox Credentials
    SQUAD_API_URL: str = "https://sandbox-api-d.squadco.com"
    SQUAD_SECRET_KEY: str
    SQUAD_PUBLIC_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()