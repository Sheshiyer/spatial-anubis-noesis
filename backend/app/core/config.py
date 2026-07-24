"""
Application configuration using Pydantic Settings.
"""
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )
    
    # Application
    APP_NAME: str = "Spatial Anubis API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/spatial_anubis"
    DATABASE_URL_SYNC: str = "postgresql://user:password@localhost:5432/spatial_anubis"
    
    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # World Labs API
    WORLD_LABS_API_KEY: Optional[str] = None
    WORLD_LABS_API_URL: str = "https://api.worldlabs.ai/v1"
    WORLD_LABS_MOCK_MODE: bool = True
    
    # Rate Limiting
    RATE_LIMIT_WORLD_GENERATION_PER_HOUR: int = 1
    
    # Asset Storage
    ASSET_STORAGE_PATH: str = "./storage/assets"
    FALLBACK_WORLDS_PATH: str = "./storage/fallback_worlds"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
