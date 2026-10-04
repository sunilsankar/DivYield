from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "DivYield"
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    base_dir: Path = Path(__file__).resolve().parent.parent.parent
    db_path: Path = Path(__file__).resolve().parent.parent.parent / "data" / "divyield.db"


settings = Settings()
