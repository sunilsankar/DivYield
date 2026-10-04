import tempfile
from pathlib import Path
import pytest
from app import credentials
from app.config import settings
from app.database import init_db


@pytest.fixture(autouse=True)
def isolate_credentials_and_db_in_tests(monkeypatch, tmp_path):
    """Ensure test runs never touch production secrets or production sqlite db."""
    temp_data_dir = tmp_path / "test_data"
    temp_data_dir.mkdir(parents=True, exist_ok=True)

    # 1. Isolate Secrets
    monkeypatch.setattr(credentials, "DATA_DIR", temp_data_dir)
    monkeypatch.setattr(credentials, "SECRET_KEY_FILE", temp_data_dir / ".secret.key")
    monkeypatch.setattr(credentials, "ENCRYPTED_SECRETS_FILE", temp_data_dir / ".secrets.enc")

    # In-memory keyring dictionary for tests
    keyring_store = {}

    def mock_set_password(service, username, password):
        keyring_store[(service, username)] = password

    def mock_get_password(service, username):
        return keyring_store.get((service, username))

    def mock_delete_password(service, username):
        keyring_store.pop((service, username), None)

    monkeypatch.setattr("keyring.set_password", mock_set_password)
    monkeypatch.setattr("keyring.get_password", mock_get_password)
    monkeypatch.setattr("keyring.delete_password", mock_delete_password)

    # 2. Isolate SQLite Database
    test_db = temp_data_dir / "test_divyield.db"
    monkeypatch.setattr(settings, "db_path", test_db)
    init_db(test_db)
