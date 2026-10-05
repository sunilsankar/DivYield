import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


def get_data_dir() -> Path:
    """
    Returns the appropriate data directory.
    If running as a packaged PyInstaller bundle (sys.frozen), uses OS AppData.
    If running from source, uses the local ./data folder.
    """
    app_name = "DivYield"
    
    if getattr(sys, 'frozen', False):
        # Packaged mode: use OS-specific application data directory
        if sys.platform == "win32":
            app_data = Path(os.environ.get("APPDATA", "~")).expanduser()
            data_dir = app_data / app_name
        elif sys.platform == "darwin":
            data_dir = Path("~/Library/Application Support").expanduser() / app_name
        else:
            # Linux fallback
            data_dir = Path("~/.local/share").expanduser() / app_name
    else:
        # Development mode: use local /data folder in repo
        data_dir = Path(__file__).resolve().parent.parent.parent / "data"

    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "DivYield"
    app_version: str = "0.1.0-beta"
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    base_dir: Path = Path(__file__).resolve().parent.parent.parent
    data_dir: Path = get_data_dir()
    db_path: Path = get_data_dir() / "divyield.db"
    log_path: Path = get_data_dir() / "divyield.log"

settings = Settings()
