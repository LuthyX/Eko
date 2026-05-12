from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Eko"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str

    # Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Squad API
    SQUAD_SECRET_KEY: str = ""
    SQUAD_BASE_URL: str = "https://sandbox-api-d.squadco.com"
    SQUAD_WEBHOOK_SECRET: str = ""

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()