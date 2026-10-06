import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet
import keyring
from keyring.errors import KeyringError

from app.config import settings

SERVICE_NAME = "divyield"
DATA_DIR = settings.data_dir
SECRET_KEY_FILE = DATA_DIR / ".secret.key"
ENCRYPTED_SECRETS_FILE = DATA_DIR / ".secrets.enc"


def mask_secret(secret: Optional[str]) -> Optional[str]:
    """Mask a secret showing only the last 4 characters if available."""
    if not secret:
        return None
    if len(secret) <= 4:
        return "••••••••"
    return f"••••••••{secret[-4:]}"


def _get_or_create_fernet_key() -> bytes:
    """Retrieve or generate the local Fernet symmetric encryption key."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if SECRET_KEY_FILE.exists():
        return SECRET_KEY_FILE.read_bytes().strip()
    key = Fernet.generate_key()
    SECRET_KEY_FILE.write_bytes(key)
    try:
        os.chmod(SECRET_KEY_FILE, 0o600)
    except Exception:
        pass
    return key


def _read_encrypted_store() -> Dict[str, str]:
    """Read the encrypted fallback file."""
    if not ENCRYPTED_SECRETS_FILE.exists():
        return {}
    try:
        key = _get_or_create_fernet_key()
        f = Fernet(key)
        encrypted_data = ENCRYPTED_SECRETS_FILE.read_bytes()
        decrypted_json = f.decrypt(encrypted_data).decode("utf-8")
        return json.loads(decrypted_json)
    except Exception:
        return {}


def _write_encrypted_store(store: Dict[str, str]) -> None:
    """Write to the encrypted fallback file."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    key = _get_or_create_fernet_key()
    f = Fernet(key)
    encrypted_data = f.encrypt(json.dumps(store).encode("utf-8"))
    ENCRYPTED_SECRETS_FILE.write_bytes(encrypted_data)
    try:
        os.chmod(ENCRYPTED_SECRETS_FILE, 0o600)
    except Exception:
        pass


def set_secret(key: str, value: str) -> None:
    """Save a secret to OS keychain with fallback to encrypted file storage."""
    saved_in_keyring = False
    try:
        keyring.set_password(SERVICE_NAME, key, value)
        saved_in_keyring = True
    except (KeyringError, Exception):
        saved_in_keyring = False

    # Also keep in encrypted store so it works in headless / test or if keyring backend switches
    store = _read_encrypted_store()
    store[key] = value
    _write_encrypted_store(store)


def get_secret(key: str) -> Optional[str]:
    """Retrieve a secret from OS keychain or fallback encrypted store."""
    try:
        val = keyring.get_password(SERVICE_NAME, key)
        if val is not None:
            return val
    except (KeyringError, Exception):
        pass

    store = _read_encrypted_store()
    return store.get(key)


def delete_secret(key: str) -> None:
    """Delete a secret from OS keychain and fallback encrypted store."""
    try:
        keyring.delete_password(SERVICE_NAME, key)
    except (KeyringError, Exception):
        pass

    store = _read_encrypted_store()
    if key in store:
        del store[key]
        _write_encrypted_store(store)


# High-level credential management

def save_trading212_credentials(api_key: str, api_secret: Optional[str] = None, environment: str = "live") -> None:
    set_secret("trading212_api_key", api_key.strip())
    if api_secret:
        set_secret("trading212_api_secret", api_secret.strip())
    else:
        delete_secret("trading212_api_secret")
    set_secret("trading212_environment", environment.strip().lower())


def get_trading212_credentials() -> Optional[Dict[str, str]]:
    key = get_secret("trading212_api_key")
    if not key:
        return None
    secret = get_secret("trading212_api_secret")
    env = get_secret("trading212_environment") or "live"
    return {
        "api_key": key,
        "api_secret": secret or "",
        "environment": env,
    }


def delete_trading212_credentials() -> None:
    delete_secret("trading212_api_key")
    delete_secret("trading212_api_secret")
    delete_secret("trading212_environment")


# Desktop App Lock Security

def set_app_password(password: str) -> None:
    """Store app lock password securely in OS keychain."""
    set_secret("app_password", password)


def get_app_password() -> Optional[str]:
    return get_secret("app_password")


def has_app_password() -> bool:
    pwd = get_secret("app_password")
    return bool(pwd and pwd.strip())


def verify_app_password(password: str) -> bool:
    pwd = get_secret("app_password")
    if not pwd:
        return True
    return pwd == password


def delete_app_password() -> None:
    delete_secret("app_password")
